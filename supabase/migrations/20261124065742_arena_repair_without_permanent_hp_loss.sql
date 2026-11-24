alter table public.monsters add column if not exists repair_until timestamptz;
do $migration$
declare f text; g text;
begin
  select pg_get_functiondef('public.game_action(text,jsonb)'::regprocedure) into f;
  if strpos(f,$patch$    update public.monsters set is_sick=false,sick_time_start=null,
      combat_hp=case when v_item='heal_basic' then greatest(1,round((combat_hp*0.8)::numeric)) else combat_hp end
      where monster_id=v_mon_id;
    if v_item<>'heal_basic' then update public.user_inventory set quantity=quantity-1 where inventory_id=v_inv.inventory_id; end if;$patch$)=0 or strpos(f,$patch$    if v_m.is_dead and p_action not in ('release','lock') then raise exception '已死亡的怪獸無法執行此操作'; end if;$patch$)=0 then raise exception 'Unexpected game_action definition; abort repair migration'; end if;
  f:=replace(replace(f,$patch$    update public.monsters set is_sick=false,sick_time_start=null,
      combat_hp=case when v_item='heal_basic' then greatest(1,round((combat_hp*0.8)::numeric)) else combat_hp end
      where monster_id=v_mon_id;
    if v_item<>'heal_basic' then update public.user_inventory set quantity=quantity-1 where inventory_id=v_inv.inventory_id; end if;$patch$,$patch$    if v_item='heal_basic' then
      if v_m.repair_until is not null then raise exception '緊急修復已開始，請等待完成或使用標準修復套件'; end if;
      update public.monsters set repair_until=now()+interval '30 minutes' where monster_id=v_mon_id;
      v_result:=jsonb_build_object('message','緊急修復已開始，30 分鐘後自動完成，耐久不變');
    else
      update public.monsters set is_sick=false,sick_time_start=null,repair_until=null where monster_id=v_mon_id;
      update public.user_inventory set quantity=quantity-1 where inventory_id=v_inv.inventory_id;
      v_result:=jsonb_build_object('message','標準修復完成，耐久不變');
    end if;$patch$),$patch$    if v_m.is_dead and p_action not in ('release','lock') then raise exception '已死亡的怪獸無法執行此操作'; end if;$patch$,$patch$    if v_m.is_dead and p_action not in ('release','lock') then raise exception '已死亡的怪獸無法執行此操作'; end if;
    if v_m.repair_until is not null and v_m.repair_until<=now() then
      update public.monsters set is_sick=false,sick_time_start=null,repair_until=null where monster_id=v_mon_id returning * into v_m;
    end if;
    if v_m.repair_until is not null and p_action in ('train','battle','raid','pvp_register','evolve') then
      raise exception '緊急修復中，請等待修復完成';
    end if;$patch$);
  execute f;
  select pg_get_functiondef('public.game_age_monsters()'::regprocedure) into g;
  if strpos(g,$patch$  end loop;
end; $function$$patch$)=0 then raise exception 'Unexpected age function; abort repair migration'; end if;
  execute replace(g,$patch$  end loop;
end; $function$$patch$,$patch$  end loop;
  update public.monsters set is_sick=false,sick_time_start=null,repair_until=null
    where user_id=v_uid and is_dead=false and repair_until<=now();
end; $function$$patch$);
end
$migration$;
