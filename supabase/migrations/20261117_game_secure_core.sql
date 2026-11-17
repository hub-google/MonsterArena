-- Arena main: server-authoritative battles, aging, private profiles, retired unsafe RPCs.
-- Only the original Game public game tables/functions are changed.

-- Only public player aliases may be searched. Private emails and wallet rows remain owner-only.
create or replace function public.game_public_profiles(
  p_user_ids uuid[] default null, p_username text default null)
returns table(user_id uuid, username text)
language plpgsql security definer set search_path=public,pg_temp
as $$
begin
  if (select auth.uid()) is null then raise exception '請先登入'; end if;
  if cardinality(p_user_ids)>100 then raise exception '查詢筆數過多'; end if;
  return query
    select u.user_id,u.username from public.users u
    where (p_user_ids is null or u.user_id=any(p_user_ids))
      and (p_username is null or lower(u.username)=lower(p_username))
    order by u.user_id limit 100;
end; $$;
revoke all on function public.game_public_profiles(uuid[],text) from PUBLIC,anon;
grant execute on function public.game_public_profiles(uuid[],text) to authenticated;

-- The browser is never trusted to supply aging or combat attributes.
create or replace function public.game_age_monsters()
returns void
language plpgsql security definer set search_path=public,pg_temp
as $$
declare
  v_uid uuid:=(select auth.uid());
  v_m public.monsters%rowtype;
  v_hours double precision;
  v_prev_age double precision;
  v_age double precision;
  v_stage integer;
  v_type smallint;
  v_decay double precision;
begin
  if v_uid is null then raise exception '請先登入'; end if;
  for v_m in select * from public.monsters
    where user_id=v_uid and is_dead=false and coalesce(is_frozen,false)=false
    for update
  loop
    v_hours:=least(720.0,greatest(0.0,extract(epoch from (now()-coalesce(v_m.last_updated_at,now())))/3600.0));
    if v_hours < 1.0/12.0 then continue; end if;
    v_prev_age:=coalesce(v_m.age_days,0);
    v_age:=v_prev_age+v_hours/24.0;
    v_stage:=greatest(coalesce(v_m.life_stage,1),
      case when v_age>=7 then 5 when v_age>=3 then 4 when v_age>=1 then 3
           when v_age>=0.05 then 2 else 1 end);
    v_type:=coalesce(v_m.type,0);
    if v_stage>=3 and v_type=0 then v_type:=1+floor(random()*3)::int; end if;
    v_decay:=power(0.99::double precision,
      greatest(0,floor(v_age-30)::int)-greatest(0,floor(v_prev_age-30)::int));
    update public.monsters set
      age_days=v_age,
      fullness=greatest(0,coalesce(fullness,0)-v_hours*(case when v_stage>=4 then 4 else 2 end)),
      cleanliness=greatest(0,round((coalesce(cleanliness,0)-v_hours*4)::numeric)),
      life_stage=v_stage,
      type=v_type,
      is_sick=coalesce(is_sick,false) or
        (coalesce(cleanliness,0)-v_hours*4<30 and random()<0.04),
      combat_atk=coalesce(combat_atk,1)*v_decay,
      combat_def=coalesce(combat_def,1)*v_decay,
      combat_spd=coalesce(combat_spd,1)*v_decay,
      last_updated_at=now()
    where monster_id=v_m.monster_id and user_id=v_uid;
  end loop;
end; $$;
revoke all on function public.game_age_monsters() from PUBLIC,anon;
grant execute on function public.game_age_monsters() to authenticated;

create or replace function public.game_rename_monster(p_monster_id uuid,p_name text)
returns jsonb
language plpgsql security definer set search_path=public,pg_temp
as $$
declare v_uid uuid:=(select auth.uid()); v_name text:=left(trim(p_name),30);
begin
  if v_uid is null then raise exception '請先登入'; end if;
  if v_name is null or v_name='' then raise exception '請輸入怪獸名稱'; end if;
  update public.monsters set name=v_name
    where monster_id=p_monster_id and user_id=v_uid;
  if not found then raise exception '無法修改其他玩家的怪獸'; end if;
  return jsonb_build_object('message','怪獸名稱已更新');
