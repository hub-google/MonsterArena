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
export const appearance=(monster,vehicle=false)=>vehicle&&Number(monster?.life_stage)>=4&&!monster?.is_dead?{vehicle:true,skin:null}:{vehicle:false,skin:wornSkin(monster)?.id||null};
export const hasDisguise=(monster,vehicle=false)=>Boolean(appearance(monster,vehicle).skin||appearance(monster,vehicle).vehicle);
