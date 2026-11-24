-- Isolated CI fixture generated from Game schema metadata, without any player data.
-- NEVER execute on the shared Game database.
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE SCHEMA auth;
CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,raw_user_meta_data jsonb);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
$$;
CREATE TABLE public."battle_records" (
  "user_id" uuid NOT NULL,
  "battle_id" text NOT NULL,
  "monster_id" uuid NOT NULL,
  "won" boolean NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public."daily_quests" (
  "quest_id" text NOT NULL,
  "user_id" uuid,
  "date" text,
  "feed_count" integer DEFAULT 0,
  "train_count" integer DEFAULT 0,
  "battle_count" integer DEFAULT 0,
  "claimed" text[] DEFAULT '{}'::text[],
  "clean_count" integer DEFAULT 0 NOT NULL
);
CREATE TABLE public."friends" (
  "friend_record_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid,
  "friend_uid" uuid,
  "friend_name" text,
  "created_at" timestamp with time zone DEFAULT now(),
  "status" integer DEFAULT 0
);
CREATE TABLE public."game_chip_reserves" (
  "user_id" uuid NOT NULL,
  "item_id" text NOT NULL,
  "bonus" numeric NOT NULL,
  "quantity" integer DEFAULT 0 NOT NULL
);
CREATE TABLE public."gifts" (
  "gift_id" text DEFAULT (gen_random_uuid())::text NOT NULL,
  "sender" text,
  "receiver" text,
  "date" text NOT NULL,
  "claimed" boolean DEFAULT false NOT NULL
);
CREATE TABLE public."guild_applications" (
  "application_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "guild_id" uuid,
  "user_id" uuid,
  "created_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE public."guild_members" (
  "member_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "guild_id" uuid,
  "user_id" uuid,
  "role" smallint DEFAULT 0,
  "contribution" integer DEFAULT 0
);
CREATE TABLE public."guilds" (
  "guild_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "guild_name" text NOT NULL,
  "leader_id" uuid,
  "level" integer DEFAULT 1,
  "total_contribution" integer DEFAULT 0,
  "created_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE public."messages" (
  "message_id" text DEFAULT (gen_random_uuid())::text NOT NULL,
  "channel" text NOT NULL,
  "user_id" text,
  "username" text,
  "text" text NOT NULL,
  "timestamp" timestamp with time zone DEFAULT now()
);
CREATE TABLE public."monsters" (
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
CREATE TABLE public."raid_boss" (
  "id" text DEFAULT (gen_random_uuid())::text NOT NULL,
  "name" text NOT NULL,
  "current_hp" integer NOT NULL,
  "max_hp" integer NOT NULL,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE public."user_inventory" (
  "inventory_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid,
  "item_type" smallint DEFAULT 1,
  "item_id" text NOT NULL,
  "quantity" integer DEFAULT 0
);
CREATE TABLE public."users" (
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
ALTER TABLE public."battle_records" ADD CONSTRAINT "battle_records_pkey" PRIMARY KEY (user_id, battle_id);
ALTER TABLE public."daily_quests" ADD CONSTRAINT "daily_quests_pkey" PRIMARY KEY (quest_id);
ALTER TABLE public."friends" ADD CONSTRAINT "friends_pkey" PRIMARY KEY (friend_record_id);
ALTER TABLE public."friends" ADD CONSTRAINT "friends_user_id_friend_uid_key" UNIQUE (user_id, friend_uid);
ALTER TABLE public."game_chip_reserves" ADD CONSTRAINT "game_chip_reserves_bonus_check" CHECK (((bonus > (5)::numeric) AND (bonus <= (1000000)::numeric)));
ALTER TABLE public."game_chip_reserves" ADD CONSTRAINT "game_chip_reserves_item_id_check" CHECK ((item_id = ANY (ARRAY['chip_atk'::text, 'chip_def'::text, 'chip_hp'::text, 'chip_spd'::text])));
ALTER TABLE public."game_chip_reserves" ADD CONSTRAINT "game_chip_reserves_pkey" PRIMARY KEY (user_id, item_id, bonus);
ALTER TABLE public."game_chip_reserves" ADD CONSTRAINT "game_chip_reserves_quantity_check" CHECK ((quantity >= 0));
ALTER TABLE public."gifts" ADD CONSTRAINT "gifts_pkey" PRIMARY KEY (gift_id);
ALTER TABLE public."guild_applications" ADD CONSTRAINT "guild_applications_guild_id_user_id_key" UNIQUE (guild_id, user_id);
ALTER TABLE public."guild_applications" ADD CONSTRAINT "guild_applications_pkey" PRIMARY KEY (application_id);
ALTER TABLE public."guild_members" ADD CONSTRAINT "guild_members_guild_id_user_id_key" UNIQUE (guild_id, user_id);
ALTER TABLE public."guild_members" ADD CONSTRAINT "guild_members_pkey" PRIMARY KEY (member_id);
ALTER TABLE public."guilds" ADD CONSTRAINT "guilds_guild_name_key" UNIQUE (guild_name);
ALTER TABLE public."guilds" ADD CONSTRAINT "guilds_pkey" PRIMARY KEY (guild_id);
ALTER TABLE public."messages" ADD CONSTRAINT "messages_pkey" PRIMARY KEY (message_id);
ALTER TABLE public."monsters" ADD CONSTRAINT "monsters_pkey" PRIMARY KEY (monster_id);
ALTER TABLE public."raid_boss" ADD CONSTRAINT "raid_boss_pkey" PRIMARY KEY (id);
ALTER TABLE public."user_inventory" ADD CONSTRAINT "user_inventory_pkey" PRIMARY KEY (inventory_id);
ALTER TABLE public."user_inventory" ADD CONSTRAINT "user_inventory_user_id_item_id_key" UNIQUE (user_id, item_id);
ALTER TABLE public."users" ADD CONSTRAINT "users_email_key" UNIQUE (email);
ALTER TABLE public."users" ADD CONSTRAINT "users_pkey" PRIMARY KEY (user_id);
ALTER TABLE public."users" ADD CONSTRAINT "users_username_key" UNIQUE (username);
ALTER TABLE public."battle_records" ADD CONSTRAINT "battle_records_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;
ALTER TABLE public."daily_quests" ADD CONSTRAINT "daily_quests_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;
ALTER TABLE public."friends" ADD CONSTRAINT "friends_friend_uid_fkey" FOREIGN KEY (friend_uid) REFERENCES users(user_id) ON DELETE CASCADE;
ALTER TABLE public."friends" ADD CONSTRAINT "friends_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;
ALTER TABLE public."game_chip_reserves" ADD CONSTRAINT "game_chip_reserves_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;
ALTER TABLE public."guild_applications" ADD CONSTRAINT "guild_applications_guild_id_fkey" FOREIGN KEY (guild_id) REFERENCES guilds(guild_id) ON DELETE CASCADE;
ALTER TABLE public."guild_applications" ADD CONSTRAINT "guild_applications_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;
ALTER TABLE public."guild_members" ADD CONSTRAINT "guild_members_guild_id_fkey" FOREIGN KEY (guild_id) REFERENCES guilds(guild_id) ON DELETE CASCADE;
ALTER TABLE public."guild_members" ADD CONSTRAINT "guild_members_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;
ALTER TABLE public."guilds" ADD CONSTRAINT "guilds_leader_id_fkey" FOREIGN KEY (leader_id) REFERENCES users(user_id) ON DELETE SET NULL;
ALTER TABLE public."monsters" ADD CONSTRAINT "monsters_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;
ALTER TABLE public."user_inventory" ADD CONSTRAINT "user_inventory_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;
ALTER TABLE public."users" ADD CONSTRAINT "users_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
