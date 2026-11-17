# Arena engineering policy for coding agents

## Repair the source, never stack a patch

1. Diagnose and reproduce a confirmed bug before editing.
2. Fix the original, **canonical** implementation; remove redundant branches, obsolete code, and unused dependencies. Do not add wrapper-on-wrapper fixes, duplicated functions, `*_new` or `*_v2` alternatives that conceal the actual defect.
3. Maintain the eight current Supabase Game RPC sources only in `supabase/schema/functions/`. Historical `supabase/migrations/` files are immutable audit history, never the source for a new change and never to be blindly replayed against production.
4. For an unavoidable database change: edit the canonical SQL first; create one documented, timestamped migration from that source as required by Supabase; verify live definitions and user data after deployment. A migration is not a substitute for updating the canonical source.
5. Keep `main` as GitHub Pages test only, `release` as Cloudflare formal only. Do not change `release` or deploy Workers unless explicitly requested. Avoid touching other projects sharing Supabase.
6. Add meaningful regression tests for the confirmed defect, run lint, contract, unit, build and built-site browser checks. Do not claim all authenticated E2E flows passed when they have not.
7. Report exact root cause, edited files, test outcomes and any remaining limitations. No fabricated BUGs or hiding failures behind retries.

**Project scope:** This file governs Arena. For the same rule across *all* projects, add it to account-wide ChatGPT Custom Instructions or to each Project's instructions.
