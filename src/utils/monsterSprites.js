// Arena 機械紀元: legacy codes remain stable; faction/role is a lossless presentation mapping.
export const STAGE_NAMES = Object.freeze(['','核心','初生機','原型機','戰鬥機','超限機','終極機']);
export const FACTIONS = Object.freeze([
 {id:1,legacy:1,name:'疾風族',color:'#f05248',roles:[{name:'突擊型',vehicle:'超級跑車',skill:'爆發重擊'},{name:'迅捷型',vehicle:'重型摩托車',skill:'高速連擊'}]},
 {id:2,legacy:4,name:'鋼鐵族',color:'#91bd51',roles:[{name:'堡壘型',vehicle:'裝甲運輸車',skill:'裝甲防禦'},{name:'重砲型',vehicle:'重型坦克',skill:'蓄力破甲'}]},
 {id:3,legacy:7,name:'蒼空族',color:'#419fed',roles:[{name:'狙擊型',vehicle:'戰鬥機',skill:'精準射擊'},{name:'轟炸型',vehicle:'武裝直升機',skill:'週期轟炸'}]},
 {id:4,legacy:3,name:'星核族',color:'#b38af6',roles:[{name:'干擾型',vehicle:'量子飛碟',skill:'干擾火力'},{name:'修復型',vehicle:'救援飛梭',skill:'週期修復'}]}
]);
const LEGACY_FACTION=Object.freeze({1:1,2:1,3:4,4:2,5:2,6:3,7:3,8:4});
export function factionOf(family){return LEGACY_FACTION[Number(family)]||1;}
export function roleOf(type,stage){return Number(stage)<3?0:Number(type)===1?1:2;}
export function getMecha(family,stage,type){
 const f=FACTIONS[factionOf(family)-1],s=Math.max(1,Math.min(6,Math.trunc(Number(stage)||1))),r=roleOf(type,s);
 const role=f.roles[r-1];
 return {faction:f.id,family:f.legacy,stage:s,type:r,factionName:f.name,roleName:role?.name||'尚未分化',stageName:STAGE_NAMES[s],name:f.name+(role?'・'+role.name:'')+'・'+STAGE_NAMES[s],vehicle:f.id===2&&s===6&&r===2?'暴龍型態':role?.vehicle,skill:role?.skill,key:f.id+'_'+s+'_'+r};
}
export function counterMultiplier(attackerFamily,defenderFamily){return factionOf(defenderFamily)===factionOf(attackerFamily)%4+1?1.2:1;}
export const MONSTER_SPRITES=Object.freeze(Object.fromEntries(FACTIONS.flatMap(f=>[...Array.from({length:2},(_,i)=>getMecha(f.legacy,i+1,0)),...Array.from({length:8},(_,i)=>getMecha(f.legacy,3+Math.floor(i/2),i%2+1))]).map((m,i)=>[m.key,{...m,id:i+1}])));
