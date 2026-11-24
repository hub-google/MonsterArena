import { createClient } from '@supabase/supabase-js';

// Original game backend. Keep this project reference to preserve all existing accounts.
export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://fanffwnhkxpfhttylntw.supabase.co';
export const publishableKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_fsrieSLUXlq-_WDpPY9K_w_eO-dN_jT';

// Publishable API keys are designed for browsers. NEVER expose service_role.
export const supabase = createClient(supabaseUrl, publishableKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

// Subscribe before React mounts so a fast recovery redirect is not lost.
const initialRecoveryHash = new URLSearchParams(window.location.hash.slice(1));
export const recoveryLinkOpened = initialRecoveryHash.get('type') === 'recovery' || initialRecoveryHash.has('error_code');
let recoveryUid = null;
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'PASSWORD_RECOVERY') recoveryUid = session?.user?.id ?? null;
  else if (!session || (recoveryUid && session.user.id !== recoveryUid)) recoveryUid = null;
});
export const getRecoveryUid = () => recoveryUid;
