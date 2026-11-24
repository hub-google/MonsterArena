-- Arena units never die. Keep the legacy column for RPC/client compatibility only.
-- Restore historical dead rows without changing their stats or ownership.
UPDATE public.monsters SET is_dead=false WHERE is_dead IS DISTINCT FROM false;
DO $immortal$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='arena_monsters_never_die' AND conrelid='public.monsters'::regclass) THEN
    ALTER TABLE public.monsters ADD CONSTRAINT arena_monsters_never_die CHECK (is_dead IS FALSE);
  END IF;
END $immortal$;

-- Arena units never die. Keep the legacy column for RPC/client compatibility only.
-- Restore historical dead rows without changing their stats or ownership.
UPDATE public.arena_preview_monsters SET is_dead=false WHERE is_dead IS DISTINCT FROM false;
DO $immortal$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='arena_monsters_never_die' AND conrelid='public.arena_preview_monsters'::regclass) THEN
    ALTER TABLE public.arena_preview_monsters ADD CONSTRAINT arena_monsters_never_die CHECK (is_dead IS FALSE);
  END IF;
END $immortal$;
