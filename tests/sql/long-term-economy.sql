-- 90 virtual days in an isolated DB only. Time/counter adjustments are fixture
-- inputs; every action, cost, reward, training limit and battle uses real RPCs.
\set ON_ERROR_STOP on
BEGIN;
SELECT setseed(0.314159);
DO $progress$
DECLARE u uuid:='44444444-4444-4444-8444-444444444441'; m uuid;
  day int; i int; p public.monsters; r jsonb; q text; g int; ledger bigint;
  earned int:=0; spent int:=100; wins int; hp int; stat text;
BEGIN
 INSERT INTO auth.users(id,email) VALUES(u,'progression@example.invalid');
 INSERT INTO public.users(user_id,username,email,gold,stamina,max_stamina) VALUES(u,'Progression','progression@example.invalid',500,100,100);
 PERFORM set_config('request.jwt.claim.sub',u::text,true);
 PERFORM public.game_action('hatch');
 SELECT monster_id INTO m FROM public.monsters WHERE user_id=u;
 FOR day IN 1..90 LOOP
  -- Simulate elapsed day, not a fabricated calendar timestamp in production.
  UPDATE public.users SET stamina_updated_at=now()-interval '24 hours' WHERE user_id=u;
  UPDATE public.monsters SET last_updated_at=now()-CASE WHEN day=1 THEN interval '2 hours' ELSE interval '24 hours' END WHERE monster_id=m;
  DELETE FROM public.daily_quests WHERE user_id=u;
  DELETE FROM arena_internal.pve_first_clear WHERE user_id=u;
  PERFORM public.game_age_monsters();
  IF (SELECT is_sick FROM public.monsters WHERE monster_id=m) THEN
   PERFORM public.game_action('heal',jsonb_build_object('monster_id',m,'item_id','heal_basic'));
   UPDATE public.monsters SET repair_until=now()-interval '1 second' WHERE monster_id=m;
   PERFORM public.game_age_monsters();
  END IF;
  FOR i IN 1..3 LOOP PERFORM public.game_action('feed',jsonb_build_object('monster_id',m,'item_id','feed_basic')); END LOOP;
  WHILE (SELECT fullness FROM public.monsters WHERE monster_id=m)<40 LOOP
   PERFORM public.game_action('feed',jsonb_build_object('monster_id',m,'item_id','feed_basic'));
  END LOOP;
  PERFORM public.game_action('clean',jsonb_build_object('monster_id',m));
  FOR i IN 1..2 LOOP
   SELECT * INTO p FROM public.monsters WHERE monster_id=m;
   stat:=CASE WHEN p.training_hp<30 THEN 'hp' WHEN p.training_atk<30 THEN 'atk' ELSE 'practice' END;
   PERFORM public.game_action('train',jsonb_build_object('monster_id',m,'stat',stat));
  END LOOP;
  FOR i IN 1..2 LOOP
   -- Cooldown is a real clock; advancing it is a simulation fixture adjustment.
   UPDATE public.battle_records SET created_at=clock_timestamp()-interval '2 days' WHERE user_id=u AND created_at>clock_timestamp()-interval '5 seconds';
   r:=public.game_action('battle',jsonb_build_object('monster_id',m,'encounter','wild'));
   earned:=earned+COALESCE((r->>'reward')::int,0);
  END LOOP;
  FOR q IN SELECT unnest(ARRAY['feed_3','clean_1','train_2','battle_2']) LOOP
   PERFORM public.game_action('claim',jsonb_build_object('quest_id',q));
  END LOOP;
  earned:=earned+250;
  SELECT * INTO p FROM public.monsters WHERE monster_id=m;
  IF p.life_stage=5 AND p.battles>=50 AND p.wins::numeric/p.battles>=.7 THEN
   PERFORM public.game_action('buy','{"item_id":"ultimate_core","quantity":1}');spent:=spent+1000;
   PERFORM public.game_action('evolve',jsonb_build_object('monster_id',m));
  END IF;
  IF day=30 OR day=90 THEN
   SELECT * INTO p FROM public.monsters WHERE monster_id=m;
   SELECT gold INTO g FROM public.users WHERE user_id=u;
   SELECT coalesce(sum(amount),0) INTO ledger FROM arena_internal.gold_ledger WHERE user_id=u;
   IF p.training_hp<>30 OR p.training_atk<>30 OR p.training_def<>0 OR p.training_spd<>0 THEN RAISE EXCEPTION 'day % training cap not respected',day; END IF;
   IF p.battles<>day*2 OR p.is_dead OR g<>500+earned-spent OR g<>500+ledger OR g<0 THEN RAISE EXCEPTION 'day % economy / progression invariant failed',day; END IF;
   IF day=90 AND p.life_stage<>6 THEN RAISE EXCEPTION 'active free player cannot reach terminal evolution'; END IF;
   RAISE NOTICE 'LONG_TERM day=% stage=% training=% battles=% wins=% gold=% earned=% spent=%',day,p.life_stage,p.training_hp+p.training_atk+p.training_def+p.training_spd,p.battles,p.wins,g,earned,spent;
  END IF;
 END LOOP;
END $progress$;
ROLLBACK;
