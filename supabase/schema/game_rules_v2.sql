ALTER TABLE public.monsters ADD COLUMN IF NOT EXISTS repair_until timestamptz;
ALTER TABLE public.monsters ADD COLUMN IF NOT EXISTS skin_id text;
ALTER TABLE public.monsters ADD COLUMN IF NOT EXISTS training_hp int NOT NULL DEFAULT 0 CHECK(training_hp BETWEEN 0 AND 30);
ALTER TABLE public.monsters ADD COLUMN IF NOT EXISTS training_atk int NOT NULL DEFAULT 0 CHECK(training_atk BETWEEN 0 AND 30);
ALTER TABLE public.monsters ADD COLUMN IF NOT EXISTS training_def int NOT NULL DEFAULT 0 CHECK(training_def BETWEEN 0 AND 30);
ALTER TABLE public.monsters ADD COLUMN IF NOT EXISTS training_spd int NOT NULL DEFAULT 0 CHECK(training_spd BETWEEN 0 AND 30);
ALTER TABLE public.monsters ADD COLUMN IF NOT EXISTS core_quality int NOT NULL DEFAULT 0 CHECK(core_quality BETWEEN 0 AND 5);
ALTER TABLE public.monsters ADD COLUMN IF NOT EXISTS legacy_combat jsonb;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='arena_training_budget' AND conrelid='public.monsters'::regclass) THEN ALTER TABLE public.monsters ADD CONSTRAINT arena_training_budget CHECK(training_hp+training_atk+training_def+training_spd<=60); END IF; END $$;
UPDATE public.monsters SET legacy_combat=jsonb_build_object('hp',combat_hp,'atk',combat_atk,'def',combat_def,'spd',combat_spd,'train_count',train_count),
 training_hp=least(15,greatest(0,(coalesce(train_count,0)+3)/4)),
 training_atk=least(15,greatest(0,(coalesce(train_count,0)+2)/4)),
 training_def=least(15,greatest(0,(coalesce(train_count,0)+1)/4)),
 training_spd=least(15,greatest(0,coalesce(train_count,0)/4))
 WHERE legacy_combat IS NULL AND coalesce(train_count,0)>0 AND training_hp+training_atk+training_def+training_spd=0;
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
ALTER TABLE arena_internal.raid_contributions ADD COLUMN IF NOT EXISTS support bigint NOT NULL DEFAULT 0 CHECK(support>=0);
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
    ('wild','廢棄機械兵',0,3,2,115::double precision,16::double precision,12::double precision,12::double precision,10),
    ('stage2','失控巡邏機',2,4,3,117,23,18,18,20),
    ('stage3','重裝守衛',2,4,4,156,26,38,18,40),
    ('stage4','疾風獵手',1,7,5,197,38,22,42,60),
    ('stage5','深淵機甲',2,7,6,226,44,35,32,100),
    ('boss','終極機甲首領',1,7,6,300,52,40,35,120)
  ) AS v(id,name,kind,family,stage,hp,atk,def,spd,reward)
  WHERE v.id=p_name;
$$;
REVOKE ALL ON FUNCTION arena_internal.encounter(text) FROM PUBLIC, anon, authenticated;


-- Factions form a directed cycle; undeveloped units have no combat affinity.
CREATE OR REPLACE FUNCTION arena_internal.role_id(p_stage int,p_family int,p_type int) RETURNS int LANGUAGE sql IMMUTABLE SET search_path TO pg_catalog,pg_temp AS $$
 SELECT CASE WHEN coalesce(p_stage,1)<3 OR coalesce(p_type,0)=0 THEN 0 ELSE (CASE p_family WHEN 1 THEN 0 WHEN 2 THEN 0 WHEN 4 THEN 2 WHEN 5 THEN 2 WHEN 6 THEN 4 WHEN 7 THEN 4 WHEN 3 THEN 6 WHEN 8 THEN 6 ELSE 0 END)+CASE WHEN p_type=1 THEN 1 ELSE 2 END END;
