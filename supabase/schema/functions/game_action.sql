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
  v_m2 public.monsters%rowtype;
  v_inv public.user_inventory%rowtype;
  v_item text;
  v_mon_id uuid;
  v_mon2_id uuid;
  v_slot int;
  v_qty int;
  v_cost int;
  v_price int;
  v_count int;
  v_stat text;
  v_value numeric;
  v_old numeric;
  v_bonus numeric;
  v_stage int;
  v_catalyst boolean;
  v_rescue boolean := false;
  v_date text := (now() at time zone 'Asia/Taipei')::date::text;
  v_key text;
  v_quest public.daily_quests%rowtype;
  v_required int;
  v_reward int;
  v_guild public.guilds%rowtype;
  v_member public.guild_members%rowtype;
  v_boss public.raid_boss%rowtype;
  v_damage int;
  v_remaining int;
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
  v_damage_a integer;
  v_own_faction integer;
  v_enemy_faction integer;
  v_own_role integer;
  v_enemy_role integer;
  v_damage_b integer;
  v_round integer;
  v_step integer;
  v_player_first boolean;
  v_events jsonb := '[]'::jsonb;
  v_result jsonb;
  v_text text;
  v_request uuid;
  v_cached record;
  v_enc record;
  v_defender arena_internal.pvp_defenders%rowtype;
  v_enemy_family int;
  v_enemy_stage int;
  v_target uuid;
  v_season text:=left(v_date,7);
  v_boss_id text;
  v_contribution bigint;
  v_pvp boolean:=false;
