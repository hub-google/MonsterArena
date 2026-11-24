ALTER TABLE public.monsters ADD COLUMN IF NOT EXISTS repair_until timestamptz;
ALTER TABLE public.monsters ADD COLUMN IF NOT EXISTS skin_id text;
ALTER TABLE public.monsters ADD COLUMN IF NOT EXISTS repair_until timestamptz;
ALTER TABLE public.monsters ADD COLUMN IF NOT EXISTS training_hp int NOT NULL DEFAULT 0 CHECK(training_hp BETWEEN 0 AND 30);
ALTER TABLE public.monsters ADD COLUMN IF NOT EXISTS training_atk int NOT NULL DEFAULT 0 CHECK(training_atk BETWEEN 0 AND 30);
ALTER TABLE public.monsters ADD COLUMN IF NOT EXISTS training_def int NOT NULL DEFAULT 0 CHECK(training_def BETWEEN 0 AND 30);
ALTER TABLE public.monsters ADD COLUMN IF NOT EXISTS training_spd int NOT NULL DEFAULT 0 CHECK(training_spd BETWEEN 0 AND 30);
ALTER TABLE public.monsters ADD COLUMN IF NOT EXISTS core_quality int NOT NULL DEFAULT 0 CHECK(core_quality BETWEEN 0 AND 5);
ALTER TABLE public.monsters ADD COLUMN IF NOT EXISTS legacy_combat jsonb;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='arena_training_budget' AND conrelid='public.monsters'::regclass) THEN ALTER TABLE public.monsters ADD CONSTRAINT arena_training_budget CHECK(training_hp+training_atk+training_def+training_spd<=60); END IF; END $$;
UPDATE public.monsters SET legacy_combat=jsonb_build_object('hp',combat_hp,'atk',combat_atk,'def',combat_def,'spd',combat_spd,'train_count',train_count) WHERE legacy_combat IS NULL;
-- Arena next game rules. Private tables are never exposed via PostgREST.
-- Compose before canonical RPCs; deploy only through a reviewed, isolated migration.
CREATE SCHEMA IF NOT EXISTS arena_internal;
REVOKE ALL ON SCHEMA arena_internal FROM PUBLIC, anon, authenticated;
CREATE TABLE IF NOT EXISTS arena_internal.action_requests (
  user_id uuid NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  request_id uuid NOT NULL, action text NOT NULL, payload_hash text NOT NULL,
  result jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id,request_id)
);
CREATE INDEX IF NOT EXISTS arena_action_requests_expiry ON arena_internal.action_requests(user_id,created_at);
CREATE TABLE IF NOT EXISTS arena_internal.gold_ledger (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  action text NOT NULL, request_id uuid, amount bigint NOT NULL,
  balance bigint NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS arena_gold_ledger_user_time ON arena_internal.gold_ledger(user_id,created_at DESC);
CREATE TABLE IF NOT EXISTS arena_internal.raid_contributions (
  boss_id text NOT NULL REFERENCES public.raid_boss(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  damage bigint NOT NULL CHECK(damage>=0), claimed_at timestamptz,
  PRIMARY KEY(boss_id,user_id)
);
ALTER TABLE arena_internal.raid_contributions ADD COLUMN IF NOT EXISTS attempts int NOT NULL DEFAULT 0 CHECK(attempts>=0);
CREATE INDEX IF NOT EXISTS arena_raid_contributions_user ON arena_internal.raid_contributions(user_id,boss_id);
CREATE TABLE IF NOT EXISTS arena_internal.pvp_defenders (
  user_id uuid PRIMARY KEY REFERENCES public.users(user_id) ON DELETE CASCADE,
  monster_id uuid NOT NULL, monster_name text NOT NULL,
  family smallint NOT NULL, stage smallint NOT NULL, type smallint NOT NULL,
  hp double precision NOT NULL CHECK(hp>=1),
  atk double precision NOT NULL CHECK(atk>=1),
  def double precision NOT NULL CHECK(def>=0),
  spd double precision NOT NULL CHECK(spd>=1),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS arena_internal.pvp_results (
  attacker_id uuid NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  defender_id uuid NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  battle_day date NOT NULL, battle_id text NOT NULL, won boolean NOT NULL,
  PRIMARY KEY(attacker_id,defender_id,battle_day), CHECK(attacker_id<>defender_id)
);
CREATE INDEX IF NOT EXISTS arena_pvp_daily ON arena_internal.pvp_results(attacker_id,battle_day);
CREATE TABLE IF NOT EXISTS arena_internal.pvp_scores (
  season text NOT NULL, user_id uuid NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  points int NOT NULL DEFAULT 0 CHECK(points>=0), wins int NOT NULL DEFAULT 0,
  losses int NOT NULL DEFAULT 0, PRIMARY KEY(season,user_id)
);
CREATE INDEX IF NOT EXISTS arena_pvp_rank ON arena_internal.pvp_scores(season,points DESC,user_id);
CREATE TABLE IF NOT EXISTS arena_internal.pve_first_clear (
  user_id uuid NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  clear_day date NOT NULL, encounter text NOT NULL,
  PRIMARY KEY(user_id,clear_day,encounter)
);
ALTER TABLE arena_internal.action_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE arena_internal.gold_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE arena_internal.raid_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE arena_internal.pvp_defenders ENABLE ROW LEVEL SECURITY;
ALTER TABLE arena_internal.pvp_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE arena_internal.pvp_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE arena_internal.pve_first_clear ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA arena_internal FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA arena_internal FROM PUBLIC, anon, authenticated;

-- Called only by the authenticated, owner-checked public transaction.
-- Retain one transaction result for safe retries and audit actual gold changes.
CREATE OR REPLACE FUNCTION arena_internal.finish_action(
  p_uid uuid,p_request uuid,p_action text,p_data jsonb,p_result jsonb,p_gold_before bigint
) RETURNS jsonb LANGUAGE plpgsql SET search_path TO pg_catalog,pg_temp AS $$
DECLARE v_gold bigint;
BEGIN
  SELECT COALESCE(gold,0) INTO v_gold FROM public.users WHERE user_id=p_uid;
  IF v_gold<>COALESCE(p_gold_before,0) THEN
    INSERT INTO arena_internal.gold_ledger(user_id,action,request_id,amount,balance)
    VALUES(p_uid,p_action,p_request,v_gold-COALESCE(p_gold_before,0),v_gold);
  END IF;
  IF p_request IS NOT NULL THEN
    INSERT INTO arena_internal.action_requests(user_id,request_id,action,payload_hash,result)
    VALUES(p_uid,p_request,p_action,md5((p_data-'request_id')::text),p_result);
    DELETE FROM arena_internal.action_requests WHERE user_id=p_uid AND created_at<now()-interval '7 days';
  END IF;
  RETURN p_result;
END $$;
REVOKE ALL ON FUNCTION arena_internal.finish_action(uuid,uuid,text,jsonb,jsonb,bigint) FROM PUBLIC, anon, authenticated;

-- Fixed encounter definition, not scaled to the player's ability.
CREATE OR REPLACE FUNCTION arena_internal.encounter(p_name text)
RETURNS TABLE(name text,kind int,family int,stage int,hp double precision,atk double precision,def double precision,spd double precision,reward int)
LANGUAGE sql IMMUTABLE SET search_path TO pg_catalog,pg_temp AS $$
  SELECT v.name,v.kind,v.family,v.stage,v.hp,v.atk,v.def,v.spd,v.reward FROM (VALUES
    ('wild','廢棄機械兵',0,3,2,80::double precision,16::double precision,12::double precision,12::double precision,10),
    ('stage2','失控巡邏機',2,4,3,115,23,18,18,20),
    ('stage3','重裝守衛',2,4,4,180,26,38,18,40),
    ('stage4','疾風獵手',1,5,5,175,38,22,42,60),
    ('stage5','深淵機甲',2,7,6,230,44,35,32,100),
    ('boss','終極機甲首領',1,7,6,300,52,40,35,120)
  ) AS v(id,name,kind,family,stage,hp,atk,def,spd,reward)
  WHERE v.id=p_name;
$$;
REVOKE ALL ON FUNCTION arena_internal.encounter(text) FROM PUBLIC, anon, authenticated;


CREATE OR REPLACE FUNCTION arena_internal.unit_stats(m public.monsters)
RETURNS TABLE(hp double precision,atk double precision,def double precision,spd double precision)
LANGUAGE sql IMMUTABLE SET search_path TO pg_catalog,pg_temp AS $$
 WITH role AS (SELECT CASE WHEN coalesce(m.life_stage,1)<3 OR coalesce(m.type,0)=0 THEN 0 ELSE (CASE m.family WHEN 1 THEN 0 WHEN 2 THEN 0 WHEN 4 THEN 2 WHEN 5 THEN 2 WHEN 6 THEN 4 WHEN 7 THEN 4 WHEN 3 THEN 6 WHEN 8 THEN 6 ELSE 0 END)+CASE WHEN m.type=1 THEN 1 ELSE 2 END END id),
 base AS (SELECT v.hp,v.atk,v.def,v.spd,CASE greatest(2,least(6,coalesce(m.life_stage,2))) WHEN 2 THEN .5 WHEN 3 THEN .625 WHEN 4 THEN .8 WHEN 5 THEN 1 ELSE 1.2 END scale FROM (VALUES (0,200,40,30,30),(1,187,42,27,30),(2,198,39,28,34),(3,216,34,37,25),(4,192,40,29,32),(5,197,39,30,30),(6,193,40,28,32),(7,207,37,30,33),(8,216,35,32,28)) v(id,hp,atk,def,spd) JOIN role r USING(id))
 SELECT floor(hp*scale*(1+coalesce(m.core_quality,0)/100.0)+coalesce(m.training_hp,0)*2+hp*scale*.05*((CASE WHEN m.chip_slot_1='chip_hp' THEN 1 ELSE 0 END)+(CASE WHEN m.chip_slot_2='chip_hp' THEN 1 ELSE 0 END))),
 floor(atk*scale*(1+coalesce(m.core_quality,0)/100.0)+coalesce(m.training_atk,0)*0.5+atk*scale*.05*((CASE WHEN m.chip_slot_1='chip_atk' THEN 1 ELSE 0 END)+(CASE WHEN m.chip_slot_2='chip_atk' THEN 1 ELSE 0 END))),
 floor(def*scale*(1+coalesce(m.core_quality,0)/100.0)+coalesce(m.training_def,0)*0.5+def*scale*.05*((CASE WHEN m.chip_slot_1='chip_def' THEN 1 ELSE 0 END)+(CASE WHEN m.chip_slot_2='chip_def' THEN 1 ELSE 0 END))),
 floor(spd*scale*(1+coalesce(m.core_quality,0)/100.0)+coalesce(m.training_spd,0)*0.5+spd*scale*.05*((CASE WHEN m.chip_slot_1='chip_spd' THEN 1 ELSE 0 END)+(CASE WHEN m.chip_slot_2='chip_spd' THEN 1 ELSE 0 END))) FROM base;
$$;
REVOKE ALL ON FUNCTION arena_internal.unit_stats(public.monsters) FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE FUNCTION arena_internal.refresh_unit(p_id uuid)
RETURNS void LANGUAGE sql SET search_path TO pg_catalog,pg_temp AS $$
 UPDATE public.monsters m SET combat_hp=f.hp,combat_atk=f.atk,combat_def=f.def,combat_spd=f.spd FROM public.monsters source CROSS JOIN LATERAL arena_internal.unit_stats(source) f WHERE m.monster_id=p_id AND source.monster_id=m.monster_id AND m.life_stage>=2;
$$;
REVOKE ALL ON FUNCTION arena_internal.refresh_unit(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION arena_internal.ensure_raid(p_day text)
RETURNS text LANGUAGE plpgsql SET search_path TO pg_catalog,pg_temp AS $$
DECLARE v_id text:='daily:'||p_day; v_hp int;
BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.raid_boss WHERE id=v_id) THEN
    SELECT greatest(3000,least(100000000,count(*)*1200))::int INTO v_hp FROM public.users u
      WHERE u.last_login_at>=now()-interval '7 days' AND EXISTS(SELECT 1 FROM public.monsters m WHERE m.user_id=u.user_id AND NOT coalesce(m.is_dead,false) AND m.life_stage>=2);
    INSERT INTO public.raid_boss(id,name,current_hp,max_hp,is_active)
    VALUES(v_id,'巨型機甲首領',v_hp,v_hp,true) ON CONFLICT(id) DO NOTHING;
  END IF;
  RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION arena_internal.ensure_raid(text) FROM PUBLIC, anon, authenticated;
CREATE INDEX IF NOT EXISTS arena_chat_channel_cursor ON public.messages(channel,timestamp DESC,message_id DESC);
CREATE INDEX IF NOT EXISTS arena_battle_user_created ON public.battle_records(user_id,created_at DESC);

-- Combat-stage budget: bounded effective values preserve stored legacy inventory and stats.
CREATE OR REPLACE FUNCTION arena_internal.fighter_stats(p_stage int,p_hp double precision,p_atk double precision,p_def double precision,p_spd double precision)
RETURNS TABLE(hp double precision,atk double precision,def double precision,spd double precision)
LANGUAGE sql IMMUTABLE SET search_path TO pg_catalog,pg_temp AS $$
 SELECT floor(least(v.hp*1.25,greatest(v.hp,coalesce(p_hp,0)))),
 floor(least(v.atk*1.25,greatest(v.atk,coalesce(p_atk,0)))),
 floor(least(v.def*1.25,greatest(v.def,coalesce(p_def,0)))),
 floor(least(v.spd*1.25,greatest(v.spd,coalesce(p_spd,0))))
 FROM (VALUES (2,100,20,15,15),(3,125,25,20,20),(4,160,32,25,25),(5,200,40,30,30),(6,240,48,36,36)) v(stage,hp,atk,def,spd)
 WHERE v.stage=greatest(2,least(6,coalesce(p_stage,2)));
$$;
REVOKE ALL ON FUNCTION arena_internal.fighter_stats(int,double precision,double precision,double precision,double precision) FROM PUBLIC, anon, authenticated;

-- Authoritative deterministic tactical PvE transcript, matching the browser practice rules.
-- The client may submit choices only; HP, damage, result and reward are computed here.
CREATE OR REPLACE FUNCTION arena_internal.boss_tactics(p_stage int,p_hp double precision,p_atk double precision,p_def double precision,p_spd double precision,p_moves jsonb)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE SET search_path TO pg_catalog,pg_temp AS $$
DECLARE f record; own_hp int; enemy_hp int:=300; en int:=0; phase text:='attack'; next_phase text; move text;
 incoming int; outgoing int; hit int; enemy_hit int; weakened boolean:=false; n int:=0;
 result text; events jsonb:='[]'::jsonb;
BEGIN
 IF jsonb_typeof(p_moves) IS DISTINCT FROM 'array' OR jsonb_array_length(p_moves) NOT BETWEEN 1 AND 20 THEN RAISE EXCEPTION '戰術指令數量錯誤'; END IF;
 SELECT p_hp AS hp,p_atk AS atk,p_def AS def,p_spd AS spd INTO f;
 own_hp:=f.hp; hit:=greatest(1,floor(f.atk*100/140)); enemy_hit:=greatest(1,floor(52*100/(100+f.def)));
 FOR move IN SELECT jsonb_array_elements_text(p_moves) LOOP
  IF result IS NOT NULL THEN RAISE EXCEPTION '戰鬥已結束，不可追加指令'; END IF;
  IF move IS NULL OR move NOT IN ('attack','guard','special','break') OR (move='special' AND en<2) OR (move='break' AND en<1) THEN RAISE EXCEPTION '無效戰術指令或能源不足'; END IF;
  n:=n+1; outgoing:=0; next_phase:=CASE phase WHEN 'attack' THEN 'charge' WHEN 'charge' THEN 'heavy' WHEN 'heavy' THEN 'attack' ELSE 'charge' END;
  CASE move
   WHEN 'attack' THEN outgoing:=hit; en:=least(5,en+1);
   WHEN 'special' THEN outgoing:=floor(hit*1.8); en:=en-2;
   WHEN 'break' THEN outgoing:=greatest(1,floor(hit*.7)); en:=en-1; IF phase='charge' THEN weakened:=true; END IF;
   ELSE NULL;
  END CASE;
  incoming:=CASE phase WHEN 'attack' THEN enemy_hit WHEN 'heavy' THEN floor(enemy_hit*1.8) ELSE 0 END;
  IF phase='heavy' AND weakened THEN incoming:=floor(incoming*.65); weakened:=false; END IF;
  IF move='guard' AND incoming>0 THEN
   incoming:=ceil(incoming*.5); en:=least(5,en+1); outgoing:=CASE WHEN phase='heavy' THEN hit ELSE floor(hit*.5) END;
   IF phase='heavy' THEN next_phase:='stunned'; END IF;
  END IF;
  IF move<>'guard' AND f.spd>=35 AND outgoing>=enemy_hp THEN incoming:=0; END IF;
  incoming:=least(own_hp,incoming); own_hp:=own_hp-incoming;
  IF own_hp=0 AND (move='guard' OR f.spd<35) THEN outgoing:=0; END IF;
  outgoing:=least(enemy_hp,outgoing); enemy_hp:=enemy_hp-outgoing;
  events:=events||jsonb_build_array(jsonb_build_object('move',move,'phase',phase,'damage',outgoing,'received',incoming,'ownHp',own_hp,'enemyHp',enemy_hp,'energy',en));
  phase:=next_phase;
  IF enemy_hp=0 AND own_hp>0 THEN result:='win'; ELSIF own_hp=0 OR n>=20 THEN result:='loss'; END IF;
 END LOOP;
 IF result IS NULL THEN RAISE EXCEPTION '戰鬥尚未結束'; END IF;
 RETURN jsonb_build_object('won',result='win','ownHp',own_hp,'enemyHp',enemy_hp,'ownMaxHp',f.hp,'enemyMaxHp',300,'events',events);
END $$;
REVOKE ALL ON FUNCTION arena_internal.boss_tactics(int,double precision,double precision,double precision,double precision,jsonb) FROM PUBLIC, anon, authenticated;
