-- Canonical source: current Game database definition, captured 2026-11-17.
-- Historical migrations are immutable records; edit this file for future changes.
CREATE OR REPLACE FUNCTION public.game_ensure_profile()
 RETURNS users
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_uid uuid := (select auth.uid());
  v_auth record;
  v_profile public.users%rowtype;
  v_name text;
begin
  if v_uid is null then raise exception '請先登入'; end if;
  select * into v_profile from public.users where user_id=v_uid;
  if found then return v_profile; end if;
  select email, raw_user_meta_data into v_auth from auth.users where id=v_uid;
  if not found then raise exception '登入帳號不存在'; end if;
  v_name:=left(trim(coalesce(v_auth.raw_user_meta_data->>'username','')),24);
  if v_name='' then v_name:='玩家_'||left(replace(v_uid::text,'-',''),8); end if;
  if exists(select 1 from public.users where username=v_name and user_id<>v_uid) then
    v_name:=left(v_name,15)||'_'||left(replace(v_uid::text,'-',''),8);
  end if;
  insert into public.users(user_id,username,email,gold,premium_gems,stamina,max_stamina)
    values(v_uid,v_name,coalesce(v_auth.email,v_uid::text||'@monsterarena.app'),500,0,100,100)
    on conflict(user_id) do nothing;
  select * into v_profile from public.users where user_id=v_uid;
  return v_profile;
end; $function$
REVOKE ALL ON FUNCTION public.game_ensure_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.game_ensure_profile() TO authenticated;
