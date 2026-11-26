import ProceduralArena from './ProceduralArena.jsx';
import React from 'react';
import BattleReveal from '../BattleReveal.jsx';
import {PlayButton,GameIcon} from '../PlayButton.jsx';
import {displayMonsterName} from '../../utils/monsterSprites.js';

export default function BattleScreen({battleState,setBattleState,showLogs,setShowLogs,logsEndRef}){
    const isBattleOver = battleState.isOver;
    return (
      <div className="h-full flex flex-col gap-4 animate-fade-in relative z-10">
        <div className="absolute inset-0 bg-red-900/10 pointer-events-none animate-pulse rounded-2xl"></div>
        
        <div className="glass-card p-4 text-center border-red-500/30">
          <div role="status" aria-label={isBattleOver?(battleState.serverWon?'勝利':'失敗'):battleState.revealing?'解除偽裝':'戰鬥中'} className="flex flex-col items-center gap-2 text-xl font-bold"><GameIcon name={isBattleOver?(battleState.serverWon?'trophy':'heart'):'battle'} className="battle-result-icon"/>{isBattleOver?(battleState.serverWon?'戰鬥勝利':'戰鬥失敗'):battleState.revealing?'解除偽裝・真身出戰':'戰鬥進行中'}</div>{isBattleOver&&battleState.reward>0&&<div className="text-amber-300">🪙 +{battleState.reward}</div>}
        </div>

        <div className="glass-card p-3 flex flex-col gap-3">
          <div className="flex justify-between items-center px-2 ma-procedural-stage rounded-xl overflow-hidden">
            <ProceduralArena boss={battleState.mB?.life_stage===6}/>
            
            {/* Player A */}
            <div className="flex flex-col items-center gap-2 w-1/3">
              <span className="truncate w-full text-center text-sm font-bold text-cyan-400">{displayMonsterName(battleState.mA)}</span>
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
              <span className="truncate w-full text-center text-sm font-bold text-rose-400">{displayMonsterName(battleState.mB)}</span>
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
              logs:[...prev.logs,`🏆 戰鬥結束！${prev.serverWon ? displayMonsterName(prev.mA) : displayMonsterName(prev.mB)} 獲勝！`]
            }))} className="w-full neon-button neon-button-primary py-3 text-sm">⏩ 跳過戰鬥動畫</button>
          )}
        </div>
      </div>
    );
}
