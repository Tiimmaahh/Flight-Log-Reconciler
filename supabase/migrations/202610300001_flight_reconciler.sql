begin;
create schema if not exists flight_reconciler;
revoke all on schema flight_reconciler from public, anon, authenticated;

create table if not exists flight_reconciler.profiles (
 id text primary key,
 tail text not null unique,
 revision bigint not null default 1 check (revision > 0),
 payload jsonb not null,
 updated_at timestamptz not null default now()
);
create table if not exists flight_reconciler.history (
 id bigint generated always as identity primary key,
 aircraft_id text not null references flight_reconciler.profiles(id),
 revision bigint not null,
 changed_at timestamptz not null default now(),
 actor uuid default auth.uid(),
 before_value jsonb,
 after_value jsonb not null
);
alter table flight_reconciler.profiles enable row level security;
alter table flight_reconciler.history enable row level security;
revoke all on all tables in schema flight_reconciler from public, anon, authenticated;
revoke all on all sequences in schema flight_reconciler from public, anon, authenticated;

-- Private validator: public callers cannot execute private helpers or touch tables.
create or replace function flight_reconciler.valid_time(v jsonb)
returns boolean language sql immutable set search_path = '' as $$
 select v = 'null'::jsonb or (
  jsonb_typeof(v) = 'object' and jsonb_typeof(v->'minutes') = 'number'
  and (v->>'minutes') ~ '^[0-9]+$' and (v->>'minutes')::numeric between 0 and 6000000000
  and jsonb_typeof(v->'raw') = 'string' and length(v->>'raw') < 100000
  and v->>'mode' in ('hm','decimal'));
$$;
create or replace function flight_reconciler.validate_profile(p jsonb, profile_id text)
returns void language plpgsql set search_path = '' as $$
declare d jsonb; l jsonb; f jsonb; side text; a jsonb;
begin
 if octet_length(p::text)>10000000 or p->>'schema' is distinct from '1'
 or p->'demo' is distinct from 'false'::jsonb
 or jsonb_typeof(p->'aircraft') is distinct from 'array'
 or jsonb_array_length(p->'aircraft')<>1
 or jsonb_typeof(p->'days') is distinct from 'array'
 or jsonb_typeof(p->'reviews') is distinct from 'object'
 or p->'audit' is distinct from '[]'::jsonb
 or p->'tolerance' is distinct from '0'::jsonb then raise exception 'Invalid aircraft profile';end if;
 a:=p->'aircraft'->0;
 if a->>'id' is distinct from profile_id or length(profile_id) not between 1 and 100
 or a->>'tail' is null or a->>'tail' !~ '^[A-Z0-9-]{2,20}$' then raise exception 'Invalid aircraft identity';end if;
 if a ? 'totalTime' and (not coalesce(flight_reconciler.valid_time(a->'totalTime'->'time'),false)
 or a->'totalTime'->>'date' !~ '^\d{4}-\d{2}-\d{2}$') then raise exception 'Invalid aircraft total';end if;
 if exists(select 1 from jsonb_array_elements(p->'days') x group by x->>'date' having count(*)>1) then raise exception 'Duplicate aircraft dates';end if;
 for d in select * from jsonb_array_elements(p->'days') loop
  if d->>'aircraftId' is distinct from profile_id or d->>'date' is null or d->>'date' !~ '^\d{4}-\d{2}-\d{2}$'
  or to_char((d->>'date')::date,'YYYY-MM-DD')<>d->>'date'
  or (d ? 'estimatedDate' and jsonb_typeof(d->'estimatedDate')<>'boolean') then raise exception 'Invalid aircraft day';end if;
  foreach side in array array['manual','digital'] loop
   l:=d->side;
   if l->>'method' is null or l->>'method' not in ('total','flights','shifts')
   or jsonb_typeof(l->'complete') is distinct from 'boolean'
   or not coalesce(flight_reconciler.valid_time(l->'total'),false)
   or not coalesce(flight_reconciler.valid_time(l->'cumulative'),false)
   or jsonb_typeof(l->'reference') is distinct from 'string'
   or jsonb_typeof(l->'notes') is distinct from 'string'
   or jsonb_typeof(l->'flights') is distinct from 'array' then raise exception 'Invalid daily log';end if;
   if l->>'method'='shifts' and (not coalesce(flight_reconciler.valid_time(l->'shifts'->'day'),false)
    or not coalesce(flight_reconciler.valid_time(l->'shifts'->'night'),false)) then raise exception 'Invalid shifts';end if;
   for f in select * from jsonb_array_elements(l->'flights') loop
    if not coalesce(flight_reconciler.valid_time(f->'time'),false)
    or exists(select 1 from unnest(array['id','flightId','departure','origin','destination','pilot','tail','notes']) k where jsonb_typeof(f->k) is distinct from 'string') then raise exception 'Invalid flight';end if;
   end loop;
  end loop;
 end loop;
end;
$$;

-- Only these narrowly named API entry points are placed in public.
-- Application tables, history and validation remain in flight_reconciler.
create or replace function public.flight_reconciler_profiles()
returns jsonb language sql security definer set search_path = '' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'revision',revision,'payload',payload) order by tail),'[]'::jsonb)
 from flight_reconciler.profiles;
$$;
create or replace function public.flight_reconciler_save(changes jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare c jsonb; prior flight_reconciler.profiles%rowtype; new_revision bigint; output jsonb:='[]'::jsonb; profile_tail text;
begin
 if jsonb_typeof(changes)<>'array' or jsonb_array_length(changes) not between 1 and 100 then raise exception 'Invalid profile update';end if;
 -- Serialize profile creation and lock existing rows in a stable order.
 perform pg_advisory_xact_lock(917462001);
 for c in select * from jsonb_array_elements(changes) order by value->>'id' loop
  perform flight_reconciler.validate_profile(c->'payload',c->>'id');
  select * into prior from flight_reconciler.profiles where id=c->>'id' for update;
  if coalesce(prior.revision,0) is distinct from (c->>'expected_revision')::bigint then
   raise exception using errcode='40001',message='Aircraft changed since it was loaded';
  end if;
  profile_tail:=c->'payload'->'aircraft'->0->>'tail';
  new_revision:=coalesce(prior.revision,0)+1;
  insert into flight_reconciler.profiles(id,tail,revision,payload) values(c->>'id',profile_tail,new_revision,c->'payload')
  on conflict(id) do update set tail=excluded.tail,revision=excluded.revision,payload=excluded.payload,updated_at=now();
  insert into flight_reconciler.history(aircraft_id,revision,before_value,after_value) values(c->>'id',new_revision,prior.payload,c->'payload');
  output:=output||jsonb_build_array(jsonb_build_object('id',c->>'id','revision',new_revision));
 end loop;
 return output;
end;
$$;
revoke all on all functions in schema flight_reconciler from public, anon, authenticated;
revoke all on function public.flight_reconciler_profiles() from public;
revoke all on function public.flight_reconciler_save(jsonb) from public;
grant execute on function public.flight_reconciler_profiles() to anon, authenticated;
grant execute on function public.flight_reconciler_save(jsonb) to anon, authenticated;
notify pgrst, 'reload schema';
commit;
