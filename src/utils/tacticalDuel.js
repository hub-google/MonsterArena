export const ACTIONS = {
 attack:{label:'攻擊',icon:'battle',tone:'red',hint:'抓準時機暴擊'},
 guard:{label:'格擋反擊',icon:'guild',tone:'blue',hint:'完美格擋反擊'},
 break:{label:'破防重擊',icon:'tools',tone:'red',hint:'消耗 2 戰術能源'},
 charge:{label:'蓄能',icon:'bolt',tone:'green',hint:'戰術能源 +2、耐久 +10'},
};
export const MAX_ROUNDS=16;
export const TIMING_MS=1800;
export function timingGrade(progress){
 if(progress>=.42&&progress<=.58)return 'perfect';
 if(progress>=.27&&progress<=.73)return 'good';
 return 'miss';
}
export function initialDuel(){return {hp:[100,100],energy:[1,1],round:1,history:[],result:null};}
export function chooseEnemy(s){
 const last=s.history.at(-1)?.player;
 const energy=s.energy[1];
 if(energy>=5)return 'attack';
 if(last==='guard'&&energy>=2)return 'break';
 if(s.hp[1]<=35&&last==='guard')return 'charge';
 if(last==='break')return 'attack';
 if(last==='charge')return 'attack';
 if(last==='attack'&&s.round%3!==0)return 'guard';
 return ['attack','charge','attack','guard','break'][ (s.round-1)%5 ]==='break'&&energy<2?'attack':['attack','charge','attack','guard','break'][(s.round-1)%5];
}
export function enemyHint(action,energy){
 if(action==='attack')return energy>=5?'敵方戰術能源滿了！準備必殺技':'敵方舉起武器，準備攻擊';
 if(action==='guard')return '敵方架起盾牌，可能反擊';
 if(action==='break')return '敵方重拳蓄力，普通攻擊可打斷';
 return '敵方正在補充戰術能源';
}
export function resolveRound(s,player,grade='good',enemy=chooseEnemy(s),enemyGrade=s.round%3===0?'perfect':'good'){
 if(s.result||!ACTIONS[player]||!ACTIONS[enemy]||(player==='break'&&s.energy[0]<2)||(enemy==='break'&&s.energy[1]<2))return s;
 const moves=[player,enemy],grades=[grade,enemyGrade],hp=[...s.hp],energy=[...s.energy],damage=[0,0],heal=[0,0],notes=[];
 for(let i=0;i<2;i++){
  const j=1-i,a=moves[i],b=moves[j],g=grades[i];
  if(a==='charge'){energy[i]=Math.min(5,energy[i]+2);heal[i]=10;}
  if(a==='guard')continue;
  if(a==='break'){
   energy[i]-=2;
   if(b==='attack'){notes.push(i===0?'你的重擊被打斷':'敵方重擊被打斷');continue;}
   damage[j]+=35;continue;
  }
  if(a==='attack'){
   const ultimate=s.energy[i]===5;
   const base=ultimate?40:20;
   const hit=Math.round(base*(g==='perfect'?1.5:g==='good'?1:.6));
   energy[i]=ultimate?0:Math.min(5,energy[i]+1);
   if(b==='guard'){
    const block=grades[j];
    if(block==='perfect'){damage[i]+=25;energy[j]=Math.min(5,energy[j]+1);notes.push(j===0?'完美格擋！反擊 25':'敵方完美格擋！反擊 25');}
    else if(block==='good'){damage[j]+=Math.round(hit*.4);notes.push(j===0?'格擋成功，減傷 60%':'敵方格擋成功');}
    else{damage[j]+=hit;notes.push(j===0?'格擋失敗':'敵方格擋失敗');}
   }else{damage[j]+=hit;}
   if(g==='perfect')notes.push(i===0?'精準攻擊！':'敵方精準攻擊！');
  }
 }
 for(let i=0;i<2;i++)hp[i]=Math.max(0,Math.min(100,hp[i]+heal[i])-damage[i]);
 const ended=hp.some(v=>v===0)||s.round>=MAX_ROUNDS;
 const result=ended?(hp[0]===hp[1]?'draw':hp[0]>hp[1]?'win':'loss'):null;
 return {hp,energy,round:s.round+1,result,history:[...s.history,{player,enemy,grade,damage,heal,notes}]};
}

/* Tactical PvE: deterministic, capped stage power and telegraphed boss moves.
 * Practice is deliberately local: no gold, records or ranked results are written.
 */
