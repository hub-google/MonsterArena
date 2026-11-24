import React, { useState, useEffect, useRef } from 'react';
import MonsterPixelArt from '../components/MonsterPixelArt';
import { api, GAME_RULES_V2 } from '../utils/api';

const STAGE_NAMES = ['蛋', '蛋', '幼年期', '成長期', '成熟期', '完全體', '究極體'];

export default function Arena({ 
  user, 
  monsters, 
  friends, 
  activeMonster, 
  battleState, 
  setBattleState, 
  refreshData, 
  setPage 
}) {
  const [subTab, setSubTab] = useState('chat');
  const [chatMessage, setChatMessage] = useState('');
  const [chatLogs, setChatLogs] = useState([]);
  const [targetUsername, setTargetUsername] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [pvp,setPvp]=useState(null);
  const [pvpError,setPvpError]=useState('');
  const reloadPvp=async()=>{
    try{setPvp(await api.getPvp());setPvpError('');}catch(err){setPvpError(err.message||'競技場資料讀取失敗');}
  };
  useEffect(()=>{if(GAME_RULES_V2 && subTab==='pvp' && !battleState)reloadPvp();},[subTab,Boolean(battleState)]);

  const logsEndRef = useRef(null);
  const refreshChatRef = useRef(null);
  const challengePending = useRef(false);
  const battleRunning = Boolean(battleState && !battleState.isOver);


  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatLogs, battleState?.logs]);

  // Shared game chat (authenticated Supabase read-only polling)
  useEffect(() => {
    if(subTab!=='chat' || battleState)return;
    const unsubscribe = api.subscribeMessages('world', (msgs) => {
      setChatLogs(msgs.map(m => ({
        senderName: m.username,
        message: m.text
      })));
    });
    refreshChatRef.current = unsubscribe.refresh;
    return () => {
      refreshChatRef.current = null;
      unsubscribe();
    };
  }, [subTab,Boolean(battleState)]);

  // Battle transcript playback is cosmetic; the database already determined the winner.
  useEffect(() => {
    if (!battleRunning) return;
    const interval = setInterval(() => setBattleState(prev => {
      if (!prev || prev.isOver) return prev;
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

  const sendWorldChat = () => {
    if (!chatMessage.trim() || loading) return;
    setLoading(true);
    api.sendMessage('world', chatMessage.trim())
      .then(() => { setChatMessage(''); refreshChatRef.current?.(); })
      .catch(err => setMessage(err.message))
      .finally(() => setLoading(false));
  };

  const getFighter=()=>monsters.find(m=>m.monster_id===activeMonster?.monster_id&&!m.is_dead&&Number(m.life_stage)>=2&&!m.is_frozen)
    ||monsters.find(m=>!m.is_dead&&Number(m.life_stage)>=2&&!m.is_frozen);
  const changePvpRegistration=async register=>{
    const monster=getFighter();
    if(register&&!monster){setMessage('請先選擇已孵化且未凍結的怪獸');return;}
    setLoading(true);setMessage('');
    try{const result=register?await api.registerPvp(monster.monster_id):await api.unregisterPvp();setMessage(result.message);await reloadPvp();}
    catch(err){setMessage(err.message);}finally{setLoading(false);}
  };
  const handleChallenge = async (encounter,opponentId) => {
    if (challengePending.current) return;
    const monster = monsters.find(m => m.monster_id === activeMonster?.monster_id && !m.is_dead && Number(m.life_stage)>=2 && !m.is_frozen)
      || monsters.find(m => !m.is_dead && Number(m.life_stage)>=2 && !m.is_frozen);
    if (!monster) return setMessage('請先選擇一隻非凍結、已孵化的怪獸出戰！');
    encounter=encounter==='mock'?'wild':encounter==='mock_boss'?'boss':encounter;
    const isBoss=encounter==='boss';
    challengePending.current=true;
    setLoading(true);
    setMessage('');
    try {
      const result=await api.startBattle(monster.monster_id,encounter,opponentId);
      const enemy={
        name:result.enemyName,
        // Opponent artwork must not reuse the player's own species or stage.
        family:result.enemyFamily??(isBoss?7:3),
        life_stage:result.enemyStage??(isBoss?6:Math.max(3,Math.min(5,Number(monster.life_stage)||3))),
        combat_hp:result.enemyMaxHp, combat_atk:result.enemyAtk,
        combat_def:result.enemyDef, combat_spd:result.enemySpd,
        type:result.enemyType
      };
      setBattleState({
        battleId:result.battleId, serverWon:result.won, reward:result.reward||0, events:result.events||[], eventIndex:0,
        mA:monster, mB:enemy,
        mA_HP:result.ownMaxHp,mB_HP:result.enemyMaxHp,
        mA_MaxHP:result.ownMaxHp,mB_MaxHP:result.enemyMaxHp,
        mA_ATB:0,mB_ATB:0,
        logs:[`⚔️ 戰鬥開始！ ${monster.name} vs ${enemy.name}！`],
        isOver:false,winner:null,finalOwnHp:result.ownHp,finalEnemyHp:result.enemyHp
      });
      await refreshData(GAME_RULES_V2?['profile','monsters']:['monsters']);
    } catch (err) {
      setMessage(`對戰失敗：${err.message || '請稍後重試'}`);
    } finally { challengePending.current=false; setLoading(false); }
  };

  const handleSendFriendRequest = async () => {
    if (!targetUsername) return;
    setLoading(true); setMessage('');
    try {
      const data = await api.addFriend(targetUsername);
      setMessage(data.message); setTargetUsername(''); await refreshData(['friends']);
    } catch (err) { setMessage(`❌ ${err.message}`); }
    finally { setLoading(false); }
  };

  if (battleState) {
    const isBattleOver = battleState.isOver;
    return (
      <div className="h-full flex flex-col gap-4 animate-fade-in relative z-10">
        <div className="absolute inset-0 bg-red-900/10 pointer-events-none animate-pulse rounded-2xl"></div>
        
        <div className="glass-card p-4 text-center border-red-500/30">
          <h2 className="text-xl font-bold text-red-500 tracking-widest">{isBattleOver ? '對戰已結算' : '對戰播放中（伺服器已結算）'}</h2>
        </div>

        <div className="glass-card p-6 flex flex-col gap-6">
          <div className="flex justify-between items-center px-2">
            
            {/* Player A */}
            <div className="flex flex-col items-center gap-2 w-1/3">
              <span className="truncate w-full text-center text-sm font-bold text-cyan-400">{battleState.mA?.name}</span>
              <div className="scale-125 my-4">
                <MonsterPixelArt family={battleState.mA?.family || 1} stage={battleState.mA?.life_stage || 4} type={battleState.mA?.type} isDead={battleState.mA_HP <= 0} />
              </div>
              
              <div className="w-full space-y-2">
                <div>
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="text-emerald-400 font-bold">HP</span>
                    <span className="text-white">{Math.round(battleState.mA_HP)}/{Math.round(battleState.mA_MaxHP)}</span>
                  </div>
                  <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-700">
                    <div className="h-full bg-emerald-500 shadow-[0_0_8px_#10b981] transition-all" style={{width:`${(battleState.mA_HP/battleState.mA_MaxHP)*100}%`}}></div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <div className="flex-1">
                    <div className="text-[8px] text-slate-400 mb-0.5">ATB</div>
                    <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden"><div className="h-full bg-cyan-500 transition-all" style={{width:`${battleState.mA_ATB}%`}}></div></div>
                  </div>

                </div>
              </div>
            </div>

            <div className="text-3xl font-black italic text-transparent bg-clip-text bg-gradient-to-br from-red-500 to-amber-500">VS</div>

            {/* Player B */}
            <div className="flex flex-col items-center gap-2 w-1/3">
              <span className="truncate w-full text-center text-sm font-bold text-rose-400">{battleState.mB?.name}</span>
              <div className="scale-125 my-4">
                <MonsterPixelArt family={battleState.mB?.family || 1} stage={battleState.mB?.life_stage || 4} type={battleState.mB?.type} isDead={battleState.mB_HP <= 0} />
              </div>
              
              <div className="w-full space-y-2">
                <div>
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="text-emerald-400 font-bold">HP</span>
                    <span className="text-white">{Math.round(battleState.mB_HP)}/{Math.round(battleState.mB_MaxHP)}</span>
                  </div>
                  <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-700">
                    <div className="h-full bg-rose-500 shadow-[0_0_8px_#f43f5e] transition-all" style={{width:`${(battleState.mB_HP/battleState.mB_MaxHP)*100}%`}}></div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <div className="flex-1">
                    <div className="text-[8px] text-slate-400 mb-0.5">ATB</div>
                    <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden"><div className="h-full bg-cyan-500 transition-all" style={{width:`${battleState.mB_ATB}%`}}></div></div>
                  </div>

                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-slate-950/80 border border-slate-700 rounded-xl p-3 h-48 overflow-y-auto text-xs leading-relaxed flex flex-col gap-2 select-text shadow-inner">
            {battleState.logs.map((log, idx) => (
              <div key={idx} className="border-b border-slate-800 pb-1 text-slate-300">
                {log.includes('獲勝') ? <span className="text-yellow-400 font-bold text-sm">{log}</span> : log.includes('傷害') ? <span className="text-rose-300">{log}</span> : log}
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        </div>

        <div className="mt-auto">
          {isBattleOver ? (
            <button onClick={() => { setBattleState(null); }} className="w-full neon-button neon-button-primary py-4 font-bold text-lg">離開戰場</button>
          ) : (
            <button onClick={() => setBattleState(prev => prev && ({
              ...prev,isOver:true,winner:prev.serverWon?'A':'B',
              mA_HP:prev.finalOwnHp,mB_HP:prev.finalEnemyHp,
              eventIndex:prev.events?.length||0,
              logs:[...prev.logs,`🏆 戰鬥結束！${prev.serverWon ? prev.mA.name : prev.mB.name} 獲勝！`]
            }))} className="w-full neon-button neon-button-primary py-4 font-bold">跳過戰鬥動畫</button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-4 animate-fade-in">
      <div className="glass-card p-4 flex justify-between items-center text-sm font-bold">
        <span className="text-cyan-400">{GAME_RULES_V2?'怪獸競技場':'野生模擬對戰'}</span>
        <span className="text-emerald-400">出戰: {monsters.find(m => m.monster_id === activeMonster?.monster_id && !m.is_dead && Number(m.life_stage)>=2 && !m.is_frozen)?.name || monsters.find(m => !m.is_dead && Number(m.life_stage)>=2 && !m.is_frozen)?.name || '無'}</span>
      </div>

      <div className={`grid ${GAME_RULES_V2?'grid-cols-4':'grid-cols-3'} gap-2`}>
        <button onClick={() => { setSubTab('chat'); setMessage(''); }} className={`py-3 rounded-xl font-bold transition-all ${subTab === 'chat' ? 'bg-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.6)]' : 'glass-panel text-slate-400'}`}>世界聊天</button>
        <button onClick={() => { setSubTab('players'); setMessage(''); }} className={`py-3 rounded-xl font-bold transition-all ${subTab === 'players' ? 'bg-rose-600 text-white shadow-[0_0_15px_rgba(225,29,72,0.6)]' : 'glass-panel text-slate-400'}`}>野生挑戰</button>
        <button onClick={() => { setSubTab('friends'); setMessage(''); }} className={`py-3 rounded-xl font-bold transition-all ${subTab === 'friends' ? 'bg-emerald-600 text-white shadow-[0_0_15px_rgba(5,150,105,0.6)]' : 'glass-panel text-slate-400'}`}>好友名單</button>
        {GAME_RULES_V2&&<button onClick={()=>{setSubTab('pvp');setMessage('');}} className={`py-3 rounded-xl font-bold ${subTab==='pvp'?'bg-amber-600 text-white':'glass-panel text-slate-400'}`}>玩家對戰</button>}
      </div>

      <div className="flex-1 overflow-y-auto">
        {subTab === 'chat' && (
          <div className="flex flex-col h-full gap-4">
            <div className="flex-1 glass-card p-4 overflow-y-auto text-sm select-text flex flex-col gap-3">
              {chatLogs.length === 0 ? <span className="text-slate-500 text-center italic mt-10">歡迎來到世界頻道！向大家打個招呼吧！</span> : chatLogs.map((chat, idx) => (
                <div key={idx} className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50 break-words">
                  <span className="font-bold text-cyan-400 mr-2">{chat.senderName}</span> 
                  <span className="text-slate-200">{chat.message}</span>
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
            <div className="flex gap-2">
              <input type="text" value={chatMessage} onChange={(e) => setChatMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !e.isComposing && sendWorldChat()} placeholder="輸入訊息..." maxLength={100} className="flex-1 bg-slate-900 border border-slate-700 text-white rounded-xl px-4 py-3 outline-none focus:border-indigo-500 transition-colors" />
              <button onClick={sendWorldChat} disabled={loading || !chatMessage.trim()} className="neon-button neon-button-primary px-6 py-3 font-bold disabled:opacity-50">發送</button>
            </div>
          </div>
        )}

        {subTab==='players'&&GAME_RULES_V2&&(
          <div className="flex flex-col gap-3">
            <p className="text-xs text-slate-300">固定敵人強度，培養怪獸即可挑戰更高難度。各關每日首勝有金幣獎勵。</p>
            {[
              ['wild','野生病毒怪獸',60,7,4,5,10],
              ['stage2','岩甲守衛',120,15,12,8,30],
              ['stage3','疾風獵手',200,27,16,25,60],
              ['stage4','深淵巨獸',340,45,32,30,100],
              ['boss','究極體王怪',550,70,48,50,200]
            ].map(([id,name,hp,atk,def,spd,reward],i)=>(
              <div className="glass-card p-3 flex justify-between items-center gap-2" key={id}>
                <div><div className="font-bold text-amber-300">第 {i+1} 關｜{name}</div>
                  <div className="text-xs text-slate-300">HP {hp}・攻 {atk}・防 {def}・速 {spd}</div>
                  <div className="text-xs text-emerald-300">每日首勝 {reward}G</div></div>
                <button disabled={loading} onClick={()=>handleChallenge(id)} className="neon-button neon-button-danger px-4 py-2">挑戰</button>
              </div>
            ))}
          </div>
        )}
        {subTab === 'players' && !GAME_RULES_V2 && (
          <div className="flex flex-col gap-3">
             <div className="glass-card p-4 border-rose-500/30 flex justify-between items-center hover:border-rose-500/60 transition-colors">
               <div className="flex items-center gap-3">
                 <span className="text-2xl">🦠</span>
                 <div className="flex flex-col">
                   <span className="font-bold text-rose-400 text-base">野生病毒怪獸</span>
                   <span className="text-xs text-slate-400">等級不定的野怪，練功好對象。</span>
                 </div>
               </div>
               <button onClick={() => handleChallenge('mock')} disabled={loading} className="neon-button neon-button-danger px-6 py-2 shadow-rose-500/20">挑戰</button>
             </div>

             <div className="glass-card p-4 border-fuchsia-500/30 flex justify-between items-center hover:border-fuchsia-500/60 transition-colors">
               <div className="flex items-center gap-3">
                 <span className="text-2xl">🐉</span>
                 <div className="flex flex-col">
                   <span className="font-bold text-fuchsia-400 text-base">究極體王怪</span>
                   <span className="text-xs text-slate-400">極度危險！請確保有充分準備。</span>
                 </div>
               </div>
               <button onClick={() => handleChallenge('mock_boss')} disabled={loading} className="neon-button neon-button-danger px-6 py-2 shadow-fuchsia-500/20 bg-fuchsia-700 hover:bg-fuchsia-600">挑戰</button>
             </div>
          </div>
        )}

        {subTab==='pvp'&&GAME_RULES_V2&&(
          <div className="flex flex-col gap-3">
            <div className="glass-card p-3 space-y-2">
              <h3 className="font-bold text-amber-300">非即時玩家競技場</h3>
              <p className="text-xs text-slate-300">登記目前選擇的怪獸為防守快照。每天可挑戰 5 位不同玩家；勝利 +3 分，失敗 +1 分。</p>
              <button disabled={loading} onClick={()=>changePvpRegistration(true)} className="neon-button px-3 py-2">{pvp?.registered?'更新防守怪獸':'登記防守怪獸'}</button>
              {pvp?.registered&&<button disabled={loading} onClick={()=>changePvpRegistration(false)} className="neon-button ml-2 px-3 py-2">取消登記</button>}
              <button disabled={loading} onClick={reloadPvp} className="ml-2 text-xs underline">重新整理</button>
              {pvpError&&<p role="alert" className="text-xs text-rose-300">{pvpError}</p>}
            </div>
            <h3 className="text-sm font-bold text-cyan-300">可挑戰玩家</h3>
            {pvp?.opponents?.length===0&&<p className="text-xs text-slate-400">目前沒有登記防守的其他玩家</p>}
            {pvp?.opponents?.map(o=>(
              <div key={o.user_id} className="glass-card p-3 flex items-center gap-2 justify-between">
                <MonsterPixelArt family={o.family} stage={o.stage} type={o.type} className="scale-75"/>
                <div className="flex-1"><div className="text-sm font-bold">{o.username}｜{o.monster_name}</div><div className="text-xs text-slate-300">{o.points} 分・HP {Math.round(o.hp)}・攻 {Math.round(o.atk)}</div></div>
                <button disabled={loading} onClick={()=>handleChallenge('pvp',o.user_id)} className="neon-button neon-button-danger px-3 py-2">挑戰</button>
              </div>
            ))}
            <div className="glass-card p-3"><h3 className="font-bold text-amber-300">賽季排行榜｜{pvp?.season||'載入中'}</h3>
              {pvp?.leaderboard?.map((o,i)=><div key={o.user_id} className="flex justify-between text-sm py-2 border-b border-slate-700"><span>{i+1}. {o.username}</span><span>{o.points} 分（{o.wins}勝/{o.losses}敗）</span></div>)}
              {pvp?.leaderboard?.length===0&&<p className="text-xs text-slate-400">本季尚無對戰紀錄</p>}
            </div>
          </div>
        )}

        {subTab === 'friends' && (
          <div className="flex flex-col gap-4">
            <div className="glass-card p-4">
              <h3 className="text-sm font-bold text-emerald-400 mb-3">新增好友</h3>
              <div className="flex gap-2 items-center">
                <input type="text" value={targetUsername} onChange={(e) => setTargetUsername(e.target.value)} placeholder="輸入玩家帳號名稱..." className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 outline-none text-white focus:border-emerald-500 transition-colors" />
                <button onClick={handleSendFriendRequest} disabled={loading || !targetUsername} className="neon-button neon-button-success px-6 py-3 font-bold disabled:opacity-50">發送邀請</button>
              </div>
            </div>
            
            <div className="glass-card p-4 flex flex-col gap-2">
              <h3 className="text-sm font-bold text-slate-300 mb-2 border-b border-slate-700 pb-2">好友列表</h3>
              {friends.length === 0 ? <span className="text-center italic mt-4 text-slate-500">尚無好友。前往世界頻道認識新朋友吧！</span> : friends.map(f => (
                <div key={f.friend_id} className="flex justify-between items-center p-3 bg-slate-800/50 border border-slate-700/50 rounded-lg">
                  <span className="font-bold text-white flex items-center gap-2">🤝 {f.friend_name}</span>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-bold px-2 py-1 rounded ${f.status === 0 ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                      ✅ 已成為好友
                    </span>
                    
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {message && <div className="glass-card p-3 text-center text-sm font-medium animate-pulse text-indigo-200 border-indigo-500/50 bg-indigo-900/20 mt-auto">{message}</div>}
    </div>
  );
}
