import React,{useState,useRef,useEffect} from 'react';
import BattleReveal from '../components/BattleReveal';
import {PlayButton,GameIcon} from '../components/PlayButton';
import {appearance,hasDisguise} from '../utils/skins';
import {ACTIONS,MAX_ROUNDS,TIMING_MS,initialDuel,chooseEnemy,enemyHint,resolveRound,timingGrade,BOSS_ACTIONS,BOSS_MAX_ROUNDS,initialBossDuel,bossHint,canBossMove,resolveBossRound} from '../utils/tacticalDuel';
import './TacticalDuel.css';

const opponent={name:'戰術訓練機',family:3,life_stage:5,type:2};
const gradeNames={perfect:'完美',good:'普通',miss:'失誤'};
export default function TacticalDuel({monster,mode,onExit,boss=false,onSettle}){
 const [duel,setDuel]=useState(()=>boss?initialBossDuel(monster):initialDuel());
 const actions=boss?BOSS_ACTIONS:ACTIONS;
 const maxRounds=boss?BOSS_MAX_ROUNDS:MAX_ROUNDS;
 const maxHp=duel.maxHp||[100,100];
 const foe=boss?{name:'終極機甲首領',family:7,life_stage:6,type:2}:opponent;
 const [look,setLook]=useState(()=>appearance(monster,mode));
 const [revealing,setRevealing]=useState(()=>hasDisguise(monster,mode));
 const [pending,setPending]=useState(null);
 const [progress,setProgress]=useState(0);
 const [difficulty,setDifficulty]=useState('normal');
 const [settlement,setSettlement]=useState(null);
 const settling=useRef(false);
 const settlementId=useRef(null);
 async function settle(){
  if(!onSettle||!duel.result||settling.current||settlement?.result)return;
  settling.current=true;setSettlement({pending:true});
  try{settlementId.current ||= crypto.randomUUID();const result=await onSettle(duel.history.map(h=>h.player),settlementId.current);setSettlement({result});}
  catch(err){setSettlement({error:err.message||'戰績未儲存'});}
  finally{settling.current=false;}
 }
 // Both wins and losses settle as soon as the last move finishes. The UUID
 // is retained on failure, so retrying cannot create a second battle record.
 useEffect(()=>{if(boss&&onSettle&&duel.result&&!settlement&&!settling.current)void settle();},[boss,onSettle,duel.result,settlement]);
 const needsSettlement=Boolean(boss&&onSettle&&duel.result&&!settlement?.result);
 const clock=useRef(null);
 const started=useRef(0);
 const locked=useRef(false);
 const pendingRef=useRef(null);
 const enemy=boss?null:chooseEnemy(duel);
 const duration=difficulty==='normal'?TIMING_MS:2400;
 useEffect(()=>{if(!revealing)return;const id=setTimeout(()=>setRevealing(false),1200);return()=>clearTimeout(id)},[revealing]);
 useEffect(()=>()=>{if(clock.current!==null)cancelAnimationFrame(clock.current)},[]);
 function finish(grade){
  if(!pendingRef.current)return;
  const move=pendingRef.current;
  pendingRef.current=null;
  if(clock.current!==null)cancelAnimationFrame(clock.current);
  clock.current=null;
  setPending(null);setProgress(0);
  setDuel(s=>resolveRound(s,move,grade));
  locked.current=false;
 }
 function select(move){
  if(locked.current||revealing||duel.result)return;
  if(boss){if(canBossMove(duel,move))setDuel(s=>resolveBossRound(s,move));return;}
  if(move==='break'&&duel.energy[0]<2)return;
  locked.current=true;
  if(move==='break'||move==='charge'){setDuel(s=>resolveRound(s,move));locked.current=false;return;}
  pendingRef.current=move;setPending(move);setProgress(0);started.current=performance.now();
  const tick=now=>{
   if(!pendingRef.current)return;
   const p=(now-started.current)/duration;
   if(p>=1){finish('miss');return;}
   setProgress(Math.max(0,p));clock.current=requestAnimationFrame(tick);
  };
  clock.current=requestAnimationFrame(tick);
 }
 function tap(){if(pendingRef.current)finish(timingGrade((performance.now()-started.current)/duration));}
 function restart(){
  if(clock.current!==null)cancelAnimationFrame(clock.current);
  clock.current=null;pendingRef.current=null;locked.current=false;
  setPending(null);setProgress(0);setSettlement(null);settlementId.current=null;setDuel(boss?initialBossDuel(monster):initialDuel());setLook(appearance(monster,mode));setRevealing(hasDisguise(monster,mode));
 }
 const latest=duel.history.at(-1);
 const resultText=duel.result==='win'?'戰鬥勝利':duel.result==='loss'?'戰鬥失敗':'平手';
 return <section className="tactical-duel" data-testid="tactical-duel" aria-label="手動戰術對戰">
  <header className="tactical-top"><button type="button" onClick={onExit} disabled={needsSettlement} aria-label="離開戰術對戰"><GameIcon name="back"/></button><div><h2>{boss?'終極機甲首領':'戰術競技場'}</h2><span>{boss?(onSettle?'戰術攻略 · 完成後結算':'首領攻略練習 · 不計金幣及排名'):'公平練習 · 不計金幣及排名'}</span></div><span className="tactical-round">{Math.min(duel.round,maxRounds)}/{maxRounds}</span></header>
  <div className="tactical-stage">
   {[monster,foe].map((m,i)=><div key={i} className={'tactical-fighter fighter-'+i}>
    <strong>{m.name}</strong>
    <div className="tactical-art"><BattleReveal monster={m} look={i===0?look:{}} revealing={i===0&&revealing} restored={Boolean(duel.result)} dead={duel.hp[i]===0} size={150}/></div>
    <div className="tactical-hp-label"><GameIcon name="heart"/><span data-testid={'tactical-hp-'+i}>{duel.hp[i]} / {maxHp[i]}</span></div>
    <div className="tactical-hp" role="progressbar" aria-label={i===0?'我方耐久':'敵方耐久'} aria-valuenow={duel.hp[i]} aria-valuemin={0} aria-valuemax={maxHp[i]}><span style={{width:(duel.hp[i]/maxHp[i]*100)+'%'}}/></div>
    <div className="tactical-energy" aria-label={'戰術能源 '+duel.energy[i]+'/5'}>{Array.from({length:5},(_,n)=><i key={n} className={n<duel.energy[i]?'filled':''}/>)}</div>
   </div>)}<span className="tactical-vs">VS</span>
  </div>
  <div className="tactical-intel" role="status"><GameIcon name={duel.result?'trophy':revealing?'transform':boss?(duel.phase==='heavy'?'bolt':'battle'):ACTIONS[enemy].icon}/><span>{duel.result?resultText:revealing?'解除偽裝・真身出戰':boss?bossHint(duel):enemyHint(enemy,duel.energy[1])}</span></div>
  <div className="tactical-timing">
   <div className="tactical-timing-title">{boss?'觀察首領動作，再選擇指令':pending?(pending==='guard'?'指針進入綠區時格擋！':'指針進入綠區時攻擊！'):'抓準綠區時機，打出完美操作'}</div>
   {!boss&&<div className="tactical-track" aria-hidden="true"><i className="tactical-good"/><i className="tactical-perfect"/><b style={{left:progress*100+'%'}}/></div>}
   {pending?<button type="button" className="tactical-tap" onClick={tap}>{pending==='guard'?'立即格擋':'立即攻擊'}</button>:<div className="tactical-feedback" aria-live="polite">{latest?<><span>我方 −{latest.damage[0]} ・ 敵方 −{latest.damage[1]}</span><small>{latest.notes.join('・')||actions[latest.player].label+' / '+(boss?({attack:'普通攻擊',charge:'蓄力',heavy:'超載重擊',stunned:'硬直'})[latest.enemy]:ACTIONS[latest.enemy].label)}{!boss&&['attack','guard'].includes(latest.player)?'・'+gradeNames[latest.grade]:''}</small></>:<span>觀察敵方動作，再選擇你的招式</span>}</div>}
  </div>
  {duel.result?<div className="tactical-result"><strong>{settlement?.result?(settlement.result.won?'戰鬥勝利':'戰鬥失敗'):resultText}</strong>{needsSettlement&&(settlement?.error?<PlayButton icon="trophy" label="重新結算" onClick={settle}/>:<small aria-live="polite">戰績結算中…</small>)} {settlement?.error&&<small role="alert">{settlement.error}</small>}{settlement?.result&&<small>戰績已儲存 · {settlement.result.reward||0}G</small>}<PlayButton disabled={needsSettlement} icon="refresh" label="再戰一場" tone="blue" onClick={restart}/></div>:<div className="tactical-actions">{Object.entries(actions).map(([id,a])=><PlayButton key={id} icon={!boss&&id==='attack'&&duel.energy[0]===5?'bolt':a.icon} label={!boss&&id==='attack'&&duel.energy[0]===5?'必殺技':a.label} subtext={!boss&&id==='attack'&&duel.energy[0]===5?'消耗 5 戰術能源':a.hint} tone={a.tone} disabled={revealing||Boolean(pending)||(boss?!canBossMove(duel,id):(id==='break'&&duel.energy[0]<2))} onClick={()=>select(id)}/>)}</div>}
  <footer className="tactical-footer"><span>{boss?'重擊時格擋反擊・硬直時釋放技能':'攻擊克重擊・重擊克格擋・格擋克攻擊'}</span>{!boss&&duel.round===1&&!pending&&!duel.result&&<button type="button" aria-pressed={difficulty==='easy'} onClick={()=>setDifficulty(d=>d==='easy'?'normal':'easy')}>{difficulty==='easy'?'慢速練習 ✓':'慢速練習'}</button>}</footer>
 </section>;
}
