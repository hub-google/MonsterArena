import {gameTable,getUid,throwIfError} from './backend.js';
import {action} from './transactions.js';

const dateInTaiwan = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit'
}).format(new Date());
const getQuestId = uid => `${uid}_${dateInTaiwan()}`;


export const economyApi = {
  getInventory: async (uid) => {
    uid = uid ?? await getUid();
    const { data, error } = await gameTable('user_inventory').select('*').eq('user_id', uid).order('item_id');
    throwIfError(error);
    return data ?? [];
  },
  equipSkin: (monster_id, skin_id) => action('skin_equip', { monster_id, skin_id }),
  buyItem: (item_id, quantity=1) => action('buy', { item_id, quantity }),
  trackQuestProgress: async () => {
    // Counts are updated atomically together with the corresponding game action.
  },
  getDailyQuests: async () => {
    const uid = await getUid();
    const { data, error } = await gameTable('daily_quests').select('*')
      .eq('quest_id', getQuestId(uid)).maybeSingle();
    throwIfError(error);
    return data ?? { feed_count:0, clean_count:0, train_count:0, battle_count:0, claimed:[] };
  },
  claimQuest: quest_id => action('claim', { quest_id }),
};