begin
  if v_uid is null then raise exception '請先登入'; end if;
  select * into v_u from public.users where user_id=v_uid for update;
  if not found then raise exception '找不到使用者資料，請重新登入'; end if;
  p_data:=coalesce(p_data,'{}'::jsonb);
  if jsonb_typeof(p_data)<>'object' then raise exception '操作參數錯誤'; end if;
  if p_action='capabilities' then
    return jsonb_build_object('version',2,'fixedEncounters',true,'asyncPvp',true,'dailyRaid',true,'idempotency',true);
  end if;
  if p_action='raid_status' then
    v_boss_id:=arena_internal.ensure_raid(v_date);
    select * into v_boss from public.raid_boss where id=v_boss_id;
    select damage into v_contribution from arena_internal.raid_contributions where boss_id=v_boss_id and user_id=v_uid;
    return to_jsonb(v_boss)||jsonb_build_object('my_damage',coalesce(v_contribution,0),'claims',
      coalesce((select jsonb_agg(jsonb_build_object('boss_id',r.boss_id,'damage',r.damage,'reward',floor(5000::numeric*r.damage/b.max_hp)) order by b.created_at desc)
        from arena_internal.raid_contributions r join public.raid_boss b on b.id=r.boss_id
        where r.user_id=v_uid and r.claimed_at is null and b.current_hp=0),'[]'::jsonb));
  end if;
  if p_action='pvp_list' then
    return jsonb_build_object('season',v_season,'registered',exists(select 1 from arena_internal.pvp_defenders where user_id=v_uid),
      'opponents',coalesce((select jsonb_agg(to_jsonb(q) order by q.points desc,q.user_id) from
        (select d.user_id,u.username,d.monster_name,d.family,d.stage,d.type,d.hp,d.atk,d.def,d.spd,coalesce(s.points,0) points
         from arena_internal.pvp_defenders d join public.users u using(user_id)
         left join arena_internal.pvp_scores s on s.user_id=d.user_id and s.season=v_season
         where d.user_id<>v_uid order by coalesce(s.points,0) desc,d.user_id limit 30) q),'[]'::jsonb),
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

  if p_action in ('hatch','feed','clean','heal','train','evolve','release','lock','equip','unequip','breed','buy','raid','battle','claim','guild_create','guild_join','guild_leave','guild_donate','guild_buy','chat','gift','raid_claim','pvp_register','pvp_unregister') then
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

  if p_action in ('feed','clean','heal','train','evolve','release','lock','equip','unequip','raid','battle','pvp_register') then
    v_mon_id := nullif(p_data->>'monster_id','')::uuid;
    if v_mon_id is null then raise exception '請選擇怪獸'; end if;
    select * into v_m from public.monsters where monster_id=v_mon_id and user_id=v_uid for update;
    if not found then raise exception '怪獸不存在或不屬於您'; end if;
    if v_m.is_dead and p_action not in ('release','lock') then raise exception '已死亡的怪獸無法執行此操作'; end if;
    -- Match disabled egg actions in the UI, even when a player calls the RPC directly.
    if p_action in ('feed','clean','train') and coalesce(v_m.life_stage,1)=1 then
      raise exception '機械核心尚不能補充能源、保養或訓練';
    end if;
    if p_action in ('raid','battle','pvp_register') then
      if coalesce(v_m.life_stage,1)<2 then raise exception '機械核心不能出戰'; end if;
      if coalesce(v_m.is_frozen,false) then raise exception '凍結中的怪獸不能出戰'; end if;
    end if;
  end if;

  if p_action = 'buy' then
    v_item := p_data->>'item_id';
    v_qty := (p_data->>'quantity')::int;
    if v_qty is null or v_qty<1 or v_qty>99 then raise exception '數量需為 1～99'; end if;
    v_price := case v_item
      when 'meat_basic' then 10 when 'meat_premium' then 50 when 'energy_drink' then 100
      when 'medicine_standard' then 200 when 'vitamin' then 50 when 'breed_catalyst' then 500
      when 'ultimate_core' then 1000
      when 'chip_atk' then 300 when 'chip_def' then 300
      when 'chip_hp' then 300 when 'chip_spd' then 300
      else null end;
    if v_price is null then raise exception '未知商品'; end if;
    v_cost := v_qty*v_price;
    if v_u.gold < v_cost then raise exception '金幣不足'; end if;
    update public.users set gold=gold-v_cost where user_id=v_uid;
    insert into public.user_inventory(user_id,item_id,item_type,quantity)
      values(v_uid,v_item,case when v_item in ('breed_catalyst','ultimate_core') then 3
           when v_item in ('chip_atk','chip_def','chip_hp','chip_spd') then 4
           when v_item in ('medicine_standard','vitamin') then 2 else 1 end,v_qty)
      on conflict(user_id,item_id) do update set quantity=public.user_inventory.quantity+excluded.quantity;
    return arena_internal.finish_action(v_uid,v_request,p_action,p_data,jsonb_build_object('message','購買成功，花費 '||v_cost||'G'),v_u.gold);
  end if;

  if p_action in ('feed','heal','equip','unequip','evolve') then
    v_item := case p_action when 'heal' then coalesce(p_data->>'item_id','medicine_standard')
          when 'unequip' then 'chip_extractor' when 'evolve' then 'ultimate_core'
          else p_data->>'item_id' end;
    if v_item is null then raise exception '未選擇道具'; end if;
    if v_item not in ('feed_basic','heal_basic') then
      select * into v_inv from public.user_inventory where user_id=v_uid and item_id=v_item for update;
      if not found or coalesce(v_inv.quantity,0)<1 then raise exception '道具不足'; end if;
    end if;
  end if;

  if p_action = 'feed' then
    if v_item not in ('feed_basic','meat_basic','meat_premium','energy_drink') then raise exception '不支援的食物'; end if;
    v_bonus := case v_item when 'feed_basic' then 10 when 'meat_basic' then 20 when 'meat_premium' then 60 else 30 end;
    update public.monsters set fullness=least(100,coalesce(fullness,0)+v_bonus),
      cleanliness=case when v_item='feed_basic' then greatest(0,cleanliness-30) else cleanliness end,
      starve_time_start=null where monster_id=v_mon_id;
    if v_item<>'feed_basic' then update public.user_inventory set quantity=quantity-1 where inventory_id=v_inv.inventory_id; end if;
    if v_item='energy_drink' then update public.users set stamina=least(max_stamina,stamina+20) where user_id=v_uid; end if;
    v_key:='feed_count';
  elsif p_action = 'clean' then
    update public.monsters set cleanliness=100 where monster_id=v_mon_id;
    v_key:='clean_count';
  elsif p_action = 'heal' then
    if not v_m.is_sick then raise exception '怪獸沒有生病'; end if;
    if v_item not in ('medicine_standard','heal_basic') then raise exception '不支援的藥物'; end if;
    update public.monsters set is_sick=false,sick_time_start=null,
      combat_hp=case when v_item='heal_basic' then greatest(1,round((combat_hp*0.8)::numeric)) else combat_hp end
      where monster_id=v_mon_id;
    if v_item<>'heal_basic' then update public.user_inventory set quantity=quantity-1 where inventory_id=v_inv.inventory_id; end if;
  elsif p_action = 'train' then
    if v_u.stamina<10 then raise exception '體力不足，需要 10 點'; end if;
    if v_m.is_sick or coalesce(v_m.fullness,0)<20 then raise exception '怪獸太餓或生病，無法訓練'; end if;
    v_stat := (array['combat_hp','combat_atk','combat_def','combat_spd'])[1+floor(random()*4)::int];
    v_value := case when v_stat='combat_hp' then 10 else 2 end;
    -- A vitamin is automatically consumed during training and improves the stat gain by 10%.
    select * into v_inv from public.user_inventory
      where user_id=v_uid and item_id='vitamin' and quantity>0 for update;
    if found then
      update public.user_inventory set quantity=quantity-1 where inventory_id=v_inv.inventory_id;
      v_value := v_value*1.1;
    end if;
    update public.users set stamina=stamina-10 where user_id=v_uid;
    update public.monsters set combat_hp=combat_hp+case when v_stat='combat_hp' then v_value else 0 end,
      combat_atk=combat_atk+case when v_stat='combat_atk' then v_value else 0 end,
      combat_def=combat_def+case when v_stat='combat_def' then v_value else 0 end,
      combat_spd=combat_spd+case when v_stat='combat_spd' then v_value else 0 end,
      fullness=greatest(0,fullness-10),train_count=coalesce(train_count,0)+1 where monster_id=v_mon_id;
    v_key:='train_count';
  elsif p_action='evolve' then
    if v_m.life_stage<>5 or coalesce(v_m.battles,0)<50 or (coalesce(v_m.wins,0)::numeric/nullif(v_m.battles,0))<0.7 then
      raise exception '究極進化需要完全體、50 戰及 70%% 勝率'; end if;
    update public.user_inventory set quantity=quantity-1 where inventory_id=v_inv.inventory_id;
    update public.monsters set life_stage=6, combat_hp=combat_hp*1.5,
      combat_atk=combat_atk*1.5,combat_def=combat_def*1.5,combat_spd=combat_spd*1.5 where monster_id=v_mon_id;
  elsif p_action='lock' then
    update public.monsters set is_locked=not coalesce(is_locked,false) where monster_id=v_mon_id;
  elsif p_action='release' then
    if v_m.is_locked then raise exception '怪獸已鎖定'; end if;
    v_reward := case when coalesce(v_m.is_rescue,false) then 0
                 else greatest(0,coalesce(v_m.life_stage,1)*50) end;
    -- Dead pets may always be cleared to recover warehouse capacity. Only
    -- the final living pet must leave enough gold for a new hatch.
    if not coalesce(v_m.is_dead,false)
       and not exists (select 1 from public.monsters
         where user_id=v_uid and monster_id<>v_mon_id and coalesce(is_dead,false)=false)
       and coalesce(v_u.gold,0)+v_reward<100 then
      raise exception '放生後將無法孵蛋；請保留最後一隻怪獸或至少 100G';
    end if;
    delete from public.monsters where monster_id=v_mon_id and user_id=v_uid;
    update public.users set gold=gold+v_reward where user_id=v_uid;
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
    -- Previously installed enhanced chips keep their individual potency when extracted.
    -- New shop chips are +5. The reserve belongs to the item, not the monster.
    select r.bonus into v_bonus from public.game_chip_reserves r
      where r.user_id=v_uid and r.item_id=v_item and r.quantity>0
      order by r.bonus desc limit 1 for update;
    if found then
      update public.game_chip_reserves set quantity=quantity-1
        where user_id=v_uid and item_id=v_item and bonus=v_bonus;
    else
      v_bonus:=5;
    end if;
    update public.user_inventory set quantity=quantity-1 where inventory_id=v_inv.inventory_id;
    if v_slot=1 then
      update public.monsters set
        chip_slot_1=v_item,chip_slot_1_val=v_bonus,
        combat_hp=greatest(1,coalesce(combat_hp,1)-case when v_text='chip_hp' then v_old else 0 end + case when v_item='chip_hp' then v_bonus else 0 end),
        combat_atk=greatest(0,coalesce(combat_atk,0)-case when v_text='chip_atk' then v_old else 0 end + case when v_item='chip_atk' then v_bonus else 0 end),
        combat_def=greatest(0,coalesce(combat_def,0)-case when v_text='chip_def' then v_old else 0 end + case when v_item='chip_def' then v_bonus else 0 end),
        combat_spd=greatest(0,coalesce(combat_spd,0)-case when v_text='chip_spd' then v_old else 0 end + case when v_item='chip_spd' then v_bonus else 0 end)
      where monster_id=v_mon_id;
    else
      update public.monsters set
        chip_slot_2=v_item,chip_slot_2_val=v_bonus,
        combat_hp=greatest(1,coalesce(combat_hp,1)-case when v_text='chip_hp' then v_old else 0 end + case when v_item='chip_hp' then v_bonus else 0 end),
        combat_atk=greatest(0,coalesce(combat_atk,0)-case when v_text='chip_atk' then v_old else 0 end + case when v_item='chip_atk' then v_bonus else 0 end),
        combat_def=greatest(0,coalesce(combat_def,0)-case when v_text='chip_def' then v_old else 0 end + case when v_item='chip_def' then v_bonus else 0 end),
        combat_spd=greatest(0,coalesce(combat_spd,0)-case when v_text='chip_spd' then v_old else 0 end + case when v_item='chip_spd' then v_bonus else 0 end)
      where monster_id=v_mon_id;
    end if;
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
      insert into public.game_chip_reserves(user_id,item_id,bonus,quantity)
        values(v_uid,v_text,v_old,1)
      on conflict(user_id,item_id,bonus) do update
        set quantity=public.game_chip_reserves.quantity+1;
    end if;
    update public.user_inventory set quantity=quantity-1 where inventory_id=v_inv.inventory_id;
    insert into public.user_inventory(user_id,item_id,item_type,quantity)
      values(v_uid,v_text,4,1)
      on conflict(user_id,item_id) do update set quantity=public.user_inventory.quantity+1;
    if v_slot=1 then
      update public.monsters set
        chip_slot_1=null,chip_slot_1_val=0,
        combat_hp=greatest(1,coalesce(combat_hp,1)-case when v_text='chip_hp' then v_old else 0 end),
        combat_atk=greatest(0,coalesce(combat_atk,0)-case when v_text='chip_atk' then v_old else 0 end),
        combat_def=greatest(0,coalesce(combat_def,0)-case when v_text='chip_def' then v_old else 0 end),
        combat_spd=greatest(0,coalesce(combat_spd,0)-case when v_text='chip_spd' then v_old else 0 end)
      where monster_id=v_mon_id;
    else
      update public.monsters set
        chip_slot_2=null,chip_slot_2_val=0,
        combat_hp=greatest(1,coalesce(combat_hp,1)-case when v_text='chip_hp' then v_old else 0 end),
        combat_atk=greatest(0,coalesce(combat_atk,0)-case when v_text='chip_atk' then v_old else 0 end),
        combat_def=greatest(0,coalesce(combat_def,0)-case when v_text='chip_def' then v_old else 0 end),
        combat_spd=greatest(0,coalesce(combat_spd,0)-case when v_text='chip_spd' then v_old else 0 end)
      where monster_id=v_mon_id;
    end if;
  elsif p_action='breed' then
    v_mon_id:=(p_data->>'parent1')::uuid;
    v_mon2_id:=(p_data->>'parent2')::uuid;
    if v_mon_id is null or v_mon2_id is null or v_mon_id=v_mon2_id then raise exception '請選擇不同的雙親'; end if;
    select * into v_m from public.monsters where monster_id=v_mon_id and user_id=v_uid for update;
    select * into v_m2 from public.monsters where monster_id=v_mon2_id and user_id=v_uid for update;
    if v_m.monster_id is null or v_m2.monster_id is null or v_m.is_dead or v_m2.is_dead
      or v_m.life_stage<4 or v_m2.life_stage<4 then raise exception '雙親必須是自己存活的成熟期怪獸'; end if;
    select count(*) into v_count from public.monsters where user_id=v_uid;
    if v_count>=50 then raise exception '怪獸倉庫已滿'; end if;
    if v_u.gold<200 then raise exception '需要 200G'; end if;
    v_catalyst:=coalesce((p_data->>'useCatalyst')::boolean,false);
    if v_catalyst then
      select * into v_inv from public.user_inventory where user_id=v_uid and item_id='breed_catalyst' for update;
      if not found or v_inv.quantity<1 then raise exception '繁衍催化劑不足'; end if;
      update public.user_inventory set quantity=quantity-1 where inventory_id=v_inv.inventory_id;
    end if;
    update public.users set gold=gold-200 where user_id=v_uid;
    v_bonus:=case when random() < (case when v_catalyst then 0.12 else 0.06 end) then 1.25 else 1.1 end;
    insert into public.monsters(user_id,parent_1_id,parent_2_id,name,generation,life_stage,type,family,age_days,fullness,cleanliness,
      is_sick,is_dead,gene_hp,gene_atk,gene_def,gene_spd,combat_hp,combat_atk,combat_def,combat_spd,battles,wins,is_locked,last_updated_at)
    values(v_uid,v_mon_id,v_mon2_id,'新生基因蛋',
      greatest(coalesce(v_m.generation,1),coalesce(v_m2.generation,1))+1,1,0,v_m.family,0,100,100,
      false,false,(v_m.combat_hp+v_m2.combat_hp)/2*v_bonus,
      (v_m.combat_atk+v_m2.combat_atk)/2*v_bonus,
      (v_m.combat_def+v_m2.combat_def)/2*v_bonus,
      (v_m.combat_spd+v_m2.combat_spd)/2*v_bonus,
      (v_m.combat_hp+v_m2.combat_hp)/2*v_bonus,
      (v_m.combat_atk+v_m2.combat_atk)/2*v_bonus,
      (v_m.combat_def+v_m2.combat_def)/2*v_bonus,
      (v_m.combat_spd+v_m2.combat_spd)/2*v_bonus,0,0,false,now());
  elsif p_action='pvp_register' then
    insert into arena_internal.pvp_defenders(user_id,monster_id,monster_name,family,stage,type,hp,atk,def,spd)
      values(v_uid,v_mon_id,coalesce(v_m.name,'怪獸'),coalesce(v_m.family,1),v_m.life_stage,coalesce(v_m.type,0),
      greatest(1,coalesce(v_m.combat_hp,1)),greatest(1,coalesce(v_m.combat_atk,1)),
      greatest(0,coalesce(v_m.combat_def,0)),greatest(1,coalesce(v_m.combat_spd,1)))
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
    select damage into v_contribution from arena_internal.raid_contributions where boss_id=v_boss_id and user_id=v_uid and claimed_at is null for update;
    if not found then raise exception '沒有可領取的討伐獎勵'; end if;
    v_reward:=floor(5000::numeric*v_contribution/v_boss.max_hp)::int;
    update arena_internal.raid_contributions set claimed_at=now() where boss_id=v_boss_id and user_id=v_uid;
    update public.users set gold=coalesce(gold,0)+v_reward where user_id=v_uid;
    v_result:=jsonb_build_object('message','領取討伐貢獻獎勵 '||v_reward||'G','reward',v_reward);
  elsif p_action='raid' then
    if v_u.stamina < 15 then raise exception '需要 15 點體力'; end if;
    v_boss_id:=arena_internal.ensure_raid(v_date);
    select * into v_boss from public.raid_boss where id=v_boss_id for update;
    if not coalesce(v_boss.is_active,false) then raise exception '今日世界王已被討伐'; end if;
    v_damage:=least(v_boss.current_hp,greatest(1,round((v_m.combat_atk*20*
      1
      *(0.9+random()*0.2))::numeric)::int));
    v_remaining:=greatest(0,v_boss.current_hp-v_damage);
    update public.raid_boss set current_hp=v_remaining,is_active=v_remaining>0 where id=v_boss.id;
    insert into arena_internal.raid_contributions(boss_id,user_id,damage) values(v_boss.id,v_uid,v_damage)
      on conflict(boss_id,user_id) do update set damage=arena_internal.raid_contributions.damage+excluded.damage;
    update public.users set stamina=stamina-15 where user_id=v_uid;
    v_result:=jsonb_build_object('message',case when v_remaining=0 then '討伐成功！可依傷害貢獻領取獎勵' else '造成傷害！' end,'damage',v_damage);
  elsif p_action='battle' then
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
    v_own_max_hp:=greatest(1,coalesce(v_m.combat_hp,1));
    v_own_hp:=v_own_max_hp;
    v_pvp:=v_encounter='pvp';
    if v_pvp then
      v_target:=nullif(p_data->>'opponent_id','')::uuid;
      if v_target is null or v_target=v_uid then raise exception '對手無效'; end if;
      select * into v_defender from arena_internal.pvp_defenders where user_id=v_target;
      if not found then raise exception '對手未登記防守怪獸'; end if;
      select count(*) into v_count from arena_internal.pvp_results where attacker_id=v_uid and battle_day=v_date::date;
      if v_count>=5 then raise exception '今日玩家對戰已達 5 場上限'; end if;
      if exists(select 1 from arena_internal.pvp_results where attacker_id=v_uid and defender_id=v_target and battle_day=v_date::date)
        then raise exception '今天已挑戰過這位玩家'; end if;
      v_enemy_name:=v_defender.monster_name;v_enemy_type:=v_defender.type;v_enemy_family:=v_defender.family;
      v_enemy_stage:=v_defender.stage;v_enemy_max_hp:=v_defender.hp;v_enemy_atk:=v_defender.atk;
      v_enemy_def:=v_defender.def;v_enemy_spd:=v_defender.spd;
    else
      select * into v_enc from arena_internal.encounter(v_encounter);
      if not found then raise exception '無效的對戰類型'; end if;
      v_enemy_name:=v_enc.name;v_enemy_type:=v_enc.kind;v_enemy_family:=v_enc.family;v_enemy_stage:=v_enc.stage;
      v_enemy_max_hp:=v_enc.hp;v_enemy_atk:=v_enc.atk;v_enemy_def:=v_enc.def;v_enemy_spd:=v_enc.spd;
    end if;
    v_enemy_hp:=v_enemy_max_hp;
    v_own_faction:=(case coalesce(v_m.family,1) when 1 then 1 when 2 then 1 when 4 then 2 when 5 then 2 when 6 then 3 when 7 then 3 when 3 then 4 when 8 then 4 else 1 end);
    v_enemy_faction:=(case coalesce(v_enemy_family,1) when 1 then 1 when 2 then 1 when 4 then 2 when 5 then 2 when 6 then 3 when 7 then 3 when 3 then 4 when 8 then 4 else 1 end);
    v_own_role:=case when coalesce(v_m.life_stage,1)<3 then 0 else (v_own_faction-1)*2+case when v_m.type=1 then 1 else 2 end end;
    v_enemy_role:=case when coalesce(v_enemy_stage,1)<3 then 0 else (v_enemy_faction-1)*2+case when v_enemy_type=1 then 1 else 2 end end;
    v_player_first:=coalesce(v_m.combat_spd,1)>=v_enemy_spd;
    for v_round in 1..100 loop
      for v_step in 1..2 loop
        if (v_step=1 and v_player_first) or (v_step=2 and not v_player_first) then
          v_damage_a:=greatest(1,floor(
            greatest(1,(greatest(1,coalesce(v_m.combat_atk,1))) *
              (case when v_enemy_role=7 and mod(v_round,3)=0 then 1
                    when v_own_role=1 and mod(v_round,3)=1 then 1.25
                    when v_own_role=2 and mod(v_round,2)=0 then 1.15
                    when v_own_role=4 and mod(v_round,3)=0 then 1.20
                    when v_own_role=5 then 1.08
                    when v_own_role=6 and mod(v_round,3)=0 then 1.30 else 1 end) *
              (case when v_own_role=5 then 1 else 0.9+random()*0.2 end)
              - (v_enemy_def)*0.5*(case when v_own_role=4 and mod(v_round,3)=0 and not (v_enemy_role=7 and mod(v_round,3)=0) then 0.60 else 1 end))
            * (case when v_enemy_faction=mod(v_own_faction,4)+1 then 1.2 else 1 end)
            * (case when v_enemy_role=3 then 0.88 when v_enemy_role=7 and mod(v_round,3)=0 then 0.85 else 1 end)
          )::int);
          v_enemy_hp:=greatest(0,v_enemy_hp-v_damage_a);
          if v_own_role=8 and mod(v_round,3)=0 and not (v_enemy_role=7 and mod(v_round,3)=0) then
            v_own_hp:=least(v_own_max_hp,v_own_hp+greatest(1,floor(v_own_max_hp*0.04)));
          end if;
          v_events:=v_events||jsonb_build_array(jsonb_build_object(
            'attacker','A','damage',v_damage_a,'ownHp',v_own_hp,'enemyHp',v_enemy_hp));
        else
          v_damage_b:=greatest(1,floor(
            greatest(1,(v_enemy_atk) *
              (case when v_own_role=7 and mod(v_round,3)=0 then 1
                    when v_enemy_role=1 and mod(v_round,3)=1 then 1.25
                    when v_enemy_role=2 and mod(v_round,2)=0 then 1.15
                    when v_enemy_role=4 and mod(v_round,3)=0 then 1.20
                    when v_enemy_role=5 then 1.08
                    when v_enemy_role=6 and mod(v_round,3)=0 then 1.30 else 1 end) *
              (case when v_enemy_role=5 then 1 else 0.9+random()*0.2 end)
              - (coalesce(v_m.combat_def,0))*0.5*(case when v_enemy_role=4 and mod(v_round,3)=0 and not (v_own_role=7 and mod(v_round,3)=0) then 0.60 else 1 end))
            * (case when v_own_faction=mod(v_enemy_faction,4)+1 then 1.2 else 1 end)
            * (case when v_own_role=3 then 0.88 when v_own_role=7 and mod(v_round,3)=0 then 0.85 else 1 end)
          )::int);
          v_own_hp:=greatest(0,v_own_hp-v_damage_b);
          if v_enemy_role=8 and mod(v_round,3)=0 and not (v_own_role=7 and mod(v_round,3)=0) then
            v_enemy_hp:=least(v_enemy_max_hp,v_enemy_hp+greatest(1,floor(v_enemy_max_hp*0.04)));
          end if;
          v_events:=v_events||jsonb_build_array(jsonb_build_object(
            'attacker','B','damage',v_damage_b,'ownHp',v_own_hp,'enemyHp',v_enemy_hp));
        end if;
        exit when v_own_hp<=0 or v_enemy_hp<=0;
      end loop;
      exit when v_own_hp<=0 or v_enemy_hp<=0;
    end loop;
    -- A battle is bounded to avoid excessive RPC work with extreme stats.
    v_won:=case when v_enemy_hp<=0 then true when v_own_hp<=0 then false
      else v_own_hp/v_own_max_hp >= v_enemy_hp/v_enemy_max_hp end;
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
    v_key:='battle_count';
    v_result:=jsonb_build_object(
      'message',case when v_won then '對戰勝利！' else '對戰失敗' end,
      'won',v_won,'battleId',v_battle,'events',v_events,
      'ownMaxHp',v_own_max_hp,'enemyMaxHp',v_enemy_max_hp,
      'enemyName',v_enemy_name,'enemyType',v_enemy_type,'enemyFamily',v_enemy_family,'enemyStage',v_enemy_stage,'reward',v_reward,
      'enemyAtk',v_enemy_atk,'enemyDef',v_enemy_def,'enemySpd',v_enemy_spd,
      'ownHp',v_own_hp,'enemyHp',v_enemy_hp);
  elsif p_action='chat' then
    v_text:=trim(p_data->>'text');
    if length(coalesce(v_text,''))<1 or length(v_text)>100 then raise exception '聊天訊息需為 1～100 字'; end if;
    if v_u.last_message_at is not null and now()-v_u.last_message_at<interval '3 seconds'
      then raise exception '聊天過於頻繁，請稍後再試'; end if;
    update public.users set last_message_at=now() where user_id=v_uid;
    insert into public.messages(channel,user_id,username,text) values('world',v_uid::text,v_u.username,v_text);
  elsif p_action='claim' then
    v_text:=p_data->>'quest_id';
    v_key:=case v_text when 'feed_3' then 'feed_count' when 'clean_1' then 'clean_count'
      when 'train_2' then 'train_count' when 'battle_2' then 'battle_count' else null end;
    v_required:=case v_text when 'feed_3' then 3 when 'clean_1' then 1
      when 'train_2' then 2 when 'battle_2' then 2 end;
    v_reward:=case v_text when 'feed_3' then 100 when 'clean_1' then 50
      when 'train_2' then 150 when 'battle_2' then 150 end;
    if v_key is null then raise exception '未知任務'; end if;
    insert into public.daily_quests(quest_id,user_id,date) values(v_uid::text||'_'||v_date,v_uid,v_date)
      on conflict(quest_id) do nothing;
    select * into v_quest from public.daily_quests where quest_id=v_uid::text||'_'||v_date for update;
    if v_text=any(coalesce(v_quest.claimed,array[]::text[])) then raise exception '獎勵已領取'; end if;
    v_count:=case v_key when 'feed_count' then v_quest.feed_count when 'clean_count' then v_quest.clean_count
      when 'train_count' then v_quest.train_count else v_quest.battle_count end;
    if coalesce(v_count,0)<v_required then raise exception '任務尚未完成'; end if;
    update public.daily_quests set claimed=array_append(coalesce(claimed,array[]::text[]),v_text)
      where quest_id=v_quest.quest_id;
    update public.users set gold=gold+v_reward where user_id=v_uid;
    v_key:=null;
  elsif p_action in ('guild_create','guild_join','guild_leave','guild_donate','guild_buy') then
    select * into v_member from public.guild_members where user_id=v_uid limit 1 for update;
    if p_action='guild_create' then
      if found then raise exception '您已經加入公會'; end if;
      if v_u.gold<500 then raise exception '建立公會需要 500G'; end if;
      v_text:=trim(p_data->>'name');
      if length(coalesce(v_text,''))<2 or length(v_text)>30 then raise exception '公會名稱需 2～30 字'; end if;
      insert into public.guilds(guild_name,leader_id,level,total_contribution) values(v_text,v_uid,1,0) returning * into v_guild;
      insert into public.guild_members(guild_id,user_id,role,contribution) values(v_guild.guild_id,v_uid,2,0);
      update public.users set gold=gold-500 where user_id=v_uid;
    elsif p_action='guild_join' then
      if found then raise exception '已加入其他公會'; end if;
      v_mon_id:=(p_data->>'guild_id')::uuid;
      perform 1 from public.guilds where guild_id=v_mon_id;
      if not found then raise exception '公會不存在'; end if;
      insert into public.guild_members(guild_id,user_id,role,contribution) values(v_mon_id,v_uid,0,0);
    else
      if v_member.member_id is null then raise exception '未加入公會'; end if;
      if p_action='guild_leave' then
        if v_member.role=2 then
          delete from public.guild_applications where guild_id=v_member.guild_id;
          delete from public.guild_members where guild_id=v_member.guild_id;
          delete from public.guilds where guild_id=v_member.guild_id and leader_id=v_uid;
        else
          delete from public.guild_members where member_id=v_member.member_id;
        end if;
      elsif p_action='guild_donate' then
        v_cost:=(p_data->>'amount')::int;
        if v_cost is null or v_cost<1 or v_cost>100000000 then raise exception '捐款金額需為正整數'; end if;
        if v_u.gold<v_cost then raise exception '金幣不足'; end if;
        update public.users set gold=gold-v_cost where user_id=v_uid;
        update public.guild_members set contribution=coalesce(contribution,0)+v_cost where member_id=v_member.member_id;
        update public.guilds set total_contribution=coalesce(total_contribution,0)+v_cost where guild_id=v_member.guild_id;
      elsif p_action='guild_buy' then
        v_item:=p_data->>'item_id';
        v_cost:=case v_item when 'chip_extractor' then 300 when 'breed_catalyst' then 150
          when 'ultimate_core' then 500 else null end;
        if v_cost is null then raise exception '未知公會商品'; end if;
        if coalesce(v_member.contribution,0)<v_cost then raise exception '公會貢獻不足'; end if;
        update public.guild_members set contribution=contribution-v_cost where member_id=v_member.member_id;
        insert into public.user_inventory(user_id,item_id,item_type,quantity) values(v_uid,v_item,case when v_item='chip_extractor' then 4 else 3 end,1)
          on conflict(user_id,item_id) do update set quantity=public.user_inventory.quantity+1;
      end if;
    end if;
  elsif p_action='gift' then
    v_mon_id := (p_data->>'friend_id')::uuid;
    if v_mon_id is null or v_mon_id=v_uid then raise exception '好友無效'; end if;
    perform 1 from public.friends where user_id=v_uid and friend_uid=v_mon_id and status=1;
    if not found then raise exception '只能贈送體力給好友'; end if;
    perform 1 from public.gifts where sender=v_uid::text and receiver=v_mon_id::text and date=v_date;
    if found then raise exception '今天已經贈送過'; end if;
    insert into public.gifts(sender,receiver,date,claimed) values(v_uid::text,v_mon_id::text,v_date,false);
  end if;

  if v_key is not null and v_key in ('feed_count','clean_count','train_count','battle_count') then
    insert into public.daily_quests(quest_id,user_id,date) values(v_uid::text||'_'||v_date,v_uid,v_date)
      on conflict(quest_id) do nothing;
    if v_key='feed_count' then
      update public.daily_quests set feed_count=coalesce(feed_count,0)+1 where quest_id=v_uid::text||'_'||v_date;
    elsif v_key='clean_count' then
      update public.daily_quests set clean_count=coalesce(clean_count,0)+1 where quest_id=v_uid::text||'_'||v_date;
    elsif v_key='train_count' then
      update public.daily_quests set train_count=coalesce(train_count,0)+1 where quest_id=v_uid::text||'_'||v_date;
    else
      update public.daily_quests set battle_count=coalesce(battle_count,0)+1 where quest_id=v_uid::text||'_'||v_date;
    end if;
  end if;
  return arena_internal.finish_action(v_uid,v_request,p_action,p_data,coalesce(v_result,jsonb_build_object('message','操作成功！')),v_u.gold);
end; $function$;
REVOKE ALL ON FUNCTION public.game_action(text,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.game_action(text,jsonb) TO authenticated;
