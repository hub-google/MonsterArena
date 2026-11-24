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
// Final-stage appearance overrides only: keys preserve the existing faction, role and stage.
const FINAL_DESIGNS=Object.freeze({
 '1_1':{name:'雷霆暴龍',vehicle:'重裝戰車',asset:'thunder-rex'},
 '1_2':{name:'炫藍閃電W',vehicle:'武裝警車',asset:'blue-lightning-w'},
 '2_1':{name:'巡邏戰警',vehicle:'巡邏警車',asset:'patrol-guard'},
 '3_1':{name:'翼龍機動裝甲',vehicle:'翼龍型態',asset:'wing-dragon'},
 '3_2':{name:'風暴翼龍',vehicle:'風暴翼龍型態',asset:'storm-wyvern'},
 '4_1':{name:'帝王暴龍',vehicle:'霸氣恐龍戰車',asset:'emperor-rex'},
 '4_2':{name:'帝王暴龍 闇黑限定版',vehicle:'闇黑暴龍型態',asset:'dark-emperor'},
});
export function getMecha(family,stage,type){
 const f=FACTIONS[factionOf(family)-1],s=Math.max(1,Math.min(6,Math.trunc(Number(stage)||1))),r=roleOf(type,s);
 const role=f.roles[r-1];
 // Tyranno is a final-stage model; earlier stages retain their own artwork and vehicle.
 const tyranno=f.id===2&&s===6&&r===2;
 const design=s===6?FINAL_DESIGNS[f.id+'_'+r]:null;
 const legacyName=f.name+(role?'・'+role.name:'')+'・'+STAGE_NAMES[s];
 return {faction:f.id,family:f.legacy,stage:s,type:r,factionName:f.name,roleName:role?.name||'尚未分化',stageName:STAGE_NAMES[s],name:design?.name||legacyName,modelName:tyranno?'暴龍戰炫王':design?.name||null,legacyName,vehicle:tyranno?'暴龍型態':design?.vehicle||role?.vehicle,spriteAsset:tyranno?{robot:'mecha/tyranno-robot.png',vehicle:'mecha/tyranno-rex.png'}:design?{robot:'mecha/'+design.asset+'-robot.png',vehicle:'mecha/'+design.asset+'-vehicle.png'}:null,skill:role?.skill,key:f.id+'_'+s+'_'+r};
}
// Default database names are presentation aliases, not player nicknames.
export function displayMonsterName(monster){
 if(!monster)return '';
 const mecha=getMecha(monster.family,monster.life_stage??monster.stage,monster.type);
 const name=monster.name??monster.monster_name;
 if(mecha.modelName&&(!name||['數位蛋','新生基因蛋','機械核心',mecha.legacyName].includes(name)))return mecha.modelName;
 return name||mecha.modelName||mecha.name;
}
export function counterMultiplier(attackerFamily,defenderFamily){return factionOf(defenderFamily)===factionOf(attackerFamily)%4+1?1.2:1;}
export const MONSTER_SPRITES=Object.freeze(Object.fromEntries(FACTIONS.flatMap(f=>[...Array.from({length:2},(_,i)=>getMecha(f.legacy,i+1,0)),...Array.from({length:8},(_,i)=>getMecha(f.legacy,3+Math.floor(i/2),i%2+1))]).map((m,i)=>[m.key,{...m,id:i+1}])));
