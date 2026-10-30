-- Extend the existing private validator without changing profile data or permissions.
do $migration$
declare definition text;
begin
 definition := pg_get_functiondef('flight_reconciler.validate_profile(jsonb,text)'::regprocedure);
 if position('Invalid third shift' in definition)=0 then
  if position('for f in select * from jsonb_array_elements' in definition)=0 then
   raise exception 'Profile validator changed; review before applying third shift validation';
  end if;
  definition := replace(definition,'for f in select * from jsonb_array_elements',
   'if (l->''shifts'') ? ''third'' and not coalesce(flight_reconciler.valid_time(l->''shifts''->''third''),false) then raise exception ''Invalid third shift'';end if;
   for f in select * from jsonb_array_elements');
  execute definition;
 end if;
end;
$migration$;
