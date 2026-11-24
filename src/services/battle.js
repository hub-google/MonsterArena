import {GAME_RULES_V2,gameTable,throwIfError} from './backend.js';
import {action} from './transactions.js';

export const battleApi = {
  startBattle: (monster_id, encounter='wild', opponent_id) => action('battle', { monster_id, encounter, ...(opponent_id?{opponent_id}:{}) }),
  settleBossTactics: (monster_id,moves,request_id) => action('battle',{monster_id,encounter:'boss',moves,request_id}),
  getPvp: () => action('pvp_list'),
  registerPvp: monster_id => action('pvp_register',{monster_id}),
  unregisterPvp: () => action('pvp_unregister'),
  claimRaid: boss_id => action('raid_claim',{boss_id}),
  getRaidStatus: async () => {
    if(GAME_RULES_V2)return action('raid_status');
    const { data, error } = await gameTable('raid_boss').select('*')
      .order('created_at', { ascending: false }).limit(1).maybeSingle();
    throwIfError(error);
    return data ?? { name:'機械紀元首領',current_hp:0,max_hp:500000,is_active:false };
  },
  attackRaidBoss: (monster_id,strategy='assault') => action('raid', { monster_id,...(GAME_RULES_V2?{strategy}:{}) }),
};
