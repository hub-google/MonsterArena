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
    ('wild','野生病毒怪獸',3,3,3,60::double precision,7::double precision,4::double precision,5::double precision,10),
    ('stage2','岩甲守衛',2,4,4,120,15,12,8,30),
    ('stage3','疾風獵手',1,5,4,200,27,16,25,60),
    ('stage4','深淵巨獸',3,6,5,340,45,32,30,100),
    ('boss','究極體王怪',1,7,6,550,70,48,50,200)
  ) AS v(id,name,kind,family,stage,hp,atk,def,spd,reward)
  WHERE v.id=p_name;
$$;
REVOKE ALL ON FUNCTION arena_internal.encounter(text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION arena_internal.ensure_raid(p_day text)
RETURNS text LANGUAGE plpgsql SET search_path TO pg_catalog,pg_temp AS $$
DECLARE v_id text:='daily:'||p_day;
BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.raid_boss WHERE id=v_id) THEN
    INSERT INTO public.raid_boss(id,name,current_hp,max_hp,is_active)
    VALUES(v_id,'數碼世界王',500000,500000,true) ON CONFLICT(id) DO NOTHING;
  END IF;
  RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION arena_internal.ensure_raid(text) FROM PUBLIC, anon, authenticated;
CREATE INDEX IF NOT EXISTS arena_chat_channel_cursor ON public.messages(channel,timestamp DESC,message_id DESC);
CREATE INDEX IF NOT EXISTS arena_battle_user_created ON public.battle_records(user_id,created_at DESC);
