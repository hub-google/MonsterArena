-- Canonical source: current Game database definition, captured 2026-11-17.
-- Historical migrations are immutable records; edit this file for future changes.
CREATE OR REPLACE FUNCTION public.game_plaza_monsters(p_type smallint DEFAULT NULL::smallint)
 RETURNS TABLE(user_id uuid, monster_id uuid, name text, family smallint, type smallint, life_stage smallint, is_dead boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  with recent_players as materialized (
    select m.user_id,max(m.created_at) as newest
    from public.monsters m
    where (select auth.uid()) is not null
      and m.is_dead=false
      and (p_type is null or ((p_type between 11 and 14 and (case coalesce(m.family,1) when 1 then 1 when 2 then 1 when 4 then 2 when 5 then 2 when 6 then 3 when 7 then 3 when 3 then 4 when 8 then 4 else 1 end)=p_type-10) or (p_type between 0 and 3 and m.type=p_type)))
    group by m.user_id
    order by newest desc nulls last,m.user_id
    limit 30
  ), top_pets as (
    select m.user_id,m.monster_id,m.name,m.family,m.type,m.life_stage,m.is_dead,
           p.newest,
           row_number() over(
             partition by m.user_id
             order by m.created_at desc nulls last,m.monster_id
           ) as pet_rank
    from recent_players p
    join public.monsters m on m.user_id=p.user_id
    where m.is_dead=false
      and (p_type is null or ((p_type between 11 and 14 and (case coalesce(m.family,1) when 1 then 1 when 2 then 1 when 4 then 2 when 5 then 2 when 6 then 3 when 7 then 3 when 3 then 4 when 8 then 4 else 1 end)=p_type-10) or (p_type between 0 and 3 and m.type=p_type)))
  )
  select s.user_id,s.monster_id,s.name,s.family,s.type,s.life_stage,s.is_dead
  from top_pets s
  where s.pet_rank<=3
  order by s.newest desc nulls last,s.user_id,s.pet_rank
  limit 90;
$function$;
REVOKE ALL ON FUNCTION public.game_plaza_monsters(smallint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.game_plaza_monsters(smallint) TO authenticated;
