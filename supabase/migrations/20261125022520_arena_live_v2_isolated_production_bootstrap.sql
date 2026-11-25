-- Arena V2 production namespace. One-time snapshot from actual production; never copies preview. Source edd6ffeb1fb1a770159757b0afe63eea9fc94b33

LOCK TABLE public.users, public.guilds, public.monsters, public.user_inventory, public.game_chip_reserves, public.friends, public.guild_members, public.guild_applications, public.daily_quests, public.battle_records, public.gifts, public.messages, public.raid_boss IN SHARE MODE;

CREATE TABLE public."arena_live_battle_records" (
  "user_id" uuid NOT NULL,
  "battle_id" text NOT NULL,
  "monster_id" uuid NOT NULL,
  "won" boolean NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public."arena_live_daily_quests" (
  "quest_id" text NOT NULL,
  "user_id" uuid,
  "date" text,
  "feed_count" integer DEFAULT 0,
  "train_count" integer DEFAULT 0,
  "battle_count" integer DEFAULT 0,
  "claimed" text[] DEFAULT '{}'::text[],
  "clean_count" integer DEFAULT 0 NOT NULL
);
CREATE TABLE public."arena_live_friends" (
  "friend_record_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid,
  "friend_uid" uuid,
  "friend_name" text,
  "created_at" timestamp with time zone DEFAULT now(),
  "status" integer DEFAULT 0
);
CREATE TABLE public."arena_live_game_chip_reserves" (
  "user_id" uuid NOT NULL,
  "item_id" text NOT NULL,
  "bonus" numeric NOT NULL,
  "quantity" integer DEFAULT 0 NOT NULL
);
CREATE TABLE public."arena_live_gifts" (
  "gift_id" text DEFAULT (gen_random_uuid())::text NOT NULL,
  "sender" text,
  "receiver" text,
  "date" text NOT NULL,
  "claimed" boolean DEFAULT false NOT NULL
);
CREATE TABLE public."arena_live_guild_applications" (
  "application_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "guild_id" uuid,
  "user_id" uuid,
  "created_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE public."arena_live_guild_members" (
  "member_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "guild_id" uuid,
  "user_id" uuid,
  "role" smallint DEFAULT 0,
  "contribution" integer DEFAULT 0
);
CREATE TABLE public."arena_live_guilds" (
  "guild_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "guild_name" text NOT NULL,
  "leader_id" uuid,
  "level" integer DEFAULT 1,
  "total_contribution" integer DEFAULT 0,
  "created_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE public."arena_live_messages" (
  "message_id" text DEFAULT (gen_random_uuid())::text NOT NULL,
  "channel" text NOT NULL,
  "user_id" text,
  "username" text,
  "text" text NOT NULL,
  "timestamp" timestamp with time zone DEFAULT now()
);
CREATE TABLE public."arena_live_monsters" (
  "monster_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid,
  "parent_1_id" uuid,
  "parent_2_id" uuid,
  "name" text,
  "generation" integer DEFAULT 1,
  "type" smallint DEFAULT 1,
  "family" smallint DEFAULT 1,
  "life_stage" smallint DEFAULT 1,
  "age_days" double precision DEFAULT 0,
  "fullness" double precision DEFAULT 100,
  "cleanliness" integer DEFAULT 100,
  "is_sick" boolean DEFAULT false,
  "sick_time_start" timestamp with time zone,
  "starve_time_start" timestamp with time zone,
  "dirty_time_start" timestamp with time zone,
  "last_healed_at" timestamp with time zone,
  "sleep_until" timestamp with time zone,
  "hunger_mistake_logged" boolean DEFAULT false,
  "sick_mistake_logged" boolean DEFAULT false,
  "poop_mistake_logged" boolean DEFAULT false,
  "sleep_poop_mistake_logged" boolean DEFAULT false,
  "neglect_count" integer DEFAULT 0,
  "train_count" integer DEFAULT 0,
  "is_dead" boolean DEFAULT false,
  "is_frozen" boolean DEFAULT false,
  "death_reason" text,
  "iv" double precision DEFAULT 0,
  "traits" text[] DEFAULT '{}'::text[],
  "gene_hp" double precision DEFAULT 0,
  "gene_atk" double precision DEFAULT 0,
  "gene_def" double precision DEFAULT 0,
  "gene_spd" double precision DEFAULT 0,
  "combat_hp" double precision DEFAULT 0,
  "combat_atk" double precision DEFAULT 0,
  "combat_def" double precision DEFAULT 0,
  "combat_spd" double precision DEFAULT 0,
  "chip_slot_1" text,
  "chip_slot_1_val" double precision DEFAULT 0,
  "chip_slot_2" text,
  "chip_slot_2_val" double precision DEFAULT 0,
  "battles" integer DEFAULT 0,
  "wins" integer DEFAULT 0,
  "is_locked" boolean DEFAULT false,
  "created_at" timestamp with time zone DEFAULT now(),
  "last_updated_at" timestamp with time zone DEFAULT now(),
  "idle_until" timestamp with time zone,
  "idle_hours" double precision,
  "awake_until" timestamp with time zone,
  "is_rescue" boolean DEFAULT false NOT NULL
);
CREATE TABLE public."arena_live_raid_boss" (
  "id" text DEFAULT (gen_random_uuid())::text NOT NULL,
  "name" text NOT NULL,
  "current_hp" integer NOT NULL,
  "max_hp" integer NOT NULL,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE public."arena_live_user_inventory" (
  "inventory_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid,
  "item_type" smallint DEFAULT 1,
  "item_id" text NOT NULL,
  "quantity" integer DEFAULT 0
);
CREATE TABLE public."arena_live_users" (
  "user_id" uuid NOT NULL,
  "username" text NOT NULL,
  "email" text NOT NULL,
  "gold" integer DEFAULT 500,
  "premium_gems" integer DEFAULT 0,
  "stamina" integer DEFAULT 100,
  "max_stamina" integer DEFAULT 100,
  "last_login_at" timestamp with time zone DEFAULT now(),
  "stamina_updated_at" timestamp with time zone DEFAULT now(),
  "created_at" timestamp with time zone DEFAULT now(),
  "last_message_at" timestamp with time zone
);
ALTER TABLE public."arena_live_battle_records" ADD CONSTRAINT "arena_live_battle_records_pkey" PRIMARY KEY (user_id, battle_id);
ALTER TABLE public."arena_live_daily_quests" ADD CONSTRAINT "arena_live_daily_quests_pkey" PRIMARY KEY (quest_id);
ALTER TABLE public."arena_live_friends" ADD CONSTRAINT "arena_live_friends_pkey" PRIMARY KEY (friend_record_id);
ALTER TABLE public."arena_live_friends" ADD CONSTRAINT "arena_live_friends_user_id_friend_uid_key" UNIQUE (user_id, friend_uid);
ALTER TABLE public."arena_live_game_chip_reserves" ADD CONSTRAINT "arena_live_game_chip_reserves_bonus_check" CHECK (((bonus > (5)::numeric) AND (bonus <= (1000000)::numeric)));
ALTER TABLE public."arena_live_game_chip_reserves" ADD CONSTRAINT "arena_live_game_chip_reserves_item_id_check" CHECK ((item_id = ANY (ARRAY['chip_atk'::text, 'chip_def'::text, 'chip_hp'::text, 'chip_spd'::text])));
ALTER TABLE public."arena_live_game_chip_reserves" ADD CONSTRAINT "arena_live_game_chip_reserves_pkey" PRIMARY KEY (user_id, item_id, bonus);
ALTER TABLE public."arena_live_game_chip_reserves" ADD CONSTRAINT "arena_live_game_chip_reserves_quantity_check" CHECK ((quantity >= 0));
ALTER TABLE public."arena_live_gifts" ADD CONSTRAINT "arena_live_gifts_pkey" PRIMARY KEY (gift_id);
ALTER TABLE public."arena_live_guild_applications" ADD CONSTRAINT "arena_live_guild_applications_guild_id_user_id_key" UNIQUE (guild_id, user_id);
ALTER TABLE public."arena_live_guild_applications" ADD CONSTRAINT "arena_live_guild_applications_pkey" PRIMARY KEY (application_id);
ALTER TABLE public."arena_live_guild_members" ADD CONSTRAINT "arena_live_guild_members_guild_id_user_id_key" UNIQUE (guild_id, user_id);
ALTER TABLE public."arena_live_guild_members" ADD CONSTRAINT "arena_live_guild_members_pkey" PRIMARY KEY (member_id);
ALTER TABLE public."arena_live_guilds" ADD CONSTRAINT "arena_live_guilds_guild_name_key" UNIQUE (guild_name);
ALTER TABLE public."arena_live_guilds" ADD CONSTRAINT "arena_live_guilds_pkey" PRIMARY KEY (guild_id);
ALTER TABLE public."arena_live_messages" ADD CONSTRAINT "arena_live_messages_pkey" PRIMARY KEY (message_id);
ALTER TABLE public."arena_live_monsters" ADD CONSTRAINT "arena_live_monsters_pkey" PRIMARY KEY (monster_id);
ALTER TABLE public."arena_live_raid_boss" ADD CONSTRAINT "arena_live_raid_boss_pkey" PRIMARY KEY (id);
ALTER TABLE public."arena_live_user_inventory" ADD CONSTRAINT "arena_live_user_inventory_pkey" PRIMARY KEY (inventory_id);
ALTER TABLE public."arena_live_user_inventory" ADD CONSTRAINT "arena_live_user_inventory_user_id_item_id_key" UNIQUE (user_id, item_id);
ALTER TABLE public."arena_live_users" ADD CONSTRAINT "arena_live_users_email_key" UNIQUE (email);
ALTER TABLE public."arena_live_users" ADD CONSTRAINT "arena_live_users_pkey" PRIMARY KEY (user_id);
ALTER TABLE public."arena_live_users" ADD CONSTRAINT "arena_live_users_username_key" UNIQUE (username);
ALTER TABLE public."arena_live_battle_records" ADD CONSTRAINT "arena_live_battle_records_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.arena_live_users(user_id) ON DELETE CASCADE;
ALTER TABLE public."arena_live_daily_quests" ADD CONSTRAINT "arena_live_daily_quests_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.arena_live_users(user_id) ON DELETE CASCADE;
ALTER TABLE public."arena_live_friends" ADD CONSTRAINT "arena_live_friends_friend_uid_fkey" FOREIGN KEY (friend_uid) REFERENCES public.arena_live_users(user_id) ON DELETE CASCADE;
ALTER TABLE public."arena_live_friends" ADD CONSTRAINT "arena_live_friends_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.arena_live_users(user_id) ON DELETE CASCADE;
ALTER TABLE public."arena_live_game_chip_reserves" ADD CONSTRAINT "arena_live_game_chip_reserves_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.arena_live_users(user_id) ON DELETE CASCADE;
ALTER TABLE public."arena_live_guild_applications" ADD CONSTRAINT "arena_live_guild_applications_guild_id_fkey" FOREIGN KEY (guild_id) REFERENCES public.arena_live_guilds(guild_id) ON DELETE CASCADE;
ALTER TABLE public."arena_live_guild_applications" ADD CONSTRAINT "arena_live_guild_applications_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.arena_live_users(user_id) ON DELETE CASCADE;
ALTER TABLE public."arena_live_guild_members" ADD CONSTRAINT "arena_live_guild_members_guild_id_fkey" FOREIGN KEY (guild_id) REFERENCES public.arena_live_guilds(guild_id) ON DELETE CASCADE;
ALTER TABLE public."arena_live_guild_members" ADD CONSTRAINT "arena_live_guild_members_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.arena_live_users(user_id) ON DELETE CASCADE;
ALTER TABLE public."arena_live_guilds" ADD CONSTRAINT "arena_live_guilds_leader_id_fkey" FOREIGN KEY (leader_id) REFERENCES public.arena_live_users(user_id) ON DELETE SET NULL;
ALTER TABLE public."arena_live_monsters" ADD CONSTRAINT "arena_live_monsters_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.arena_live_users(user_id) ON DELETE CASCADE;
ALTER TABLE public."arena_live_user_inventory" ADD CONSTRAINT "arena_live_user_inventory_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.arena_live_users(user_id) ON DELETE CASCADE;
ALTER TABLE public."arena_live_users" ADD CONSTRAINT "arena_live_users_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


ALTER TABLE public.arena_live_monsters ADD COLUMN repair_until timestamptz, ADD COLUMN skin_id text;

ALTER TABLE public.arena_live_users ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.arena_live_users FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.arena_live_users TO authenticated;
CREATE POLICY arena_live_read ON public.arena_live_users FOR SELECT TO authenticated USING (user_id=(select auth.uid()));
ALTER TABLE public.arena_live_guilds ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.arena_live_guilds FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.arena_live_guilds TO authenticated;
CREATE POLICY arena_live_read ON public.arena_live_guilds FOR SELECT TO authenticated USING (true);
ALTER TABLE public.arena_live_monsters ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.arena_live_monsters FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.arena_live_monsters TO authenticated;
CREATE POLICY arena_live_read ON public.arena_live_monsters FOR SELECT TO authenticated USING (user_id=(select auth.uid()));
ALTER TABLE public.arena_live_user_inventory ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.arena_live_user_inventory FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.arena_live_user_inventory TO authenticated;
CREATE POLICY arena_live_read ON public.arena_live_user_inventory FOR SELECT TO authenticated USING (user_id=(select auth.uid()));
ALTER TABLE public.arena_live_game_chip_reserves ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.arena_live_game_chip_reserves FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.arena_live_game_chip_reserves TO authenticated;
CREATE POLICY arena_live_read ON public.arena_live_game_chip_reserves FOR SELECT TO authenticated USING (user_id=(select auth.uid()));
ALTER TABLE public.arena_live_friends ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.arena_live_friends FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.arena_live_friends TO authenticated;
CREATE POLICY arena_live_read ON public.arena_live_friends FOR SELECT TO authenticated USING (user_id=(select auth.uid()) OR friend_uid=(select auth.uid()));
ALTER TABLE public.arena_live_guild_members ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.arena_live_guild_members FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.arena_live_guild_members TO authenticated;
CREATE POLICY arena_live_read ON public.arena_live_guild_members FOR SELECT TO authenticated USING (user_id=(select auth.uid()) OR exists(select 1 from public.arena_live_guilds g where g.guild_id=arena_live_guild_members.guild_id and g.leader_id=(select auth.uid())));
ALTER TABLE public.arena_live_guild_applications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.arena_live_guild_applications FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.arena_live_guild_applications TO authenticated;
CREATE POLICY arena_live_read ON public.arena_live_guild_applications FOR SELECT TO authenticated USING (user_id=(select auth.uid()) OR exists(select 1 from public.arena_live_guilds g where g.guild_id=arena_live_guild_applications.guild_id and g.leader_id=(select auth.uid())));
ALTER TABLE public.arena_live_daily_quests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.arena_live_daily_quests FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.arena_live_daily_quests TO authenticated;
CREATE POLICY arena_live_read ON public.arena_live_daily_quests FOR SELECT TO authenticated USING (user_id=(select auth.uid()));
ALTER TABLE public.arena_live_battle_records ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.arena_live_battle_records FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.arena_live_battle_records TO authenticated;
CREATE POLICY arena_live_read ON public.arena_live_battle_records FOR SELECT TO authenticated USING (user_id=(select auth.uid()));
ALTER TABLE public.arena_live_gifts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.arena_live_gifts FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.arena_live_gifts TO authenticated;
CREATE POLICY arena_live_read ON public.arena_live_gifts FOR SELECT TO authenticated USING (sender=(select auth.uid())::text OR receiver=(select auth.uid())::text);
ALTER TABLE public.arena_live_messages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.arena_live_messages FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.arena_live_messages TO authenticated;
CREATE POLICY arena_live_read ON public.arena_live_messages FOR SELECT TO authenticated USING (true);
ALTER TABLE public.arena_live_raid_boss ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.arena_live_raid_boss FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.arena_live_raid_boss TO authenticated;
CREATE POLICY arena_live_read ON public.arena_live_raid_boss FOR SELECT TO authenticated USING (true);

DO $snapshot$ DECLARE src text; dst text; cols text; old_count bigint; new_count bigint; BEGIN
FOREACH src IN ARRAY ARRAY['users','guilds','monsters','user_inventory','game_chip_reserves','friends','guild_members','guild_applications','daily_quests','battle_records','gifts','messages','raid_boss'] LOOP
dst:='arena_live_'||src;
SELECT string_agg(format('%I',c.column_name),',' ORDER BY c.ordinal_position) INTO cols FROM information_schema.columns c WHERE c.table_schema='public' AND c.table_name=dst AND EXISTS(SELECT 1 FROM information_schema.columns s WHERE s.table_schema='public' AND s.table_name=src AND s.column_name=c.column_name);
IF cols IS NULL THEN RAISE EXCEPTION 'Missing snapshot columns for %',src; END IF;
EXECUTE format('INSERT INTO public.%I (%s) SELECT %s FROM public.%I',dst,cols,cols,src);
EXECUTE format('SELECT count(*) FROM public.%I',src) INTO old_count;
EXECUTE format('SELECT count(*) FROM public.%I',dst) INTO new_count;
IF old_count<>new_count THEN RAISE EXCEPTION 'Snapshot count mismatch for %',src; END IF;
END LOOP; END $snapshot$;

-- Arena units never die. Keep the legacy column for RPC/client compatibility only.
-- Restore historical dead rows without changing their stats or ownership.
UPDATE public.arena_live_monsters SET is_dead=false WHERE is_dead IS DISTINCT FROM false;
DO $immortal$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='arena_monsters_never_die' AND conrelid='public.arena_live_monsters'::regclass) THEN
    ALTER TABLE public.arena_live_monsters ADD CONSTRAINT arena_monsters_never_die CHECK (is_dead IS FALSE);
  END IF;
END $immortal$;
ALTER TABLE public.arena_live_monsters ADD COLUMN IF NOT EXISTS repair_until timestamptz;
ALTER TABLE public.arena_live_monsters ADD COLUMN IF NOT EXISTS skin_id text;
ALTER TABLE public.arena_live_monsters ADD COLUMN IF NOT EXISTS training_hp int NOT NULL DEFAULT 0 CHECK(training_hp BETWEEN 0 AND 30);
ALTER TABLE public.arena_live_monsters ADD COLUMN IF NOT EXISTS training_atk int NOT NULL DEFAULT 0 CHECK(training_atk BETWEEN 0 AND 30);
ALTER TABLE public.arena_live_monsters ADD COLUMN IF NOT EXISTS training_def int NOT NULL DEFAULT 0 CHECK(training_def BETWEEN 0 AND 30);
ALTER TABLE public.arena_live_monsters ADD COLUMN IF NOT EXISTS training_spd int NOT NULL DEFAULT 0 CHECK(training_spd BETWEEN 0 AND 30);
ALTER TABLE public.arena_live_monsters ADD COLUMN IF NOT EXISTS training_unspent int NOT NULL DEFAULT 0 CHECK(training_unspent BETWEEN 0 AND 60);
DO $pool$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='arena_training_pool_budget' AND conrelid='public.arena_live_monsters'::regclass) THEN ALTER TABLE public.arena_live_monsters ADD CONSTRAINT arena_training_pool_budget CHECK(training_hp+training_atk+training_def+training_spd+training_unspent<=60); END IF; END $pool$;
ALTER TABLE public.arena_live_monsters ADD COLUMN IF NOT EXISTS core_quality int NOT NULL DEFAULT 0 CHECK(core_quality BETWEEN 0 AND 5);
ALTER TABLE public.arena_live_monsters ADD COLUMN IF NOT EXISTS legacy_combat jsonb;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='arena_training_budget' AND conrelid='public.arena_live_monsters'::regclass) THEN ALTER TABLE public.arena_live_monsters ADD CONSTRAINT arena_training_budget CHECK(training_hp+training_atk+training_def+training_spd<=60); END IF; END $$;
UPDATE public.arena_live_monsters SET legacy_combat=jsonb_build_object('hp',combat_hp,'atk',combat_atk,'def',combat_def,'spd',combat_spd,'train_count',train_count),
 training_hp=least(15,greatest(0,(coalesce(train_count,0)+3)/4)),
 training_atk=least(15,greatest(0,(coalesce(train_count,0)+2)/4)),
 training_def=least(15,greatest(0,(coalesce(train_count,0)+1)/4)),
 training_spd=least(15,greatest(0,coalesce(train_count,0)/4))
 WHERE legacy_combat IS NULL AND coalesce(train_count,0)>0 AND training_hp+training_atk+training_def+training_spd=0;
 UPDATE public.arena_live_monsters SET legacy_combat=jsonb_build_object('hp',combat_hp,'atk',combat_atk,'def',combat_def,'spd',combat_spd,'train_count',train_count) WHERE legacy_combat IS NULL;
