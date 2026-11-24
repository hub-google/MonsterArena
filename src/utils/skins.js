// Pure cosmetic catalog. Never use cosmetics in combat calculations.
export const SKINS=Object.freeze([
  {
    "id": "skin_flerken",
    "name": "噬元獸",
    "price": 100
  },
  {
    "id": "skin_husky",
    "name": "哈士奇",
    "price": 50
  },
  {
    "id": "skin_dragon",
    "name": "火龍",
    "price": 150
  },
  {
    "id": "skin_slime",
    "name": "史萊姆",
    "price": 50
  },
  {
    "id": "skin_ghost",
    "name": "幽靈",
    "price": 80
  },
  {
    "id": "skin_panda",
    "name": "熊貓",
    "price": 80
  },
  {
    "id": "skin_dino",
    "name": "機甲恐龍",
    "price": 200
  },
  {
    "id": "skin_fox",
    "name": "九尾狐",
    "price": 180
  },
  {
    "id": "skin_angel",
    "name": "天使",
    "price": 250
  },
  {
    "id": "skin_demon",
    "name": "暗影惡魔",
    "price": 300
  }
].map(Object.freeze));
export const getSkin=id=>SKINS.find(s=>s.id===id)||null;
export const ownsSkin=(inventory,id)=>Boolean(getSkin(id)&&inventory?.some(i=>i.item_id===id&&Number(i.quantity)>0));
export const canWearSkin=monster=>Boolean(monster&&!monster.is_dead&&Number(monster.life_stage)>=2);
export const wornSkin=monster=>canWearSkin(monster)?getSkin(monster.skin_id):null;
export const canTransform=monster=>canWearSkin(monster)&&Number(monster.life_stage)>=4;
// A collected skin, a robot and its original vehicle are independent display modes.
// Only the equipped skin is stored on the server; temporary mode selection is per session.
export function appearanceMode(monster,preferred='skin'){
 if(!canWearSkin(monster))return 'robot';
 if(preferred==='vehicle'&&canTransform(monster))return 'vehicle';
 if(preferred==='robot')return 'robot';
 return wornSkin(monster)?'skin':'robot';
}
export function appearance(monster,preferred='skin'){
 const mode=appearanceMode(monster,preferred);
 return {vehicle:mode==='vehicle',skin:mode==='skin'?wornSkin(monster)?.id||null:null};
}
export function nextAppearanceMode(monster,preferred='skin'){
 const modes=['robot',...(canTransform(monster)?['vehicle']:[]),...(wornSkin(monster)?['skin']:[])];
 return modes.length>1?modes[(modes.indexOf(appearanceMode(monster,preferred))+1)%modes.length]:null;
}
export const hasDisguise=(monster,preferred='skin')=>{const look=appearance(monster,preferred);return Boolean(look.skin||look.vehicle);};

