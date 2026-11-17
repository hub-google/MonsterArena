// The only maintained inventory of active Arena Game RPC sources.
// Historical supabase/migrations/*.sql are applied audit history, NOT editable canonical code.
export const GAME_FUNCTIONS = Object.freeze([
  { name: 'game_ensure_profile', signature: '()' },
  { name: 'game_public_profiles', signature: '(uuid[],text)' },
  { name: 'game_age_monsters', signature: '()' },
  { name: 'game_rename_monster', signature: '(uuid,text)' },
  { name: 'game_friend_action', signature: '(text,uuid)' },
  { name: 'game_claim_gifts', signature: '()' },
  { name: 'game_plaza_monsters', signature: '(smallint)' },
  { name: 'game_action', signature: '(text,jsonb)' },
]);
