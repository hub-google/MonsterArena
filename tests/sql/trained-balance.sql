-- Same-investment mature units: test actual server combat rather than base-only profiles.
\set ON_ERROR_STOP on
SELECT setseed(0.6782);
DO $trained$
DECLARE st int; a record;b record;rate double precision; avgs double precision[]; counter_sum double precision;counter_n int;rel int; trials int:=1200;
BEGIN
 FOR st IN 5..6 LOOP
  avgs:=array_fill(0::double precision,ARRAY[8]);counter_sum:=0;counter_n:=0;
  FOR a IN SELECT * FROM arena_internal.base_profiles(st) WHERE role>0 ORDER BY role LOOP
   FOR b IN SELECT * FROM arena_internal.base_profiles(st) WHERE role>a.role ORDER BY role LOOP
    SELECT avg(((arena_internal.auto_battle(ARRAY[a.hp+60,a.atk+15,a.def,a.spd]::double precision[],ARRAY[b.hp+60,b.atk+15,b.def,b.spd]::double precision[],a.role,b.role,false)->>'won')::boolean)::int) INTO rate FROM generate_series(1,trials);
    avgs[a.role]:=avgs[a.role]+rate/7;avgs[b.role]:=avgs[b.role]+(1-rate)/7;
    rel:=CASE WHEN (b.role-1)/2=((a.role-1)/2+1)%4 THEN 1 WHEN (a.role-1)/2=((b.role-1)/2+1)%4 THEN -1 ELSE 0 END;
    IF rel<>0 THEN counter_sum:=counter_sum+CASE WHEN rel=1 THEN rate ELSE 1-rate END;counter_n:=counter_n+1; END IF;
   END LOOP;
  END LOOP;
  IF EXISTS(SELECT 1 FROM unnest(avgs) x WHERE x<.30 OR x>.70) OR counter_sum/counter_n<.53 THEN RAISE EXCEPTION 'trained stage % roles % affinity %',st,avgs,counter_sum/counter_n; END IF;
  RAISE NOTICE 'TRAINED stage=% roles=% advantage=%',st,avgs,counter_sum/counter_n;
 END LOOP;
END $trained$;
