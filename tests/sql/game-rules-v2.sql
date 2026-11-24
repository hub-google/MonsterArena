-- Run only against an isolated database initialized by fixture.sql.
\set ON_ERROR_STOP on
BEGIN;
INSERT INTO auth.users(id,email) VALUES
 ('00000000-0000-4000-8000-000000000001','a@example.invalid'),
 ('00000000-0000-4000-8000-000000000002','b@example.invalid');
INSERT INTO public.users(user_id,username,email,gold,stamina,max_stamina) VALUES
 ('00000000-0000-4000-8000-000000000001','測試A','a@example.invalid',500,100,100),
 ('00000000-0000-4000-8000-000000000002','測試B','b@example.invalid',500,100,100);
INSERT INTO public.monsters(monster_id,user_id,name,life_stage,type,family,combat_hp,combat_atk,combat_def,combat_spd,age_days,cleanliness,last_updated_at)
VALUES
 ('00000000-0000-4000-8000-000000000011','00000000-0000-4000-8000-000000000001','弱怪',3,1,1,50,1,5,5,1,100,now()-interval '15 minutes'),
 ('00000000-0000-4000-8000-000000000012','00000000-0000-4000-8000-000000000002','強怪',5,2,2,5000,1000,500,100,10,100,now()-interval '40 days');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
DO $$
DECLARE r jsonb;s jsonb;
BEGIN
  IF has_schema_privilege(current_user,'arena_internal','USAGE') THEN RAISE EXCEPTION 'private schema exposed'; END IF;
  r:=public.game_action('capabilities');
  IF (r->>'version')::int<>2 THEN RAISE EXCEPTION 'missing capabilities'; END IF;
  r:=public.game_action('buy','{"item_id":"feed_basic","quantity":1,"request_id":"00000000-0000-4000-8000-000000000099"}');
  s:=public.game_action('buy','{"item_id":"feed_basic","quantity":1,"request_id":"00000000-0000-4000-8000-000000000099"}');
  IF r<>s THEN RAISE EXCEPTION 'retry must return same result'; END IF;
  BEGIN
    PERFORM public.game_action('buy','{"item_id":"feed_basic","quantity":2,"request_id":"00000000-0000-4000-8000-000000000099"}');
    RAISE EXCEPTION 'payload reuse accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE '%交易識別碼%' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM public.game_action('pvp_register','{"monster_id":"00000000-0000-4000-8000-000000000012"}');
    RAISE EXCEPTION 'other player monster accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE '%不屬於%' THEN RAISE; END IF;
  END;
  PERFORM public.game_action('pvp_register','{"monster_id":"00000000-0000-4000-8000-000000000011"}');
  r:=public.game_action('battle','{"monster_id":"00000000-0000-4000-8000-000000000011","encounter":"wild"}');
  IF (r->>'enemyMaxHp')::numeric<>45 OR (r->>'enemyAtk')::numeric<>5 THEN RAISE EXCEPTION 'wild stats incorrect'; END IF;
  PERFORM public.game_age_monsters();
  PERFORM public.game_action('raid_status');
END $$;
RESET ROLE;
DO $$
BEGIN
 IF (SELECT quantity FROM public.user_inventory WHERE user_id='00000000-0000-4000-8000-000000000001' AND item_id='feed_basic')<>1 THEN RAISE EXCEPTION 'duplicate inventory credit'; END IF;
 IF (SELECT count(*) FROM arena_internal.gold_ledger WHERE user_id='00000000-0000-4000-8000-000000000001' AND action='buy')<>1 THEN RAISE EXCEPTION 'duplicate ledger'; END IF;
 IF (SELECT cleanliness FROM public.monsters WHERE monster_id='00000000-0000-4000-8000-000000000011')<>99 THEN RAISE EXCEPTION 'elapsed cleanliness failed'; END IF;
END $$;
UPDATE public.raid_boss SET current_hp=100,max_hp=100 WHERE id LIKE 'daily:%';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
SELECT public.game_action('raid','{"monster_id":"00000000-0000-4000-8000-000000000011"}');
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
DO $$
DECLARE r jsonb;
BEGIN
 r:=public.game_action('battle','{"monster_id":"00000000-0000-4000-8000-000000000012","encounter":"wild"}');
 IF (r->>'enemyMaxHp')::numeric<>45 OR (r->>'enemyAtk')::numeric<>5 OR NOT (r->>'won')::boolean OR (r->>'reward')::int<>10 THEN RAISE EXCEPTION 'fixed difficulty or clear reward failed'; END IF;
 PERFORM public.game_action('raid','{"monster_id":"00000000-0000-4000-8000-000000000012"}');
 r:=public.game_action('raid_status');
 IF (r->>'current_hp')::int<>0 OR jsonb_array_length(r->'claims')<>1 THEN RAISE EXCEPTION 'daily raid settlement failed'; END IF;
 PERFORM public.game_action('raid_claim',jsonb_build_object('boss_id',r->>'id'));
 PERFORM public.game_age_monsters();
END $$;
RESET ROLE;
UPDATE public.battle_records SET created_at=clock_timestamp()-interval '10 seconds';
SET LOCAL ROLE authenticated;
DO $$
DECLARE r jsonb;
BEGIN
 r:=public.game_action('battle','{"monster_id":"00000000-0000-4000-8000-000000000012","encounter":"pvp","opponent_id":"00000000-0000-4000-8000-000000000001"}');
 IF NOT (r->>'won')::boolean THEN RAISE EXCEPTION 'async pvp winner incorrect'; END IF;
 r:=public.game_action('pvp_list');
 IF jsonb_array_length(r->'opponents')<>1 OR (r->'leaderboard'->0->>'points')::int<>3 THEN RAISE EXCEPTION 'ranking incorrect'; END IF;
END $$;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
DO $$
DECLARE r jsonb;
BEGIN
 r:=public.game_action('raid_status');
 IF jsonb_array_length(r->'claims')<>1 THEN RAISE EXCEPTION 'non-final hitter missing reward'; END IF;
 PERFORM public.game_action('raid_claim',jsonb_build_object('boss_id',r->>'id'));
 r:=public.game_action('raid_status');
 IF jsonb_array_length(r->'claims')<>0 THEN RAISE EXCEPTION 'reward still claimable'; END IF;
END $$;
RESET ROLE;
DO $$
BEGIN
 IF (SELECT sum(damage) FROM arena_internal.raid_contributions)<>100 THEN RAISE EXCEPTION 'overkill damage counted'; END IF;
 IF (SELECT sum(amount) FROM arena_internal.gold_ledger WHERE action='raid_claim')>5000 THEN RAISE EXCEPTION 'reward pool overflow'; END IF;
 IF (SELECT age_days FROM public.monsters WHERE monster_id='00000000-0000-4000-8000-000000000012')<49.99 THEN RAISE EXCEPTION 'offline age lost'; END IF;
END $$;
ROLLBACK;
