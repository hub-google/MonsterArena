import {GAME_RULES_V2,gameRpc,gameTable,getUid,throwIfError} from './backend.js';
import {action} from './transactions.js';

export const unitApi = {
  getMonsters: async (uid) => {
    uid = uid ?? await getUid();
    const aged=await gameRpc('game_age_monsters');
    throwIfError(aged.error);
    const { data, error } = await gameTable('monsters').select('*').eq('user_id', uid);
    throwIfError(error);
    return (data ?? []).sort((a,b) => Number(a.is_dead)-Number(b.is_dead) || b.life_stage-a.life_stage);
  },
  hatchEgg: () => action('hatch'),
  feed: (monster_id, item_id, buyMissing=false) => action('feed', { monster_id, item_id, ...(GAME_RULES_V2&&buyMissing?{buy_missing:true}:{}) }),
  clean: monster_id => action('clean', { monster_id }),
  heal: (monster_id, item_id = 'medicine_standard', buyMissing=false) => action('heal', { monster_id, item_id, ...(GAME_RULES_V2&&buyMissing?{buy_missing:true}:{}) }),
  train: (monster_id,stat='pool',boost=false,buyMissing=false) => action('train', { monster_id, ...(GAME_RULES_V2?{stat,boost,...(buyMissing?{buy_missing:true}:{})}:{}) }),
  evolve: monster_id => action('evolve', { monster_id }),
  release: monster_id => action('release', { monster_id }),
  toggleLock: monster_id => action('lock', { monster_id }),
  equipChip: (monster_id, item_id, slot) => action('equip', { monster_id, item_id, slot }),
  unequipChip: (monster_id, slot) => action('unequip', { monster_id, slot }),
  breed: (parent1, parent2, useCatalyst=false) => action('breed', { parent1, parent2, useCatalyst }),
  allocateTraining: (monster_id,target) => action('train', {monster_id,stat:'allocate',target}),
  rename: async (monster_id, name) => {
    const {data,error}=await gameRpc('game_rename_monster',{p_monster_id:monster_id,p_name:name});
    throwIfError(error);
    return data;
  },
};
