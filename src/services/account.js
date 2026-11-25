import {supabase,getRecoveryUid} from '../utils/supabaseClient.js';
import {GAME_RULES_V2,gameRpc,gameTable,throwIfError} from './backend.js';
import {action} from './transactions.js';

const usernameEmail = name => `${name.toLowerCase().replace(/[^a-z0-9_]/g, '')}@monsterarena.app`;
const legacyUsernameEmail = name => `${name.toLowerCase().replace(/[^a-z0-9]/g, '')}@monsterarena.app`;

export const accountApi = {
  register: async (username, email, password) => {
    const trimmed = username.trim();
    if (!/^[a-zA-Z0-9_]{3,24}$/.test(trimmed)) throw new Error('帳號需為 3–24 位英數字或底線');
    const finalEmail = email?.trim() || usernameEmail(trimmed);
    const { data, error } = await supabase.auth.signUp({
      email: finalEmail, password, options: { data: { username: trimmed } }
    });
    throwIfError(error);
    if (data.session) {
      const result = await gameRpc('game_ensure_profile');
      throwIfError(result.error);
    }
    return { user: data.user, requiresEmailConfirmation: !data.session };
  },
  login: async (usernameOrEmail, password) => {
    const input = usernameOrEmail.trim();
    const isEmail = input.includes('@');
    const email = isEmail ? input : usernameEmail(input);
    let { data, error } = await supabase.auth.signInWithPassword({ email, password });
    // Older username-only accounts stripped underscores from synthetic addresses.
    // A fallback must verify the account name to avoid logging into a collision.
    if (error && !isEmail && input.includes('_')) {
      const legacy = await supabase.auth.signInWithPassword({
        email: legacyUsernameEmail(input), password
      });
      if (!legacy.error) {
        const actualName = legacy.data.user?.user_metadata?.username;
        if (!actualName || actualName.toLowerCase() !== input.toLowerCase()) {
          await supabase.auth.signOut();
          throw new Error('帳號名稱不符，請使用註冊 Email 登入');
        }
        data = legacy.data;
        error = null;
      }
    }
    throwIfError(error);
    return { user: data.user };
  },
  requestPasswordReset: async (email) => {
    const address = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address) || /@monsterarena\.app$/i.test(address)) {
      throw new Error('請輸入可收信的註冊 Email');
    }
    const redirectTo = window.location.origin + window.location.pathname;
    const { error } = await supabase.auth.resetPasswordForEmail(address, { redirectTo });
    if (error) {
      if (error.status === 429) throw new Error('寄信次數過多，請稍後重試');
      throw new Error('暫時無法寄出重設信，請稍後重試');
    }
  },
  resetPassword: async (password, recoveryUid) => {
    if(getRecoveryUid() !== recoveryUid) throw new Error('驗證已失效，請重新申請重設密碼');
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user || user.id !== recoveryUid) throw new Error('驗證已失效，請重新申請重設密碼');
    const { error } = await supabase.auth.updateUser({ password });
    throwIfError(error);
  },
  endPasswordRecovery: async (changed) => {
    const { error } = await supabase.auth.signOut({ scope: changed ? 'global' : 'local' });
    throwIfError(error);
  },
  logout: async () => {
    const { error } = await supabase.auth.signOut();
    throwIfError(error);
  },
  getMe: async () => {
    const { data, error } = await gameRpc('game_ensure_profile');
    throwIfError(error);
    if(GAME_RULES_V2){const caps=await action('capabilities');if(caps.combatBalance!==3)throw new Error('遊戲後端尚未更新至目前戰鬥平衡版本');}
    const giftResult = await gameRpc('game_claim_gifts');
    if(giftResult.error)console.warn('Gift claim unavailable; re-reading current player balance',giftResult.error.message);
    if (giftResult.error || giftResult.data > 0) {
      const refresh = await gameTable('users').select('*').eq('user_id',data.user_id).single();
      throwIfError(refresh.error);
      return refresh.data;
    }
    return data;
  },
};
