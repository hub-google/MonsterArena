import {useEffect} from 'react';
import {displayMonsterName} from '../utils/monsterSprites.js';

// Playback is presentation only. All outcomes come from the server.
export function useBattlePlayback(battleState,setBattleState){
  const battleRunning = Boolean(battleState && !battleState.isOver && !battleState.revealing);
  useEffect(()=>{if(!battleState?.revealing||battleState.isOver)return;const timer=setTimeout(()=>setBattleState(prev=>prev?.revealing&&!prev.isOver?{...prev,revealing:false,logs:[...prev.logs,'解除偽裝，真身出戰！','戰鬥開始！']}:prev),1200);return ()=>clearTimeout(timer);},[battleState?.battleId,battleState?.revealing,battleState?.isOver,setBattleState]);
  // Battle transcript playback is cosmetic; the database already determined the winner.
  useEffect(() => {
    if (!battleRunning) return;
    const interval = setInterval(() => setBattleState(prev => {
      if (!prev || prev.isOver || prev.revealing) return prev;
      const index = prev.eventIndex || 0;
      const step = prev.events?.[index];
      const winner = prev.serverWon ? 'A' : 'B';
      const victoryText = `🏆 戰鬥結束！${prev.serverWon ? displayMonsterName(prev.mA) : displayMonsterName(prev.mB)} 獲勝！${prev.reward?` 首勝獎勵 ${prev.reward}G`:''}`;
      if (!step) return {...prev, isOver:true, winner,
        logs:[...prev.logs,victoryText]};
      const finished = index + 1 >= prev.events.length;
      const attackerName=step.attacker==='A' ? displayMonsterName(prev.mA) : displayMonsterName(prev.mB);
      return {...prev, eventIndex:index+1,
        mA_HP:step.ownHp, mB_HP:step.enemyHp,
        mA_ATB:step.attacker==='A'?100:0, mB_ATB:step.attacker==='B'?100:0,
        logs:[...prev.logs,`${attackerName} 攻擊，造成 ${step.damage} 傷害！`,
          ...(finished?[victoryText]:[])].slice(-80),
        isOver:finished, winner:finished?winner:null};
    }), 160);
    return () => clearInterval(interval);
  }, [battleRunning, setBattleState]);

}
