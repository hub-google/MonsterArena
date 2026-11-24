-- Canonical source: current Game database definition, captured 2026-11-17.
-- Historical migrations are immutable records; edit this file for future changes.
CREATE OR REPLACE FUNCTION public.game_rename_monster(p_monster_id uuid, p_name text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_uid uuid:=(select auth.uid()); v_name text:=left(trim(p_name),30);
begin
  if v_uid is null then raise exception '請先登入'; end if;
  if v_name is null or v_name='' then raise exception '請輸入怪獸名稱'; end if;
  update public.monsters set name=v_name
    where monster_id=p_monster_id and user_id=v_uid;
  if not found then raise exception '無法修改其他玩家的怪獸'; end if;
  return jsonb_build_object('message','怪獸名稱已更新');
end; $function$;
REVOKE ALL ON FUNCTION public.game_rename_monster(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.game_rename_monster(uuid,text) TO authenticated;
