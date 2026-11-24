import {presentGameMessage} from '../utils/mechaVocabulary.js';
import {supabase,supabaseUrl} from '../utils/supabaseClient.js';

// The preview namespace is isolated from the original Game tables, while
// retaining the same Supabase Auth accounts. Independent test projects also work.
export const ARENA_PREVIEW=import.meta.env.VITE_ARENA_PREVIEW==='true';
const explicitBackend=Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
const originalGame=supabaseUrl.includes('fanffwnhkxpfhttylntw');
const otherShared=supabaseUrl.includes('unapiwajmgqqtdkixaab');
export const GAME_RULES_V2=import.meta.env.VITE_ARENA_V2==='true' &&
  (ARENA_PREVIEW ? !otherShared && (originalGame||explicitBackend) : explicitBackend && !originalGame && !otherShared);
export const gameResource=name=>ARENA_PREVIEW?'arena_preview_'+name:name;
export const gameRpc=(name,args)=>supabase.rpc(gameResource(name),args);
export const gameTable=name=>supabase.from(gameResource(name));

// All economy mutations go through authenticated PostgreSQL transactions.
// Direct client updates are reserved for owner-controlled presentation state.
export const getUid = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error('User not authenticated');
  return user.id;
};
export const throwIfError = error => { if (error) throw new Error(presentGameMessage(error.message)); };
