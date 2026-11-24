-- Canonical source for next main Game rules; not yet applied to the shared database.
-- Historical migrations are immutable records; edit this file for future changes.
CREATE OR REPLACE FUNCTION public.game_age_monsters()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_uid uuid:=(select auth.uid());
  v_m public.monsters%rowtype;
  v_hours double precision;
  v_prev_age double precision;
  v_age double precision;
  v_stage integer;
  v_type smallint;
  v_decay double precision;
  v_dirty_hours double precision;
  v_dirty_ticks int;
  v_hunger_loss double precision;
begin
  if v_uid is null then raise exception '請先登入'; end if;
  for v_m in select * from public.monsters
    where user_id=v_uid and is_dead=false and coalesce(is_frozen,false)=false
    for update
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
    v_decay:=power(0.99::double precision,
      greatest(0,floor(v_age-30)::int)-greatest(0,floor(v_prev_age-30)::int));
    -- Integer cleanliness decreases on elapsed 15-minute boundaries, not refresh count.
    v_dirty_ticks:=floor(v_age*96)::int-floor(v_prev_age*96)::int;
    v_dirty_hours:=greatest(0.0,v_hours-greatest(0.0,(coalesce(v_m.cleanliness,0)-30)/4.0));
    v_hunger_loss:=2*v_hours+2*greatest(0.0,(v_age-greatest(3.0,v_prev_age))*24.0);
    update public.monsters set
      age_days=v_age,
      fullness=greatest(0,coalesce(fullness,0)-v_hunger_loss),
      cleanliness=greatest(0,coalesce(cleanliness,0)-v_dirty_ticks),
      life_stage=v_stage,
      type=v_type,
      is_sick=coalesce(is_sick,false) or
        (v_dirty_hours>0 and random()<1-power(0.96::double precision,v_dirty_hours)),
      combat_atk=greatest(1,coalesce(combat_atk,1)*v_decay),
      combat_def=greatest(0,coalesce(combat_def,1)*v_decay),
      combat_spd=greatest(1,coalesce(combat_spd,1)*v_decay),
      last_updated_at=now()
    where monster_id=v_m.monster_id and user_id=v_uid;
  end loop;
end; $function$;
REVOKE ALL ON FUNCTION public.game_age_monsters() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.game_age_monsters() TO authenticated;
