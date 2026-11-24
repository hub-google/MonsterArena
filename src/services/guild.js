import {ARENA_PREVIEW,gameTable,gameRpc,getUid,throwIfError} from './backend.js';
import {action} from './transactions.js';

export const guildApi = {
  getGuilds: async (uid) => {
    uid = uid ?? await getUid();
    const [guildResult, memberResult] = await Promise.all([
      gameTable('guilds').select('*').order('created_at', { ascending: false }).limit(100),
      gameTable('guild_members').select(ARENA_PREVIEW?'*,guilds:arena_preview_guilds(*)':'*,guilds(*)').eq('user_id', uid).maybeSingle()
    ]);
    throwIfError(guildResult.error);throwIfError(memberResult.error);
    const guilds = guildResult.data ?? [];
    const leaderIds = [...new Set(guilds.map(g => g.leader_id).filter(Boolean))];
    let usernames = {};
    if (leaderIds.length) {
      const { data, error } = await gameRpc('game_public_profiles',{p_user_ids:leaderIds});
      throwIfError(error);
      usernames = Object.fromEntries((data ?? []).map(u => [u.user_id,u.username]));
    }
    const membership = memberResult.data;
    const myGuild = membership?.guilds ? { ...membership.guilds,
      role: membership.role, contribution: membership.contribution } : null;
    return { guilds: guilds.map(g=>({...g,leader_name:usernames[g.leader_id]||'會長'})), myGuild };
  },
  createGuild: name => action('guild_create', { name }),
  joinGuild: guild_id => action('guild_join', { guild_id }),
  leaveGuild: () => action('guild_leave'),
  donateGuild: amount => action('guild_donate', { amount }),
  buyGuildShop: item_id => action('guild_buy', { item_id }),
};
