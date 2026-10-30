import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {emptyData,emptyLog,parseTime} from '../src/core.ts';

test('database migration isolates storage, permits anonymous profile edits, audits changes and rejects stale writes',async()=>{
 const db=new PGlite();
 try{
  await db.exec("create role anon; create role authenticated; create schema auth; create function auth.uid() returns uuid language sql as $$ select null::uuid $$;create table public.existing_supplemental(id int);insert into public.existing_supplemental values(1);");
  await db.exec(await readFile(new URL('../supabase/migrations/202610300001_flight_reconciler.sql',import.meta.url),'utf8'));
  const data=emptyData();data.aircraft=[{id:'test-aircraft',tail:'NTEST',manual:null,digital:null}];data.days=[{aircraftId:'test-aircraft',date:'2026-01-01',manual:{...emptyLog(),total:parseTime('01:00')},digital:emptyLog()}];
  const change=[{id:'test-aircraft',expected_revision:0,payload:data}];
  await db.exec('set role anon');
  await db.query('select public.flight_reconciler_save($1::jsonb)',[JSON.stringify(change)]);
  const result=await db.query<{profiles:any}>('select public.flight_reconciler_profiles() as profiles');
  assert.equal(result.rows[0].profiles[0].revision,1);
  await assert.rejects(db.query('select public.flight_reconciler_save($1::jsonb)',[JSON.stringify(change)]),/changed since/);
  await assert.rejects(db.query('select * from flight_reconciler.profiles'),/permission denied/);
  await assert.rejects(db.query('delete from flight_reconciler.history'),/permission denied/);
  await assert.rejects(db.query('select * from public.existing_supplemental'),/permission denied/);
  await db.exec('reset role');
  assert.equal((await db.query<{count:number}>('select count(*)::int as count from flight_reconciler.history')).rows[0].count,1);
  assert.equal((await db.query<{id:number}>('select * from public.existing_supplemental')).rows[0].id,1);
 }finally{await db.close();}
});