-- Arena next game rules. Private tables are never exposed via PostgREST.
-- Compose before canonical RPCs; deploy only through a reviewed, isolated migration.
CREATE SCHEMA IF NOT EXISTS arena_live_internal;
REVOKE ALL ON SCHEMA arena_live_internal FROM PUBLIC, anon, authenticated;
CREATE TABLE IF NOT EXISTS arena_live_internal.action_requests (
  user_id uuid NOT NULL REFERENCES public.arena_live_users(user_id) ON DELETE CASCADE,
  request_id uuid NOT NULL, action text NOT NULL, payload_hash text NOT NULL,
  result jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id,request_id)
);
CREATE INDEX IF NOT EXISTS arena_live_action_requests_expiry ON arena_live_internal.action_requests(user_id,created_at);
CREATE TABLE IF NOT EXISTS arena_live_internal.gold_ledger (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.arena_live_users(user_id) ON DELETE CASCADE,
  action text NOT NULL, request_id uuid, amount bigint NOT NULL,
  balance bigint NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS arena_live_gold_ledger_user_time ON arena_live_internal.gold_ledger(user_id,created_at DESC);
CREATE TABLE IF NOT EXISTS arena_live_internal.raid_contributions (
  boss_id text NOT NULL REFERENCES public.arena_live_raid_boss(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.arena_live_users(user_id) ON DELETE CASCADE,
  damage bigint NOT NULL CHECK(damage>=0), claimed_at timestamptz,
  PRIMARY KEY(boss_id,user_id)
);
ALTER TABLE arena_live_internal.raid_contributions ADD COLUMN IF NOT EXISTS attempts int NOT NULL DEFAULT 0 CHECK(attempts>=0);
ALTER TABLE arena_live_internal.raid_contributions ADD COLUMN IF NOT EXISTS support bigint NOT NULL DEFAULT 0 CHECK(support>=0);
CREATE INDEX IF NOT EXISTS arena_live_raid_contributions_user ON arena_live_internal.raid_contributions(user_id,boss_id);
CREATE TABLE IF NOT EXISTS arena_live_internal.pvp_defenders (
  user_id uuid PRIMARY KEY REFERENCES public.arena_live_users(user_id) ON DELETE CASCADE,
  monster_id uuid NOT NULL, monster_name text NOT NULL,
  family smallint NOT NULL, stage smallint NOT NULL, type smallint NOT NULL,
  hp double precision NOT NULL CHECK(hp>=1),
  atk double precision NOT NULL CHECK(atk>=1),
  def double precision NOT NULL CHECK(def>=0),
  spd double precision NOT NULL CHECK(spd>=1),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS arena_live_internal.pvp_results (
  attacker_id uuid NOT NULL REFERENCES public.arena_live_users(user_id) ON DELETE CASCADE,
  defender_id uuid NOT NULL REFERENCES public.arena_live_users(user_id) ON DELETE CASCADE,
  battle_day date NOT NULL, battle_id text NOT NULL, won boolean NOT NULL,
  PRIMARY KEY(attacker_id,defender_id,battle_day), CHECK(attacker_id<>defender_id)
);
CREATE INDEX IF NOT EXISTS arena_live_pvp_daily ON arena_live_internal.pvp_results(attacker_id,battle_day);
CREATE TABLE IF NOT EXISTS arena_live_internal.pvp_scores (
  season text NOT NULL, user_id uuid NOT NULL REFERENCES public.arena_live_users(user_id) ON DELETE CASCADE,
  points int NOT NULL DEFAULT 0 CHECK(points>=0), wins int NOT NULL DEFAULT 0,
  losses int NOT NULL DEFAULT 0, PRIMARY KEY(season,user_id)
);
CREATE INDEX IF NOT EXISTS arena_live_pvp_rank ON arena_live_internal.pvp_scores(season,points DESC,user_id);
CREATE TABLE IF NOT EXISTS arena_live_internal.pve_first_clear (
  user_id uuid NOT NULL REFERENCES public.arena_live_users(user_id) ON DELETE CASCADE,
  clear_day date NOT NULL, encounter text NOT NULL,
  PRIMARY KEY(user_id,clear_day,encounter)
);
ALTER TABLE arena_live_internal.action_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE arena_live_internal.gold_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE arena_live_internal.raid_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE arena_live_internal.pvp_defenders ENABLE ROW LEVEL SECURITY;
ALTER TABLE arena_live_internal.pvp_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE arena_live_internal.pvp_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE arena_live_internal.pve_first_clear ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA arena_live_internal FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA arena_live_internal FROM PUBLIC, anon, authenticated;

-- Called only by the authenticated, owner-checked public transaction.
-- Retain one transaction result for safe retries and audit actual gold changes.
CREATE OR REPLACE FUNCTION arena_live_internal.finish_action(
  p_uid uuid,p_request uuid,p_action text,p_data jsonb,p_result jsonb,p_gold_before bigint
) RETURNS jsonb LANGUAGE plpgsql SET search_path TO pg_catalog,pg_temp AS $$
DECLARE v_gold bigint;
BEGIN
  SELECT COALESCE(gold,0) INTO v_gold FROM public.arena_live_users WHERE user_id=p_uid;
  IF v_gold<>COALESCE(p_gold_before,0) THEN
    INSERT INTO arena_live_internal.gold_ledger(user_id,action,request_id,amount,balance)
    VALUES(p_uid,p_action,p_request,v_gold-COALESCE(p_gold_before,0),v_gold);
  END IF;
  IF p_request IS NOT NULL THEN
    INSERT INTO arena_live_internal.action_requests(user_id,request_id,action,payload_hash,result)
    VALUES(p_uid,p_request,p_action,md5((p_data-'request_id')::text),p_result);
    DELETE FROM arena_live_internal.action_requests WHERE user_id=p_uid AND created_at<now()-interval '7 days';
    -- Idle-account receipts cannot accumulate forever; clean a bounded batch
    -- occasionally. SKIP LOCKED avoids blocking unrelated player transactions.
    IF random()<0.02 THEN
      DELETE FROM arena_live_internal.action_requests r USING (
        SELECT user_id,request_id FROM arena_live_internal.action_requests
        WHERE created_at<now()-interval '7 days' ORDER BY created_at LIMIT 200 FOR UPDATE SKIP LOCKED
      ) expired WHERE r.user_id=expired.user_id AND r.request_id=expired.request_id;
    END IF;
  END IF;
  RETURN p_result;
END $$;
REVOKE ALL ON FUNCTION arena_live_internal.finish_action(uuid,uuid,text,jsonb,jsonb,bigint) FROM PUBLIC, anon, authenticated;

-- Fixed encounter definition, not scaled to the player's ability.
CREATE OR REPLACE FUNCTION arena_live_internal.encounter(p_name text)
RETURNS TABLE(name text,kind int,family int,stage int,hp double precision,atk double precision,def double precision,spd double precision,reward int)
LANGUAGE sql IMMUTABLE SET search_path TO pg_catalog,pg_temp AS $$
  SELECT v.name,v.kind,v.family,v.stage,v.hp,v.atk,v.def,v.spd,v.reward FROM (VALUES
    ('wild','廢棄機械兵',0,3,2,115::double precision,16::double precision,12::double precision,12::double precision,10),
    ('stage2','失控巡邏機',2,4,3,117,23,18,18,20),
    ('stage3','重裝守衛',2,4,4,156,26,38,18,40),
    ('stage4','疾風獵手',1,7,5,197,38,22,42,60),
    ('stage5','深淵機甲',2,7,6,226,44,35,32,100),
    ('boss','終極機甲首領',1,7,6,300,52,40,35,120)
  ) AS v(id,name,kind,family,stage,hp,atk,def,spd,reward)
  WHERE v.id=p_name;
$$;
REVOKE ALL ON FUNCTION arena_live_internal.encounter(text) FROM PUBLIC, anon, authenticated;


-- Factions form a directed cycle; undeveloped units have no combat affinity.
CREATE OR REPLACE FUNCTION arena_live_internal.role_id(p_stage int,p_family int,p_type int) RETURNS int LANGUAGE sql IMMUTABLE SET search_path TO pg_catalog,pg_temp AS $$
 SELECT CASE WHEN coalesce(p_stage,1)<3 OR coalesce(p_type,0)=0 THEN 0 ELSE (CASE p_family WHEN 1 THEN 0 WHEN 2 THEN 0 WHEN 4 THEN 2 WHEN 5 THEN 2 WHEN 6 THEN 4 WHEN 7 THEN 4 WHEN 3 THEN 6 WHEN 8 THEN 6 ELSE 0 END)+CASE WHEN p_type=1 THEN 1 ELSE 2 END END;
$$;
REVOKE ALL ON FUNCTION arena_live_internal.role_id(int,int,int) FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE FUNCTION arena_live_internal.base_profiles(p_stage int)
RETURNS TABLE(role int,hp int,atk int,def int,spd int) LANGUAGE sql IMMUTABLE SET search_path TO pg_catalog,pg_temp AS $$
 SELECT v.role,v.hp,v.atk,v.def,v.spd FROM (VALUES
 (2,0,100,20,15,15),
 (3,0,125,25,20,20),
 (3,1,115,26,15,18),
 (3,2,123,24,17,21),
 (3,3,133,21,24,15),
 (3,4,120,25,18,20),
 (3,5,122,24,18,17),
 (3,6,119,25,16,21),
 (3,7,127,23,18,21),
 (3,8,137,21,21,19),
 (4,0,160,32,25,25),
 (4,1,151,33,21,23),
 (4,2,157,31,22,28),
 (4,3,170,27,29,20),
 (4,4,152,32,23,26),
 (4,5,156,31,24,24),
 (4,6,154,32,21,25),
 (4,7,165,29,25,26),
 (4,8,172,28,25,23),
 (5,0,200,40,30,30),
 (5,1,187,42,27,30),
 (5,2,198,39,28,34),
 (5,3,213,34,38,25),
 (5,4,193,40,29,33),
 (5,5,196,39,30,30),
 (5,6,194,40,27,32),
 (5,7,206,37,30,33),
 (5,8,217,35,32,28),
 (6,0,240,48,36,36),
 (6,1,226,50,31,35),
 (6,2,235,47,33,39),
 (6,3,253,40,44,30),
 (6,4,231,48,34,38),
 (6,5,235,46,36,38),
 (6,6,233,48,32,38),
 (6,7,246,44,36,39),
 (6,8,254,42,38,34)
 ) v(stage,role,hp,atk,def,spd) WHERE v.stage=greatest(2,least(6,coalesce(p_stage,2)));
$$;
REVOKE ALL ON FUNCTION arena_live_internal.base_profiles(int) FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE FUNCTION arena_live_internal.unit_stats(m public.arena_live_monsters)
RETURNS TABLE(hp double precision,atk double precision,def double precision,spd double precision)
LANGUAGE sql IMMUTABLE SET search_path TO pg_catalog,pg_temp AS $$
 SELECT floor(b.hp*(1+coalesce(m.core_quality,0)/100.0)+coalesce(m.training_hp,0)*2+b.hp*.05*((CASE WHEN m.chip_slot_1='chip_hp' THEN 1 ELSE 0 END)+(CASE WHEN m.chip_slot_2='chip_hp' THEN 1 ELSE 0 END))),
 floor(b.atk*(1+coalesce(m.core_quality,0)/100.0)+coalesce(m.training_atk,0)*0.5+b.atk*.05*((CASE WHEN m.chip_slot_1='chip_atk' THEN 1 ELSE 0 END)+(CASE WHEN m.chip_slot_2='chip_atk' THEN 1 ELSE 0 END))),
 floor(b.def*(1+coalesce(m.core_quality,0)/100.0)+coalesce(m.training_def,0)*0.5+b.def*.05*((CASE WHEN m.chip_slot_1='chip_def' THEN 1 ELSE 0 END)+(CASE WHEN m.chip_slot_2='chip_def' THEN 1 ELSE 0 END))),
 floor(b.spd*(1+coalesce(m.core_quality,0)/100.0)+coalesce(m.training_spd,0)*0.5+b.spd*.05*((CASE WHEN m.chip_slot_1='chip_spd' THEN 1 ELSE 0 END)+(CASE WHEN m.chip_slot_2='chip_spd' THEN 1 ELSE 0 END)))
 FROM arena_live_internal.base_profiles(m.life_stage) b WHERE b.role=arena_live_internal.role_id(m.life_stage,m.family,m.type);
$$;
REVOKE ALL ON FUNCTION arena_live_internal.unit_stats(public.arena_live_monsters) FROM PUBLIC, anon, authenticated;
-- All automatic matches use this engine. Advantage increases damage rather than predetermining a winner.
CREATE OR REPLACE FUNCTION arena_live_internal.duel_damage(p_atk double precision,p_def double precision,p_role int,p_other int,p_round int,p_roll double precision)
RETURNS int LANGUAGE sql IMMUTABLE SET search_path TO pg_catalog,pg_temp AS $$
 SELECT greatest(1,floor(
 p_atk*(CASE WHEN p_other=7 AND p_round%3=0 THEN 1 WHEN p_role=1 AND p_round%3=1 THEN 1.12 WHEN p_role=2 AND p_round%2=0 THEN 1.10 WHEN p_role=4 AND p_round%3=0 THEN 1.10 WHEN p_role=5 THEN 1.04 WHEN p_role=6 AND p_round%3=0 THEN 1.16 ELSE 1 END)
 *(CASE WHEN p_role=5 THEN .88+p_roll*.24 ELSE .85+p_roll*.30 END)
 *100/(100+p_def*(CASE WHEN p_role=4 AND p_round%3=0 AND p_other<>7 THEN .85 ELSE 1 END))
 *(CASE WHEN p_role>0 AND p_other>0 AND (p_other-1)/2=((p_role-1)/2+1)%4 THEN 1.045 ELSE 1 END)
 *(CASE WHEN p_other=3 THEN .95 WHEN p_other=7 AND p_round%3=0 THEN .93 ELSE 1 END)
 ))::int;
$$;
REVOKE ALL ON FUNCTION arena_live_internal.duel_damage(double precision,double precision,int,int,int,double precision) FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE FUNCTION arena_live_internal.auto_battle(a double precision[],b double precision[],role_a int,role_b int,log_events boolean DEFAULT true)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SET search_path TO pg_catalog,pg_temp AS $$
DECLARE h double precision[]:=ARRAY[a[1],b[1]]; mx double precision[]:=h; atk double precision[]:=ARRAY[a[2],b[2]]; def double precision[]:=ARRAY[a[3],b[3]];
 roles int[]:=ARRAY[role_a,role_b]; first int; attacker int; defender int; dmg int; r int; rounds int:=0; events jsonb:='[]'; won boolean;
BEGIN
 FOR r IN 1..25 LOOP
  rounds:=r;
  first:=CASE WHEN random()<.5+.4*(a[4]-b[4])/greatest(1,a[4]+b[4]) THEN 1 ELSE 2 END;
  FOR step IN 1..2 LOOP
   attacker:=CASE WHEN step=1 THEN first ELSE 3-first END; defender:=3-attacker;
   dmg:=least(h[defender],arena_live_internal.duel_damage(atk[attacker],def[defender],roles[attacker],roles[defender],r,random()))::int;
   h[defender]:=greatest(0,h[defender]-dmg);
   IF roles[attacker]=8 AND r%3=0 AND roles[defender]<>7 THEN h[attacker]:=least(mx[attacker],h[attacker]+greatest(1,floor(mx[attacker]*.025))); END IF;
   IF log_events THEN events:=events||jsonb_build_array(jsonb_build_object('attacker',CASE WHEN attacker=1 THEN 'A' ELSE 'B' END,'damage',dmg,'ownHp',h[1],'enemyHp',h[2])); END IF;
   EXIT WHEN h[1]<=0 OR h[2]<=0;
  END LOOP;
  EXIT WHEN h[1]<=0 OR h[2]<=0;
 END LOOP;
 won:=CASE WHEN h[2]<=0 THEN true WHEN h[1]<=0 THEN false WHEN h[1]/mx[1]=h[2]/mx[2] THEN random()<.5 ELSE h[1]/mx[1]>h[2]/mx[2] END;
 RETURN jsonb_build_object('won',won,'ownHp',h[1],'enemyHp',h[2],'rounds',rounds,'events',events);
END $$;
REVOKE ALL ON FUNCTION arena_live_internal.auto_battle(double precision[],double precision[],int,int,boolean) FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE FUNCTION arena_live_internal.refresh_unit(p_id uuid)
RETURNS void LANGUAGE sql SET search_path TO pg_catalog,pg_temp AS $$
 UPDATE public.arena_live_monsters m SET combat_hp=f.hp,combat_atk=f.atk,combat_def=f.def,combat_spd=f.spd FROM public.arena_live_monsters source CROSS JOIN LATERAL arena_live_internal.unit_stats(source) f WHERE m.monster_id=p_id AND source.monster_id=m.monster_id AND m.life_stage>=2 AND (m.combat_hp,m.combat_atk,m.combat_def,m.combat_spd) IS DISTINCT FROM (f.hp,f.atk,f.def,f.spd);
$$;
REVOKE ALL ON FUNCTION arena_live_internal.refresh_unit(uuid) FROM PUBLIC, anon, authenticated;

-- Co-op: each assault has ten rounds, phase-appropriate tactics and bounded support.
CREATE OR REPLACE FUNCTION arena_live_internal.power_rating(hp double precision,atk double precision,def double precision,spd double precision)
RETURNS double precision LANGUAGE sql IMMUTABLE SET search_path TO pg_catalog,pg_temp AS $$
 SELECT hp/5+atk+def*.5+spd*.3;
$$;
REVOKE ALL ON FUNCTION arena_live_internal.power_rating(double precision,double precision,double precision,double precision) FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE FUNCTION arena_live_internal.raid_attempt(p_hp double precision,p_atk double precision,p_def double precision,p_spd double precision,p_phase int,p_strategy text)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE SET search_path TO pg_catalog,pg_temp AS $$
DECLARE own_hp double precision:=p_hp; hit int; incoming int; dealt int:=0; support int:=0; turns int:=0; raw int; factor numeric;
BEGIN
 IF p_strategy IS NULL OR p_strategy NOT IN ('assault','defend','break') THEN RAISE EXCEPTION '無效共鬥策略'; END IF;
 FOR i IN 1..10 LOOP
  IF own_hp<=0 THEN EXIT; END IF;
  turns:=turns+1;
  raw:=greatest(1,floor((CASE p_phase WHEN 1 THEN 12 WHEN 2 THEN 15 ELSE 18 END)*100/(100+p_def)*(CASE WHEN i%3=0 THEN 1.8 ELSE 1 END)));
  incoming:=raw;
  factor:=CASE p_strategy WHEN 'assault' THEN CASE p_phase WHEN 1 THEN 1.35 WHEN 2 THEN .8 ELSE .95 END WHEN 'defend' THEN CASE p_phase WHEN 3 THEN 1.12 ELSE .85 END ELSE CASE p_phase WHEN 2 THEN 1.45 ELSE .9 END END;
  hit:=greatest(1,floor(p_atk*100/(100+30)*factor*(.9+least(.2,p_spd/180))));
  IF p_strategy='defend' THEN incoming:=ceil(raw*(CASE WHEN p_phase=3 THEN .35 ELSE .5 END)); support:=support+least(raw-incoming,ceil(own_hp));
  ELSIF p_strategy='break' AND i%3=0 THEN incoming:=0;support:=support+raw;
  END IF;
  IF p_strategy<>'assault' AND p_phase=2 AND i%3=0 THEN support:=support+5; END IF;
  dealt:=dealt+hit; own_hp:=greatest(0,own_hp-incoming);
 END LOOP;
 RETURN jsonb_build_object('damage',dealt,'support',support,'rounds',turns,'ownHp',floor(own_hp));
END $$;
REVOKE ALL ON FUNCTION arena_live_internal.raid_attempt(double precision,double precision,double precision,double precision,int,text) FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE FUNCTION arena_live_internal.raid_pool(p_hp bigint) RETURNS int LANGUAGE sql IMMUTABLE SET search_path TO pg_catalog,pg_temp AS $$
 SELECT greatest(150,least(5000,ceil(p_hp/6.0)::int));
$$;
REVOKE ALL ON FUNCTION arena_live_internal.raid_pool(bigint) FROM PUBLIC, anon, authenticated;
-- Replenish stamina from elapsed time; discard time spent at the cap.
CREATE OR REPLACE FUNCTION arena_live_internal.refresh_stamina(p_uid uuid) RETURNS public.arena_live_users LANGUAGE plpgsql SET search_path TO pg_catalog,pg_temp AS $$
DECLARE u public.arena_live_users; ticks int;
BEGIN
 SELECT * INTO u FROM public.arena_live_users WHERE user_id=p_uid FOR NO KEY UPDATE;
 IF NOT FOUND THEN RETURN NULL; END IF;
 ticks:=greatest(0,floor(extract(epoch FROM (now()-coalesce(u.stamina_updated_at,now())))/600)::int);
 UPDATE public.arena_live_users SET stamina=least(100,coalesce(stamina,0)+ticks),max_stamina=100,
 stamina_updated_at=CASE WHEN coalesce(stamina,0)+ticks>=100 OR stamina_updated_at IS NULL THEN now() ELSE least(now(),stamina_updated_at+ticks*interval '10 minutes') END,
 last_login_at=now() WHERE user_id=p_uid RETURNING * INTO u;
 RETURN u;
END $$;
REVOKE ALL ON FUNCTION arena_live_internal.refresh_stamina(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION arena_live_internal.ensure_raid(p_day text)
RETURNS text LANGUAGE plpgsql SET search_path TO pg_catalog,pg_temp AS $$
DECLARE v_id text:='daily:'||p_day; v_hp int;
BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.arena_live_raid_boss WHERE id=v_id) THEN
    SELECT greatest(250,least(100000000,coalesce(sum(q.best)*2.2,250)))::int INTO v_hp FROM
 (SELECT u.user_id,max((arena_live_internal.raid_attempt(f.hp,f.atk,f.def,f.spd,1,'assault')->>'damage')::int) best
 FROM public.arena_live_users u JOIN public.arena_live_monsters m USING(user_id) CROSS JOIN LATERAL arena_live_internal.unit_stats(m) f
 WHERE u.last_login_at>=now()-interval '1 day' AND NOT coalesce(m.is_dead,false) AND NOT coalesce(m.is_frozen,false) AND m.life_stage>=2
 GROUP BY u.user_id) q;
    INSERT INTO public.arena_live_raid_boss(id,name,current_hp,max_hp,is_active)
    VALUES(v_id,'巨型機甲首領',v_hp,v_hp,true) ON CONFLICT(id) DO NOTHING;
  END IF;
  RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION arena_live_internal.ensure_raid(text) FROM PUBLIC, anon, authenticated;
CREATE INDEX IF NOT EXISTS arena_live_chat_channel_cursor ON public.arena_live_messages(channel,timestamp DESC,message_id DESC);
CREATE INDEX IF NOT EXISTS arena_live_battle_user_created ON public.arena_live_battle_records(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS arena_live_monsters_owner ON public.arena_live_monsters(user_id);
CREATE INDEX IF NOT EXISTS arena_live_guild_member_owner ON public.arena_live_guild_members(user_id);
CREATE INDEX IF NOT EXISTS arena_live_friends_incoming ON public.arena_live_friends(friend_uid,status);
CREATE INDEX IF NOT EXISTS arena_live_gifts_pending ON public.arena_live_gifts(receiver) WHERE claimed=false;
CREATE INDEX IF NOT EXISTS arena_live_gifts_daily ON public.arena_live_gifts(sender,receiver,date);
CREATE INDEX IF NOT EXISTS arena_live_users_active ON public.arena_live_users(last_login_at);
CREATE INDEX IF NOT EXISTS arena_live_requests_global_expiry ON arena_live_internal.action_requests(created_at);

-- Authoritative deterministic tactical PvE transcript, matching the browser practice rules.
-- The client may submit choices only; HP, damage, result and reward are computed here.
CREATE OR REPLACE FUNCTION arena_live_internal.boss_tactics(p_stage int,p_hp double precision,p_atk double precision,p_def double precision,p_spd double precision,p_moves jsonb)
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
REVOKE ALL ON FUNCTION arena_live_internal.boss_tactics(int,double precision,double precision,double precision,double precision,jsonb) FROM PUBLIC, anon, authenticated;


CREATE OR REPLACE FUNCTION arena_live_internal.shop_catalog(p_id text)
RETURNS TABLE(price int,item_type int,cosmetic boolean) LANGUAGE sql IMMUTABLE SET search_path TO pg_catalog,pg_temp AS $$
 SELECT v.price,v.item_type,v.cosmetic FROM (VALUES ('meat_basic',10,1,false),
('meat_premium',25,1,false),
('energy_drink',50,1,false),
('medicine_standard',80,2,false),
('vitamin',30,2,false),
('chip_atk',300,4,false),
('chip_def',300,4,false),
('chip_hp',300,4,false),
('chip_spd',300,4,false),
('breed_catalyst',300,3,false),
('ultimate_core',1000,3,false),
('skin_flerken',100,1,true),
('skin_husky',50,1,true),
('skin_dragon',150,1,true),
('skin_slime',50,1,true),
('skin_ghost',80,1,true),
('skin_panda',80,1,true),
('skin_dino',200,1,true),
('skin_fox',180,1,true),
('skin_angel',250,1,true),
('skin_demon',300,1,true)) AS v(id,price,item_type,cosmetic) WHERE v.id=p_id;
$$;
REVOKE ALL ON FUNCTION arena_live_internal.shop_catalog(text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION arena_live_internal.quest_catalog(p_id text)
RETURNS TABLE(progress_key text,required int,reward int) LANGUAGE sql IMMUTABLE SET search_path TO pg_catalog,pg_temp AS $$
 SELECT v.progress_key,v.required,v.reward FROM (VALUES ('feed_3','feed_count',3,50),
('clean_1','clean_count',1,30),
('train_2','train_count',2,70),
('battle_2','battle_count',2,100)) AS v(id,progress_key,required,reward) WHERE v.id=p_id;
$$;
REVOKE ALL ON FUNCTION arena_live_internal.quest_catalog(text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION arena_live_internal.guild_catalog(p_id text)
RETURNS TABLE(price int,item_type int) LANGUAGE sql IMMUTABLE SET search_path TO pg_catalog,pg_temp AS $$
 SELECT v.price,v.item_type FROM (VALUES ('chip_extractor',300,4),
('breed_catalyst',150,3),
('ultimate_core',500,3)) AS v(id,price,item_type) WHERE v.id=p_id;
$$;
REVOKE ALL ON FUNCTION arena_live_internal.guild_catalog(text) FROM PUBLIC, anon, authenticated;

-- Private battle settlement. The public game_action owns authentication,
-- the player/monster locks, idempotency, quest progress and gold ledger.
CREATE OR REPLACE FUNCTION arena_live_internal.resolve_battle(v_uid uuid,v_m public.arena_live_monsters,p_data jsonb)
RETURNS jsonb LANGUAGE plpgsql SET search_path TO pg_catalog,pg_temp AS $battle$
DECLARE
  v_mon_id uuid:=v_m.monster_id;
  v_date text:=(now() at time zone 'Asia/Taipei')::date::text;
  v_season text:=left(v_date,7);
  v_count int;
  v_reward int;
  v_battle text;
  v_won boolean;
  v_encounter text;
  v_enemy_name text;
  v_enemy_type integer;
  v_enemy_hp double precision;
  v_enemy_max_hp double precision;
  v_enemy_atk double precision;
  v_enemy_def double precision;
  v_enemy_spd double precision;
  v_own_hp double precision;
  v_own_max_hp double precision;
  v_events jsonb := '[]'::jsonb;
  v_result jsonb;
  v_enc record;
  v_defender arena_live_internal.pvp_defenders%rowtype;
  v_enemy_family int;
  v_enemy_stage int;
  v_target uuid;
  v_pvp boolean:=false;
  v_fighter record;
  v_tactical jsonb;
  v_opponent public.arena_live_monsters%rowtype;
  v_opponent_stats record;
BEGIN
    -- Ignore legacy caller-provided battleId and won. The server owns all outcomes.
    -- The owning user row is FOR UPDATE locked above, serializing requests across tabs.
    -- A replay cannot instantly farm wins or daily battle rewards.
    perform 1 from public.arena_live_battle_records
      where user_id=v_uid and created_at>clock_timestamp()-interval '5 seconds'
      limit 1;
    if found then raise exception '對戰冷卻中，請 5 秒後再挑戰'; end if;
    v_encounter:=coalesce(p_data->>'encounter','wild');
    if coalesce(v_m.is_frozen,false) then raise exception '凍結的怪獸不能出戰'; end if;
    select count(*) into v_count from public.arena_live_battle_records where user_id=v_uid
      and created_at>=date_trunc('day',now() at time zone 'Asia/Taipei') at time zone 'Asia/Taipei';
    if v_count>=30 then raise exception '今日已達 30 場挑戰上限'; end if;
    SELECT * INTO v_fighter FROM arena_live_internal.unit_stats(v_m);
    v_own_max_hp:=v_fighter.hp;
    v_own_hp:=v_own_max_hp;
    v_pvp:=v_encounter='pvp';
    if v_pvp then
      v_target:=nullif(p_data->>'opponent_id','')::uuid;
      if v_target is null or v_target=v_uid then raise exception '對手無效'; end if;
      select * into v_defender from arena_live_internal.pvp_defenders where user_id=v_target;
      if not found then raise exception '對手未登記防守怪獸'; end if;
      SELECT * INTO v_opponent FROM public.arena_live_monsters WHERE monster_id=v_defender.monster_id AND user_id=v_target;
      IF NOT FOUND OR coalesce(v_opponent.is_dead,false) OR coalesce(v_opponent.is_frozen,false) OR v_opponent.life_stage<2 OR v_opponent.repair_until>now() THEN RAISE EXCEPTION '對手機體目前不可出戰'; END IF;
      SELECT * INTO v_opponent_stats FROM arena_live_internal.unit_stats(v_opponent);
      IF abs(v_m.life_stage-v_opponent.life_stage)>1 OR greatest(arena_live_internal.power_rating(v_fighter.hp,v_fighter.atk,v_fighter.def,v_fighter.spd),arena_live_internal.power_rating(v_opponent_stats.hp,v_opponent_stats.atk,v_opponent_stats.def,v_opponent_stats.spd)) > 1.45*least(arena_live_internal.power_rating(v_fighter.hp,v_fighter.atk,v_fighter.def,v_fighter.spd),arena_live_internal.power_rating(v_opponent_stats.hp,v_opponent_stats.atk,v_opponent_stats.def,v_opponent_stats.spd)) THEN RAISE EXCEPTION '戰力差距過大，請選擇同階或相近戰力的對手'; END IF;
      select count(*) into v_count from arena_live_internal.pvp_results where attacker_id=v_uid and battle_day=v_date::date;
      if v_count>=5 then raise exception '今日玩家對戰已達 5 場上限'; end if;
      if exists(select 1 from arena_live_internal.pvp_results where attacker_id=v_uid and defender_id=v_target and battle_day=v_date::date)
        then raise exception '今天已挑戰過這位玩家'; end if;
      v_enemy_name:=v_opponent.name;v_enemy_type:=v_opponent.type;v_enemy_family:=v_opponent.family;
      v_enemy_stage:=v_opponent.life_stage;v_enemy_max_hp:=v_opponent_stats.hp;v_enemy_atk:=v_opponent_stats.atk;
      v_enemy_def:=v_opponent_stats.def;v_enemy_spd:=v_opponent_stats.spd;
    else
      select * into v_enc from arena_live_internal.encounter(v_encounter);
      if not found then raise exception '無效的對戰類型'; end if;
      v_enemy_name:=v_enc.name;v_enemy_type:=v_enc.kind;v_enemy_family:=v_enc.family;v_enemy_stage:=v_enc.stage;
      v_enemy_max_hp:=v_enc.hp;v_enemy_atk:=v_enc.atk;v_enemy_def:=v_enc.def;v_enemy_spd:=v_enc.spd;
    end if;
    v_enemy_hp:=v_enemy_max_hp;
    IF v_encounter='boss' AND NOT (p_data ? 'moves') THEN RAISE EXCEPTION '首領挑戰需要戰術指令'; END IF;
    IF v_encounter='boss' THEN
      v_tactical:=arena_live_internal.boss_tactics(v_m.life_stage,v_fighter.hp,v_fighter.atk,v_fighter.def,v_fighter.spd,p_data->'moves');
      v_own_hp:=(v_tactical->>'ownHp')::double precision; v_enemy_hp:=(v_tactical->>'enemyHp')::double precision;
      v_won:=(v_tactical->>'won')::boolean; v_events:=v_tactical->'events';
    ELSE
      v_tactical:=arena_live_internal.auto_battle(
        ARRAY[v_fighter.hp,v_fighter.atk,v_fighter.def,v_fighter.spd],ARRAY[v_enemy_max_hp,v_enemy_atk,v_enemy_def,v_enemy_spd],
        arena_live_internal.role_id(v_m.life_stage,v_m.family,v_m.type),arena_live_internal.role_id(v_enemy_stage,v_enemy_family,v_enemy_type),true);
      v_won:=(v_tactical->>'won')::boolean; v_events:=v_tactical->'events';
      v_own_hp:=(v_tactical->>'ownHp')::double precision; v_enemy_hp:=(v_tactical->>'enemyHp')::double precision;
    END IF;
    v_battle:=gen_random_uuid()::text;
    insert into public.arena_live_battle_records(user_id,battle_id,monster_id,won)
      values(v_uid,v_battle,v_mon_id,v_won);
    update public.arena_live_monsters set battles=coalesce(battles,0)+1,
      wins=coalesce(wins,0)+case when v_won then 1 else 0 end where monster_id=v_mon_id;
    v_reward:=0;
    if v_pvp then
      insert into arena_live_internal.pvp_results(attacker_id,defender_id,battle_day,battle_id,won)
        values(v_uid,v_target,v_date::date,v_battle,v_won);
      insert into arena_live_internal.pvp_scores(season,user_id,points,wins,losses)
        values(v_season,v_uid,case when v_won then 3 else 1 end,case when v_won then 1 else 0 end,case when v_won then 0 else 1 end)
        on conflict(season,user_id) do update set points=arena_live_internal.pvp_scores.points+excluded.points,
        wins=arena_live_internal.pvp_scores.wins+excluded.wins,losses=arena_live_internal.pvp_scores.losses+excluded.losses;
    elsif v_won then
      insert into arena_live_internal.pve_first_clear(user_id,clear_day,encounter) values(v_uid,v_date::date,v_encounter)
        on conflict do nothing;
      if found then
        v_reward:=v_enc.reward;
        update public.arena_live_users set gold=coalesce(gold,0)+v_reward where user_id=v_uid;
      end if;
    end if;
    v_result:=jsonb_build_object(
      'message',case when v_won then '對戰勝利！' else '對戰失敗' end,
      'won',v_won,'battleId',v_battle,'events',v_events,
      'ownMaxHp',v_own_max_hp,'enemyMaxHp',v_enemy_max_hp,
      'enemyName',v_enemy_name,'enemyType',v_enemy_type,'enemyFamily',v_enemy_family,'enemyStage',v_enemy_stage,'enemySkin',case when v_pvp then (select m.skin_id from public.arena_live_monsters m where m.monster_id=v_defender.monster_id and m.user_id=v_defender.user_id) else null end,'reward',v_reward,
      'enemyAtk',v_enemy_atk,'enemyDef',v_enemy_def,'enemySpd',v_enemy_spd,
      'ownHp',v_own_hp,'enemyHp',v_enemy_hp);
  RETURN v_result;
END; $battle$;
REVOKE ALL ON FUNCTION arena_live_internal.resolve_battle(uuid,public.arena_live_monsters,jsonb) FROM PUBLIC, anon, authenticated;


-- Private unit transactions; public game_action owns authorization, locks and receipts.
CREATE OR REPLACE FUNCTION arena_live_internal.unit_action(v_uid uuid,v_u public.arena_live_users,v_m public.arena_live_monsters,p_action text,p_data jsonb)
RETURNS jsonb LANGUAGE plpgsql SET search_path TO pg_catalog,pg_temp AS $domain$
DECLARE
  v_mon_id uuid:=v_m.monster_id;
  v_m2 public.arena_live_monsters%rowtype;
  v_inv public.arena_live_user_inventory%rowtype;
  v_item text;
  v_mon2_id uuid;
  v_slot int;
  v_count int;
  v_stat text;
  v_old numeric;
  v_bonus numeric;
  v_catalyst boolean;
  v_key text;
  v_reward int;
  v_result jsonb;
  v_text text;
  v_points int;
  v_allocated int;
  v_purchased boolean:=false;
BEGIN
  if p_action = 'skin_equip' then
    if coalesce(v_m.life_stage,1)<2 then raise exception '機械核心尚未孵化'; end if;
    v_item:=nullif(p_data->>'skin_id','');
    if v_item is not null then
      if not exists(select 1 from arena_live_internal.shop_catalog(v_item) c where c.cosmetic) then raise exception '未知皮膚'; end if;
      if not exists(select 1 from public.arena_live_user_inventory where user_id=v_uid and item_id=v_item and quantity>0) then raise exception '尚未收藏此皮膚'; end if;
    end if;
    update public.arena_live_monsters set skin_id=v_item where monster_id=v_mon_id and user_id=v_uid;
    return jsonb_build_object('result',jsonb_build_object('message','造型已更新'),'quest_key',NULL);
  end if;

  if p_action in ('feed','heal','equip','unequip','evolve') then
    v_item := case p_action when 'heal' then coalesce(p_data->>'item_id','medicine_standard')
          when 'unequip' then 'chip_extractor' when 'evolve' then 'ultimate_core'
          else p_data->>'item_id' end;
    if v_item is null then raise exception '未選擇道具'; end if;
    if v_item not in ('feed_basic','heal_basic') then
      select * into v_inv from public.arena_live_user_inventory where user_id=v_uid and item_id=v_item for update;
      if not found or coalesce(v_inv.quantity,0)<1 then
        if coalesce((p_data->>'buy_missing')::boolean,false) AND
           ((p_action='feed' AND v_item IN ('meat_basic','meat_premium','energy_drink')) OR (p_action='heal' AND v_item='medicine_standard')) then
          PERFORM arena_live_internal.purchase_item(v_uid,v_u,jsonb_build_object('item_id',v_item,'quantity',1));
          SELECT * INTO v_inv FROM public.arena_live_user_inventory WHERE user_id=v_uid AND item_id=v_item FOR UPDATE;
          v_purchased:=true;
        else raise exception '道具不足'; end if;
      end if;
    end if;
  end if;

  if p_action = 'feed' then
    if v_item not in ('feed_basic','meat_basic','meat_premium','energy_drink') then raise exception '不支援的食物'; end if;
    v_bonus := case v_item when 'feed_basic' then 10 when 'meat_basic' then 20 when 'meat_premium' then 60 else 30 end;
    update public.arena_live_monsters set fullness=least(100,coalesce(fullness,0)+v_bonus),
      cleanliness=case when v_item='feed_basic' then greatest(0,cleanliness-30) else cleanliness end,
      starve_time_start=null where monster_id=v_mon_id;
    if v_item<>'feed_basic' then update public.arena_live_user_inventory set quantity=quantity-1 where inventory_id=v_inv.inventory_id; end if;
    if v_item='energy_drink' then update public.arena_live_users set stamina=least(max_stamina,stamina+20) where user_id=v_uid; end if;
    v_key:='feed_count';
    v_result:=jsonb_build_object('message',CASE WHEN v_purchased THEN '購買並補充能源成功' ELSE '補充能源成功' END);
  elsif p_action = 'clean' then
    update public.arena_live_monsters set cleanliness=100 where monster_id=v_mon_id;
    v_key:='clean_count';
  elsif p_action = 'heal' then
    if not v_m.is_sick then raise exception '怪獸沒有生病'; end if;
    if v_item not in ('medicine_standard','heal_basic') then raise exception '不支援的藥物'; end if;
    if v_item='heal_basic' then
      if v_m.repair_until is not null then raise exception '緊急修復已開始，請等待完成或使用標準修復套件'; end if;
      update public.arena_live_monsters set repair_until=now()+interval '30 minutes' where monster_id=v_mon_id;
      v_result:=jsonb_build_object('message','緊急修復已開始，30 分鐘後自動完成，耐久不變');
    else
      update public.arena_live_monsters set is_sick=false,sick_time_start=null,repair_until=null where monster_id=v_mon_id;
      update public.arena_live_user_inventory set quantity=quantity-1 where inventory_id=v_inv.inventory_id;
      v_result:=jsonb_build_object('message',CASE WHEN v_purchased THEN '購買並標準修復完成，耐久不變' ELSE '標準修復完成，耐久不變' END);
    end if;
  elsif p_action = 'train' then
    v_stat:=coalesce(p_data->>'stat','pool');
    v_allocated:=v_m.training_hp+v_m.training_atk+v_m.training_def+v_m.training_spd+v_m.training_unspent;
    IF v_stat='allocate' THEN
      v_stat:=p_data->>'target';
      IF v_stat IS NULL OR v_stat NOT IN ('hp','atk','def','spd') THEN RAISE EXCEPTION '無效配點項目'; END IF;
      v_count:=CASE v_stat WHEN 'hp' THEN v_m.training_hp WHEN 'atk' THEN v_m.training_atk WHEN 'def' THEN v_m.training_def ELSE v_m.training_spd END;
      IF v_m.training_unspent<1 THEN RAISE EXCEPTION '沒有可分配點數'; END IF;
      IF v_count>=30 THEN RAISE EXCEPTION '單項配點已達上限'; END IF;
      UPDATE public.arena_live_monsters SET training_unspent=training_unspent-1,
        training_hp=training_hp+CASE WHEN v_stat='hp' THEN 1 ELSE 0 END,
        training_atk=training_atk+CASE WHEN v_stat='atk' THEN 1 ELSE 0 END,
        training_def=training_def+CASE WHEN v_stat='def' THEN 1 ELSE 0 END,
        training_spd=training_spd+CASE WHEN v_stat='spd' THEN 1 ELSE 0 END WHERE monster_id=v_mon_id;
      PERFORM arena_live_internal.refresh_unit(v_mon_id);
      RETURN jsonb_build_object('result',jsonb_build_object('message','配點成功'),'quest_key',NULL);
    END IF;
    if v_u.stamina<10 then raise exception '體力不足，需要 10 點'; end if;
    if v_m.is_sick or coalesce(v_m.fullness,0)<20 then raise exception '怪獸太餓或生病，無法訓練'; end if;
    IF v_stat NOT IN ('hp','atk','def','spd','pool','practice') THEN RAISE EXCEPTION '無效訓練項目'; END IF;
    -- Explicit old-client stat choices remain compatible, but share the same total cap.
    v_count:=CASE v_stat WHEN 'hp' THEN v_m.training_hp WHEN 'atk' THEN v_m.training_atk WHEN 'def' THEN v_m.training_def WHEN 'spd' THEN v_m.training_spd ELSE 0 END;
    v_points:=least(1,60-v_allocated,30-v_count);
    IF v_allocated>=60 AND v_stat='practice' THEN v_points:=0; ELSIF v_points<=0 OR v_stat='practice' THEN RAISE EXCEPTION '訓練配點已達上限'; END IF;
    IF coalesce((p_data->>'buy_missing')::boolean,false) AND (v_stat<>'pool' OR NOT coalesce((p_data->>'boost')::boolean,false) OR v_allocated>=59) THEN
      RAISE EXCEPTION '無法購買並使用效能增幅器';
    END IF;
    IF v_stat<>'practice' AND coalesce((p_data->>'boost')::boolean,false) AND v_allocated<59 AND v_count<29 THEN
      SELECT * INTO v_inv FROM public.arena_live_user_inventory WHERE user_id=v_uid AND item_id='vitamin' AND quantity>0 FOR UPDATE;
      IF NOT FOUND THEN
        IF coalesce((p_data->>'buy_missing')::boolean,false) THEN
          PERFORM arena_live_internal.purchase_item(v_uid,v_u,jsonb_build_object('item_id','vitamin','quantity',1));
          SELECT * INTO STRICT v_inv FROM public.arena_live_user_inventory WHERE user_id=v_uid AND item_id='vitamin' AND quantity>0 FOR UPDATE;
          v_purchased:=true;
        ELSE RAISE EXCEPTION '效能增幅器不足'; END IF;
      END IF;
      UPDATE public.arena_live_user_inventory SET quantity=quantity-1 WHERE inventory_id=v_inv.inventory_id; v_points:=2;
    END IF;
    UPDATE public.arena_live_users SET stamina=stamina-10 WHERE user_id=v_uid;
    UPDATE public.arena_live_monsters SET training_unspent=training_unspent+CASE WHEN v_stat='pool' THEN v_points ELSE 0 END,
      training_hp=training_hp+CASE WHEN v_stat='hp' THEN v_points ELSE 0 END,
      training_atk=training_atk+CASE WHEN v_stat='atk' THEN v_points ELSE 0 END,
      training_def=training_def+CASE WHEN v_stat='def' THEN v_points ELSE 0 END,
      training_spd=training_spd+CASE WHEN v_stat='spd' THEN v_points ELSE 0 END,fullness=greatest(0,fullness-10),train_count=coalesce(train_count,0)+1 WHERE monster_id=v_mon_id;
    PERFORM arena_live_internal.refresh_unit(v_mon_id);
    v_result:=jsonb_build_object('message',CASE WHEN v_points=0 THEN '維持訓練完成' WHEN v_stat='pool' THEN (CASE WHEN v_purchased THEN '購買並增幅訓練完成，可分配點數 +' WHEN v_points=2 THEN '增幅訓練完成，可分配點數 +' ELSE '訓練完成，可分配點數 +' END)||v_points ELSE '訓練完成，配點 +'||v_points END);
    v_key:='train_count';
  elsif p_action='evolve' then
    if v_m.life_stage<>5 or coalesce(v_m.battles,0)<50 or (coalesce(v_m.wins,0)::numeric/nullif(v_m.battles,0))<0.7 then
      raise exception '究極進化需要完全體、50 戰及 70%% 勝率'; end if;
    update public.arena_live_user_inventory set quantity=quantity-1 where inventory_id=v_inv.inventory_id;
    update public.arena_live_monsters set life_stage=6 where monster_id=v_mon_id;
    PERFORM arena_live_internal.refresh_unit(v_mon_id);
  elsif p_action='lock' then
    update public.arena_live_monsters set is_locked=not coalesce(is_locked,false) where monster_id=v_mon_id;
  elsif p_action='release' then
    if v_m.is_locked then raise exception '怪獸已鎖定'; end if;
    v_reward := case when coalesce(v_m.is_rescue,false) then 0
                 else least(80,greatest(0,coalesce(v_m.life_stage,1)*15)) end;
    -- Dead pets may always be cleared to recover warehouse capacity. Only
    -- the final living pet must leave enough gold for a new hatch.
    if not coalesce(v_m.is_dead,false)
       and not exists (select 1 from public.arena_live_monsters
         where user_id=v_uid and monster_id<>v_mon_id and coalesce(is_dead,false)=false)
       and coalesce(v_u.gold,0)+v_reward<100 then
      raise exception '放生後將無法孵蛋；請保留最後一隻怪獸或至少 100G';
    end if;
    delete from arena_live_internal.pvp_defenders where user_id=v_uid and monster_id=v_mon_id;
    delete from public.arena_live_monsters where monster_id=v_mon_id and user_id=v_uid;
    update public.arena_live_users set gold=gold+v_reward where user_id=v_uid;
  elsif p_action='equip' then
    v_slot:=(p_data->>'slot')::int;
    if v_slot is null or v_slot not in (1,2) then raise exception '無效插槽'; end if;
    if v_m.life_stage < (case when v_slot=1 then 4 else 5 end)
      then raise exception '怪獸尚未開啟晶片插槽'; end if;
    -- Previous inventory data used item_type 1 or 6 for chips.
    -- A strict item_id whitelist safely accepts these legacy items without rewriting inventory.
    if v_item not in ('chip_atk','chip_def','chip_hp','chip_spd')
      then raise exception '道具不是可鑲嵌晶片'; end if;
    v_text:=case when v_slot=1 then v_m.chip_slot_1 else v_m.chip_slot_2 end;
    v_old:=case when v_slot=1 then coalesce(v_m.chip_slot_1_val,0)
                else coalesce(v_m.chip_slot_2_val,0) end;
    SELECT r.bonus INTO v_bonus FROM public.arena_live_game_chip_reserves r WHERE r.user_id=v_uid AND r.item_id=v_item AND r.quantity>0 ORDER BY r.bonus DESC LIMIT 1 FOR UPDATE;
    IF FOUND THEN UPDATE public.arena_live_game_chip_reserves SET quantity=quantity-1 WHERE user_id=v_uid AND item_id=v_item AND bonus=v_bonus; ELSE v_bonus:=5; END IF;
    UPDATE public.arena_live_user_inventory SET quantity=quantity-1 WHERE inventory_id=v_inv.inventory_id;
    IF v_slot=1 THEN UPDATE public.arena_live_monsters SET chip_slot_1=v_item,chip_slot_1_val=v_bonus WHERE monster_id=v_mon_id;
    ELSE UPDATE public.arena_live_monsters SET chip_slot_2=v_item,chip_slot_2_val=v_bonus WHERE monster_id=v_mon_id; END IF;
    PERFORM arena_live_internal.refresh_unit(v_mon_id);
  elsif p_action='unequip' then
    v_slot:=(p_data->>'slot')::int;
    if v_slot is null or v_slot not in (1,2) then raise exception '無效插槽'; end if;
    v_text:=case when v_slot=1 then v_m.chip_slot_1 else v_m.chip_slot_2 end;
    v_old:=case when v_slot=1 then coalesce(v_m.chip_slot_1_val,0)
                else coalesce(v_m.chip_slot_2_val,0) end;
    if v_text is null then raise exception '插槽內沒有晶片'; end if;
    -- Preserve pre-existing +50/+200 chips when returned to a stack.
    -- These credits cannot be minted by browser roles and must be spent on re-equipping.
    if v_old>5 then
      insert into public.arena_live_game_chip_reserves(user_id,item_id,bonus,quantity)
        values(v_uid,v_text,v_old,1)
      on conflict(user_id,item_id,bonus) do update
        set quantity=public.arena_live_game_chip_reserves.quantity+1;
    end if;
    update public.arena_live_user_inventory set quantity=quantity-1 where inventory_id=v_inv.inventory_id;
    insert into public.arena_live_user_inventory(user_id,item_id,item_type,quantity)
      values(v_uid,v_text,4,1)
      on conflict(user_id,item_id) do update set quantity=public.arena_live_user_inventory.quantity+1;
    IF v_slot=1 THEN UPDATE public.arena_live_monsters SET chip_slot_1=null,chip_slot_1_val=0 WHERE monster_id=v_mon_id;
    ELSE UPDATE public.arena_live_monsters SET chip_slot_2=null,chip_slot_2_val=0 WHERE monster_id=v_mon_id; END IF;
    PERFORM arena_live_internal.refresh_unit(v_mon_id);
  elsif p_action='breed' then
    v_mon_id:=(p_data->>'parent1')::uuid;
    v_mon2_id:=(p_data->>'parent2')::uuid;
    if v_mon_id is null or v_mon2_id is null or v_mon_id=v_mon2_id then raise exception '請選擇不同的雙親'; end if;
    select * into v_m from public.arena_live_monsters where monster_id=v_mon_id and user_id=v_uid for update;
    select * into v_m2 from public.arena_live_monsters where monster_id=v_mon2_id and user_id=v_uid for update;
    if v_m.monster_id is null or v_m2.monster_id is null or v_m.is_dead or v_m2.is_dead
      or v_m.life_stage<4 or v_m2.life_stage<4 then raise exception '雙親必須是自己存活的成熟期怪獸'; end if;
    select count(*) into v_count from public.arena_live_monsters where user_id=v_uid;
    if v_count>=50 then raise exception '怪獸倉庫已滿'; end if;
    if v_u.gold<200 then raise exception '需要 200G'; end if;
    v_catalyst:=coalesce((p_data->>'useCatalyst')::boolean,false);
    if v_catalyst then
      select * into v_inv from public.arena_live_user_inventory where user_id=v_uid and item_id='breed_catalyst' for update;
      if not found or v_inv.quantity<1 then raise exception '繁衍催化劑不足'; end if;
      update public.arena_live_user_inventory set quantity=quantity-1 where inventory_id=v_inv.inventory_id;
    end if;
    update public.arena_live_users set gold=gold-200 where user_id=v_uid;
    v_bonus:=least(5,greatest(0,round((v_m.core_quality+v_m2.core_quality)/2.0)::int+CASE WHEN random()<(CASE WHEN v_catalyst THEN .12 ELSE .06 END) THEN 1 ELSE 0 END));
    insert into public.arena_live_monsters(user_id,parent_1_id,parent_2_id,name,generation,life_stage,type,family,age_days,fullness,cleanliness,
      is_sick,is_dead,gene_hp,gene_atk,gene_def,gene_spd,combat_hp,combat_atk,combat_def,combat_spd,battles,wins,is_locked,last_updated_at,core_quality)
    values(v_uid,v_mon_id,v_mon2_id,'新生機械核心',
      greatest(coalesce(v_m.generation,1),coalesce(v_m2.generation,1))+1,1,0,v_m.family,0,100,100,
      false,false,50,5,5,5,50,5,5,5,0,0,false,now(),v_bonus::int);
  end if;
  RETURN jsonb_build_object('result',coalesce(v_result,jsonb_build_object('message','操作成功！')),'quest_key',v_key);
END; $domain$;
REVOKE ALL ON FUNCTION arena_live_internal.unit_action(uuid,public.arena_live_users,public.arena_live_monsters,text,jsonb) FROM PUBLIC, anon, authenticated;


-- Private purchases, quests and guild economy. One rule implementation per domain.
CREATE OR REPLACE FUNCTION arena_live_internal.purchase_item(v_uid uuid,v_u public.arena_live_users,p_data jsonb)
RETURNS jsonb LANGUAGE plpgsql SET search_path TO pg_catalog,pg_temp AS $domain$
DECLARE
  v_item text;
  v_qty int;
  v_cost int;
  v_price int;
  v_item_type int;
  v_cosmetic boolean;
BEGIN
    v_item := p_data->>'item_id';
    v_qty := (p_data->>'quantity')::int;
    if v_qty is null or v_qty<1 or v_qty>99 then raise exception '數量需為 1～99'; end if;
    select c.price,c.item_type,c.cosmetic into v_price,v_item_type,v_cosmetic from arena_live_internal.shop_catalog(v_item) c;
    if not found then raise exception '未知商品'; end if;
    if v_cosmetic then
      if v_qty<>1 then raise exception '皮膚每款只需購買一次'; end if;
      if exists(select 1 from public.arena_live_user_inventory where user_id=v_uid and item_id=v_item and quantity>0) then raise exception '已收藏此皮膚'; end if;
    end if;
    v_cost := v_qty*v_price;
    if v_u.gold < v_cost then raise exception '金幣不足'; end if;
    update public.arena_live_users set gold=gold-v_cost where user_id=v_uid;
    insert into public.arena_live_user_inventory(user_id,item_id,item_type,quantity)
      values(v_uid,v_item,v_item_type,v_qty)
      on conflict(user_id,item_id) do update set quantity=public.arena_live_user_inventory.quantity+excluded.quantity;
    RETURN jsonb_build_object('message','購買成功，花費 '||v_cost||'G');

END; $domain$;
REVOKE ALL ON FUNCTION arena_live_internal.purchase_item(uuid,public.arena_live_users,jsonb) FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE FUNCTION arena_live_internal.claim_quest(v_uid uuid,v_date text,p_data jsonb)
RETURNS jsonb LANGUAGE plpgsql SET search_path TO pg_catalog,pg_temp AS $domain$
DECLARE
  v_count int;
  v_key text;
  v_quest public.arena_live_daily_quests%rowtype;
  v_required int;
  v_reward int;
  v_text text;
BEGIN
    v_text:=p_data->>'quest_id';
    select c.progress_key,c.required,c.reward into v_key,v_required,v_reward from arena_live_internal.quest_catalog(v_text) c;
    if not found then raise exception '未知任務'; end if;
    insert into public.arena_live_daily_quests(quest_id,user_id,date) values(v_uid::text||'_'||v_date,v_uid,v_date)
      on conflict(quest_id) do nothing;
    select * into v_quest from public.arena_live_daily_quests where quest_id=v_uid::text||'_'||v_date for update;
    if v_text=any(coalesce(v_quest.claimed,array[]::text[])) then raise exception '獎勵已領取'; end if;
    v_count:=case v_key when 'feed_count' then v_quest.feed_count when 'clean_count' then v_quest.clean_count
      when 'train_count' then v_quest.train_count else v_quest.battle_count end;
    if coalesce(v_count,0)<v_required then raise exception '任務尚未完成'; end if;
    update public.arena_live_daily_quests set claimed=array_append(coalesce(claimed,array[]::text[]),v_text)
      where quest_id=v_quest.quest_id;
    update public.arena_live_users set gold=gold+v_reward where user_id=v_uid;
    RETURN jsonb_build_object('message','操作成功！');

END; $domain$;
REVOKE ALL ON FUNCTION arena_live_internal.claim_quest(uuid,text,jsonb) FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE FUNCTION arena_live_internal.guild_action(v_uid uuid,v_u public.arena_live_users,p_action text,p_data jsonb)
RETURNS jsonb LANGUAGE plpgsql SET search_path TO pg_catalog,pg_temp AS $domain$
DECLARE
  v_item text;
  v_mon_id uuid;
  v_cost int;
  v_item_type int;
  v_guild public.arena_live_guilds%rowtype;
  v_member public.arena_live_guild_members%rowtype;
  v_text text;
BEGIN
    -- Own user is already locked. Shared guild row must precede member locks
    -- for donations, shopping, leaving, joining and leader disbanding.
    select * into v_member from public.arena_live_guild_members where user_id=v_uid limit 1;
    if v_member.member_id is not null then
      perform 1 from public.arena_live_guilds where guild_id=v_member.guild_id for update;
      select * into v_member from public.arena_live_guild_members where user_id=v_uid limit 1 for update;
    end if;
    if p_action='guild_create' then
      if v_member.member_id is not null then raise exception '您已經加入公會'; end if;
      if v_u.gold<500 then raise exception '建立公會需要 500G'; end if;
      v_text:=trim(p_data->>'name');
      if length(coalesce(v_text,''))<2 or length(v_text)>30 then raise exception '公會名稱需 2～30 字'; end if;
      insert into public.arena_live_guilds(guild_name,leader_id,level,total_contribution) values(v_text,v_uid,1,0) returning * into v_guild;
      insert into public.arena_live_guild_members(guild_id,user_id,role,contribution) values(v_guild.guild_id,v_uid,2,0);
      update public.arena_live_users set gold=gold-500 where user_id=v_uid;
    elsif p_action='guild_join' then
      if v_member.member_id is not null then raise exception '已加入其他公會'; end if;
      v_mon_id:=(p_data->>'guild_id')::uuid;
      perform 1 from public.arena_live_guilds where guild_id=v_mon_id for update;
      if not found then raise exception '公會不存在'; end if;
      insert into public.arena_live_guild_members(guild_id,user_id,role,contribution) values(v_mon_id,v_uid,0,0);
    else
      if v_member.member_id is null then raise exception '未加入公會'; end if;
      if p_action='guild_leave' then
        if v_member.role=2 then
          delete from public.arena_live_guild_applications where guild_id=v_member.guild_id;
          delete from public.arena_live_guild_members where guild_id=v_member.guild_id;
          delete from public.arena_live_guilds where guild_id=v_member.guild_id and leader_id=v_uid;
        else
          delete from public.arena_live_guild_members where member_id=v_member.member_id;
        end if;
      elsif p_action='guild_donate' then
        v_cost:=(p_data->>'amount')::int;
        if v_cost is null or v_cost<1 or v_cost>100000000 then raise exception '捐款金額需為正整數'; end if;
        if v_u.gold<v_cost then raise exception '金幣不足'; end if;
        update public.arena_live_users set gold=gold-v_cost where user_id=v_uid;
        update public.arena_live_guild_members set contribution=coalesce(contribution,0)+v_cost where member_id=v_member.member_id;
        update public.arena_live_guilds set total_contribution=coalesce(total_contribution,0)+v_cost where guild_id=v_member.guild_id;
      elsif p_action='guild_buy' then
        v_item:=p_data->>'item_id';
        select c.price,c.item_type into v_cost,v_item_type from arena_live_internal.guild_catalog(v_item) c;
        if not found then raise exception '未知公會商品'; end if;
        if coalesce(v_member.contribution,0)<v_cost then raise exception '公會貢獻不足'; end if;
        update public.arena_live_guild_members set contribution=contribution-v_cost where member_id=v_member.member_id;
        insert into public.arena_live_user_inventory(user_id,item_id,item_type,quantity) values(v_uid,v_item,v_item_type,1)
          on conflict(user_id,item_id) do update set quantity=public.arena_live_user_inventory.quantity+1;
      end if;
    end if;
    RETURN jsonb_build_object('message','操作成功！');
END; $domain$;
REVOKE ALL ON FUNCTION arena_live_internal.guild_action(uuid,public.arena_live_users,text,jsonb) FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE FUNCTION arena_live_internal.progress_quest(v_uid uuid,v_date text,v_key text)
RETURNS void LANGUAGE plpgsql SET search_path TO pg_catalog,pg_temp AS $domain$
DECLARE

BEGIN
  if v_key is not null and v_key in ('feed_count','clean_count','train_count','battle_count') then
    insert into public.arena_live_daily_quests(quest_id,user_id,date) values(v_uid::text||'_'||v_date,v_uid,v_date)
      on conflict(quest_id) do nothing;
    if v_key='feed_count' then
      update public.arena_live_daily_quests set feed_count=coalesce(feed_count,0)+1 where quest_id=v_uid::text||'_'||v_date;
    elsif v_key='clean_count' then
      update public.arena_live_daily_quests set clean_count=coalesce(clean_count,0)+1 where quest_id=v_uid::text||'_'||v_date;
    elsif v_key='train_count' then
      update public.arena_live_daily_quests set train_count=coalesce(train_count,0)+1 where quest_id=v_uid::text||'_'||v_date;
    else
      update public.arena_live_daily_quests set battle_count=coalesce(battle_count,0)+1 where quest_id=v_uid::text||'_'||v_date;
    end if;
  end if;

END; $domain$;
REVOKE ALL ON FUNCTION arena_live_internal.progress_quest(uuid,text,text) FROM PUBLIC, anon, authenticated;


-- Canonical source: current Game database definition, captured 2026-11-17.
-- Historical migrations are immutable records; edit this file for future changes.
CREATE OR REPLACE FUNCTION public.arena_live_game_ensure_profile()
 RETURNS public.arena_live_users
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_uid uuid := (select auth.uid());
  v_auth record;
  v_profile public.arena_live_users%rowtype;
  v_name text;
begin
  if v_uid is null then raise exception '請先登入'; end if;
  select * into v_profile from public.arena_live_users where user_id=v_uid;
  if found then return arena_live_internal.refresh_stamina(v_uid); end if;
  select email, raw_user_meta_data into v_auth from auth.users where id=v_uid;
  if not found then raise exception '登入帳號不存在'; end if;
  v_name:=left(trim(coalesce(v_auth.raw_user_meta_data->>'username','')),24);
  if v_name='' then v_name:='玩家_'||left(replace(v_uid::text,'-',''),8); end if;
  if exists(select 1 from public.arena_live_users where username=v_name and user_id<>v_uid) then
    v_name:=left(v_name,15)||'_'||left(replace(v_uid::text,'-',''),8);
  end if;
  insert into public.arena_live_users(user_id,username,email,gold,premium_gems,stamina,max_stamina)
    values(v_uid,v_name,coalesce(v_auth.email,v_uid::text||'@monsterarena.app'),500,0,100,100)
    on conflict(user_id) do nothing;
  select * into v_profile from public.arena_live_users where user_id=v_uid;
  return v_profile;
end; $function$;
REVOKE ALL ON FUNCTION public.arena_live_game_ensure_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.arena_live_game_ensure_profile() TO authenticated;


-- Canonical source: current Game database definition, captured 2026-11-17.
-- Historical migrations are immutable records; edit this file for future changes.
CREATE OR REPLACE FUNCTION public.arena_live_game_public_profiles(p_user_ids uuid[] DEFAULT NULL::uuid[], p_username text DEFAULT NULL::text)
 RETURNS TABLE(user_id uuid, username text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  if (select auth.uid()) is null then raise exception '請先登入'; end if;
  if cardinality(p_user_ids)>100 then raise exception '查詢筆數過多'; end if;
  return query
    select u.user_id,u.username from public.arena_live_users u
    where (p_user_ids is null or u.user_id=any(p_user_ids))
      and (p_username is null or lower(u.username)=lower(p_username))
    order by u.user_id limit 100;
end; $function$;
REVOKE ALL ON FUNCTION public.arena_live_game_public_profiles(uuid[],text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.arena_live_game_public_profiles(uuid[],text) TO authenticated;


-- Canonical source for next main Game rules; not yet applied to the shared database.
-- Historical migrations are immutable records; edit this file for future changes.
CREATE OR REPLACE FUNCTION public.arena_live_game_age_monsters()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_uid uuid:=(select auth.uid());
  v_m public.arena_live_monsters%rowtype;
  v_hours double precision;
  v_prev_age double precision;
  v_age double precision;
  v_stage integer;
  v_type smallint;
  v_dirty_hours double precision;
  v_dirty_ticks int;
  v_hunger_loss double precision;
begin
  if v_uid is null then raise exception '請先登入'; end if;
  -- Same lock order as game_action: player first, then owned units.
  perform 1 from public.arena_live_users where user_id=v_uid FOR NO KEY UPDATE;
  if not found then raise exception '找不到使用者資料，請重新登入'; end if;
  for v_m in select * from public.arena_live_monsters
    where user_id=v_uid and is_dead=false and coalesce(is_frozen,false)=false
    order by monster_id for update
  loop
    v_hours:=greatest(0.0,extract(epoch from (now()-coalesce(v_m.last_updated_at,now())))/3600.0);
    if v_hours < 1.0/12.0 then continue; end if;
    v_prev_age:=coalesce(v_m.age_days,0);
    v_age:=v_prev_age+v_hours/24.0;
    v_stage:=greatest(coalesce(v_m.life_stage,1),
      case when v_age>=7 then 5 when v_age>=3 then 4 when v_age>=1 then 3
           when v_age>=0.05 then 2 else 1 end);
    v_type:=coalesce(v_m.type,0);
    if v_stage>=3 and v_type=0 then v_type:=1+floor(random()*2)::int; end if;
    -- Integer cleanliness decreases on elapsed 15-minute boundaries, not refresh count.
    v_dirty_ticks:=floor(v_age*96)::int-floor(v_prev_age*96)::int;
    v_dirty_hours:=greatest(0.0,v_hours-greatest(0.0,(coalesce(v_m.cleanliness,0)-30)/4.0));
    v_hunger_loss:=2*v_hours+2*greatest(0.0,(v_age-greatest(3.0,v_prev_age))*24.0);
    update public.arena_live_monsters set
      age_days=v_age,
      fullness=greatest(0,coalesce(fullness,0)-v_hunger_loss),
      cleanliness=greatest(0,coalesce(cleanliness,0)-v_dirty_ticks),
      life_stage=v_stage,
      type=v_type,
      is_sick=coalesce(is_sick,false) or
        (v_dirty_hours>0 and random()<1-power(0.96::double precision,v_dirty_hours)),
      last_updated_at=now()
    where monster_id=v_m.monster_id and user_id=v_uid;
  end loop;
  PERFORM arena_live_internal.refresh_unit(m.monster_id) FROM public.arena_live_monsters m WHERE m.user_id=v_uid AND m.life_stage>=2 AND NOT coalesce(m.is_dead,false);
  update public.arena_live_monsters set is_sick=false,sick_time_start=null,repair_until=null
    where user_id=v_uid and is_dead=false and repair_until<=now();
end; $function$;
REVOKE ALL ON FUNCTION public.arena_live_game_age_monsters() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.arena_live_game_age_monsters() TO authenticated;


-- Canonical source: current Game database definition, captured 2026-11-17.
-- Historical migrations are immutable records; edit this file for future changes.
CREATE OR REPLACE FUNCTION public.arena_live_game_rename_monster(p_monster_id uuid, p_name text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_uid uuid:=(select auth.uid()); v_name text:=left(trim(p_name),30);
begin
  if v_uid is null then raise exception '請先登入'; end if;
  if v_name is null or v_name='' then raise exception '請輸入怪獸名稱'; end if;
  update public.arena_live_monsters set name=v_name
    where monster_id=p_monster_id and user_id=v_uid;
  if not found then raise exception '無法修改其他玩家的怪獸'; end if;
  return jsonb_build_object('message','怪獸名稱已更新');
end; $function$;
REVOKE ALL ON FUNCTION public.arena_live_game_rename_monster(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.arena_live_game_rename_monster(uuid,text) TO authenticated;


-- Canonical source: current Game database definition, captured 2026-11-17.
-- Historical migrations are immutable records; edit this file for future changes.
CREATE OR REPLACE FUNCTION public.arena_live_game_friend_action(p_mode text, p_peer uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_uid uuid:=(select auth.uid());
  v_peer_name text;
  v_own_name text;
  v_changed integer;
begin
  if v_uid is null then raise exception '請先登入'; end if;
  if p_peer is null or v_uid=p_peer then raise exception '好友帳號無效'; end if;
  -- Both directions take the same transaction-scoped lock. Prevent reciprocal
  -- requests and request/accept races without locking unrelated accounts.
  perform pg_advisory_xact_lock(hashtextextended('arena_live_internal:friend:'||least(v_uid,p_peer)::text||':'||greatest(v_uid,p_peer)::text,0));
  select username into v_peer_name from public.arena_live_users where user_id=p_peer;
  select username into v_own_name from public.arena_live_users where user_id=v_uid;
  if v_peer_name is null or v_own_name is null then raise exception '找不到玩家'; end if;
  if p_mode='request' then
    if exists (select 1 from public.arena_live_friends
      where user_id=v_uid and friend_uid=p_peer and status=1)
      then raise exception '已經是好友'; end if;
    if exists (select 1 from public.arena_live_friends
      where user_id=p_peer and friend_uid=v_uid and status=0)
      then raise exception '對方已邀請你，請到好友邀請清單接受'; end if;
    insert into public.arena_live_friends(user_id,friend_uid,friend_name,status)
      values(v_uid,p_peer,v_peer_name,0)
      on conflict(user_id,friend_uid) do nothing;
    get diagnostics v_changed=row_count;
    if v_changed=0 then raise exception '好友邀請已送出，請等待對方回覆'; end if;
    return jsonb_build_object('message','好友邀請已送出');
  elsif p_mode='accept' then
    update public.arena_live_friends set status=1
      where user_id=p_peer and friend_uid=v_uid and status=0;
    get diagnostics v_changed=row_count;
    if v_changed=0 then raise exception '找不到待處理的好友邀請'; end if;
    insert into public.arena_live_friends(user_id,friend_uid,friend_name,status)
      values(v_uid,p_peer,v_peer_name,1)
      on conflict(user_id,friend_uid)
      do update set status=1,friend_name=excluded.friend_name;
    return jsonb_build_object('message','好友邀請已接受');
  else raise exception '未知好友操作';
  end if;
end; $function$;
REVOKE ALL ON FUNCTION public.arena_live_game_friend_action(text,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.arena_live_game_friend_action(text,uuid) TO authenticated;


-- Canonical source: current Game database definition, captured 2026-11-17.
-- Historical migrations are immutable records; edit this file for future changes.
CREATE OR REPLACE FUNCTION public.arena_live_game_claim_gifts()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_uid uuid:=(select auth.uid());
  v_count int;
begin
  if v_uid is null then raise exception '請先登入'; end if;
  perform 1 from public.arena_live_users where user_id=v_uid FOR NO KEY UPDATE;
  with pending as (
    select gift_id from public.arena_live_gifts where receiver=v_uid::text and claimed=false for update
  ), credited as (
    update public.arena_live_gifts set claimed=true where gift_id in(select gift_id from pending)
    returning gift_id
  )
  select count(*) into v_count from credited;
  if v_count>0 then
    update public.arena_live_users set stamina=least(coalesce(max_stamina,100),coalesce(stamina,0)+20*v_count)
      where user_id=v_uid;
  end if;
  return v_count;
end; $function$;
REVOKE ALL ON FUNCTION public.arena_live_game_claim_gifts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.arena_live_game_claim_gifts() TO authenticated;


-- Canonical source: current Game database definition, captured 2026-11-17.
-- Historical migrations are immutable records; edit this file for future changes.
-- PostgreSQL requires replacement when the public result gains a column. No CASCADE.
DROP FUNCTION IF EXISTS public.arena_live_game_plaza_monsters(smallint);
CREATE OR REPLACE FUNCTION public.arena_live_game_plaza_monsters(p_type smallint DEFAULT NULL::smallint)
 RETURNS TABLE(user_id uuid, monster_id uuid, name text, family smallint, type smallint, life_stage smallint, is_dead boolean, skin_id text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  with recent_players as materialized (
    select m.user_id,max(m.created_at) as newest
    from public.arena_live_monsters m
    where (select auth.uid()) is not null
      and m.is_dead=false
      and (p_type is null or ((p_type between 11 and 14 and (case coalesce(m.family,1) when 1 then 1 when 2 then 1 when 4 then 2 when 5 then 2 when 6 then 3 when 7 then 3 when 3 then 4 when 8 then 4 else 1 end)=p_type-10) or (p_type between 0 and 3 and m.type=p_type)))
    group by m.user_id
    order by newest desc nulls last,m.user_id
    limit 30
  ), top_pets as (
    select m.user_id,m.monster_id,m.name,m.family,m.type,m.life_stage,m.is_dead,case when m.life_stage>=2 then m.skin_id else null end skin_id,
           p.newest,
           row_number() over(
             partition by m.user_id
             order by m.created_at desc nulls last,m.monster_id
           ) as pet_rank
    from recent_players p
    join public.arena_live_monsters m on m.user_id=p.user_id
    where m.is_dead=false
      and (p_type is null or ((p_type between 11 and 14 and (case coalesce(m.family,1) when 1 then 1 when 2 then 1 when 4 then 2 when 5 then 2 when 6 then 3 when 7 then 3 when 3 then 4 when 8 then 4 else 1 end)=p_type-10) or (p_type between 0 and 3 and m.type=p_type)))
  )
  select s.user_id,s.monster_id,s.name,s.family,s.type,s.life_stage,s.is_dead,s.skin_id
  from top_pets s
  where s.pet_rank<=3
  order by s.newest desc nulls last,s.user_id,s.pet_rank
  limit 90;
$function$;
REVOKE ALL ON FUNCTION public.arena_live_game_plaza_monsters(smallint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.arena_live_game_plaza_monsters(smallint) TO authenticated;


-- Canonical source for next main Game rules; not yet applied to the shared database.
-- Historical migrations are immutable records; edit this file for future changes.
CREATE OR REPLACE FUNCTION public.arena_live_game_action(p_action text, p_data jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_uid uuid := (select auth.uid());
  v_u public.arena_live_users%rowtype;
  v_m public.arena_live_monsters%rowtype;
  v_mon_id uuid;
  v_count int;
  v_rescue boolean := false;
  v_date text := (now() at time zone 'Asia/Taipei')::date::text;
  v_key text;
  v_reward int;
  v_boss public.arena_live_raid_boss%rowtype;
  v_damage int;
  v_remaining int;
  v_result jsonb;
  v_unit_result jsonb;
  v_text text;
  v_request uuid;
  v_cached record;
  v_season text:=left(v_date,7);
  v_boss_id text;
  v_contribution bigint;
  v_fighter record;
  v_attempts int;
  v_support int;
  v_phase int;
  v_raid_result jsonb;
  v_strategy text;
begin
  if v_uid is null then raise exception '請先登入'; end if;
  select * into v_u from public.arena_live_users where user_id=v_uid FOR NO KEY UPDATE;
  if not found then raise exception '找不到使用者資料，請重新登入'; end if;
  v_u:=arena_live_internal.refresh_stamina(v_uid);
  p_data:=coalesce(p_data,'{}'::jsonb);
  if jsonb_typeof(p_data)<>'object' then raise exception '操作參數錯誤'; end if;
  if p_action='capabilities' then
    return jsonb_build_object('version',2,'combatBalance',3,'fixedEncounters',true,'asyncPvp',true,'dailyRaid',true,'idempotency',true);
  end if;
  if p_action='raid_status' then
    v_boss_id:=arena_live_internal.ensure_raid(v_date);
    select * into v_boss from public.arena_live_raid_boss where id=v_boss_id;
    select damage,attempts,support into v_contribution,v_attempts,v_support from arena_live_internal.raid_contributions where boss_id=v_boss_id and user_id=v_uid;
    return to_jsonb(v_boss)||jsonb_build_object('my_damage',coalesce(v_contribution,0),'my_attempts',coalesce(v_attempts,0),'my_support',coalesce(v_support,0),'reward_pool',arena_live_internal.raid_pool(v_boss.max_hp),'claims',
      coalesce((select jsonb_agg(jsonb_build_object('boss_id',r.boss_id,'damage',r.damage,'reward',floor(arena_live_internal.raid_pool(b.max_hp)::numeric*(r.damage+r.support)/greatest(1,(SELECT sum(x.damage+x.support) FROM arena_live_internal.raid_contributions x WHERE x.boss_id=b.id)))) order by b.created_at desc)
        from arena_live_internal.raid_contributions r join public.arena_live_raid_boss b on b.id=r.boss_id
        where r.user_id=v_uid and r.claimed_at is null and b.current_hp=0),'[]'::jsonb));
  end if;
  if p_action='pvp_list' then
    return jsonb_build_object('season',v_season,'registered',exists(select 1 from arena_live_internal.pvp_defenders d join public.arena_live_monsters m on m.monster_id=d.monster_id and m.user_id=d.user_id where d.user_id=v_uid and not coalesce(m.is_dead,false) and not coalesce(m.is_frozen,false) and m.life_stage>=2 and (m.repair_until is null or m.repair_until<=now())),
      'opponents',coalesce((select jsonb_agg(to_jsonb(q) order by q.points desc,q.user_id) from
        (select d.user_id,u.username,m.name monster_name,m.family,m.life_stage stage,m.type,m.skin_id,f.hp,f.atk,f.def,f.spd,coalesce(s.points,0) points
         from arena_live_internal.pvp_defenders d join public.arena_live_users u using(user_id) join public.arena_live_monsters m on m.monster_id=d.monster_id and m.user_id=d.user_id cross join lateral arena_live_internal.unit_stats(m) f
         left join arena_live_internal.pvp_scores s on s.user_id=d.user_id and s.season=v_season
         where d.user_id<>v_uid and not coalesce(m.is_dead,false) and not coalesce(m.is_frozen,false) and (m.repair_until is null or m.repair_until<=now()) and m.life_stage>=2 order by coalesce(s.points,0) desc,d.user_id limit 30) q),'[]'::jsonb),
      'leaderboard',coalesce((select jsonb_agg(to_jsonb(q) order by q.points desc,q.user_id) from
        (select s.user_id,u.username,s.points,s.wins,s.losses from arena_live_internal.pvp_scores s join public.arena_live_users u using(user_id)
         where s.season=v_season order by s.points desc,s.user_id limit 30) q),'[]'::jsonb));
  end if;
  v_request:=nullif(p_data->>'request_id','')::uuid;
  if v_request is not null then
    select action,payload_hash,result into v_cached from arena_live_internal.action_requests
      where user_id=v_uid and request_id=v_request;
    if found then
      if v_cached.action<>p_action or v_cached.payload_hash<>md5((p_data-'request_id')::text) then
        raise exception '交易識別碼已用於其他操作';
      end if;
      return v_cached.result;
    end if;
  end if;

  if p_action in ('hatch','feed','clean','heal','train','evolve','release','lock','equip','unequip','breed','buy','skin_equip','raid','battle','claim','guild_create','guild_join','guild_leave','guild_donate','guild_buy','chat','gift','raid_claim','pvp_register','pvp_unregister') then
    null;
  else
    raise exception '未知遊戲操作';
  end if;

  if p_action = 'hatch' then
    select count(*) into v_count from public.arena_live_monsters where user_id=v_uid;
    if v_count >= 50 then raise exception '倉庫已滿 50 隻'; end if;
    if coalesce(v_u.gold,0)<100 then
      -- Only a player with no living pet may obtain a rescue egg.
      if exists(select 1 from public.arena_live_monsters
        where user_id=v_uid and coalesce(is_dead,false)=false) then
        raise exception '金幣不足，需要 100G';
      end if;
      -- Rescue pets have no release-gold refund, even after growing up.
      -- Without this marker, repeatedly releasing free eggs minted gold.
      v_rescue := true;
    else
      update public.arena_live_users set gold=gold-100 where user_id=v_uid;
    end if;
    insert into public.arena_live_monsters(user_id,name,generation,life_stage,type,family,age_days,fullness,cleanliness,
      is_sick,is_dead,gene_hp,gene_atk,gene_def,gene_spd,combat_hp,combat_atk,combat_def,combat_spd,battles,wins,is_locked,last_updated_at,is_rescue)
    values(v_uid,'機械核心',1,1,0,(array[1,4,7,3])[1+floor(random()*4)::int],0,100,100,false,false,50,5,5,5,50,5,5,5,0,0,false,now(),v_rescue);
    return arena_live_internal.finish_action(v_uid,v_request,p_action,p_data,jsonb_build_object('message','核心啟動成功！'),v_u.gold);
  end if;

  if p_action in ('feed','clean','heal','train','evolve','breed','raid','battle','pvp_register') then
    PERFORM public.arena_live_game_age_monsters();
  end if;
  if p_action in ('feed','clean','heal','train','evolve','release','lock','equip','unequip','skin_equip','raid','battle','pvp_register') then
    v_mon_id := nullif(p_data->>'monster_id','')::uuid;
    if v_mon_id is null then raise exception '請選擇怪獸'; end if;
    select * into v_m from public.arena_live_monsters where monster_id=v_mon_id and user_id=v_uid for update;
    if not found then raise exception '怪獸不存在或不屬於您'; end if;
    if v_m.is_dead and p_action not in ('release','lock') then raise exception '已死亡的怪獸無法執行此操作'; end if;
    if v_m.repair_until is not null and v_m.repair_until<=now() then
      update public.arena_live_monsters set is_sick=false,sick_time_start=null,repair_until=null where monster_id=v_mon_id returning * into v_m;
    end if;
    if v_m.repair_until is not null and p_action in ('train','battle','raid','pvp_register','evolve') and not (p_action='train' and coalesce(p_data->>'stat','')='allocate') then
      raise exception '緊急修復中，請等待修復完成';
    end if;
    -- Match disabled egg actions in the UI, even when a player calls the RPC directly.
    if p_action in ('feed','clean','train') and coalesce(v_m.life_stage,1)=1 then
      raise exception '機械核心尚不能補充能源、保養或訓練';
    end if;
    if p_action in ('raid','battle','pvp_register') then
      if coalesce(v_m.life_stage,1)<2 then raise exception '機械核心不能出戰'; end if;
      if coalesce(v_m.is_frozen,false) then raise exception '凍結中的怪獸不能出戰'; end if;
    end if;
  end if;

  if p_action='buy' then
    v_result:=arena_live_internal.purchase_item(v_uid,v_u,p_data);
  elsif p_action in ('skin_equip','feed','clean','heal','train','evolve','release','lock','equip','unequip','breed') then
    v_unit_result:=arena_live_internal.unit_action(v_uid,v_u,v_m,p_action,p_data);
    v_result:=v_unit_result->'result';
    v_key:=v_unit_result->>'quest_key';
  elsif p_action='pvp_register' then
    SELECT * INTO v_fighter FROM arena_live_internal.unit_stats(v_m);
    insert into arena_live_internal.pvp_defenders(user_id,monster_id,monster_name,family,stage,type,hp,atk,def,spd)
      values(v_uid,v_mon_id,coalesce(v_m.name,'怪獸'),coalesce(v_m.family,1),v_m.life_stage,coalesce(v_m.type,0),
      v_fighter.hp,v_fighter.atk,v_fighter.def,v_fighter.spd)
      on conflict(user_id) do update set monster_id=excluded.monster_id,monster_name=excluded.monster_name,
      family=excluded.family,stage=excluded.stage,type=excluded.type,hp=excluded.hp,atk=excluded.atk,def=excluded.def,spd=excluded.spd,updated_at=now();
    v_result:=jsonb_build_object('message','防守怪獸已登記');
  elsif p_action='pvp_unregister' then
    delete from arena_live_internal.pvp_defenders where user_id=v_uid;
    v_result:=jsonb_build_object('message','已取消競技場防守登記');
  elsif p_action='raid_claim' then
    v_boss_id:=p_data->>'boss_id';
    select * into v_boss from public.arena_live_raid_boss where id=v_boss_id;
    if not found or v_boss.current_hp<>0 then raise exception '世界王尚未討伐成功'; end if;
    select damage+support into v_contribution from arena_live_internal.raid_contributions where boss_id=v_boss_id and user_id=v_uid and claimed_at is null for update;
    if not found then raise exception '沒有可領取的討伐獎勵'; end if;
    v_reward:=floor(arena_live_internal.raid_pool(v_boss.max_hp)::numeric*v_contribution/greatest(1,(SELECT sum(x.damage+x.support) FROM arena_live_internal.raid_contributions x WHERE x.boss_id=v_boss.id)))::int;
    update arena_live_internal.raid_contributions set claimed_at=now() where boss_id=v_boss_id and user_id=v_uid;
    update public.arena_live_users set gold=coalesce(gold,0)+v_reward where user_id=v_uid;
    v_result:=jsonb_build_object('message','領取討伐貢獻獎勵 '||v_reward||'G','reward',v_reward);
  elsif p_action='raid' then
    if v_u.stamina < 15 then raise exception '需要 15 點體力'; end if;
    v_boss_id:=arena_live_internal.ensure_raid(v_date);
    select * into v_boss from public.arena_live_raid_boss where id=v_boss_id for update;
    if not coalesce(v_boss.is_active,false) then raise exception '今日世界王已被討伐'; end if;
    SELECT coalesce(attempts,0) INTO v_attempts FROM arena_live_internal.raid_contributions WHERE boss_id=v_boss.id AND user_id=v_uid;
    IF coalesce(v_attempts,0)>=3 THEN RAISE EXCEPTION '今日世界王已達三次挑戰上限'; END IF;
    SELECT * INTO v_fighter FROM arena_live_internal.unit_stats(v_m);
    v_strategy:=coalesce(p_data->>'strategy','assault');
    v_phase:=CASE WHEN v_boss.current_hp>v_boss.max_hp*.6 THEN 1 WHEN v_boss.current_hp>v_boss.max_hp*.3 THEN 2 ELSE 3 END;
    v_raid_result:=arena_live_internal.raid_attempt(v_fighter.hp,v_fighter.atk,v_fighter.def,v_fighter.spd,v_phase,v_strategy);
    v_damage:=least(v_boss.current_hp,(v_raid_result->>'damage')::int);
    v_support:=least(v_damage,(v_raid_result->>'support')::int);
    v_remaining:=greatest(0,v_boss.current_hp-v_damage);
    UPDATE public.arena_live_raid_boss SET current_hp=v_remaining,is_active=v_remaining>0 WHERE id=v_boss.id;
    INSERT INTO arena_live_internal.raid_contributions(boss_id,user_id,damage,attempts,support) VALUES(v_boss.id,v_uid,v_damage,1,v_support)
      ON CONFLICT(boss_id,user_id) DO UPDATE SET damage=arena_live_internal.raid_contributions.damage+excluded.damage,attempts=arena_live_internal.raid_contributions.attempts+1,support=arena_live_internal.raid_contributions.support+excluded.support;
    UPDATE public.arena_live_users SET stamina=stamina-15,gold=gold+CASE WHEN coalesce(v_attempts,0)=0 THEN 20 ELSE 0 END WHERE user_id=v_uid;
    v_result:=v_raid_result||jsonb_build_object('message',CASE WHEN v_remaining=0 THEN '討伐成功！可領取貢獻獎勵' ELSE '共鬥完成' END,'damage',v_damage,'support',v_support,'participationReward',CASE WHEN coalesce(v_attempts,0)=0 THEN 20 ELSE 0 END);
  elsif p_action='battle' then
    v_result:=arena_live_internal.resolve_battle(v_uid,v_m,p_data);
    v_key:='battle_count';
  elsif p_action='chat' then
    v_text:=trim(p_data->>'text');
    if length(coalesce(v_text,''))<1 or length(v_text)>100 then raise exception '聊天訊息需為 1～100 字'; end if;
    if v_u.last_message_at is not null and now()-v_u.last_message_at<interval '3 seconds'
      then raise exception '聊天過於頻繁，請稍後再試'; end if;
    update public.arena_live_users set last_message_at=now() where user_id=v_uid;
    insert into public.arena_live_messages(channel,user_id,username,text) values('world',v_uid::text,v_u.username,v_text);
  elsif p_action='claim' then
    v_result:=arena_live_internal.claim_quest(v_uid,v_date,p_data);
  elsif p_action in ('guild_create','guild_join','guild_leave','guild_donate','guild_buy') then
    v_result:=arena_live_internal.guild_action(v_uid,v_u,p_action,p_data);
  elsif p_action='gift' then
    v_mon_id := (p_data->>'friend_id')::uuid;
    if v_mon_id is null or v_mon_id=v_uid then raise exception '好友無效'; end if;
    perform 1 from public.arena_live_friends where user_id=v_uid and friend_uid=v_mon_id and status=1;
    if not found then raise exception '只能贈送體力給好友'; end if;
    perform 1 from public.arena_live_gifts where sender=v_uid::text and receiver=v_mon_id::text and date=v_date;
    if found then raise exception '今天已經贈送過'; end if;
    insert into public.arena_live_gifts(sender,receiver,date,claimed) values(v_uid::text,v_mon_id::text,v_date,false);
  end if;

  PERFORM arena_live_internal.progress_quest(v_uid,v_date,v_key);
  return arena_live_internal.finish_action(v_uid,v_request,p_action,p_data,coalesce(v_result,jsonb_build_object('message','操作成功！')),v_u.gold);
end; $function$;
REVOKE ALL ON FUNCTION public.arena_live_game_action(text,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.arena_live_game_action(text,jsonb) TO authenticated;


CREATE OR REPLACE FUNCTION public.arena_live_health() RETURNS jsonb LANGUAGE sql STABLE SET search_path TO pg_catalog,pg_temp AS $$ SELECT jsonb_build_object('version',2,'combatBalance',3,'namespace','arena_live') $$;
REVOKE ALL ON FUNCTION public.arena_live_health() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.arena_live_health() TO anon, authenticated;
NOTIFY pgrst,'reload schema';