import BattleReveal from '../components/BattleReveal';
import {appearance,hasDisguise} from '../utils/skins';
import React, { useState, useEffect, useRef } from 'react';
import { api, GAME_RULES_V2 } from '../utils/api';

export default function Raid({ 
  user, 
  monsters, 
  activeMonster, vehicleModes={}, 
  refreshData, 
  setPage 
}) {
  const [boss, setBoss] = useState(null);
  const [bossError, setBossError] = useState('');
  const aliveMonsters = monsters.filter(m => !m.is_dead && Number(m.life_stage)>=2 && !m.is_frozen);
  const [selectedMonsterId, setSelectedMonsterId] = useState(
    () => aliveMonsters.find(m => m.monster_id === activeMonster?.monster_id)?.monster_id || aliveMonsters[0]?.monster_id || ''
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const requestRef=useRef(0);
  // Reload boss stats
  const fetchBossStatus = async () => {
    const version=++requestRef.current;
    try {
      const data = await api.getRaidStatus();
      if(version!==requestRef.current)return;
      setBoss(data);
      setBossError('');
    } catch (err) {
      if(version!==requestRef.current)return;
      setBossError(err.message || '世界王資料讀取失敗');
    }
  };

  useEffect(() => {
    if(document.visibilityState==='visible')fetchBossStatus();
    // Avoid wasting backend requests while the game is in a background tab.
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') fetchBossStatus();
    };
    const interval = setInterval(refreshWhenVisible, boss?.is_active ? 15000 : 60000);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      ++requestRef.current;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [boss?.is_active]);

  const selectedMonster = aliveMonsters.find(m => m.monster_id === selectedMonsterId) || aliveMonsters[0] || null;

  const handleClaim=async bossId=>{
    setLoading(true);setMessage('');
    try{const result=await api.claimRaid(bossId);setMessage(result.message);await refreshData(['profile']);await fetchBossStatus();}
    catch(err){setMessage(err.message);}finally{setLoading(false);}
  };
  const [revealing,setRevealing]=useState(false);
  const attackPending=useRef(false);
  const handleAttack = async () => {
    if(attackPending.current)return;
    if (!selectedMonster || selectedMonster.is_dead) {
      setMessage('❌ 請選擇已孵化且未凍結的怪獸！');
      return;
    }
    if (user.stamina < 15) {
      setMessage('❌ 體力不足！需要 15 點體力。');
      return;
    }

    attackPending.current=true;
    setLoading(true);
    setMessage('');
    try {
      if(hasDisguise(selectedMonster,vehicleModes[selectedMonster.monster_id])){setRevealing(true);await new Promise(resolve=>setTimeout(resolve,1200));setRevealing(false);}
      const data = await api.attackRaidBoss(selectedMonster.monster_id);
      setMessage(`💥 造成 ${data.damage.toLocaleString()} 點傷害！\n${data.message}`);
      await refreshData(['profile']);
      await fetchBossStatus();
    } catch (err) {
      setMessage(`❌ ${err.message}`);
    } finally {
      attackPending.current=false;setRevealing(false);setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col gap-4 animate-fade-in relative z-10">
      <div className="absolute inset-0 bg-red-900/5 pointer-events-none rounded-2xl"></div>

      {/* Header bar */}
      <div className="glass-card p-4 flex justify-between items-center text-sm font-bold border-red-900/30">
        <span className="text-rose-400">世界王共鬥討伐</span>
        <span className="text-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.5)]">🔋 {user.stamina} / {user.max_stamina ?? 100}</span>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col gap-6">
        
        {boss ? (
          <div className="glass-card p-6 border-rose-500/30 relative overflow-hidden flex flex-col items-center text-center">
            <div className="absolute top-0 right-0 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>

            {/* Boss Name */}
            <div className="text-6xl mb-4 animate-pulse drop-shadow-[0_0_15px_rgba(225,29,72,0.6)]">👹</div>
            <h2 className="text-2xl font-black text-rose-500 tracking-widest mb-6">
              {boss.name}
            </h2>

            {/* Boss Health Bar */}
            <div className="w-full relative z-10 mb-6">
              <div className="flex justify-between text-sm mb-2 font-bold">
                <span className="text-rose-400">HP</span>
                <span className="text-white">{boss.current_hp.toLocaleString()} <span className="text-slate-500">/ {boss.max_hp.toLocaleString()}</span></span>
              </div>
              <div className="w-full h-4 bg-slate-950 rounded-full overflow-hidden border border-slate-700 shadow-inner">
                <div 
                  className="bg-gradient-to-r from-red-600 to-rose-400 h-full transition-all duration-1000 shadow-[0_0_10px_#f43f5e]" 
                  style={{ width: `${(boss.current_hp / boss.max_hp) * 100}%` }}
                ></div>
              </div>
              <div className="mt-2 text-xs font-bold text-amber-400">
                {((boss.current_hp / boss.max_hp) * 100).toFixed(2)}%
              </div>
            </div>

            {/* Status indicators */}
            <div className={`px-4 py-2 rounded-full text-sm font-bold w-full ${boss.is_active ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>
              {boss.is_active ? '🔴 全服共鬥進行中' : '🏆 世界王已遭全服討伐成功！'}
            </div>
          </div>
        ) : (
          <div className="glass-card p-10 flex flex-col items-center justify-center h-64 border-slate-700/50 gap-4">
            {bossError ? (
              <>
                <span role="alert" className="text-rose-400 text-center text-sm">世界王資料讀取失敗：{bossError}</span>
                <button type="button" onClick={fetchBossStatus} className="neon-button neon-button-primary px-4 py-2">重新載入</button>
              </>
            ) : (
              <>
                <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <span className="text-slate-400">正在載入世界王數據...</span>
              </>
            )}
          </div>
        )}
        {boss && bossError && (
          <div role="alert" className="glass-card p-3 text-amber-300 text-sm">
            世界王狀態更新失敗：{bossError}
            <button type="button" onClick={fetchBossStatus} className="ml-3 underline">重試</button>
          </div>
        )}

        {GAME_RULES_V2&&boss&&<div className="glass-card p-3 space-y-2">
          <div className="text-sm font-bold text-amber-300">今日傷害貢獻：{Number(boss.my_damage||0).toLocaleString()}</div>
          <p className="text-xs text-slate-300">每天台灣時間更新世界王；成功討伐後按有效傷害分配 5,000G，不再只獎勵最後一擊。</p>
          {(boss.claims||[]).map(c=><button key={c.boss_id} disabled={loading} onClick={()=>handleClaim(c.boss_id)} className="w-full neon-button neon-button-success px-3 py-2">領取 {c.boss_id.replace('daily:','')} 貢獻獎勵 {c.reward}G</button>)}
        </div>}
        {/* Monster selector & Attack triggers */}
        {boss && boss.is_active && (
          <div className="glass-card p-5 mt-auto">
            
            <h4 className="text-sm font-bold text-slate-300 mb-3">{revealing?'解除偽裝・真身出戰':'準備出擊'}</h4>
            {selectedMonster&&revealing&&<div className="flex justify-center"><BattleReveal monster={selectedMonster} look={appearance(selectedMonster,vehicleModes[selectedMonster.monster_id])} revealing/></div>}
            
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">選擇出戰怪獸</label>
                <select 
                  disabled={loading} value={selectedMonster?.monster_id || ''}
                  onChange={(e) => setSelectedMonsterId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-rose-500 transition-colors"
                >
                  {aliveMonsters.map(m => (
                    <option key={m.monster_id} value={m.monster_id}>
                      {m.name} (攻擊力: {Math.round(m.combat_atk)})
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleAttack}
                disabled={loading || user.stamina < 15 || !selectedMonster}
                className="w-full neon-button neon-button-danger py-4 text-lg font-bold flex items-center justify-center gap-2"
              >
                <span>💥 發動討伐突襲</span>
                <span className="text-xs bg-black/30 px-2 py-1 rounded">-15 體力</span>
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Log message output */}
      {message && (
        <div className="glass-card p-4 text-center text-sm font-medium text-rose-200 border-rose-500/50 bg-rose-900/30 mt-auto whitespace-pre-line">
          {message}
        </div>
      )}
    </div>
  );
}
