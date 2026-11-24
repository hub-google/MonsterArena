-- Canonical source: current Game database definition, captured 2026-11-17.
-- Historical migrations are immutable records; edit this file for future changes.
CREATE OR REPLACE FUNCTION public.game_friend_action(p_mode text, p_peer uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_uid uuid:=(select auth.uid());
  v_peer_name text;
  v_own_name text;
  v_changed integer;
begin
  if v_uid is null then raise exception '請先登入'; end if;
  if p_peer is null or v_uid=p_peer then raise exception '好友帳號無效'; end if;
  select username into v_peer_name from public.users where user_id=p_peer;
  select username into v_own_name from public.users where user_id=v_uid;
  if v_peer_name is null or v_own_name is null then raise exception '找不到玩家'; end if;
  if p_mode='request' then
    if exists (select 1 from public.friends
      where user_id=v_uid and friend_uid=p_peer and status=1)
      then raise exception '已經是好友'; end if;
    if exists (select 1 from public.friends
      where user_id=p_peer and friend_uid=v_uid and status=0)
      then raise exception '對方已邀請你，請到好友邀請清單接受'; end if;
    insert into public.friends(user_id,friend_uid,friend_name,status)
      values(v_uid,p_peer,v_peer_name,0)
      on conflict(user_id,friend_uid) do nothing;
    get diagnostics v_changed=row_count;
    if v_changed=0 then raise exception '好友邀請已送出，請等待對方回覆'; end if;
    return jsonb_build_object('message','好友邀請已送出');
  elsif p_mode='accept' then
    update public.friends set status=1
      where user_id=p_peer and friend_uid=v_uid and status=0;
    get diagnostics v_changed=row_count;
    if v_changed=0 then raise exception '找不到待處理的好友邀請'; end if;
    insert into public.friends(user_id,friend_uid,friend_name,status)
      values(v_uid,p_peer,v_peer_name,1)
      on conflict(user_id,friend_uid)
      do update set status=1,friend_name=excluded.friend_name;
    return jsonb_build_object('message','好友邀請已接受');
  else raise exception '未知好友操作';
  end if;
end; $function$;
REVOKE ALL ON FUNCTION public.game_friend_action(text,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.game_friend_action(text,uuid) TO authenticated;
