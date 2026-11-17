-- Arena main: RLS policies reflect actual browser privileges.
-- Table writes are controlled by privileged game RPCs; users may only SELECT their own rows.
-- This also avoids per-row auth.uid() evaluation warned about by Supabase advisor.
drop policy if exists "Users can manage their own profile" on public.users;
drop policy if exists "arena_users_self_read" on public.users;
create policy "arena_users_self_read" on public.users
  for select to authenticated using (user_id=(select auth.uid()));

drop policy if exists "Users can manage their own inventory" on public.user_inventory;
drop policy if exists "arena_inventory_self_read" on public.user_inventory;
create policy "arena_inventory_self_read" on public.user_inventory
  for select to authenticated using (user_id=(select auth.uid()));

drop policy if exists "Gifts for self" on public.gifts;
drop policy if exists "arena_gifts_self_read" on public.gifts;
create policy "arena_gifts_self_read" on public.gifts
  for select to authenticated
  using (sender=(select auth.uid())::text or receiver=(select auth.uid())::text);

-- The message insert policy is obsolete; only game_action('chat') writes messages.
drop policy if exists "Users can insert messages" on public.messages;
-- Only game_action('raid') may write boss health; no direct browser INSERT/UPDATE.
drop policy if exists "Admin can insert raid_boss" on public.raid_boss;
drop policy if exists "Users can update raid_boss" on public.raid_boss;

-- Preserve all valid SELECT grants while explicitly enforcing read-only app roles.
revoke INSERT,UPDATE,DELETE on public.users,public.user_inventory,
  public.gifts,public.messages,public.raid_boss from PUBLIC,anon,authenticated;
