# Arena main security audit (2026-11-17)

Only `main` is under maintenance. Supabase Game (`fanffwnhkxpfhttylntw`) remains the database.

## Hardening in 20261117_game_secure_core.sql

- Legacy unsafe `deduct_gold` and ten `rpc_*` SECURITY DEFINER endpoints are no longer executable by browser roles. Existing functions and data are kept.
- Player `users` RLS permits only the player's own row; `game_public_profiles` exposes only user UUID and username.
- Browser writes to `monsters` are revoked. `game_age_monsters` and `game_rename_monster` validate auth.uid() server-side.
- `game_action('battle')` computes and records results server-side. Client `won` and `battleId` values are ignored; server-generated battle IDs are unique.
- Vitamin is consumed during training, adding 10% to the normal stat increase.
- Previous six restricted game tables and six transactional tables retain the RLS/grant protections from earlier migrations.
- No other project in the shared Supabase database is intentionally modified.

## Verification

`npm run check:contract` checks frontend/API and migration invariants, and is required for the `main` deployment. Runtime cross-account tests are still required for full security assurance. The remote SQL migration must be applied to Game and verified independently; GitHub CI alone cannot prove live database policies.

## Follow-up guardrails

The `20261117_game_guardrails_perf.sql` migration blocks egg feeding/cleaning/training at the server, creates scoped indexes for Arena lookups, and fixes the retired RPCs' mutable search paths. It does not grant any legacy RPC back to browser roles.
