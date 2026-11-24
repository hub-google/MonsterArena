-- Run the actual server battle function against all roles at every stage.
-- Independent from the JavaScript mirror and deterministic through setseed.
\set ON_ERROR_STOP on
SELECT setseed(0.234789);
DO $balance$
DECLARE st int; a record; b record; n int; w int; trials int; avgs double precision[]; advantage double precision; counters int; relation int; rate double precision; low double precision; high double precision; neutral_low double precision; neutral_high double precision;
BEGIN
 FOR st IN 3..6 LOOP
  avgs:=array_fill(0::double precision,ARRAY[8]); advantage:=0; counters:=0;low:=1;high:=0;neutral_low:=1;neutral_high:=0;
  trials:=CASE WHEN st=5 THEN 10000 ELSE 1000 END;
  FOR a IN SELECT * FROM arena_internal.base_profiles(st) WHERE role>0 ORDER BY role LOOP
   FOR b IN SELECT * FROM arena_internal.base_profiles(st) WHERE role>a.role ORDER BY role LOOP
    SELECT count(*) FILTER (WHERE (arena_internal.auto_battle(ARRAY[a.hp,a.atk,a.def,a.spd]::double precision[],ARRAY[b.hp,b.atk,b.def,b.spd]::double precision[],a.role,b.role,false)->>'won')::boolean) INTO w FROM generate_series(1,trials);
    rate:=w::double precision/trials;avgs[a.role]:=avgs[a.role]+rate/7;avgs[b.role]:=avgs[b.role]+(1-rate)/7;
    relation:=CASE WHEN (b.role-1)/2=((a.role-1)/2+1)%4 THEN 1 WHEN (a.role-1)/2=((b.role-1)/2+1)%4 THEN -1 ELSE 0 END;
    IF relation<>0 THEN
     rate:=CASE WHEN relation=1 THEN rate ELSE 1-rate END; advantage:=advantage+rate; counters:=counters+1;low:=least(low,rate);high:=greatest(high,rate);
    ELSE neutral_low:=least(neutral_low,rate);neutral_high:=greatest(neutral_high,rate);
    END IF;
   END LOOP;
  END LOOP;
  advantage:=advantage/counters;
  IF EXISTS(SELECT 1 FROM unnest(avgs) x WHERE x<.43 OR x>.57) OR advantage<.58 OR advantage>.72 OR low<.47 OR neutral_low<.37 OR neutral_high>.65 THEN RAISE EXCEPTION 'server balance stage %, roles %, counter average %, range %–%, neutral %–%',st,avgs,advantage,low,high,neutral_low,neutral_high; END IF;
  RAISE NOTICE 'stage %, % matches per matchup, role wins %, counter average %, range %–%, neutral %–%',st,trials,avgs,advantage,low,high,neutral_low,neutral_high;
 END LOOP;
END $balance$;
