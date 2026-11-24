import React, { useState, useEffect, useRef } from 'react';
import MonsterPixelArt from '../components/MonsterPixelArt';
import BattleReveal from '../components/BattleReveal';
import TacticalDuel from './TacticalDuel';
import {FIXED_ENCOUNTERS,canRankedMatch,roleId,affinityAdvantage} from '../utils/tacticalDuel';
import {appearance,hasDisguise,getSkin} from '../utils/skins';
import { api, GAME_RULES_V2 } from '../utils/api';
import { selectBattleMonster, refreshAfterCommit } from '../utils/gameRules';
import {PlayButton,GameIcon} from '../components/PlayButton';

import { STAGE_NAMES, getMecha } from '../utils/monsterSprites';

export default function Arena({ 
  user, 
  monsters, 
  activeMonster, 
  battleState, appearanceModes={}, 
  setBattleState, setBattleNavLocked, 
  refreshData 
}) {
  const [subTab, setSubTab] = useState('players');
  const [tacticalFighter,setTacticalFighter]=useState(null);
  useEffect(()=>{if(!GAME_RULES_V2||subTab!=='boss-tactical')return;setBattleNavLocked?.(true);return()=>setBattleNavLocked?.(false);},[subTab,setBattleNavLocked]);
  const [showLogs,setShowLogs]=useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [pvp,setPvp]=useState(null);
  const [pvpError,setPvpError]=useState('');
  const reloadPvp=async()=>{
    try{setPvp(await api.getPvp());setPvpError('');}catch(err){setPvpError(err.message||'競技場資料讀取失敗');}
  };
  useEffect(()=>{if(GAME_RULES_V2 && subTab==='pvp' && !battleState)reloadPvp();},[subTab,Boolean(battleState)]);

  const logsEndRef = useRef(null);
  const challengePending = useRef(false);
  const battleRunning = Boolean(battleState && !battleState.isOver && !battleState.revealing);


  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [battleState?.logs]);

  useEffect(()=>{if(!battleState?.revealing||battleState.isOver)return;const timer=setTimeout(()=>setBattleState(prev=>prev?.revealing&&!prev.isOver?{...prev,revealing:false,logs:[...prev.logs,'解除偽裝，真身出戰！','戰鬥開始！']}:prev),1200);return ()=>clearTimeout(timer);},[battleState?.battleId,battleState?.revealing,battleState?.isOver,setBattleState]);
  // Battle transcript playback is cosmetic; the database already determined the winner.
  useEffect(() => {
    if (!battleRunning) return;
    const interval = setInterval(() => setBattleState(prev => {
      if (!prev || prev.isOver || prev.revealing) return prev;
      const index = prev.eventIndex || 0;
      const step = prev.events?.[index];
      const winner = prev.serverWon ? 'A' : 'B';
      const victoryText = `🏆 戰鬥結束！${prev.serverWon ? prev.mA.name : prev.mB.name} 獲勝！${prev.reward?` 首勝獎勵 ${prev.reward}G`:''}`;
      if (!step) return {...prev, isOver:true, winner,
        logs:[...prev.logs,victoryText]};
      const finished = index + 1 >= prev.events.length;
      const attackerName=step.attacker==='A' ? prev.mA.name : prev.mB.name;
      return {...prev, eventIndex:index+1,
        mA_HP:step.ownHp, mB_HP:step.enemyHp,
        mA_ATB:step.attacker==='A'?100:0, mB_ATB:step.attacker==='B'?100:0,
        logs:[...prev.logs,`${attackerName} 攻擊，造成 ${step.damage} 傷害！`,
          ...(finished?[victoryText]:[])].slice(-80),
        isOver:finished, winner:finished?winner:null};
    }), 160);
    return () => clearInterval(interval);
  }, [battleRunning, setBattleState]);

  const getFighter=()=>selectBattleMonster(monsters,activeMonster?.monster_id);
  const enterTactical=tab=>{const fighter=getFighter();if(!fighter)return;setTacticalFighter(fighter);setSubTab(tab);setMessage('');};
  const exitTactical=()=>{setTacticalFighter(null);setSubTab('players');};
  const changePvpRegistration=async register=>{
    const monster=getFighter();
    if(register&&!monster){setMessage('請先選擇已啟動且未停機的機體');return;}
    setLoading(true);setMessage('');
    try{const result=register?await api.registerPvp(monster.monster_id):await api.unregisterPvp();setMessage(result.message);await reloadPvp();}
    catch(err){setMessage(err.message);}finally{setLoading(false);}
  };
  const handleChallenge = async (encounter,opponentId) => {
    if (challengePending.current) return;
    const monster = getFighter();
    if (!monster) return setMessage('請先選擇一隻未停機、已啟動的機體出戰！');
    encounter=encounter==='mock'?'wild':encounter==='mock_boss'?'boss':encounter;
    const isBoss=encounter==='boss';
    challengePending.current=true;
    setLoading(true);
    setMessage('');
    try {
      const result=await api.startBattle(monster.monster_id,encounter,opponentId);
      const enemy={
        name:result.enemyName||'敵方機甲',
        // Opponent artwork must not reuse the player's own species or stage.
        family:result.enemyFamily??(isBoss?7:3),
        life_stage:result.enemyStage??(isBoss?6:Math.max(3,Math.min(5,Number(monster.life_stage)||3))),
        combat_hp:result.enemyMaxHp, combat_atk:result.enemyAtk,
        combat_def:result.enemyDef, combat_spd:result.enemySpd,
        type:result.enemyType, skin_id:result.enemySkin||null
      };
      const ownLook=appearance(monster,appearanceModes[monster.monster_id]);
      const enemyLook=appearance(enemy);
      const revealing=hasDisguise(monster,appearanceModes[monster.monster_id])||hasDisguise(enemy);
      setShowLogs(false);
      setBattleState({
        ownLook,enemyLook,revealing,
        battleId:result.battleId, serverWon:result.won, reward:result.reward||0, events:result.events||[], eventIndex:0,
        mA:monster, mB:enemy,
        mA_HP:result.ownMaxHp,mB_HP:result.enemyMaxHp,
        mA_MaxHP:result.ownMaxHp,mB_MaxHP:result.enemyMaxHp,
        mA_ATB:0,mB_ATB:0,
        logs:[revealing?'準備解除偽裝！':`⚔️ 戰鬥開始！ ${monster.name} vs ${enemy.name}！`],
        isOver:false,winner:null,finalOwnHp:result.ownHp,finalEnemyHp:result.enemyHp
      });
      const warning=await refreshAfterCommit(refreshData,GAME_RULES_V2?['profile','monsters']:['monsters']);
      if(warning)setMessage(warning);
    } catch (err) {
      setMessage(`對戰失敗：${err.message || '請稍後重試'}`);
    } finally { challengePending.current=false; setLoading(false); }
  };

  if (battleState) {
    const isBattleOver = battleState.isOver;
    return (
      <div className="h-full flex flex-col gap-4 animate-fade-in relative z-10">
        <div className="absolute inset-0 bg-red-900/10 pointer-events-none animate-pulse rounded-2xl"></div>
        
        <div className="glass-card p-4 text-center border-red-500/30">
          <div role="status" aria-label={isBattleOver?(battleState.serverWon?'勝利':'失敗'):battleState.revealing?'解除偽裝':'戰鬥中'} className="flex flex-col items-center gap-2 text-xl font-bold"><GameIcon name={isBattleOver?(battleState.serverWon?'trophy':'heart'):'battle'} className="battle-result-icon"/>{isBattleOver?(battleState.serverWon?'戰鬥勝利':'戰鬥失敗'):battleState.revealing?'解除偽裝・真身出戰':'戰鬥進行中'}</div>{isBattleOver&&battleState.reward>0&&<div className="text-amber-300">🪙 +{battleState.reward}</div>}
        </div>

        <div className="glass-card p-3 flex flex-col gap-3">
          <div className="flex justify-between items-center px-2">
            
            {/* Player A */}
            <div className="flex flex-col items-center gap-2 w-1/3">
              <span className="truncate w-full text-center text-sm font-bold text-cyan-400">{battleState.mA?.name}</span>
              <div className="my-2 w-full flex justify-center">
                <BattleReveal monster={battleState.mA} look={battleState.ownLook} restored={isBattleOver} revealing={battleState.revealing&&Boolean(battleState.ownLook?.skin||battleState.ownLook?.vehicle)} dead={battleState.mA_HP<=0}/>
              </div>
              
              <div className="w-full space-y-2">
                <div>
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="text-emerald-400 font-bold" aria-label="耐久"><GameIcon name="guild"/></span>
                    <span className="text-white">{Math.round(battleState.mA_HP)}/{Math.round(battleState.mA_MaxHP)}</span>
                  </div>
                  <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-700">
                    <div className="h-full bg-emerald-500 shadow-[0_0_8px_#10b981] transition-all" style={{width:`${(battleState.mA_HP/battleState.mA_MaxHP)*100}%`}}></div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <div className="flex-1">
                    <div className="text-[8px] text-slate-400 mb-0.5" aria-label="行動">⚡</div>
                    <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden"><div className="h-full bg-cyan-500 transition-all" style={{width:`${battleState.mA_ATB}%`}}></div></div>
                  </div>

                </div>
              </div>
            </div>

            <div className="text-3xl font-black italic text-transparent bg-clip-text bg-gradient-to-br from-red-500 to-amber-500">⚔️</div>

            {/* Player B */}
            <div className="flex flex-col items-center gap-2 w-1/3">
              <span className="truncate w-full text-center text-sm font-bold text-rose-400">{battleState.mB?.name}</span>
              <div className="my-2 w-full flex justify-center">
                <BattleReveal monster={battleState.mB} look={battleState.enemyLook} restored={isBattleOver} revealing={battleState.revealing&&Boolean(battleState.enemyLook?.skin||battleState.enemyLook?.vehicle)} dead={battleState.mB_HP<=0}/>
              </div>
              
              <div className="w-full space-y-2">
                <div>
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="text-emerald-400 font-bold" aria-label="耐久"><GameIcon name="guild"/></span>
                    <span className="text-white">{Math.round(battleState.mB_HP)}/{Math.round(battleState.mB_MaxHP)}</span>
                  </div>
                  <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-700">
                    <div className="h-full bg-rose-500 shadow-[0_0_8px_#f43f5e] transition-all" style={{width:`${(battleState.mB_HP/battleState.mB_MaxHP)*100}%`}}></div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <div className="flex-1">
                    <div className="text-[8px] text-slate-400 mb-0.5" aria-label="行動">⚡</div>
                    <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden"><div className="h-full bg-cyan-500 transition-all" style={{width:`${battleState.mB_ATB}%`}}></div></div>
                  </div>

                </div>
              </div>
            </div>
          </div>
          
          <button type="button" className="self-end text-xs text-slate-400 p-2" aria-label="戰鬥紀錄" aria-expanded={showLogs} onClick={()=>setShowLogs(v=>!v)}>戰鬥紀錄 {showLogs?'▴':'▾'}</button>
          {showLogs&&<div className="bg-slate-950/80 border border-slate-700 rounded-xl p-3 h-40 overflow-y-auto text-xs leading-relaxed flex flex-col gap-2 select-text shadow-inner">
            {battleState.logs.map((log, idx) => (
              <div key={idx} className="border-b border-slate-800 pb-1 text-slate-300">
                {log.includes('獲勝') ? <span className="text-yellow-400 font-bold text-sm">{log}</span> : log.includes('傷害') ? <span className="text-rose-300">{log}</span> : log}
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>}
        </div>

        <div className="mt-auto">
          {isBattleOver ? (
            <PlayButton icon="back" label="離開戰場" short="返回" tone="blue" onClick={()=>setBattleState(null)} className="w-full"/>
          ) : (
            <button aria-label="跳過戰鬥動畫" title="跳過戰鬥動畫" disabled={battleState.revealing} onClick={() => setBattleState(prev => prev && ({
              ...prev,isOver:true,winner:prev.serverWon?'A':'B',
              mA_HP:prev.finalOwnHp,mB_HP:prev.finalEnemyHp,
              eventIndex:prev.events?.length||0,
              logs:[...prev.logs,`🏆 戰鬥結束！${prev.serverWon ? prev.mA.name : prev.mB.name} 獲勝！`]
            }))} className="w-full neon-button neon-button-primary py-3 text-sm">⏩ 跳過戰鬥動畫</button>
          )}
        </div>
      </div>
    );
  }

  if(subTab==='boss-tactical'&&tacticalFighter)return <TacticalDuel key={'boss:'+tacticalFighter.monster_id} boss monster={tacticalFighter} mode={appearanceModes[tacticalFighter.monster_id]} onSettle={GAME_RULES_V2?async (moves,requestId)=>{const r=await api.settleBossTactics(tacticalFighter.monster_id,moves,requestId);const warning=await refreshAfterCommit(refreshData,['profile','monsters']);if(warning)setMessage(warning);return r;}:undefined} onExit={exitTactical}/>;
  if(subTab==='tactical'&&tacticalFighter)return <TacticalDuel monster={tacticalFighter} mode={appearanceModes[tacticalFighter.monster_id]} onExit={exitTactical}/>;

  return (
    <div className="h-full flex flex-col gap-4 animate-fade-in">
      <div className="flex justify-center items-center gap-2">
        {getFighter()?<><MonsterPixelArt family={getFighter().family} stage={getFighter().life_stage} type={getFighter().type} {...appearance(getFighter(),appearanceModes[getFighter().monster_id])} displaySize={64}/><span className="font-bold text-cyan-300 text-sm truncate">{getFighter().name}</span></>:<p className="text-sm text-slate-400 text-center">請先在養成頁選擇可出戰機甲。</p>}
      </div>
      {GAME_RULES_V2&&<div className="grid grid-cols-2 gap-2">
       {([['players','battle','失控機甲挑戰'],['pvp','🏆','玩家對戰']]).map(([id,icon,label])=><PlayButton key={id} icon={icon} label={label} selected={subTab===id} onClick={()=>{setSubTab(id);setMessage('')}} className="play-compact"/>)}
      </div>}
      {subTab==='players'&&<PlayButton icon="guild" label="手動戰術對戰" subtext="格擋反擊・精準暴擊・公平競技" tone="blue" disabled={!getFighter()||loading} onClick={()=>enterTactical('tactical')} className="play-compact"/>}
      {subTab==='players'&&!GAME_RULES_V2&&<PlayButton icon="battle" label="首領戰術挑戰" subtext="預判蓄力・格擋反擊・硬直輸出" tone="red" disabled={!getFighter()||loading} onClick={()=>enterTactical('boss-tactical')} className="play-compact"/>}
      <div className="flex-1 overflow-y-auto">
        {subTab==='players'&&GAME_RULES_V2&&(
          <div className="flex flex-col gap-3">
            <details className="text-xs text-slate-300"><summary>挑戰說明</summary>固定敵人強度，各關每日首勝有金幣獎勵。</details>
            {FIXED_ENCOUNTERS.map(([id,name,hp,atk,def,spd,reward],i)=>(
              <div className="glass-card p-3 flex justify-between items-center gap-2" key={id}>
                <div><div className="font-bold text-amber-300">第 {i+1} 關｜{name}</div>
                  <div className="text-xs text-slate-300" >耐久 {hp}・攻 {atk}・防 {def}・速 {spd}</div>
                  <div className="text-xs text-emerald-300">每日首勝 {reward}G</div></div>
                <PlayButton icon="battle" label={'挑戰'+name} short="打" tone="red" disabled={loading||!getFighter()} onClick={()=>id==='boss'?enterTactical('boss-tactical'):handleChallenge(id)} className="play-compact"/>
              </div>
            ))}
          </div>
        )}
        {subTab==='players'&&!GAME_RULES_V2&&(
          <div className="grid grid-cols-2 gap-3" data-testid="wild-challenges">
            {[['wild','失控巡邏機',3,4,1,'⭐','普通'],['boss','終極機甲首領',4,6,2,'⭐⭐⭐','首領']].map(([encounter,label,family,stage,type,stars,short])=>
             <button key={encounter} type="button" aria-label={'挑戰'+label} disabled={loading||!getFighter()} onClick={()=>handleChallenge(encounter)} className={'play-encounter '+(encounter==='boss'?'border-purple-500/60':'border-emerald-500/60')}>
               <span className="text-xl" aria-hidden="true">{stars}</span>
               <MonsterPixelArt family={family} stage={stage} type={type} displaySize={136}/>
               <span className="text-sm font-semibold">{label}</span><span className="text-xs text-slate-400">{short==='首領'?'高難度':'普通難度'}</span><span className="encounter-cta"><GameIcon name="battle"/>開始挑戰</span>
             </button>)}
          </div>
        )}

        {subTab==='pvp'&&GAME_RULES_V2&&(
          <div className="flex flex-col gap-3">
            <div className="glass-card p-3 space-y-2">
              <h3 className="font-bold text-amber-300">非即時玩家競技場</h3>
              <p className="text-xs text-slate-300">登記目前選擇的機甲為防守快照。每天可挑戰 5 位不同玩家；勝利 +3 分，失敗 +1 分。</p>
              <button disabled={loading} onClick={()=>changePvpRegistration(true)} className="neon-button px-3 py-2">{pvp?.registered?'更新防守機甲':'登記防守機甲'}</button>
              {pvp?.registered&&<button disabled={loading} onClick={()=>changePvpRegistration(false)} className="neon-button ml-2 px-3 py-2">取消登記</button>}
              <button disabled={loading} onClick={reloadPvp} className="ml-2 text-xs underline">重新整理</button>
              {pvpError&&<p role="alert" className="text-xs text-rose-300">{pvpError}</p>}
            </div>
            <h3 className="text-sm font-bold text-cyan-300">可挑戰玩家</h3>
            {pvp?.opponents?.length===0&&<p className="text-xs text-slate-400">目前沒有登記防守的其他玩家</p>}
            {pvp?.opponents?.map(o=>(
              <div key={o.user_id} className="glass-card p-3 flex items-center gap-2 justify-between">
                <MonsterPixelArt family={o.family} stage={o.stage} type={o.type} skin={o.skin_id} className="scale-75"/>
                <div className="flex-1"><div className="text-sm font-bold">{o.username}｜{getSkin(o.skin_id)?.name||o.monster_name}</div><div className="text-xs text-slate-300">{o.points} 分・耐久 {Math.round(o.hp)}・攻 {Math.round(o.atk)}{getFighter()&& (affinityAdvantage(roleId(getFighter()),roleId({life_stage:o.stage,family:o.family,type:o.type}))?'・克制優勢':affinityAdvantage(roleId({life_stage:o.stage,family:o.family,type:o.type}),roleId(getFighter()))?'・受到克制':'')}</div></div>
                <button disabled={loading||!canRankedMatch(getFighter(),o)} onClick={()=>handleChallenge('pvp',o.user_id)} className="neon-button neon-button-danger px-3 py-2">{canRankedMatch(getFighter(),o)?'挑戰':'戰力不符'}</button>
              </div>
            ))}
            <div className="glass-card p-3"><h3 className="font-bold text-amber-300">賽季排行榜｜{pvp?.season||'載入中'}</h3>
              {pvp?.leaderboard?.map((o,i)=><div key={o.user_id} className="flex justify-between text-sm py-2 border-b border-slate-700"><span>{i+1}. {o.username}</span><span>{o.points} 分（{o.wins}勝/{o.losses}敗）</span></div>)}
              {pvp?.leaderboard?.length===0&&<p className="text-xs text-slate-400">本季尚無對戰紀錄</p>}
            </div>
          </div>
        )}

      </div>

      {message && <div className="glass-card p-3 text-center text-sm font-medium animate-pulse text-indigo-200 border-indigo-500/50 bg-indigo-900/20 mt-auto">{message}</div>}
    </div>
  );
}
