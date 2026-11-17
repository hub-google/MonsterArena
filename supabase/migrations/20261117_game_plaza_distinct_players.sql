-- Return up to 30 distinct player cards and no more than three pets per card.
-- Previous global LIMIT 100 omitted older players when two users owned 50 pets each.
create or replace function public.game_plaza_monsters(p_type smallint default null)
returns table(
  user_id uuid,monster_id uuid,name text,family smallint,
  type smallint,life_stage smallint,is_dead boolean)
language sql stable security definer set search_path=public,pg_temp
as $$
  with recent_players as materialized (
    select m.user_id,max(m.created_at) as newest
    from public.monsters m
    where (select auth.uid()) is not null
      and m.is_dead=false
      and (p_type is null or m.type=p_type)
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
      and (p_type is null or m.type=p_type)
  )
  select s.user_id,s.monster_id,s.name,s.family,s.type,s.life_stage,s.is_dead
  from top_pets s
  where s.pet_rank<=3
  order by s.newest desc nulls last,s.user_id,s.pet_rank
  limit 90;
$$;
revoke all on function public.game_plaza_monsters(smallint) from PUBLIC,anon;
grant execute on function public.game_plaza_monsters(smallint) to authenticated;
create index if not exists arena_monsters_plaza_latest_idx
  on public.monsters(user_id,created_at desc,monster_id)
  where is_dead=false;
