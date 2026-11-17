-- Current main/release call authenticated RPCs for all mutations on these tables.
-- Browser clients retain read access as needed.
REVOKE ALL ON TABLE public.users, public.user_inventory, public.raid_boss,
  public.messages, public.gifts, public.battle_records
  FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.users, public.user_inventory, public.raid_boss,
  public.messages, public.gifts, public.battle_records TO authenticated;

-- Direct client aging and renaming still update monsters; do not revoke UPDATE
-- before replacing those operations with server-side RPCs.
REVOKE TRUNCATE ON TABLE public.monsters FROM PUBLIC, anon, authenticated;
