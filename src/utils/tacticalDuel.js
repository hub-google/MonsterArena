export const ACTIONS = {
 attack:{label:'攻擊',icon:'battle',tone:'red',hint:'抓準時機暴擊'},
 guard:{label:'格擋反擊',icon:'guild',tone:'blue',hint:'完美格擋反擊'},
 break:{label:'破防重擊',icon:'tools',tone:'red',hint:'消耗 2 能量'},
 charge:{label:'蓄能',icon:'bolt',tone:'green',hint:'能量 +2、生命 +10'},
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
 if(action==='attack')return energy>=5?'敵方能量滿了！準備必殺技':'敵方舉起武器，準備攻擊';
 if(action==='guard')return '敵方架起盾牌，可能反擊';
 if(action==='break')return '敵方重拳蓄力，普通攻擊可打斷';
 return '敵方正在補充能量';
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
