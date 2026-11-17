-- Arena main fix 3: preserve own complete monster access, expose only plaza-safe fields for other players.
-- No existing monster rows or gameplay stats are changed.
create or replace function public.game_plaza_monsters(p_type smallint default null)
returns table(user_id uuid,monster_id uuid,name text,family smallint,type smallint,life_stage smallint,is_dead boolean)
language sql security definer set search_path=public,pg_temp
as $$
  select m.user_id,m.monster_id,m.name,m.family,m.type,m.life_stage,m.is_dead
  from public.monsters m
  where (select auth.uid()) is not null
    and m.is_dead=false
    and (p_type is null or m.type=p_type)
  order by m.created_at desc nulls last,m.monster_id
  limit 100;
$$;
revoke all on function public.game_plaza_monsters(smallint) from PUBLIC,anon;
grant execute on function public.game_plaza_monsters(smallint) to authenticated;

drop policy if exists "Anyone can view monsters" on public.monsters;
drop policy if exists "arena_monster_owner_read" on public.monsters;
create policy "arena_monster_owner_read" on public.monsters
  for select to authenticated
  using (user_id=(select auth.uid()));
