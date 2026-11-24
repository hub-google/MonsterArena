import React,{useState,useRef,useEffect} from 'react';
import BattleReveal from '../components/BattleReveal';
import {PlayButton,GameIcon} from '../components/PlayButton';
import {appearance,hasDisguise} from '../utils/skins';
import {ACTIONS,MAX_ROUNDS,TIMING_MS,initialDuel,chooseEnemy,enemyHint,resolveRound,timingGrade} from '../utils/tacticalDuel';
import './TacticalDuel.css';

const opponent={name:'競技教練',family:3,life_stage:5,type:2};
const gradeNames={perfect:'完美',good:'普通',miss:'失誤'};
export default function TacticalDuel({monster,vehicle,onExit}){
 const [duel,setDuel]=useState(initialDuel);
 const [revealing,setRevealing]=useState(()=>hasDisguise(monster,vehicle));
 const [pending,setPending]=useState(null);
 const [progress,setProgress]=useState(0);
 const [difficulty,setDifficulty]=useState('normal');
 const clock=useRef(null);
 const started=useRef(0);
 const locked=useRef(false);
 const pendingRef=useRef(null);
 const enemy=chooseEnemy(duel);
 const duration=difficulty==='normal'?TIMING_MS:2400;
 useEffect(()=>{if(!revealing)return;const id=setTimeout(()=>setRevealing(false),1000);return()=>clearTimeout(id)},[revealing]);
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
  if(locked.current||revealing||duel.result||(move==='break'&&duel.energy[0]<2))return;
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
  setPending(null);setProgress(0);setDuel(initialDuel());setRevealing(hasDisguise(monster,vehicle));
 }
 const latest=duel.history.at(-1);
 const resultText=duel.result==='win'?'戰鬥勝利':duel.result==='loss'?'戰鬥失敗':'平手';
 return <section className="tactical-duel" data-testid="tactical-duel" aria-label="手動戰術對戰">
  <header className="tactical-top"><button type="button" onClick={onExit} aria-label="離開戰術對戰"><GameIcon name="back"/></button><div><h2>戰術競技場</h2><span>公平練習 · 不計金幣及排名</span></div><span className="tactical-round">{Math.min(duel.round,MAX_ROUNDS)}/{MAX_ROUNDS}</span></header>
  <div className="tactical-stage">
   {[monster,opponent].map((m,i)=><div key={i} className={'tactical-fighter fighter-'+i}>
    <strong>{m.name}</strong>
    <div className="tactical-art"><BattleReveal monster={m} look={i===0?appearance(monster,vehicle):{}} revealing={i===0&&revealing} dead={duel.hp[i]===0} size={150}/></div>
    <div className="tactical-hp-label"><GameIcon name="heart"/><span data-testid={'tactical-hp-'+i}>{duel.hp[i]} / 100</span></div>
    <div className="tactical-hp" role="progressbar" aria-label={i===0?'我方生命':'敵方生命'} aria-valuenow={duel.hp[i]} aria-valuemin={0} aria-valuemax={100}><span style={{width:duel.hp[i]+'%'}}/></div>
    <div className="tactical-energy" aria-label={'能量 '+duel.energy[i]+'/5'}>{Array.from({length:5},(_,n)=><i key={n} className={n<duel.energy[i]?'filled':''}/>)}</div>
   </div>)}<span className="tactical-vs">VS</span>
  </div>
  <div className="tactical-intel" role="status"><GameIcon name={duel.result?'trophy':revealing?'transform':ACTIONS[enemy].icon}/><span>{duel.result?resultText:revealing?'解除偽裝・真身出戰':enemyHint(enemy,duel.energy[1])}</span></div>
  <div className="tactical-timing">
   <div className="tactical-timing-title">{pending?(pending==='guard'?'指針進入綠區時格擋！':'指針進入綠區時攻擊！'):'抓準綠區時機，打出完美操作'}</div>
   <div className="tactical-track" aria-hidden="true"><i className="tactical-good"/><i className="tactical-perfect"/><b style={{left:progress*100+'%'}}/></div>
   {pending?<button type="button" className="tactical-tap" onClick={tap}>{pending==='guard'?'立即格擋':'立即攻擊'}</button>:<div className="tactical-feedback" aria-live="polite">{latest?<><span>我方 −{latest.damage[0]} ・ 敵方 −{latest.damage[1]}</span><small>{latest.notes.join('・')||ACTIONS[latest.player].label+' / '+ACTIONS[latest.enemy].label}{['attack','guard'].includes(latest.player)?'・'+gradeNames[latest.grade]:''}</small></>:<span>觀察敵方動作，再選擇你的招式</span>}</div>}
  </div>
  {duel.result?<div className="tactical-result"><strong>{resultText}</strong><PlayButton icon="refresh" label="再戰一場" tone="blue" onClick={restart}/></div>:<div className="tactical-actions">{Object.entries(ACTIONS).map(([id,a])=><PlayButton key={id} icon={id==='attack'&&duel.energy[0]===5?'bolt':a.icon} label={id==='attack'&&duel.energy[0]===5?'必殺技':a.label} subtext={id==='attack'&&duel.energy[0]===5?'消耗 5 能量':a.hint} tone={a.tone} disabled={revealing||Boolean(pending)||(id==='break'&&duel.energy[0]<2)} onClick={()=>select(id)}/>)}</div>}
  <footer className="tactical-footer"><span>攻擊克重擊・重擊克格擋・格擋克攻擊</span>{duel.round===1&&!pending&&!duel.result&&<button type="button" aria-pressed={difficulty==='easy'} onClick={()=>setDifficulty(d=>d==='easy'?'normal':'easy')}>{difficulty==='easy'?'慢速練習 ✓':'慢速練習'}</button>}</footer>
 </section>;
}