$$;
REVOKE ALL ON FUNCTION arena_internal.role_id(int,int,int) FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE FUNCTION arena_internal.base_profiles(p_stage int)
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
REVOKE ALL ON FUNCTION arena_internal.base_profiles(int) FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE FUNCTION arena_internal.unit_stats(m public.monsters)
RETURNS TABLE(hp double precision,atk double precision,def double precision,spd double precision)
LANGUAGE sql IMMUTABLE SET search_path TO pg_catalog,pg_temp AS $$
 SELECT floor(b.hp*(1+coalesce(m.core_quality,0)/100.0)+coalesce(m.training_hp,0)*2+b.hp*.05*((CASE WHEN m.chip_slot_1='chip_hp' THEN 1 ELSE 0 END)+(CASE WHEN m.chip_slot_2='chip_hp' THEN 1 ELSE 0 END))),
 floor(b.atk*(1+coalesce(m.core_quality,0)/100.0)+coalesce(m.training_atk,0)*0.5+b.atk*.05*((CASE WHEN m.chip_slot_1='chip_atk' THEN 1 ELSE 0 END)+(CASE WHEN m.chip_slot_2='chip_atk' THEN 1 ELSE 0 END))),
 floor(b.def*(1+coalesce(m.core_quality,0)/100.0)+coalesce(m.training_def,0)*0.5+b.def*.05*((CASE WHEN m.chip_slot_1='chip_def' THEN 1 ELSE 0 END)+(CASE WHEN m.chip_slot_2='chip_def' THEN 1 ELSE 0 END))),
 floor(b.spd*(1+coalesce(m.core_quality,0)/100.0)+coalesce(m.training_spd,0)*0.5+b.spd*.05*((CASE WHEN m.chip_slot_1='chip_spd' THEN 1 ELSE 0 END)+(CASE WHEN m.chip_slot_2='chip_spd' THEN 1 ELSE 0 END)))
 FROM arena_internal.base_profiles(m.life_stage) b WHERE b.role=arena_internal.role_id(m.life_stage,m.family,m.type);
$$;
REVOKE ALL ON FUNCTION arena_internal.unit_stats(public.monsters) FROM PUBLIC, anon, authenticated;
-- All automatic matches use this engine. Advantage increases damage rather than predetermining a winner.
CREATE OR REPLACE FUNCTION arena_internal.duel_damage(p_atk double precision,p_def double precision,p_role int,p_other int,p_round int,p_roll double precision)
RETURNS int LANGUAGE sql IMMUTABLE SET search_path TO pg_catalog,pg_temp AS $$
 SELECT greatest(1,floor(
 p_atk*(CASE WHEN p_other=7 AND p_round%3=0 THEN 1 WHEN p_role=1 AND p_round%3=1 THEN 1.12 WHEN p_role=2 AND p_round%2=0 THEN 1.10 WHEN p_role=4 AND p_round%3=0 THEN 1.10 WHEN p_role=5 THEN 1.04 WHEN p_role=6 AND p_round%3=0 THEN 1.16 ELSE 1 END)
 *(CASE WHEN p_role=5 THEN .88+p_roll*.24 ELSE .85+p_roll*.30 END)
 *100/(100+p_def*(CASE WHEN p_role=4 AND p_round%3=0 AND p_other<>7 THEN .85 ELSE 1 END))
 *(CASE WHEN p_role>0 AND p_other>0 AND (p_other-1)/2=((p_role-1)/2+1)%4 THEN 1.045 ELSE 1 END)
 *(CASE WHEN p_other=3 THEN .95 WHEN p_other=7 AND p_round%3=0 THEN .93 ELSE 1 END)
 ))::int;
$$;
REVOKE ALL ON FUNCTION arena_internal.duel_damage(double precision,double precision,int,int,int,double precision) FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE FUNCTION arena_internal.auto_battle(a double precision[],b double precision[],role_a int,role_b int,log_events boolean DEFAULT true)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SET search_path TO pg_catalog,pg_temp AS $$
DECLARE h double precision[]:=ARRAY[a[1],b[1]]; mx double precision[]:=h; atk double precision[]:=ARRAY[a[2],b[2]]; def double precision[]:=ARRAY[a[3],b[3]];
 roles int[]:=ARRAY[role_a,role_b]; first int; attacker int; defender int; dmg int; r int; rounds int:=0; events jsonb:='[]'; won boolean;
BEGIN
 FOR r IN 1..25 LOOP
  rounds:=r;
  first:=CASE WHEN random()<.5+.4*(a[4]-b[4])/greatest(1,a[4]+b[4]) THEN 1 ELSE 2 END;
  FOR step IN 1..2 LOOP
   attacker:=CASE WHEN step=1 THEN first ELSE 3-first END; defender:=3-attacker;
   dmg:=least(h[defender],arena_internal.duel_damage(atk[attacker],def[defender],roles[attacker],roles[defender],r,random()))::int;
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
REVOKE ALL ON FUNCTION arena_internal.auto_battle(double precision[],double precision[],int,int,boolean) FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE FUNCTION arena_internal.refresh_unit(p_id uuid)
RETURNS void LANGUAGE sql SET search_path TO pg_catalog,pg_temp AS $$
 UPDATE public.monsters m SET combat_hp=f.hp,combat_atk=f.atk,combat_def=f.def,combat_spd=f.spd FROM public.monsters source CROSS JOIN LATERAL arena_internal.unit_stats(source) f WHERE m.monster_id=p_id AND source.monster_id=m.monster_id AND m.life_stage>=2 AND (m.combat_hp,m.combat_atk,m.combat_def,m.combat_spd) IS DISTINCT FROM (f.hp,f.atk,f.def,f.spd);
