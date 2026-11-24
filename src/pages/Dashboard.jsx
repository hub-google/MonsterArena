import React, { useState, useEffect } from 'react';
import MonsterPixelArt from '../components/MonsterPixelArt';
import { api } from '../utils/api';
import { resourcesForAction, getHatchState, canCareForMonster, canHealMonster } from '../utils/gameRules';
import { STAGE_NAMES, getMecha } from '../utils/monsterSprites';
import ShopModal from '../components/ShopModal';
import QuestModal from '../components/QuestModal';


export default function Dashboard({ 
  user, 
  monsters, 
  inventory, 
  refreshData, 
  activeMonster, 
  setActiveMonster, 
  setPage 
}) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showFeedMenu, setShowFeedMenu] = useState(false);
  const [showHealMenu, setShowHealMenu] = useState(false);
  const [actionEmote, setActionEmote] = useState(null);
  const [showShop, setShowShop] = useState(false);
  const [showQuests, setShowQuests] = useState(false);
  const [vehicle, setVehicle] = useState(false);

  const monster = activeMonster || monsters[0];
  const hatchState = getHatchState(user, monsters);

  // Changing selected pet must close action menus from the previous pet.
  useEffect(() => {
    setShowFeedMenu(false);
    setShowHealMenu(false);
    setVehicle(false);
  }, [monster?.monster_id]);

  const handleAction = async (actionFn, ...args) => {
    setLoading(true);
    setMessage('');
    try {
      const data = await actionFn(...args);
      setMessage(data.message || '操作成功！');
      
      // Trigger Happy Emote on successful train/feed
      if (actionFn === api.train || actionFn === api.feed) {
        setActionEmote('happy');
        setTimeout(() => setActionEmote(null), 3000);
      }

      await refreshData(resourcesForAction(api,actionFn));
    } catch (err) {
      setMessage(`❌ ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleHatch = async () => {
    setLoading(true);
    setMessage('');
    try {
      const data = await api.hatchEgg();
      setMessage(data.message);
      await refreshData(['profile','monsters']);
    } catch (err) {
      setMessage(`❌ ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Render Egg / Hatch state if user has no monsters
  if (monsters.length === 0) {
    return (
      <div className="h-full flex flex-col justify-center items-center">
        <div className="glass-card w-full max-w-sm p-8 flex flex-col items-center gap-8 text-center animate-fade-in">
          <div className="text-6xl animate-bounce">🥚</div>
          <div>
            <h2 className="text-xl font-bold neon-text mb-2">尚未擁有怪獸</h2>
            <p className="text-slate-400 text-sm">你需要啟動一枚機械核心來開始你的冒險。</p>
          </div>
          
          <div className="flex justify-center gap-6 w-full text-sm font-bold text-slate-300">
            <span className="flex items-center gap-1">💰 {user.gold}G</span>
            <span className="flex items-center gap-1">🔋 {user.stamina}</span>
          </div>

          <button
            type="button"
            onClick={handleHatch}
            disabled={loading || !hatchState.available}
            className="neon-button neon-button-primary w-full py-4 text-lg mt-4"
          >
            {hatchState.label}
          </button>
          
          {message && <div className="text-rose-400 text-sm mt-2">{message}</div>}
        </div>
      </div>
    );
  }

  if (!monster) return null;

  const getItemQty = (itemId) => {
    const item = inventory.find(i => i.item_id === itemId);
    return item ? item.quantity : 0;
  };

  // The database has a "name" column, but no "custom_name" column.
  // Preserve names chosen by players instead of replacing them with a species name.
  const mecha = getMecha(monster.family, monster.life_stage, monster.type);
  const isDefaultEggName = ['數位蛋','新生基因蛋','機械核心'].includes(monster.name);
  const speciesName = mecha.name;
  const displayName = isDefaultEggName ? speciesName : monster.name;

  const handleRename = async () => {
    const newName = prompt('請輸入新的怪獸名稱（最多30字）：', displayName);
    if (newName !== null && newName.trim() !== '') {
      setLoading(true);
      setMessage('');
      try {
        const data = await api.rename(monster.monster_id, newName.trim());
        setMessage(data.message || '改名成功！');
        await refreshData(['monsters']);
      } catch (err) {
        setMessage(`❌ ${err.message}`);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="flex flex-col gap-4 animate-fade-in pb-10">
      {/* Top Header stats */}
      <div className="glass-card p-4 flex justify-between items-center text-sm font-bold">
        <div className="flex gap-4">
          <span className="text-amber-400 drop-shadow-[0_0_5px_rgba(251,191,36,0.5)]">💰 {user.gold}G</span>
          <span className="text-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.5)]">🔋 {user.stamina}</span>
        </div>
        <div className="flex gap-2 sm:gap-3 items-center">
          <button 
            onClick={() => setShowShop(true)}
            className="text-amber-400 hover:text-amber-300 transition font-bold text-xs flex items-center gap-1"
          >
            🏪 商城
          </button>
          <span className="text-slate-600">|</span>
          <button 
            onClick={() => setShowQuests(true)}
            className="text-cyan-400 hover:text-cyan-300 transition font-bold text-xs flex items-center gap-1"
          >
            📋 任務
          </button>
          <span className="text-slate-600">|</span>
          <button 
            onClick={() => setPage('roster')}
            className="text-cyan-400 hover:text-cyan-300 transition underline text-xs"
          >
            切換怪獸 ({monsters.length}/50)
          </button>
          <span className="text-slate-600">|</span>
          <button 
            onClick={() => setPage('pokedex')}
            className="text-amber-400 hover:text-amber-300 transition font-bold text-xs flex items-center gap-1"
          >
            📖 圖鑑
          </button>
        </div>
      </div>

      {/* Monster Display Area */}
      <div className="glass-card p-6 flex flex-col items-center relative overflow-hidden">

        <div className="flex flex-col items-center gap-1 z-10 mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-white">{displayName}</h2>
            <button 
              onClick={handleRename}
              className="text-slate-400 hover:text-slate-700 transition cursor-pointer"
              title="改名"
            >
              ✏️
            </button>
          </div>
          {monster.is_rescue && <div className="text-xs text-cyan-300">免費救援怪獸・放生不提供金幣</div>}
          {!isDefaultEggName && monster.life_stage >= 3 && (
            <div className="text-xs text-slate-500">
              種族：{speciesName}
            </div>
          )}
        </div>
        
        <div className="flex gap-2 text-xs font-medium text-slate-300 z-10 mb-6 bg-slate-800 px-3 py-1 rounded-full border border-slate-600">
          <span>G{monster.generation} {STAGE_NAMES[monster.life_stage]}</span>
          <span>•</span>
          <span>{mecha.factionName}・{mecha.roleName}</span>
        </div>

        {/* LCD Screen for Pet */}
        <div data-testid="mecha-screen" className="relative z-10 w-full max-w-[248px] my-3 bg-slate-900 border-4 border-slate-700 rounded-xl p-3 shadow-inner shadow-slate-950/50">
          <MonsterPixelArt 
            family={monster.family}
            stage={monster.life_stage} 
            type={monster.type} 
            isDead={monster.is_dead} 
            isSick={monster.is_sick} 
            isPoop={monster.cleanliness < 40}
            isHappy={actionEmote === 'happy'}
            isHungry={monster.fullness < 30}
            displaySize={192}
            vehicle={vehicle && monster.life_stage >= 4}
          />
        </div>

        {!monster.is_dead && monster.life_stage >= 4 && <div className="flex flex-col items-center gap-1 z-10">
          <span data-testid="mecha-current-form" className="text-xs text-slate-400">目前形態：{vehicle?mecha.vehicle:'機器人'}</span>
          <button onClick={()=>setVehicle(v=>!v)} aria-pressed={vehicle} className="neon-button bg-slate-800 border border-slate-600 text-sm px-4 py-2">{vehicle?'切換機器人':'變形：'+mecha.vehicle}</button>
        </div>}
        {/* Status Bars */}
        <div className="w-full space-y-4 z-10 mt-6">
          <div>
            <div className="flex justify-between text-xs mb-1 font-medium text-slate-300">
              <span>能源</span>
              <span>{Math.round(monster.fullness)}%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-700">
              <div 
                className={`h-full transition-all duration-500 ${monster.fullness < 30 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                style={{ width: `${monster.fullness}%` }}
              ></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1 font-medium text-slate-300">
              <span>機體維護</span>
              <span>{Math.round(monster.cleanliness)}%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-700">
              <div 
                className={`h-full transition-all duration-500 ${monster.cleanliness < 40 ? 'bg-amber-500' : 'bg-cyan-500'}`}
                style={{ width: `${monster.cleanliness}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Combat Stats summary */}
      <div className="grid grid-cols-4 gap-2">
        <div className="glass-card py-2 flex flex-col items-center">
          <span className="text-[10px] text-slate-400">HP</span>
          <span className="font-bold text-rose-400">{Math.round(monster.combat_hp)}</span>
        </div>
        <div className="glass-card py-2 flex flex-col items-center">
          <span className="text-[10px] text-slate-400">ATK</span>
          <span className="font-bold text-amber-400">{Math.round(monster.combat_atk)}</span>
        </div>
        <div className="glass-card py-2 flex flex-col items-center">
          <span className="text-[10px] text-slate-400">DEF</span>
          <span className="font-bold text-blue-400">{Math.round(monster.combat_def)}</span>
        </div>
        <div className="glass-card py-2 flex flex-col items-center">
          <span className="text-[10px] text-slate-400">SPD</span>
          <span className="font-bold text-emerald-400">{Math.round(monster.combat_spd)}</span>
        </div>
      </div>

      {/* Disabled state for a dead pet: backend already rejects its actions. */}
      {monster.is_dead && (
        <div role="status" className="glass-card p-3 text-center text-sm border-rose-500/40 text-rose-300">
          此怪獸已死亡，無法補充能源、打掃、治療、訓練或進化。請到倉庫切換其他怪獸。
        </div>
      )}

      {/* Dynamic Actions Menu */}
      <div className="glass-card p-4">
        {showFeedMenu ? (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => { handleAction(api.feed, monster.monster_id, 'feed_basic'); setShowFeedMenu(false); }}
              disabled={loading || monster.is_dead}
              className="neon-button bg-slate-600 text-white hover:bg-slate-500 py-3 text-sm flex flex-col"
            >
              <span>基礎飼料 (免費)</span>
              <span className="text-[10px] opacity-70 font-normal">無限供應 (大便量增加)</span>
            </button>
            <button
              onClick={() => { handleAction(api.feed, monster.monster_id, 'meat_basic'); setShowFeedMenu(false); }}
              disabled={getItemQty('meat_basic') === 0 || loading || monster.is_dead}
              className="neon-button neon-button-primary py-3 text-sm flex flex-col"
            >
              <span>基本肉</span>
              <span className="text-[10px] opacity-70 font-normal">庫存: {getItemQty('meat_basic')} {getItemQty('meat_basic') === 0 ? '(請至倉庫商店購買)' : ''}</span>
            </button>
            <button
              onClick={() => { handleAction(api.feed, monster.monster_id, 'meat_premium'); setShowFeedMenu(false); }}
              disabled={getItemQty('meat_premium') === 0 || loading || monster.is_dead}
              className="neon-button neon-button-primary py-3 text-sm flex flex-col"
            >
              <span>頂級肉</span>
              <span className="text-[10px] opacity-70 font-normal">庫存: {getItemQty('meat_premium')} {getItemQty('meat_premium') === 0 ? '(請至倉庫商店購買)' : ''}</span>
            </button>
            <button
              onClick={() => { handleAction(api.feed, monster.monster_id, 'energy_drink'); setShowFeedMenu(false); }}
              disabled={getItemQty('energy_drink') === 0 || loading || monster.is_dead}
              className="neon-button neon-button-success py-3 text-sm flex flex-col"
            >
              <span>能量飲</span>
              <span className="text-[10px] opacity-70 font-normal">庫存: {getItemQty('energy_drink')} {getItemQty('energy_drink') === 0 ? '(請至倉庫商店購買)' : ''}</span>
            </button>
            <button 
              onClick={() => setShowFeedMenu(false)}
              className="neon-button bg-slate-700 text-white hover:bg-slate-600 py-3 text-sm col-span-2"
            >
              取消返回
            </button>
          </div>
        ) : showHealMenu ? (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => { handleAction(api.heal, monster.monster_id, 'heal_basic'); setShowHealMenu(false); }}
              disabled={loading || !canHealMonster(monster)}
              className="neon-button bg-slate-600 text-white hover:bg-slate-500 py-3 text-sm flex flex-col"
            >
              <span>急救草藥 (免費)</span>
              <span className="text-[10px] opacity-70 font-normal">無限供應 (扣減20%生命)</span>
            </button>
            <button
              onClick={() => { handleAction(api.heal, monster.monster_id, 'medicine_standard'); setShowHealMenu(false); }}
              disabled={getItemQty('medicine_standard') === 0 || loading || !canHealMonster(monster)}
              className="neon-button neon-button-success py-3 text-sm flex flex-col"
            >
              <span>基礎特效藥</span>
              <span className="text-[10px] opacity-70 font-normal">庫存: {getItemQty('medicine_standard')} {getItemQty('medicine_standard') === 0 ? '(請至倉庫商店購買)' : ''}</span>
            </button>
            <button 
              onClick={() => setShowHealMenu(false)}
              className="neon-button bg-slate-700 text-white hover:bg-slate-600 py-3 text-sm col-span-2"
            >
              取消返回
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              onClick={() => setShowFeedMenu(true)}
              disabled={loading || !canCareForMonster(monster)}
              className="neon-button neon-button-primary py-3 text-sm"
            >
              🍽️ 補充能源
            </button>
            <button
              onClick={() => handleAction(api.clean, monster.monster_id)}
              disabled={loading || !canCareForMonster(monster)}
              className="neon-button bg-cyan-700 text-white hover:bg-cyan-600 shadow-lg shadow-cyan-900/50 py-3 text-sm"
            >
              🧹 打掃
            </button>
            <button
              onClick={() => setShowHealMenu(true)}
              disabled={loading || !canHealMonster(monster)}
              className="neon-button neon-button-success py-3 text-sm"
            >
              💊 治療
            </button>
            <button
              onClick={() => handleAction(api.train, monster.monster_id)}
              disabled={loading || !canCareForMonster(monster)}
              className="neon-button neon-button-danger py-3 text-sm"
            >
              ⚔️ 訓練
            </button>
          </div>
        )}

        {/* Evolve action if Perfect and ready */}
        {monster.life_stage === 5 && (
          <div className="mt-4">
            <button
              onClick={() => handleAction(api.evolve, monster.monster_id)}
              disabled={loading || monster.is_dead || getItemQty('ultimate_core') === 0 || monster.battles < 50}
              className="neon-button bg-gradient-to-r from-yellow-500 to-amber-600 text-white shadow-[0_0_20px_rgba(245,158,11,0.5)] w-full py-4 text-sm pulse-glow"
            >
              🧬 究極進化 (需核心+50戰+70%勝率)
            </button>
          </div>
        )}
      </div>

      {/* Status / Log text */}
      {message && (
        <div className="glass-card p-3 text-center text-sm font-medium animate-pulse text-cyan-200 border-cyan-500/50 bg-cyan-900/20">
          {message}
        </div>
      )}
      
      {/* Age display subtle */}
      <div className="text-center text-xs text-slate-500 mt-2">
        存活時間: {Math.floor(monster.age_days * 10) / 10} 天
      </div>

      {showShop && <ShopModal user={user} onClose={() => setShowShop(false)} refreshData={refreshData} />}
      {showQuests && <QuestModal user={user} onClose={() => setShowQuests(false)} refreshData={refreshData} />}
    </div>
  );
}
