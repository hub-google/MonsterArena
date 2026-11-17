-- Canonical source: current Game database definition, captured 2026-11-17.
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
end; $function$
REVOKE ALL ON FUNCTION public.game_age_monsters() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.game_age_monsters() TO authenticated;
