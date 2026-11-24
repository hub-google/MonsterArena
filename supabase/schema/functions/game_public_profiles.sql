-- Canonical source: current Game database definition, captured 2026-11-17.
-- Historical migrations are immutable records; edit this file for future changes.
CREATE OR REPLACE FUNCTION public.game_public_profiles(p_user_ids uuid[] DEFAULT NULL::uuid[], p_username text DEFAULT NULL::text)
 RETURNS TABLE(user_id uuid, username text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  if (select auth.uid()) is null then raise exception '請先登入'; end if;
  if cardinality(p_user_ids)>100 then raise exception '查詢筆數過多'; end if;
  return query
    select u.user_id,u.username from public.users u
    where (p_user_ids is null or u.user_id=any(p_user_ids))
      and (p_username is null or lower(u.username)=lower(p_username))
    order by u.user_id limit 100;
end; $function$;
REVOKE ALL ON FUNCTION public.game_public_profiles(uuid[],text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.game_public_profiles(uuid[],text) TO authenticated;
