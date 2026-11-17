-- Canonical source: current Game database definition, captured 2026-11-17.
-- Historical migrations are immutable records; edit this file for future changes.
CREATE OR REPLACE FUNCTION public.game_claim_gifts()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_uid uuid:=(select auth.uid());
  v_count int;
begin
  if v_uid is null then raise exception '請先登入'; end if;
  perform 1 from public.users where user_id=v_uid for update;
  with pending as (
    select gift_id from public.gifts where receiver=v_uid::text and claimed=false for update
  ), credited as (
    update public.gifts set claimed=true where gift_id in(select gift_id from pending)
    returning gift_id
  )
  select count(*) into v_count from credited;
  if v_count>0 then
    update public.users set stamina=least(coalesce(max_stamina,100),coalesce(stamina,0)+20*v_count)
      where user_id=v_uid;
  end if;
  return v_count;
end; $function$
REVOKE ALL ON FUNCTION public.game_claim_gifts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.game_claim_gifts() TO authenticated;
