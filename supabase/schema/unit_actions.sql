-- Private unit transactions; public game_action owns authorization, locks and receipts.
CREATE OR REPLACE FUNCTION arena_internal.unit_action(v_uid uuid,v_u public.users,v_m public.monsters,p_action text,p_data jsonb)
RETURNS jsonb LANGUAGE plpgsql SET search_path TO pg_catalog,pg_temp AS $domain$
DECLARE
  v_mon_id uuid:=v_m.monster_id;
  v_m2 public.monsters%rowtype;
  v_inv public.user_inventory%rowtype;
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
BEGIN
  if p_action = 'skin_equip' then
    if coalesce(v_m.life_stage,1)<2 then raise exception '機械核心尚未孵化'; end if;
    v_item:=nullif(p_data->>'skin_id','');
    if v_item is not null then
      if not exists(select 1 from arena_internal.shop_catalog(v_item) c where c.cosmetic) then raise exception '未知皮膚'; end if;
      if not exists(select 1 from public.user_inventory where user_id=v_uid and item_id=v_item and quantity>0) then raise exception '尚未收藏此皮膚'; end if;
    end if;
    update public.monsters set skin_id=v_item where monster_id=v_mon_id and user_id=v_uid;
    return jsonb_build_object('result',jsonb_build_object('message','造型已更新'),'quest_key',NULL);
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
  end if;
  RETURN jsonb_build_object('result',coalesce(v_result,jsonb_build_object('message','操作成功！')),'quest_key',v_key);
END; $domain$;
REVOKE ALL ON FUNCTION arena_internal.unit_action(uuid,public.users,public.monsters,text,jsonb) FROM PUBLIC, anon, authenticated;
