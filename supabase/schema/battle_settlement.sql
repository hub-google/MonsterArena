-- Private battle settlement. The public game_action owns authentication,
-- the player/monster locks, idempotency, quest progress and gold ledger.
CREATE OR REPLACE FUNCTION arena_internal.resolve_battle(v_uid uuid,v_m public.monsters,p_data jsonb)
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
  v_defender arena_internal.pvp_defenders%rowtype;
  v_enemy_family int;
  v_enemy_stage int;
  v_target uuid;
  v_pvp boolean:=false;
  v_fighter record;
  v_tactical jsonb;
  v_opponent public.monsters%rowtype;
  v_opponent_stats record;
BEGIN
    -- Ignore legacy caller-provided battleId and won. The server owns all outcomes.
    -- The owning user row is FOR UPDATE locked above, serializing requests across tabs.
    -- A replay cannot instantly farm wins or daily battle rewards.
    perform 1 from public.battle_records
      where user_id=v_uid and created_at>clock_timestamp()-interval '5 seconds'
      limit 1;
    if found then raise exception '對戰冷卻中，請 5 秒後再挑戰'; end if;
    v_encounter:=coalesce(p_data->>'encounter','wild');
    if coalesce(v_m.is_frozen,false) then raise exception '凍結的怪獸不能出戰'; end if;
    select count(*) into v_count from public.battle_records where user_id=v_uid
      and created_at>=date_trunc('day',now() at time zone 'Asia/Taipei') at time zone 'Asia/Taipei';
    if v_count>=30 then raise exception '今日已達 30 場挑戰上限'; end if;
    SELECT * INTO v_fighter FROM arena_internal.unit_stats(v_m);
    v_own_max_hp:=v_fighter.hp;
    v_own_hp:=v_own_max_hp;
    v_pvp:=v_encounter='pvp';
    if v_pvp then
      v_target:=nullif(p_data->>'opponent_id','')::uuid;
      if v_target is null or v_target=v_uid then raise exception '對手無效'; end if;
      select * into v_defender from arena_internal.pvp_defenders where user_id=v_target;
      if not found then raise exception '對手未登記防守怪獸'; end if;
      SELECT * INTO v_opponent FROM public.monsters WHERE monster_id=v_defender.monster_id AND user_id=v_target;
      IF NOT FOUND OR coalesce(v_opponent.is_dead,false) OR coalesce(v_opponent.is_frozen,false) OR v_opponent.life_stage<2 OR v_opponent.repair_until>now() THEN RAISE EXCEPTION '對手機體目前不可出戰'; END IF;
      SELECT * INTO v_opponent_stats FROM arena_internal.unit_stats(v_opponent);
      IF abs(v_m.life_stage-v_opponent.life_stage)>1 OR greatest(arena_internal.power_rating(v_fighter.hp,v_fighter.atk,v_fighter.def,v_fighter.spd),arena_internal.power_rating(v_opponent_stats.hp,v_opponent_stats.atk,v_opponent_stats.def,v_opponent_stats.spd)) > 1.45*least(arena_internal.power_rating(v_fighter.hp,v_fighter.atk,v_fighter.def,v_fighter.spd),arena_internal.power_rating(v_opponent_stats.hp,v_opponent_stats.atk,v_opponent_stats.def,v_opponent_stats.spd)) THEN RAISE EXCEPTION '戰力差距過大，請選擇同階或相近戰力的對手'; END IF;
      select count(*) into v_count from arena_internal.pvp_results where attacker_id=v_uid and battle_day=v_date::date;
      if v_count>=5 then raise exception '今日玩家對戰已達 5 場上限'; end if;
      if exists(select 1 from arena_internal.pvp_results where attacker_id=v_uid and defender_id=v_target and battle_day=v_date::date)
        then raise exception '今天已挑戰過這位玩家'; end if;
      v_enemy_name:=v_opponent.name;v_enemy_type:=v_opponent.type;v_enemy_family:=v_opponent.family;
      v_enemy_stage:=v_opponent.life_stage;v_enemy_max_hp:=v_opponent_stats.hp;v_enemy_atk:=v_opponent_stats.atk;
      v_enemy_def:=v_opponent_stats.def;v_enemy_spd:=v_opponent_stats.spd;
    else
      select * into v_enc from arena_internal.encounter(v_encounter);
      if not found then raise exception '無效的對戰類型'; end if;
      v_enemy_name:=v_enc.name;v_enemy_type:=v_enc.kind;v_enemy_family:=v_enc.family;v_enemy_stage:=v_enc.stage;
      v_enemy_max_hp:=v_enc.hp;v_enemy_atk:=v_enc.atk;v_enemy_def:=v_enc.def;v_enemy_spd:=v_enc.spd;
    end if;
    v_enemy_hp:=v_enemy_max_hp;
    IF v_encounter='boss' AND NOT (p_data ? 'moves') THEN RAISE EXCEPTION '首領挑戰需要戰術指令'; END IF;
    IF v_encounter='boss' THEN
      v_tactical:=arena_internal.boss_tactics(v_m.life_stage,v_fighter.hp,v_fighter.atk,v_fighter.def,v_fighter.spd,p_data->'moves');
      v_own_hp:=(v_tactical->>'ownHp')::double precision; v_enemy_hp:=(v_tactical->>'enemyHp')::double precision;
      v_won:=(v_tactical->>'won')::boolean; v_events:=v_tactical->'events';
    ELSE
      v_tactical:=arena_internal.auto_battle(
        ARRAY[v_fighter.hp,v_fighter.atk,v_fighter.def,v_fighter.spd],ARRAY[v_enemy_max_hp,v_enemy_atk,v_enemy_def,v_enemy_spd],
        arena_internal.role_id(v_m.life_stage,v_m.family,v_m.type),arena_internal.role_id(v_enemy_stage,v_enemy_family,v_enemy_type),true);
      v_won:=(v_tactical->>'won')::boolean; v_events:=v_tactical->'events';
      v_own_hp:=(v_tactical->>'ownHp')::double precision; v_enemy_hp:=(v_tactical->>'enemyHp')::double precision;
    END IF;
    v_battle:=gen_random_uuid()::text;
    insert into public.battle_records(user_id,battle_id,monster_id,won)
      values(v_uid,v_battle,v_mon_id,v_won);
    update public.monsters set battles=coalesce(battles,0)+1,
      wins=coalesce(wins,0)+case when v_won then 1 else 0 end where monster_id=v_mon_id;
    v_reward:=0;
    if v_pvp then
      insert into arena_internal.pvp_results(attacker_id,defender_id,battle_day,battle_id,won)
        values(v_uid,v_target,v_date::date,v_battle,v_won);
      insert into arena_internal.pvp_scores(season,user_id,points,wins,losses)
        values(v_season,v_uid,case when v_won then 3 else 1 end,case when v_won then 1 else 0 end,case when v_won then 0 else 1 end)
        on conflict(season,user_id) do update set points=arena_internal.pvp_scores.points+excluded.points,
        wins=arena_internal.pvp_scores.wins+excluded.wins,losses=arena_internal.pvp_scores.losses+excluded.losses;
    elsif v_won then
      insert into arena_internal.pve_first_clear(user_id,clear_day,encounter) values(v_uid,v_date::date,v_encounter)
        on conflict do nothing;
      if found then
        v_reward:=v_enc.reward;
        update public.users set gold=coalesce(gold,0)+v_reward where user_id=v_uid;
      end if;
    end if;
    v_result:=jsonb_build_object(
      'message',case when v_won then '對戰勝利！' else '對戰失敗' end,
      'won',v_won,'battleId',v_battle,'events',v_events,
      'ownMaxHp',v_own_max_hp,'enemyMaxHp',v_enemy_max_hp,
      'enemyName',v_enemy_name,'enemyType',v_enemy_type,'enemyFamily',v_enemy_family,'enemyStage',v_enemy_stage,'enemySkin',case when v_pvp then (select m.skin_id from public.monsters m where m.monster_id=v_defender.monster_id and m.user_id=v_defender.user_id) else null end,'reward',v_reward,
      'enemyAtk',v_enemy_atk,'enemyDef',v_enemy_def,'enemySpd',v_enemy_spd,
      'ownHp',v_own_hp,'enemyHp',v_enemy_hp);
  RETURN v_result;
END; $battle$;
REVOKE ALL ON FUNCTION arena_internal.resolve_battle(uuid,public.monsters,jsonb) FROM PUBLIC, anon, authenticated;
