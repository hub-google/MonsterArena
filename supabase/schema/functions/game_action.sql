-- Canonical source for next main Game rules; not yet applied to the shared database.
-- Historical migrations are immutable records; edit this file for future changes.
CREATE OR REPLACE FUNCTION public.game_action(p_action text, p_data jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_uid uuid := (select auth.uid());
  v_u public.users%rowtype;
  v_m public.monsters%rowtype;
  v_mon_id uuid;
  v_count int;
  v_rescue boolean := false;
  v_date text := (now() at time zone 'Asia/Taipei')::date::text;
  v_key text;
  v_reward int;
  v_boss public.raid_boss%rowtype;
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
  select * into v_u from public.users where user_id=v_uid FOR NO KEY UPDATE;
  if not found then raise exception '找不到使用者資料，請重新登入'; end if;
  v_u:=arena_internal.refresh_stamina(v_uid);
  p_data:=coalesce(p_data,'{}'::jsonb);
  if jsonb_typeof(p_data)<>'object' then raise exception '操作參數錯誤'; end if;
  if p_action='capabilities' then
    return jsonb_build_object('version',2,'combatBalance',3,'fixedEncounters',true,'asyncPvp',true,'dailyRaid',true,'idempotency',true);
  end if;
  if p_action='raid_status' then
    v_boss_id:=arena_internal.ensure_raid(v_date);
    select * into v_boss from public.raid_boss where id=v_boss_id;
    select damage,attempts,support into v_contribution,v_attempts,v_support from arena_internal.raid_contributions where boss_id=v_boss_id and user_id=v_uid;
    return to_jsonb(v_boss)||jsonb_build_object('my_damage',coalesce(v_contribution,0),'my_attempts',coalesce(v_attempts,0),'my_support',coalesce(v_support,0),'reward_pool',arena_internal.raid_pool(v_boss.max_hp),'claims',
      coalesce((select jsonb_agg(jsonb_build_object('boss_id',r.boss_id,'damage',r.damage,'reward',floor(arena_internal.raid_pool(b.max_hp)::numeric*(r.damage+r.support)/greatest(1,(SELECT sum(x.damage+x.support) FROM arena_internal.raid_contributions x WHERE x.boss_id=b.id)))) order by b.created_at desc)
        from arena_internal.raid_contributions r join public.raid_boss b on b.id=r.boss_id
        where r.user_id=v_uid and r.claimed_at is null and b.current_hp=0),'[]'::jsonb));
  end if;
  if p_action='pvp_list' then
    return jsonb_build_object('season',v_season,'registered',exists(select 1 from arena_internal.pvp_defenders d join public.monsters m on m.monster_id=d.monster_id and m.user_id=d.user_id where d.user_id=v_uid and not coalesce(m.is_dead,false) and not coalesce(m.is_frozen,false) and m.life_stage>=2 and (m.repair_until is null or m.repair_until<=now())),
      'opponents',coalesce((select jsonb_agg(to_jsonb(q) order by q.points desc,q.user_id) from
        (select d.user_id,u.username,m.name monster_name,m.family,m.life_stage stage,m.type,m.skin_id,f.hp,f.atk,f.def,f.spd,coalesce(s.points,0) points
         from arena_internal.pvp_defenders d join public.users u using(user_id) join public.monsters m on m.monster_id=d.monster_id and m.user_id=d.user_id cross join lateral arena_internal.unit_stats(m) f
         left join arena_internal.pvp_scores s on s.user_id=d.user_id and s.season=v_season
         where d.user_id<>v_uid and not coalesce(m.is_dead,false) and not coalesce(m.is_frozen,false) and (m.repair_until is null or m.repair_until<=now()) and m.life_stage>=2 order by coalesce(s.points,0) desc,d.user_id limit 30) q),'[]'::jsonb),
      'leaderboard',coalesce((select jsonb_agg(to_jsonb(q) order by q.points desc,q.user_id) from
        (select s.user_id,u.username,s.points,s.wins,s.losses from arena_internal.pvp_scores s join public.users u using(user_id)
         where s.season=v_season order by s.points desc,s.user_id limit 30) q),'[]'::jsonb));
  end if;
  v_request:=nullif(p_data->>'request_id','')::uuid;
  if v_request is not null then
    select action,payload_hash,result into v_cached from arena_internal.action_requests
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
    select count(*) into v_count from public.monsters where user_id=v_uid;
    if v_count >= 50 then raise exception '倉庫已滿 50 隻'; end if;
    if coalesce(v_u.gold,0)<100 then
      -- Only a player with no living pet may obtain a rescue egg.
      if exists(select 1 from public.monsters
        where user_id=v_uid and coalesce(is_dead,false)=false) then
        raise exception '金幣不足，需要 100G';
      end if;
      -- Rescue pets have no release-gold refund, even after growing up.
      -- Without this marker, repeatedly releasing free eggs minted gold.
      v_rescue := true;
    else
      update public.users set gold=gold-100 where user_id=v_uid;
    end if;
    insert into public.monsters(user_id,name,generation,life_stage,type,family,age_days,fullness,cleanliness,
      is_sick,is_dead,gene_hp,gene_atk,gene_def,gene_spd,combat_hp,combat_atk,combat_def,combat_spd,battles,wins,is_locked,last_updated_at,is_rescue)
    values(v_uid,'機械核心',1,1,0,(array[1,4,7,3])[1+floor(random()*4)::int],0,100,100,false,false,50,5,5,5,50,5,5,5,0,0,false,now(),v_rescue);
    return arena_internal.finish_action(v_uid,v_request,p_action,p_data,jsonb_build_object('message','核心啟動成功！'),v_u.gold);
  end if;

  if p_action in ('feed','clean','heal','train','evolve','breed','raid','battle','pvp_register') then
    PERFORM public.game_age_monsters();
  end if;
  if p_action in ('feed','clean','heal','train','evolve','release','lock','equip','unequip','skin_equip','raid','battle','pvp_register') then
    v_mon_id := nullif(p_data->>'monster_id','')::uuid;
    if v_mon_id is null then raise exception '請選擇怪獸'; end if;
    select * into v_m from public.monsters where monster_id=v_mon_id and user_id=v_uid for update;
    if not found then raise exception '怪獸不存在或不屬於您'; end if;
    if v_m.is_dead and p_action not in ('release','lock') then raise exception '已死亡的怪獸無法執行此操作'; end if;
    if v_m.repair_until is not null and v_m.repair_until<=now() then
      update public.monsters set is_sick=false,sick_time_start=null,repair_until=null where monster_id=v_mon_id returning * into v_m;
    end if;
    if v_m.repair_until is not null and p_action in ('train','battle','raid','pvp_register','evolve') then
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
    v_result:=arena_internal.purchase_item(v_uid,v_u,p_data);
  elsif p_action in ('skin_equip','feed','clean','heal','train','evolve','release','lock','equip','unequip','breed') then
    v_unit_result:=arena_internal.unit_action(v_uid,v_u,v_m,p_action,p_data);
    v_result:=v_unit_result->'result';
    v_key:=v_unit_result->>'quest_key';
  elsif p_action='pvp_register' then
    SELECT * INTO v_fighter FROM arena_internal.unit_stats(v_m);
    insert into arena_internal.pvp_defenders(user_id,monster_id,monster_name,family,stage,type,hp,atk,def,spd)
      values(v_uid,v_mon_id,coalesce(v_m.name,'怪獸'),coalesce(v_m.family,1),v_m.life_stage,coalesce(v_m.type,0),
      v_fighter.hp,v_fighter.atk,v_fighter.def,v_fighter.spd)
      on conflict(user_id) do update set monster_id=excluded.monster_id,monster_name=excluded.monster_name,
      family=excluded.family,stage=excluded.stage,type=excluded.type,hp=excluded.hp,atk=excluded.atk,def=excluded.def,spd=excluded.spd,updated_at=now();
    v_result:=jsonb_build_object('message','防守怪獸已登記');
  elsif p_action='pvp_unregister' then
    delete from arena_internal.pvp_defenders where user_id=v_uid;
    v_result:=jsonb_build_object('message','已取消競技場防守登記');
  elsif p_action='raid_claim' then
    v_boss_id:=p_data->>'boss_id';
    select * into v_boss from public.raid_boss where id=v_boss_id;
    if not found or v_boss.current_hp<>0 then raise exception '世界王尚未討伐成功'; end if;
    select damage+support into v_contribution from arena_internal.raid_contributions where boss_id=v_boss_id and user_id=v_uid and claimed_at is null for update;
    if not found then raise exception '沒有可領取的討伐獎勵'; end if;
    v_reward:=floor(arena_internal.raid_pool(v_boss.max_hp)::numeric*v_contribution/greatest(1,(SELECT sum(x.damage+x.support) FROM arena_internal.raid_contributions x WHERE x.boss_id=v_boss.id)))::int;
    update arena_internal.raid_contributions set claimed_at=now() where boss_id=v_boss_id and user_id=v_uid;
    update public.users set gold=coalesce(gold,0)+v_reward where user_id=v_uid;
    v_result:=jsonb_build_object('message','領取討伐貢獻獎勵 '||v_reward||'G','reward',v_reward);
  elsif p_action='raid' then
    if v_u.stamina < 15 then raise exception '需要 15 點體力'; end if;
    v_boss_id:=arena_internal.ensure_raid(v_date);
    select * into v_boss from public.raid_boss where id=v_boss_id for update;
    if not coalesce(v_boss.is_active,false) then raise exception '今日世界王已被討伐'; end if;
    SELECT coalesce(attempts,0) INTO v_attempts FROM arena_internal.raid_contributions WHERE boss_id=v_boss.id AND user_id=v_uid;
    IF coalesce(v_attempts,0)>=3 THEN RAISE EXCEPTION '今日世界王已達三次挑戰上限'; END IF;
    SELECT * INTO v_fighter FROM arena_internal.unit_stats(v_m);
    v_strategy:=coalesce(p_data->>'strategy','assault');
    v_phase:=CASE WHEN v_boss.current_hp>v_boss.max_hp*.6 THEN 1 WHEN v_boss.current_hp>v_boss.max_hp*.3 THEN 2 ELSE 3 END;
    v_raid_result:=arena_internal.raid_attempt(v_fighter.hp,v_fighter.atk,v_fighter.def,v_fighter.spd,v_phase,v_strategy);
    v_damage:=least(v_boss.current_hp,(v_raid_result->>'damage')::int);
    v_support:=least(v_damage,(v_raid_result->>'support')::int);
    v_remaining:=greatest(0,v_boss.current_hp-v_damage);
    UPDATE public.raid_boss SET current_hp=v_remaining,is_active=v_remaining>0 WHERE id=v_boss.id;
    INSERT INTO arena_internal.raid_contributions(boss_id,user_id,damage,attempts,support) VALUES(v_boss.id,v_uid,v_damage,1,v_support)
      ON CONFLICT(boss_id,user_id) DO UPDATE SET damage=arena_internal.raid_contributions.damage+excluded.damage,attempts=arena_internal.raid_contributions.attempts+1,support=arena_internal.raid_contributions.support+excluded.support;
    UPDATE public.users SET stamina=stamina-15,gold=gold+CASE WHEN coalesce(v_attempts,0)=0 THEN 20 ELSE 0 END WHERE user_id=v_uid;
    v_result:=v_raid_result||jsonb_build_object('message',CASE WHEN v_remaining=0 THEN '討伐成功！可領取貢獻獎勵' ELSE '共鬥完成' END,'damage',v_damage,'support',v_support,'participationReward',CASE WHEN coalesce(v_attempts,0)=0 THEN 20 ELSE 0 END);
  elsif p_action='battle' then
    v_result:=arena_internal.resolve_battle(v_uid,v_m,p_data);
    v_key:='battle_count';
  elsif p_action='chat' then
    v_text:=trim(p_data->>'text');
    if length(coalesce(v_text,''))<1 or length(v_text)>100 then raise exception '聊天訊息需為 1～100 字'; end if;
    if v_u.last_message_at is not null and now()-v_u.last_message_at<interval '3 seconds'
      then raise exception '聊天過於頻繁，請稍後再試'; end if;
    update public.users set last_message_at=now() where user_id=v_uid;
    insert into public.messages(channel,user_id,username,text) values('world',v_uid::text,v_u.username,v_text);
  elsif p_action='claim' then
    v_result:=arena_internal.claim_quest(v_uid,v_date,p_data);
  elsif p_action in ('guild_create','guild_join','guild_leave','guild_donate','guild_buy') then
    v_result:=arena_internal.guild_action(v_uid,v_u,p_action,p_data);
  elsif p_action='gift' then
    v_mon_id := (p_data->>'friend_id')::uuid;
    if v_mon_id is null or v_mon_id=v_uid then raise exception '好友無效'; end if;
    perform 1 from public.friends where user_id=v_uid and friend_uid=v_mon_id and status=1;
    if not found then raise exception '只能贈送體力給好友'; end if;
    perform 1 from public.gifts where sender=v_uid::text and receiver=v_mon_id::text and date=v_date;
    if found then raise exception '今天已經贈送過'; end if;
    insert into public.gifts(sender,receiver,date,claimed) values(v_uid::text,v_mon_id::text,v_date,false);
  end if;

  PERFORM arena_internal.progress_quest(v_uid,v_date,v_key);
  return arena_internal.finish_action(v_uid,v_request,p_action,p_data,coalesce(v_result,jsonb_build_object('message','操作成功！')),v_u.gold);
end; $function$;
REVOKE ALL ON FUNCTION public.game_action(text,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.game_action(text,jsonb) TO authenticated;