export const BOSS_STATS=Object.freeze({hp:300,atk:52,def:40,spd:35});
export const STAGE_STATS=Object.freeze({
 2:[100,20,15,15],3:[125,25,20,20],4:[160,32,25,25],5:[200,40,30,30],6:[240,48,36,36]
});
export const BOSS_ACTIONS=Object.freeze({
 attack:{label:'普通攻擊',icon:'battle',tone:'red',hint:'傷害 100% · 能源 +1'},
 guard:{label:'格擋反擊',icon:'guild',tone:'blue',hint:'減傷 50% · 重擊時反擊並硬直'},
 special:{label:'特殊技能',icon:'bolt',tone:'red',hint:'傷害 180% · 能源 −2'},
 break:{label:'破甲攻擊',icon:'tools',tone:'blue',hint:'傷害 70% · 蓄力時削弱重擊 · 能源 −1'}
});
export const BOSS_MAX_ROUNDS=20;
export const bossDamage=(attack,defense)=>Math.max(1,Math.floor(attack*100/(100+Math.max(0,defense))));
export const STAGE_ROLE_STATS=Object.freeze(Object.fromEntries(Object.entries({"2":[[100,20,15,15]],"3":[[125,25,20,20],[115,26,15,18],[123,24,17,21],[133,21,24,15],[120,25,18,20],[122,24,18,17],[119,25,16,21],[127,23,18,21],[137,21,21,19]],"4":[[160,32,25,25],[151,33,21,23],[157,31,22,28],[170,27,29,20],[152,32,23,26],[156,31,24,24],[154,32,21,25],[165,29,25,26],[172,28,25,23]],"5":[[200,40,30,30],[187,42,27,30],[198,39,28,34],[213,34,38,25],[193,40,29,33],[196,39,30,30],[194,40,27,32],[206,37,30,33],[217,35,32,28]],"6":[[240,48,36,36],[226,50,31,35],[235,47,33,39],[253,40,44,30],[231,48,34,38],[235,46,36,38],[233,48,32,38],[246,44,36,39],[254,42,38,34]]}).map(([k,rows])=>[k,Object.freeze(rows.map(Object.freeze))])));
export const ROLE_STATS=Object.freeze(STAGE_ROLE_STATS[5].slice(1));
export const AFFINITY_BONUS=1.045;
export function roleId(m){
 if(Number(m.life_stage)<3||!Number(m.type))return 0;
 return (({1:0,2:0,4:2,5:2,6:4,7:4,3:6,8:6})[m.family]||0)+(Number(m.type)===1?1:2);
}
export function powerRating(s){return s.hp/5+s.atk+s.def*.5+s.spd*.3;}
export function canRankedMatch(monster,opponent){if(!monster||!opponent||Math.abs(Number(monster.life_stage)-Number(opponent.stage))>1)return false;const a=powerRating(unitStats(monster)),b=powerRating(opponent);return Math.max(a,b)<=1.45*Math.min(a,b);}
export function affinityAdvantage(a,b){return a>0&&b>0&&Math.floor((b-1)/2)===(Math.floor((a-1)/2)+1)%4;}
export function unitStats(m){
 const stage=Math.max(2,Math.min(6,Math.floor(Number(m.life_stage)||2))),role=roleId(m),base=STAGE_ROLE_STATS[stage][role]||STAGE_ROLE_STATS[stage][0];
 const quality=1+Math.max(0,Math.min(5,Number(m.core_quality)||0))/100;
 return Object.fromEntries(['hp','atk','def','spd'].map((k,i)=>{
  const v=base[i],points=Math.max(0,Math.min(30,Number(m['training_'+k])||0));
  const chips=[m.chip_slot_1,m.chip_slot_2].filter(c=>c==='chip_'+k).length;
  return [k,Math.floor(v*quality+points*(i===0?2:.5)+v*.05*chips+1e-9)];
 }));
}
// Deterministic simulation mirror; the isolated SQL tests exercise the authoritative engine.
export function duelDamage(atk,def,role,other,round,roll){
 const mult=other===7&&round%3===0?1:role===1&&round%3===1?1.12:role===2&&round%2===0?1.10:role===4&&round%3===0?1.10:role===5?1.04:role===6&&round%3===0?1.16:1;
 return Math.max(1,Math.floor(atk*mult*(role===5?.88+roll*.24:.85+roll*.30)*100/(100+def*(role===4&&round%3===0&&other!==7?.85:1))*(affinityAdvantage(role,other)?AFFINITY_BONUS:1)*(other===3?.95:other===7&&round%3===0?.93:1)));
}
export function autoBattle(a,b,roleA,roleB,rng=Math.random){
 const S=[a,b],R=[roleA,roleB],H=[a[0],b[0]];let rounds=0;
 for(let r=1;r<=25;r++){
  rounds=r;const first=rng()<.5+.4*(a[3]-b[3])/Math.max(1,a[3]+b[3])?0:1;
  for(let k=0;k<2;k++){const x=k===0?first:1-first,y=1-x;
   H[y]=Math.max(0,H[y]-duelDamage(S[x][1],S[y][2],R[x],R[y],r,rng()));
   if(R[x]===8&&r%3===0&&R[y]!==7)H[x]=Math.min(S[x][0],H[x]+Math.max(1,Math.floor(S[x][0]*.025)));
   if(H[y]<=0)break;
  }
  if(H.some(v=>v<=0))break;
 }
 return {won:H[1]<=0?true:H[0]<=0?false:H[0]/a[0]===H[1]/b[0]?rng()<.5:H[0]/a[0]>H[1]/b[0],hp:H,rounds};
}
export const FIXED_ENCOUNTERS=Object.freeze([['wild','廢棄機械兵',115,16,12,12,10,2,0],['stage2','失控巡邏機',117,23,18,18,20,3,4],['stage3','重裝守衛',156,26,38,18,40,4,4],['stage4','疾風獵手',197,38,22,42,60,5,5],['stage5','深淵機甲',226,44,35,32,100,6,6],['boss','終極機甲首領',300,52,40,35,120,6,0]].map(Object.freeze));
export function balancedFighter(monster={}){
 if(Object.hasOwn(monster,'training_hp'))return unitStats(monster);
 const stage=Math.max(2,Math.min(6,Math.floor(Number(monster.life_stage)||2)));
 const base=STAGE_STATS[stage];
 const keys=['combat_hp','combat_atk','combat_def','combat_spd'];
 // Historical outliers cannot trivialize the encounter. Training only adds up to 25% per stat.
 const values=base.map((v,i)=>Math.floor(Math.min(v*1.25,Math.max(v,Number(monster[keys[i]])||0))));
 return {hp:values[0],atk:values[1],def:values[2],spd:values[3]};
}
export function initialBossDuel(monster={}){
 const fighter=balancedFighter(monster);
 return {kind:'boss',fighter,hp:[fighter.hp,BOSS_STATS.hp],maxHp:[fighter.hp,BOSS_STATS.hp],
  energy:[0,0],round:1,history:[],result:null,phase:'attack',weakened:false};
}
export function bossHint(s){
 return ({attack:'首領舉起武器，準備普通攻擊',charge:'首領正在蓄力！下一回合將發動超載重擊',heavy:'超載重擊即將發動！使用格擋反擊可使首領硬直',stunned:'首領硬直，無法攻擊！趁機發動特殊技能'})[s.phase];
}
export function canBossMove(s,move){
 return !s.result&&Object.hasOwn(BOSS_ACTIONS,move)&&s.energy[0]>=(move==='special'?2:move==='break'?1:0);
}
export function resolveBossRound(s,move){
 if(!canBossMove(s,move))return s;
 const hp=[...s.hp],energy=[...s.energy],damage=[0,0],notes=[];
 const hit=bossDamage(s.fighter.atk,BOSS_STATS.def),enemyHit=bossDamage(BOSS_STATS.atk,s.fighter.def);
 let nextPhase={attack:'charge',charge:'heavy',heavy:'attack',stunned:'charge'}[s.phase];
 let weakened=s.weakened;
 if(move==='attack'){damage[1]=hit;energy[0]=Math.min(5,energy[0]+1);}
 if(move==='special'){damage[1]=Math.floor(hit*1.8);energy[0]-=2;}
 if(move==='break'){damage[1]=Math.max(1,Math.floor(hit*.7));energy[0]--;if(s.phase==='charge'){weakened=true;notes.push('破甲成功：下次重擊傷害降低 35%');}}
 let incoming=s.phase==='attack'?enemyHit:s.phase==='heavy'?Math.floor(enemyHit*1.8):0;
 if(s.phase==='heavy'&&weakened){incoming=Math.floor(incoming*.65);weakened=false;}
 if(move==='guard'&&incoming>0){
  incoming=Math.ceil(incoming*.5);energy[0]=Math.min(5,energy[0]+1);
  damage[1]=s.phase==='heavy'?hit:Math.floor(hit*.5);
  if(s.phase==='heavy'){nextPhase='stunned';notes.push('成功格擋超載重擊！首領下一回合硬直');}
  else notes.push('格擋成功，減傷 50% 並反擊');
 }
 // Speed decides lethal priority; a guard counter can only occur after surviving the hit.
 if(move!=='guard'&&s.fighter.spd>=BOSS_STATS.spd&&damage[1]>=hp[1])incoming=0;
 damage[0]=Math.min(hp[0],incoming);hp[0]-=damage[0];
 if(hp[0]===0&&(move==='guard'||s.fighter.spd<BOSS_STATS.spd))damage[1]=0;
 damage[1]=Math.min(hp[1],damage[1]);hp[1]-=damage[1];
 const result=hp[1]===0&&hp[0]>0?'win':hp[0]===0||s.round>=BOSS_MAX_ROUNDS?'loss':null;
 return {...s,hp,energy,phase:nextPhase,weakened,round:s.round+1,result,
  history:[...s.history,{player:move,enemy:s.phase,grade:'good',damage,heal:[0,0],notes}]};
}