end; $$;
revoke all on function public.game_rename_monster(uuid,text) from PUBLIC,anon;
grant execute on function public.game_rename_monster(uuid,text) to authenticated;

create or replace function public.game_action(p_action text, p_data jsonb default '{}'::jsonb)
returns jsonb
language plpgsql security definer set search_path=public,pg_temp
as $$
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
  v_damage_b integer;
  v_round integer;
  v_step integer;
  v_player_first boolean;
  v_events jsonb := '[]'::jsonb;
  v_result jsonb;
  v_text text;
begin
  if v_uid is null then raise exception '請先登入'; end if;
  select * into v_u from public.users where user_id=v_uid for update;
  if not found then raise exception '找不到使用者資料，請重新登入'; end if;

  if p_action in ('hatch','feed','clean','heal','train','evolve','release','lock','equip','unequip','breed','buy','raid','battle','claim','guild_create','guild_join','guild_leave','guild_donate','guild_buy','chat','gift') then
    null;
  else
    raise exception '未知遊戲操作';
  end if;

  if p_action = 'hatch' then
    select count(*) into v_count from public.monsters where user_id=v_uid;
    if v_count >= 50 then raise exception '倉庫已滿 50 隻'; end if;
    if coalesce(v_u.gold,0)<100 then raise exception '金幣不足，需要 100G'; end if;
    update public.users set gold=gold-100 where user_id=v_uid;
    insert into public.monsters(user_id,name,generation,life_stage,type,family,age_days,fullness,cleanliness,
      is_sick,is_dead,gene_hp,gene_atk,gene_def,gene_spd,combat_hp,combat_atk,combat_def,combat_spd,battles,wins,is_locked,last_updated_at)
    values(v_uid,'數位蛋',1,1,0,1+floor(random()*7)::int,0,100,100,false,false,50,5,5,5,50,5,5,5,0,0,false,now());
    return jsonb_build_object('message','孵化數位蛋成功！');
  end if;

  if p_action in ('feed','clean','heal','train','evolve','release','lock','equip','unequip','raid','battle') then
    v_mon_id := nullif(p_data->>'monster_id','')::uuid;
    if v_mon_id is null then raise exception '請選擇怪獸'; end if;
    select * into v_m from public.monsters where monster_id=v_mon_id and user_id=v_uid for update;
    if not found then raise exception '怪獸不存在或不屬於您'; end if;
    if v_m.is_dead and p_action not in ('release','lock') then raise exception '已死亡的怪獸無法執行此操作'; end if;
  end if;

  if p_action = 'buy' then
    v_item := p_data->>'item_id';
    v_qty := (p_data->>'quantity')::int;
    if v_qty is null or v_qty<1 or v_qty>99 then raise exception '數量需為 1～99'; end if;
    v_price := case v_item
      when 'meat_basic' then 10 when 'meat_premium' then 50 when 'energy_drink' then 100
      when 'medicine_standard' then 200 when 'vitamin' then 50 when 'breed_catalyst' then 500
      when 'ultimate_core' then 1000 else null end;
    if v_price is null then raise exception '未知商品'; end if;
    v_cost := v_qty*v_price;
    if v_u.gold < v_cost then raise exception '金幣不足'; end if;
    update public.users set gold=gold-v_cost where user_id=v_uid;
    insert into public.user_inventory(user_id,item_id,item_type,quantity)
      values(v_uid,v_item,case when v_item in ('breed_catalyst','ultimate_core') then 3
           when v_item in ('medicine_standard','vitamin') then 2 else 1 end,v_qty)
      on conflict(user_id,item_id) do update set quantity=public.user_inventory.quantity+excluded.quantity;
    return jsonb_build_object('message','購買成功，花費 '||v_cost||'G');
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
    delete from public.monsters where monster_id=v_mon_id and user_id=v_uid;
    update public.users set gold=gold+greatest(0,coalesce(v_m.life_stage,1)*50) where user_id=v_uid;
  elsif p_action='equip' then
    v_slot := (p_data->>'slot')::int;
    if v_slot not in (1,2) then raise exception '無效插槽'; end if;
    if v_m.life_stage < (case when v_slot=1 then 4 else 5 end) then raise exception '怪獸尚未開啟晶片插槽'; end if;
    if v_inv.item_type<>4 or v_item='chip_extractor' then raise exception '道具不是晶片'; end if;
    v_old:=case when v_slot=1 then coalesce(v_m.chip_slot_1_val,0) else coalesce(v_m.chip_slot_2_val,0) end;
    update public.user_inventory set quantity=quantity-1 where inventory_id=v_inv.inventory_id;
    if v_slot=1 then
      update public.monsters set chip_slot_1=v_item,chip_slot_1_val=5,
        combat_atk=greatest(0,combat_atk-v_old+5) where monster_id=v_mon_id;
    else
      update public.monsters set chip_slot_2=v_item,chip_slot_2_val=5,
        combat_def=greatest(0,combat_def-v_old+5) where monster_id=v_mon_id;
    end if;
  elsif p_action='unequip' then
    v_slot:=(p_data->>'slot')::int;
    if v_slot not in (1,2) then raise exception '無效插槽'; end if;
    v_text:=case when v_slot=1 then v_m.chip_slot_1 else v_m.chip_slot_2 end;
    if v_text is null then raise exception '插槽內沒有晶片'; end if;
    update public.user_inventory set quantity=quantity-1 where inventory_id=v_inv.inventory_id;
    insert into public.user_inventory(user_id,item_id,item_type,quantity)
      values(v_uid,v_text,4,1)
      on conflict(user_id,item_id) do update set quantity=public.user_inventory.quantity+1;
    if v_slot=1 then
      update public.monsters set chip_slot_1=null,chip_slot_1_val=0,
        combat_atk=greatest(0,combat_atk-coalesce(chip_slot_1_val,0)) where monster_id=v_mon_id;
    else
      update public.monsters set chip_slot_2=null,chip_slot_2_val=0,
        combat_def=greatest(0,combat_def-coalesce(chip_slot_2_val,0)) where monster_id=v_mon_id;
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
  elsif p_action='raid' then
    if v_u.stamina < 15 then raise exception '需要 15 點體力'; end if;
    select * into v_boss from public.raid_boss order by created_at desc limit 1 for update;
    if not found then
      insert into public.raid_boss(name,current_hp,max_hp,is_active)
        values('數碼世界王',500000,500000,true) returning * into v_boss;
    end if;
    if not coalesce(v_boss.is_active,false) then raise exception '世界王已被討伐'; end if;
    v_damage:=greatest(1,round((v_m.combat_atk*20*
      case when v_m.type=3 then 1.3 when v_m.type=2 then 0.7 else 1 end
      *(0.9+random()*0.2))::numeric)::int);
    v_remaining:=greatest(0,v_boss.current_hp-v_damage);
    update public.raid_boss set current_hp=v_remaining,is_active=v_remaining>0 where id=v_boss.id;
    update public.users set stamina=stamina-15,gold=gold+case when v_remaining=0 then 5000 else 0 end where user_id=v_uid;
    return jsonb_build_object('message',case when v_remaining=0 then '討伐成功，獲得 5000G' else '造成傷害！' end,'damage',v_damage);
  elsif p_action='battle' then
    -- Ignore legacy caller-provided battleId and won. The server owns all outcomes.
    v_encounter:=coalesce(p_data->>'encounter','wild');
    if v_encounter not in ('wild','boss') then raise exception '無效的對戰類型'; end if;
    if coalesce(v_m.is_frozen,false) then raise exception '凍結的怪獸不能出戰'; end if;
    v_enemy_name:=case when v_encounter='boss' then '究極體王怪' else '野生病毒怪獸' end;
    v_enemy_type:=case when v_encounter='boss' then 1 else 3 end;
    v_own_max_hp:=greatest(1,coalesce(v_m.combat_hp,1));
    v_own_hp:=v_own_max_hp;
    v_enemy_max_hp:=greatest(1,round((v_own_max_hp*(case when v_encounter='boss' then 2.2 else 0.9 end))::numeric));
    v_enemy_hp:=v_enemy_max_hp;
    v_enemy_atk:=greatest(1,coalesce(v_m.combat_atk,1)*(case when v_encounter='boss' then 1.6 else 0.8 end));
    v_enemy_def:=greatest(0,coalesce(v_m.combat_def,0)*(case when v_encounter='boss' then 1.5 else 0.8 end));
    v_enemy_spd:=greatest(1,coalesce(v_m.combat_spd,1)*(case when v_encounter='boss' then 1.3 else 0.9 end));
    v_player_first:=coalesce(v_m.combat_spd,1)>=v_enemy_spd;
    for v_round in 1..100 loop
      for v_step in 1..2 loop
        if (v_step=1 and v_player_first) or (v_step=2 and not v_player_first) then
          v_damage_a:=greatest(1,floor(greatest(1,coalesce(v_m.combat_atk,1)) *
            (case when v_m.type=1 and v_enemy_type=3 then 1.3
                  when v_m.type=3 and v_enemy_type=2 then 1.3
                  when v_m.type=2 and v_enemy_type=1 then 1.3
                  when v_m.type=3 and v_enemy_type=1 then 0.7
                  when v_m.type=2 and v_enemy_type=3 then 0.7
                  when v_m.type=1 and v_enemy_type=2 then 0.7 else 1 end) *
            (0.9+random()*0.2) - v_enemy_def*0.5)::int);
          v_enemy_hp:=greatest(0,v_enemy_hp-v_damage_a);
          v_events:=v_events||jsonb_build_array(jsonb_build_object(
            'attacker','A','damage',v_damage_a,'ownHp',v_own_hp,'enemyHp',v_enemy_hp));
        else
          v_damage_b:=greatest(1,floor(v_enemy_atk *
            (case when v_enemy_type=1 and v_m.type=3 then 1.3
                  when v_enemy_type=3 and v_m.type=2 then 1.3
                  when v_enemy_type=2 and v_m.type=1 then 1.3
                  when v_enemy_type=3 and v_m.type=1 then 0.7
                  when v_enemy_type=2 and v_m.type=3 then 0.7
                  when v_enemy_type=1 and v_m.type=2 then 0.7 else 1 end) *
            (0.9+random()*0.2) - coalesce(v_m.combat_def,0)*0.5)::int);
          v_own_hp:=greatest(0,v_own_hp-v_damage_b);
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
    v_key:='battle_count';
    v_result:=jsonb_build_object(
      'message',case when v_won then '對戰勝利！' else '對戰失敗' end,
      'won',v_won,'battleId',v_battle,'events',v_events,
      'ownMaxHp',v_own_max_hp,'enemyMaxHp',v_enemy_max_hp,
      'enemyName',v_enemy_name,'enemyType',v_enemy_type,
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
  return coalesce(v_result,jsonb_build_object('message','操作成功！'));
end; $$;

-- Fix cross-player email leakage. Leave the self-only RLS policy in place.
drop policy if exists "Anyone can view profiles" on public.users;

-- All direct economy/monster mutations require audited server RPCs.
drop policy if exists "Users can manage their own monsters" on public.monsters;
revoke all on table public.monsters from PUBLIC,anon,authenticated;
grant select on table public.monsters to authenticated;

-- Legacy SECURITY DEFINER RPCs take client-supplied economy values and are not used by main.
-- Never remove functions or unrelated schema objects; only revoke browser EXECUTE rights.
do $$
declare x record;
begin
  for x in select p.oid::regprocedure::text as signature from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname=any(array[
      'deduct_gold','rpc_attack_raid_boss','rpc_buy_guild_shop',
      'rpc_buy_item','rpc_collect_idle','rpc_consume_or_buy',
      'rpc_donate_guild','rpc_hatch_egg','rpc_release_monster',
      'rpc_thaw_monster','rpc_train_monster'
    ])
  loop
    execute format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',x.signature);
  end loop;
end; $$;
