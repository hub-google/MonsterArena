import { createClient } from '@supabase/supabase-js';

// Original game backend. Keep this project reference to preserve all existing accounts.
export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://fanffwnhkxpfhttylntw.supabase.co';
export const publishableKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_fsrieSLUXlq-_WDpPY9K_w_eO-dN_jT';

// Publishable API keys are designed for browsers. NEVER expose service_role.
export const supabase = createClient(supabaseUrl, publishableKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

// Remember a verified recovery flow through refreshes in this tab only.
const initialRecoveryHash = new URLSearchParams(window.location.hash.slice(1));
const incomingRecovery = initialRecoveryHash.get('type') === 'recovery' || initialRecoveryHash.has('error_code');
const recoveryKey = 'ma-password-recovery:' + supabaseUrl;
const readRecovery = () => {try {return sessionStorage.getItem(recoveryKey);} catch {return null;}};
const writeRecovery = uid => {try {if(uid)sessionStorage.setItem(recoveryKey,uid);else sessionStorage.removeItem(recoveryKey);} catch {/* private browsing */}};
if(incomingRecovery)writeRecovery(null);
export const recoveryLinkOpened = incomingRecovery || Boolean(readRecovery());
let recoveryUid = null;
supabase.auth.onAuthStateChange((event, session) => {
  const uid=session?.user?.id ?? null;
  if(event==='PASSWORD_RECOVERY' && uid){
    recoveryUid=uid;
    writeRecovery(uid);
  }else if(!uid || (recoveryUid && recoveryUid!==uid)){
    recoveryUid=null;writeRecovery(null);
  }else if(event==='INITIAL_SESSION' && !incomingRecovery && readRecovery()===uid){
    recoveryUid=uid;
  }
});
export const getRecoveryUid = () => recoveryUid;
