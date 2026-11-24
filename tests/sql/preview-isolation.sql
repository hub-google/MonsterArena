-- Real authorization and isolation regression in CI only.
\set ON_ERROR_STOP on
BEGIN;
INSERT INTO auth.users(id,email) VALUES ('33333333-3333-4333-8333-333333333331','isolation-a@example.invalid'),('33333333-3333-4333-8333-333333333332','isolation-b@example.invalid');
INSERT INTO public.users(user_id,username,email,gold) VALUES ('33333333-3333-4333-8333-333333333331','formal-A','isolation-a@example.invalid',777);
INSERT INTO public.arena_preview_users(user_id,username,email,gold) VALUES ('33333333-3333-4333-8333-333333333331','preview-A','isolation-a@example.invalid',500),('33333333-3333-4333-8333-333333333332','preview-B','isolation-b@example.invalid',900);
DO $$ BEGIN
 IF has_table_privilege('anon','public.arena_preview_users','SELECT') OR has_table_privilege('authenticated','public.arena_preview_users','UPDATE') OR has_function_privilege('anon','public.arena_preview_game_action(text,jsonb)','EXECUTE') THEN RAISE EXCEPTION 'unsafe preview grants'; END IF;
 IF NOT has_function_privilege('anon','public.arena_preview_health()','EXECUTE') THEN RAISE EXCEPTION 'public health unavailable'; END IF;
END $$;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333331',true);
DO $$ BEGIN
 IF (SELECT count(*) FROM public.arena_preview_users)<>1 THEN RAISE EXCEPTION 'preview cross-account read'; END IF;
 IF (public.arena_preview_game_action('capabilities')->>'combatBalance')::int<>3 THEN RAISE EXCEPTION 'wrong preview rules'; END IF;
 PERFORM public.arena_preview_game_action('buy','{"item_id":"meat_basic","quantity":1,"request_id":"33333333-3333-4333-8333-333333333339"}');
END $$;
RESET ROLE;
DO $$ BEGIN
 IF (SELECT gold FROM public.users WHERE user_id='33333333-3333-4333-8333-333333333331')<>777 THEN RAISE EXCEPTION 'preview mutated formal profile'; END IF;
 IF (SELECT gold FROM public.arena_preview_users WHERE user_id='33333333-3333-4333-8333-333333333331')<>490 THEN RAISE EXCEPTION 'preview buy not settled'; END IF;
 IF (SELECT gold FROM public.arena_preview_users WHERE user_id='33333333-3333-4333-8333-333333333332')<>900 THEN RAISE EXCEPTION 'preview cross-account mutation'; END IF;
END $$;
ROLLBACK;
