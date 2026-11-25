import {presentGameMessage} from '../utils/mechaVocabulary.js';
import {supabase,supabaseUrl} from '../utils/supabaseClient.js';

// Build targets are isolated while sharing the existing Game Auth accounts.
export const ARENA_PREVIEW=import.meta.env.VITE_ARENA_PREVIEW==='true';
const explicitBackend=Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
const originalGame=supabaseUrl.includes('fanffwnhkxpfhttylntw');
const otherShared=supabaseUrl.includes('unapiwajmgqqtdkixaab');
export const ARENA_LIVE=import.meta.env.VITE_DEPLOY_TARGET==='cloudflare' && !ARENA_PREVIEW;
if(ARENA_LIVE && !originalGame) throw new Error('正式 Arena 資料庫設定錯誤');
export const GAME_RULES_V2=ARENA_LIVE || (import.meta.env.VITE_ARENA_V2==='true' &&
  (ARENA_PREVIEW ? !otherShared && (originalGame||explicitBackend) : explicitBackend && !originalGame && !otherShared));
export const gameResource=name=>ARENA_LIVE?'arena_live_'+name:ARENA_PREVIEW?'arena_preview_'+name:name;
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
