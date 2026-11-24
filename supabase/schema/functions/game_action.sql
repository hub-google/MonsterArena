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
  v_item_type int;
  v_cosmetic boolean;
  v_count int;
  v_stat text;
  v_old numeric;
  v_bonus numeric;
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
  v_result jsonb;
  v_text text;
  v_request uuid;
  v_cached record;
  v_season text:=left(v_date,7);
  v_boss_id text;
  v_contribution bigint;
  v_fighter record;
  v_attempts int;
  v_points int;
  v_allocated int;
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

  if p_action = 'skin_equip' then
    if coalesce(v_m.life_stage,1)<2 then raise exception '機械核心尚未孵化'; end if;
    v_item:=nullif(p_data->>'skin_id','');
    if v_item is not null then
      if not exists(select 1 from arena_internal.shop_catalog(v_item) c where c.cosmetic) then raise exception '未知皮膚'; end if;
      if not exists(select 1 from public.user_inventory where user_id=v_uid and item_id=v_item and quantity>0) then raise exception '尚未收藏此皮膚'; end if;
    end if;
    update public.monsters set skin_id=v_item where monster_id=v_mon_id and user_id=v_uid;
    return arena_internal.finish_action(v_uid,v_request,p_action,p_data,jsonb_build_object('message','造型已更新'),v_u.gold);
  end if;

  if p_action = 'buy' then
    v_item := p_data->>'item_id';
    v_qty := (p_data->>'quantity')::int;
    if v_qty is null or v_qty<1 or v_qty>99 then raise exception '數量需為 1～99'; end if;
    select c.price,c.item_type,c.cosmetic into v_price,v_item_type,v_cosmetic from arena_internal.shop_catalog(v_item) c;
    if not found then raise exception '未知商品'; end if;
    if v_cosmetic then
      if v_qty<>1 then raise exception '皮膚每款只需購買一次'; end if;
      if exists(select 1 from public.user_inventory where user_id=v_uid and item_id=v_item and quantity>0) then raise exception '已收藏此皮膚'; end if;
    end if;
    v_cost := v_qty*v_price;
    if v_u.gold < v_cost then raise exception '金幣不足'; end if;
    update public.users set gold=gold-v_cost where user_id=v_uid;
    insert into public.user_inventory(user_id,item_id,item_type,quantity)
      values(v_uid,v_item,v_item_type,v_qty)
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
    if v_item='heal_basic' then
      if v_m.repair_until is not null then raise exception '緊急修復已開始，請等待完成或使用標準修復套件'; end if;
      update public.monsters set repair_until=now()+interval '30 minutes' where monster_id=v_mon_id;
      v_result:=jsonb_build_object('message','緊急修復已開始，30 分鐘後自動完成，耐久不變');
    else
      update public.monsters set is_sick=false,sick_time_start=null,repair_until=null where monster_id=v_mon_id;
      update public.user_inventory set quantity=quantity-1 where inventory_id=v_inv.inventory_id;
      v_result:=jsonb_build_object('message','標準修復完成，耐久不變');
    end if;
  elsif p_action = 'train' then
    if v_u.stamina<10 then raise exception '體力不足，需要 10 點'; end if;
    if v_m.is_sick or coalesce(v_m.fullness,0)<20 then raise exception '怪獸太餓或生病，無法訓練'; end if;
    v_stat:=coalesce(p_data->>'stat','atk');
    IF v_stat NOT IN ('hp','atk','def','spd','practice') THEN RAISE EXCEPTION '無效訓練項目'; END IF;
    v_allocated:=v_m.training_hp+v_m.training_atk+v_m.training_def+v_m.training_spd;
    v_count:=CASE v_stat WHEN 'hp' THEN v_m.training_hp WHEN 'atk' THEN v_m.training_atk WHEN 'def' THEN v_m.training_def ELSE v_m.training_spd END;
    v_points:=least(1,60-v_allocated,30-v_count);
    IF v_allocated>=60 AND v_stat='practice' THEN v_points:=0; ELSIF v_points<=0 OR v_stat='practice' THEN RAISE EXCEPTION '訓練配點已達上限'; END IF;
    IF v_stat<>'practice' AND coalesce((p_data->>'boost')::boolean,false) AND v_allocated<59 AND v_count<29 THEN
      SELECT * INTO v_inv FROM public.user_inventory WHERE user_id=v_uid AND item_id='vitamin' AND quantity>0 FOR UPDATE;
      IF NOT FOUND THEN RAISE EXCEPTION '效能增幅器不足'; END IF;
      UPDATE public.user_inventory SET quantity=quantity-1 WHERE inventory_id=v_inv.inventory_id; v_points:=2;
    END IF;
    UPDATE public.users SET stamina=stamina-10 WHERE user_id=v_uid;
    UPDATE public.monsters SET training_hp=training_hp+CASE WHEN v_stat='hp' THEN v_points ELSE 0 END,
      training_atk=training_atk+CASE WHEN v_stat='atk' THEN v_points ELSE 0 END,
      training_def=training_def+CASE WHEN v_stat='def' THEN v_points ELSE 0 END,
      training_spd=training_spd+CASE WHEN v_stat='spd' THEN v_points ELSE 0 END,fullness=greatest(0,fullness-10),train_count=coalesce(train_count,0)+1 WHERE monster_id=v_mon_id;
    PERFORM arena_internal.refresh_unit(v_mon_id);
    v_result:=jsonb_build_object('message',CASE WHEN v_points=0 THEN '維持訓練完成' ELSE '訓練完成，配點 +'||v_points END);
    v_key:='train_count';
  elsif p_action='evolve' then
    if v_m.life_stage<>5 or coalesce(v_m.battles,0)<50 or (coalesce(v_m.wins,0)::numeric/nullif(v_m.battles,0))<0.7 then
      raise exception '究極進化需要完全體、50 戰及 70%% 勝率'; end if;
    update public.user_inventory set quantity=quantity-1 where inventory_id=v_inv.inventory_id;
    update public.monsters set life_stage=6 where monster_id=v_mon_id;
    PERFORM arena_internal.refresh_unit(v_mon_id);
  elsif p_action='lock' then
    update public.monsters set is_locked=not coalesce(is_locked,false) where monster_id=v_mon_id;
  elsif p_action='release' then
    if v_m.is_locked then raise exception '怪獸已鎖定'; end if;
    v_reward := case when coalesce(v_m.is_rescue,false) then 0
                 else least(80,greatest(0,coalesce(v_m.life_stage,1)*15)) end;
    -- Dead pets may always be cleared to recover warehouse capacity. Only
    -- the final living pet must leave enough gold for a new hatch.
    if not coalesce(v_m.is_dead,false)
       and not exists (select 1 from public.monsters
         where user_id=v_uid and monster_id<>v_mon_id and coalesce(is_dead,false)=false)
       and coalesce(v_u.gold,0)+v_reward<100 then
      raise exception '放生後將無法孵蛋；請保留最後一隻怪獸或至少 100G';
    end if;
    delete from arena_internal.pvp_defenders where user_id=v_uid and monster_id=v_mon_id;
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
    SELECT r.bonus INTO v_bonus FROM public.game_chip_reserves r WHERE r.user_id=v_uid AND r.item_id=v_item AND r.quantity>0 ORDER BY r.bonus DESC LIMIT 1 FOR UPDATE;
    IF FOUND THEN UPDATE public.game_chip_reserves SET quantity=quantity-1 WHERE user_id=v_uid AND item_id=v_item AND bonus=v_bonus; ELSE v_bonus:=5; END IF;
    UPDATE public.user_inventory SET quantity=quantity-1 WHERE inventory_id=v_inv.inventory_id;
    IF v_slot=1 THEN UPDATE public.monsters SET chip_slot_1=v_item,chip_slot_1_val=v_bonus WHERE monster_id=v_mon_id;
    ELSE UPDATE public.monsters SET chip_slot_2=v_item,chip_slot_2_val=v_bonus WHERE monster_id=v_mon_id; END IF;
    PERFORM arena_internal.refresh_unit(v_mon_id);
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
    IF v_slot=1 THEN UPDATE public.monsters SET chip_slot_1=null,chip_slot_1_val=0 WHERE monster_id=v_mon_id;
    ELSE UPDATE public.monsters SET chip_slot_2=null,chip_slot_2_val=0 WHERE monster_id=v_mon_id; END IF;
    PERFORM arena_internal.refresh_unit(v_mon_id);
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
    v_bonus:=least(5,greatest(0,round((v_m.core_quality+v_m2.core_quality)/2.0)::int+CASE WHEN random()<(CASE WHEN v_catalyst THEN .12 ELSE .06 END) THEN 1 ELSE 0 END));
    insert into public.monsters(user_id,parent_1_id,parent_2_id,name,generation,life_stage,type,family,age_days,fullness,cleanliness,
      is_sick,is_dead,gene_hp,gene_atk,gene_def,gene_spd,combat_hp,combat_atk,combat_def,combat_spd,battles,wins,is_locked,last_updated_at,core_quality)
    values(v_uid,v_mon_id,v_mon2_id,'新生機械核心',
      greatest(coalesce(v_m.generation,1),coalesce(v_m2.generation,1))+1,1,0,v_m.family,0,100,100,
      false,false,50,5,5,5,50,5,5,5,0,0,false,now(),v_bonus::int);
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
    v_text:=p_data->>'quest_id';
    select c.progress_key,c.required,c.reward into v_key,v_required,v_reward from arena_internal.quest_catalog(v_text) c;
    if not found then raise exception '未知任務'; end if;
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
    -- Own user is already locked. Shared guild row must precede member locks
    -- for donations, shopping, leaving, joining and leader disbanding.
    select * into v_member from public.guild_members where user_id=v_uid limit 1;
    if v_member.member_id is not null then
      perform 1 from public.guilds where guild_id=v_member.guild_id for update;
      select * into v_member from public.guild_members where user_id=v_uid limit 1 for update;
    end if;
    if p_action='guild_create' then
      if v_member.member_id is not null then raise exception '您已經加入公會'; end if;
      if v_u.gold<500 then raise exception '建立公會需要 500G'; end if;
      v_text:=trim(p_data->>'name');
      if length(coalesce(v_text,''))<2 or length(v_text)>30 then raise exception '公會名稱需 2～30 字'; end if;
      insert into public.guilds(guild_name,leader_id,level,total_contribution) values(v_text,v_uid,1,0) returning * into v_guild;
      insert into public.guild_members(guild_id,user_id,role,contribution) values(v_guild.guild_id,v_uid,2,0);
      update public.users set gold=gold-500 where user_id=v_uid;
    elsif p_action='guild_join' then
      if v_member.member_id is not null then raise exception '已加入其他公會'; end if;
      v_mon_id:=(p_data->>'guild_id')::uuid;
      perform 1 from public.guilds where guild_id=v_mon_id for update;
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
        select c.price,c.item_type into v_cost,v_item_type from arena_internal.guild_catalog(v_item) c;
        if not found then raise exception '未知公會商品'; end if;
        if coalesce(v_member.contribution,0)<v_cost then raise exception '公會貢獻不足'; end if;
        update public.guild_members set contribution=contribution-v_cost where member_id=v_member.member_id;
        insert into public.user_inventory(user_id,item_id,item_type,quantity) values(v_uid,v_item,v_item_type,1)
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