$$;
REVOKE ALL ON FUNCTION arena_internal.refresh_unit(uuid) FROM PUBLIC, anon, authenticated;

-- Co-op: each assault has ten rounds, phase-appropriate tactics and bounded support.
CREATE OR REPLACE FUNCTION arena_internal.power_rating(hp double precision,atk double precision,def double precision,spd double precision)
RETURNS double precision LANGUAGE sql IMMUTABLE SET search_path TO pg_catalog,pg_temp AS $$
 SELECT hp/5+atk+def*.5+spd*.3;
$$;
REVOKE ALL ON FUNCTION arena_internal.power_rating(double precision,double precision,double precision,double precision) FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE FUNCTION arena_internal.raid_attempt(p_hp double precision,p_atk double precision,p_def double precision,p_spd double precision,p_phase int,p_strategy text)
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
REVOKE ALL ON FUNCTION arena_internal.raid_attempt(double precision,double precision,double precision,double precision,int,text) FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE FUNCTION arena_internal.raid_pool(p_hp bigint) RETURNS int LANGUAGE sql IMMUTABLE SET search_path TO pg_catalog,pg_temp AS $$
 SELECT greatest(150,least(5000,ceil(p_hp/6.0)::int));
$$;
REVOKE ALL ON FUNCTION arena_internal.raid_pool(bigint) FROM PUBLIC, anon, authenticated;
-- Replenish stamina from elapsed time; discard time spent at the cap.
CREATE OR REPLACE FUNCTION arena_internal.refresh_stamina(p_uid uuid) RETURNS public.users LANGUAGE plpgsql SET search_path TO pg_catalog,pg_temp AS $$
DECLARE u public.users; ticks int;
BEGIN
 SELECT * INTO u FROM public.users WHERE user_id=p_uid FOR UPDATE;
 IF NOT FOUND THEN RETURN NULL; END IF;
 ticks:=greatest(0,floor(extract(epoch FROM (now()-coalesce(u.stamina_updated_at,now())))/600)::int);
 UPDATE public.users SET stamina=least(100,coalesce(stamina,0)+ticks),max_stamina=100,
 stamina_updated_at=CASE WHEN coalesce(stamina,0)+ticks>=100 OR stamina_updated_at IS NULL THEN now() ELSE least(now(),stamina_updated_at+ticks*interval '10 minutes') END,
 last_login_at=now() WHERE user_id=p_uid RETURNING * INTO u;
 RETURN u;
END $$;
REVOKE ALL ON FUNCTION arena_internal.refresh_stamina(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION arena_internal.ensure_raid(p_day text)
RETURNS text LANGUAGE plpgsql SET search_path TO pg_catalog,pg_temp AS $$
DECLARE v_id text:='daily:'||p_day; v_hp int;
BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.raid_boss WHERE id=v_id) THEN
    SELECT greatest(250,least(100000000,coalesce(sum(q.best)*2.2,250)))::int INTO v_hp FROM
 (SELECT u.user_id,max((arena_internal.raid_attempt(f.hp,f.atk,f.def,f.spd,1,'assault')->>'damage')::int) best
 FROM public.users u JOIN public.monsters m USING(user_id) CROSS JOIN LATERAL arena_internal.unit_stats(m) f
 WHERE u.last_login_at>=now()-interval '1 day' AND NOT coalesce(m.is_dead,false) AND NOT coalesce(m.is_frozen,false) AND m.life_stage>=2
 GROUP BY u.user_id) q;
    INSERT INTO public.raid_boss(id,name,current_hp,max_hp,is_active)
    VALUES(v_id,'巨型機甲首領',v_hp,v_hp,true) ON CONFLICT(id) DO NOTHING;
  END IF;
  RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION arena_internal.ensure_raid(text) FROM PUBLIC, anon, authenticated;
CREATE INDEX IF NOT EXISTS arena_chat_channel_cursor ON public.messages(channel,timestamp DESC,message_id DESC);
CREATE INDEX IF NOT EXISTS arena_battle_user_created ON public.battle_records(user_id,created_at DESC);

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
