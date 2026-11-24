import {displayMonsterName} from '../utils/monsterSprites';
import BattleReveal from '../components/BattleReveal';
import MonsterPixelArt from '../components/MonsterPixelArt';
import {GameIcon} from '../components/PlayButton';
import {appearance,hasDisguise} from '../utils/skins';
import React, { useState, useEffect, useRef } from 'react';
import { api, GAME_RULES_V2 } from '../utils/api';
import { canBattleMonster, refreshAfterCommit } from '../utils/gameRules';

export default function Raid({ 
  user, 
  monsters, 
  activeMonster, appearanceModes={}, 
  refreshData, 
  setPage 
}) {
  const [boss, setBoss] = useState(null);
  const [bossError, setBossError] = useState('');
  const [strategy,setStrategy]=useState('assault');
  const aliveMonsters = monsters.filter(canBattleMonster);
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
      setBossError(err.message || '巨型機甲首領資料讀取失敗');
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
    try{const result=await api.claimRaid(bossId);setMessage(result.message);const warning=await refreshAfterCommit(refreshData,['profile']);if(warning)setMessage(warning);await fetchBossStatus();}
    catch(err){setMessage(err.message);}finally{setLoading(false);}
  };
  const [revealing,setRevealing]=useState(false);
  const [attacking,setAttacking]=useState(false);
  const attackPending=useRef(false);
  const mounted=useRef(false);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  const handleAttack = async () => {
    if(attackPending.current)return;
    if (!selectedMonster || selectedMonster.is_dead) {
      setMessage('❌ 請選擇已啟動且未停機的機體！');
      return;
    }
    if (user.stamina < 15) {
      setMessage('❌ 行動電力不足！需要 15 點行動電力。');
      return;
    }

    attackPending.current=true;
    setLoading(true);
    setMessage('');
    try {
      if(hasDisguise(selectedMonster,appearanceModes[selectedMonster.monster_id])){setRevealing(true);await new Promise(resolve=>setTimeout(resolve,1200));if(!mounted.current)return;setRevealing(false);}
      setAttacking(true);
      const data = await api.attackRaidBoss(selectedMonster.monster_id,strategy);
      if(!mounted.current)return;
      setMessage(`💥 造成 ${data.damage.toLocaleString()} 點傷害！\n${data.message}${GAME_RULES_V2?'\n有效支援 '+data.support+'・存活回合 '+data.rounds+'/10・參與獎勵 '+data.participationReward+'G':''}`);
      const warning=await refreshAfterCommit(refreshData,['profile']);
      if(warning)setMessage(previous=>previous+'\n'+warning);
      await fetchBossStatus();
    } catch (err) {
      setMessage(`❌ ${err.message}`);
    } finally {
      attackPending.current=false;if(mounted.current){setRevealing(false);setAttacking(false);setLoading(false);}
    }
  };

  const healthPct=boss?Math.max(0,Math.min(100,boss.max_hp>0?100*boss.current_hp/boss.max_hp:0)):0;
  const phase=healthPct>60?'普通攻擊':healthPct>30?'護盾啟動':'暴走重擊';
  return <section className="flex flex-col gap-2 min-h-full relative animate-fade-in">
    <header className="flex justify-between items-center px-1 py-1">
      <h2 className="text-base font-bold text-rose-300">巨型機甲首領</h2>
      <span className="flex items-center gap-1 text-sm font-bold text-emerald-400"><GameIcon name="bolt"/> {user.stamina}/{user.max_stamina??100}</span>
    </header>
    {boss?<div className="glass-card border-rose-500/30 p-3 flex gap-3 items-center">
      <div className="shrink-0" data-testid="raid-boss-art"><MonsterPixelArt family={7} stage={6} type={2} displaySize={88} isDead={!boss.is_active}/></div>
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex justify-between items-center gap-1"><span className={boss.is_active?'text-xs text-rose-300':'text-xs text-amber-300'}>{boss.is_active?'全服共鬥中':'討伐成功'}</span><span className="text-xs text-amber-300">{healthPct.toFixed(1)}%</span></div>
        <div className="flex justify-between gap-1 text-xs font-bold"><span>耐久</span><span>{Number(boss.current_hp).toLocaleString()} / {Number(boss.max_hp).toLocaleString()}</span></div>
        <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden" role="progressbar" aria-label="首領耐久" aria-valuenow={Number(boss.current_hp)} aria-valuemin={0} aria-valuemax={Number(boss.max_hp)||1}><div className="h-full rounded-full bg-gradient-to-r from-red-600 to-rose-400" style={{width:healthPct+'%'}}/></div>
        {GAME_RULES_V2&&boss.is_active&&<span className="block text-xs text-slate-300">目前階段：{phase}</span>}
      </div>
    </div>:<div className="glass-card p-5 text-center text-sm">{bossError?<><span role="alert" className="text-rose-300">{bossError}</span><button onClick={fetchBossStatus} className="block underline mx-auto mt-3">重新載入</button></>:<span>正在載入首領...</span>}</div>}
    {boss&&bossError&&<div role="alert" className="text-xs text-amber-300">狀態更新失敗 <button className="underline" onClick={fetchBossStatus}>重試</button></div>}
    {GAME_RULES_V2&&boss&&<div className="glass-card p-2 space-y-1">
      <div className="grid grid-cols-3 divide-x divide-slate-700 text-center text-xs text-slate-400">
        <div>今日傷害<strong className="block text-amber-300 text-sm">{Number(boss.my_damage||0).toLocaleString()}</strong></div>
        <div>有效支援<strong className="block text-amber-300 text-sm">{boss.my_support||0}</strong></div>
        <div>今日挑戰<strong className="block text-amber-300 text-sm">{boss.my_attempts||0}/3</strong></div>
      </div>
      <p className="text-[11px] text-slate-300 text-center">貢獻分配 {boss.reward_pool}G · 首次參與 20G</p>
      {(boss.claims||[]).map(c=><button key={c.boss_id} disabled={loading} onClick={()=>handleClaim(c.boss_id)} className="w-full neon-button neon-button-success px-2 py-2 text-xs">領取 {c.boss_id.replace('daily:','')} 貢獻獎勵 {c.reward}G</button>)}
    </div>}
    {boss?.is_active&&<div className="glass-card p-3 space-y-2">
      <div className="flex items-center gap-2">
        {selectedMonster&&<div className="shrink-0" data-testid="raid-fighter"><BattleReveal monster={selectedMonster} look={appearance(selectedMonster,appearanceModes[selectedMonster.monster_id])} revealing={revealing} restored={!revealing&&!attacking} size={56}/></div>}
        <div className="flex-1 min-w-0">
          <label className="block text-xs text-slate-400 mb-1" htmlFor="raid-fighter-select">{revealing?'解除偽裝・真身出戰':attacking?'真身討伐中':'選擇出戰機甲'}</label>
          <select id="raid-fighter-select" disabled={loading||!selectedMonster} value={selectedMonster?.monster_id||''} onChange={e=>setSelectedMonsterId(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white">
            {!selectedMonster&&<option value="">沒有可出戰的機體</option>}
            {aliveMonsters.map(m=><option key={m.monster_id} value={m.monster_id}>{displayMonsterName(m)} (攻擊力: {Math.round(m.combat_atk)})</option>)}
          </select>
        </div>
      </div>
      {GAME_RULES_V2&&<div className="space-y-1"><label className="text-xs text-slate-400" htmlFor="raid-strategy">共鬥策略</label><select id="raid-strategy" disabled={loading} value={strategy} onChange={e=>setStrategy(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm"><option value="assault">強攻輸出（普通階段）</option><option value="break">破甲干擾（護盾階段）</option><option value="defend">防禦支援（暴走階段）</option></select></div>}
      <button onClick={handleAttack} disabled={loading||user.stamina<15||!selectedMonster||(GAME_RULES_V2&&Number(boss.my_attempts)>=3)} className="w-full neon-button neon-button-danger py-3 font-bold flex justify-center items-center gap-2"><GameIcon name="battle"/> 發動討伐突襲 <span className="text-xs">-15 行動電力</span></button>
    </div>}
    {message&&<div role="status" className="glass-card p-2 text-center text-xs font-medium text-rose-200 border-rose-500/30 whitespace-pre-line">{message}</div>}
  </section>;
}
