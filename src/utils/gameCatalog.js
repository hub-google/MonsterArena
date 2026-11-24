// Shared game economy: V2 SQL is generated from the same catalog the UI reads.
import { BALANCED_SHOP_ITEMS } from './mechaVocabulary.js';
import { SKINS } from './skins.js';

export const SHOP_CATALOG = Object.freeze([
  ...BALANCED_SHOP_ITEMS.map(({id,price})=>Object.freeze({id,price,itemType:
    ['breed_catalyst','ultimate_core'].includes(id)?3:id.startsWith('chip_')?4:
    ['medicine_standard','vitamin'].includes(id)?2:1,cosmetic:false})),
  ...SKINS.map(({id,price})=>Object.freeze({id,price,itemType:1,cosmetic:true}))
]);
export const QUEST_CATALOG = Object.freeze([
  {id:'feed_3',title:'能源補給',desc:'為機體補充能源 3 次',target:3,key:'feed_count',reward:50,legacyReward:100},
  {id:'clean_1',title:'例行維護',desc:'執行機體保養 1 次',target:1,key:'clean_count',reward:30,legacyReward:50},
  {id:'train_2',title:'戰鬥校準',desc:'執行機體訓練 2 次',target:2,key:'train_count',reward:70,legacyReward:150},
  {id:'battle_2',title:'戰場演習',desc:'參與競技場戰鬥 2 次',target:2,key:'battle_count',reward:100,legacyReward:150}
].map(Object.freeze));
export const dailyQuestConfig = v2=>QUEST_CATALOG.map(q=>({...q,reward:v2?q.reward:q.legacyReward}));
export const GUILD_SHOP = Object.freeze([
  {id:'chip_extractor',name:'晶片提取器',description:'安全拔除已安裝的晶片',icon:'🔧',price:300,itemType:4},
  {id:'breed_catalyst',name:'核心融合增幅器',description:'核心融合時變異機率翻倍',icon:'⚙️',price:150,itemType:3},
  {id:'ultimate_core',name:'終極升級核心',description:'超限機升級終極機甲的必備材料',icon:'🔮',price:500,itemType:3}
].map(Object.freeze));
