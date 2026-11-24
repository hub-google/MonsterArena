import React, { useState } from 'react';
import { api } from '../utils/api';
import MonsterPixelArt from '../components/MonsterPixelArt';
import {PlayButton} from '../components/PlayButton';
import { resourcesForAction, getHatchState, canManageMonsterChips } from '../utils/gameRules';

import { STAGE_NAMES, getMecha } from '../utils/monsterSprites';

export default function Roster({ 
  user, 
  monsters, 
  inventory, 
  refreshData, 
  activeMonster, 
  setActiveMonster, 
  setPage 
}) {
  const [selectedMonsterId, setSelectedMonsterId] = useState(activeMonster?.monster_id || monsters[0]?.monster_id);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  // Tab within roster: 'list', 'chips', 'breed', 'shop'
  const [subTab, setSubTab] = useState('list');
  const [petPage,setPetPage]=useState(0);

  // Breeding selections
  const [parent1, setParent1] = useState('');
  const [parent2, setParent2] = useState('');
  const [useCatalyst, setUseCatalyst] = useState(false);

  // Chip slot selections
  const [equipSlot, setEquipSlot] = useState(1);
  const [selectedChipId, setSelectedChipId] = useState('');

  const selectedMonster = monsters.find(m => m.monster_id === selectedMonsterId) || monsters[0];
  const hatchState = getHatchState(user, monsters);
  const petPages=Math.max(1,Math.ceil(monsters.length/6));
  const currentPetPage=Math.min(petPage,petPages-1);

  const handleAction = async (actionFn, ...args) => {
    setLoading(true);
    setMessage('');
    try {
      const data = await actionFn(...args);
      setMessage(data.message || '操作成功！');
      try { await refreshData(resourcesForAction(api,actionFn)); }
      catch { setMessage('操作成功，但重新載入失敗，請手動更新。'); }
      return true;
    } catch (err) {
      setMessage(`❌ ${err.message}`);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleHatch = async () => {
    await handleAction(api.hatchEgg);
  };

  const handleSetSelection = (mId) => {
    setSelectedMonsterId(mId);
    const mon = monsters.find(m => m.monster_id === mId);
    if (mon) setActiveMonster(mon);
  };

  const handleBuy = async (itemId) => {
    await handleAction(api.buyItem, itemId, 1);
  };

  const handleEquip = async () => {
    if (!canManageMonsterChips(selectedMonster) || !selectedChipId) return;
    const previous = equipSlot === 1 ? selectedMonster.chip_slot_1 : selectedMonster.chip_slot_2;
    if (previous && !window.confirm('覆蓋晶片會永久損毀原晶片，確定繼續嗎？')) return;
    if (await handleAction(api.equipChip, selectedMonster.monster_id, selectedChipId, equipSlot))
      setSelectedChipId('');
  };

  const handleUnequip = async (slot) => {
    if (!canManageMonsterChips(selectedMonster)) return;
    await handleAction(api.unequipChip, selectedMonster.monster_id, slot);
  };

  const handleBreed = async () => {
    if (!parent1 || !parent2) return;
    await handleAction(api.breed, parent1, parent2, useCatalyst);
  };

  const getItemQty = (itemId) => {
    const item = inventory.find(i => i.item_id === itemId);
    return item ? item.quantity : 0;
  };

  // Older accounts have chips stored under item_type 1 or 6.
  const chipLabels = { chip_atk:'攻擊晶片', chip_def:'防禦晶片', chip_hp:'生命晶片', chip_spd:'速度晶片' };
  const chipsInInventory = inventory.filter(i =>
    Object.hasOwn(chipLabels,i.item_id) && Number(i.quantity) > 0);

  return (
    <div className="h-full flex flex-col gap-4 animate-fade-in">
      {/* Header bar */}
      <div className="glass-card p-4 flex justify-between items-center text-sm font-bold">
        <span className="text-cyan-400">庫存: {monsters.length}/50</span>
        <span className="text-amber-400">💰 {user.gold}G</span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[['list','🤖','機體清單','機體'],['chips','🔧','裝備晶片','裝備'],['breed','🧬','繁衍','融合']].map(([id,icon,label,short])=><PlayButton key={id} icon={icon} label={label} short={short} selected={subTab===id} onClick={()=>{setSubTab(id);setMessage('')}} className="play-compact"/>)}
      </div>

      {/* Main SubTab Content Area (Scrollable) */}
      <div className="flex-1 overflow-y-auto">
        
        {subTab==='list'&&<div className="flex flex-col gap-3">
          {monsters.length<50&&<PlayButton icon="hatch" label={hatchState.label} caption={hatchState.isRescue?'免費領取救援核心':'啟動新機械核心'} subtext={hatchState.isRescue?'':'100 金幣'} tone="green" onClick={handleHatch} disabled={loading||!hatchState.available} className="w-full play-compact"/>}
          <div className="grid grid-cols-3 gap-2" data-testid="pet-picker">
           {monsters.slice(currentPetPage*6,currentPetPage*6+6).map(m=><button key={m.monster_id} type="button" aria-label={'選擇 '+m.name} aria-pressed={selectedMonster?.monster_id===m.monster_id} onClick={()=>handleSetSelection(m.monster_id)} className={'play-encounter min-w-0 p-1 '+(selectedMonster?.monster_id===m.monster_id?'border-cyan-400':'border-slate-700')}>
             <MonsterPixelArt family={m.family} stage={m.life_stage} type={m.type} isDead={m.is_dead} displaySize={88}/>
             <span className="truncate w-full text-xs">{m.name}</span>{m.is_locked&&<span aria-label="已鎖定">🔒</span>}
           </button>)}
          </div>
          {petPages>1&&<div className="page-controls"><button className="play-arrow" aria-label="上一頁機體" disabled={!currentPetPage} onClick={()=>setPetPage(currentPetPage-1)}>‹</button><span>{currentPetPage+1} / {petPages}</span><button className="play-arrow" aria-label="下一頁機體" disabled={currentPetPage>=petPages-1} onClick={()=>setPetPage(currentPetPage+1)}>›</button></div>}
          {selectedMonster&&<>
           <PlayButton icon="home" label="回家照顧選定機體" caption="回家照顧" tone="blue" onClick={()=>{handleSetSelection(selectedMonster.monster_id);setPage('dashboard')}} className="w-full play-compact"/>
           <details className="glass-card p-3"><summary className="cursor-pointer text-sm">機體管理 · {selectedMonster.name}</summary>
            <div className="text-xs text-slate-400 my-2">{getMecha(selectedMonster.family,selectedMonster.life_stage,selectedMonster.type).name}・G{selectedMonster.generation}</div>
            {selectedMonster.is_rescue&&<div className="text-xs text-cyan-300">免費救援機體（放生無金幣獎勵）</div>}
            <div className="grid grid-cols-4 gap-2 my-3">{[['❤️',selectedMonster.combat_hp],['⚔️',selectedMonster.combat_atk],['🛡️',selectedMonster.combat_def],['⚡',selectedMonster.combat_spd]].map(([icon,val])=><div key={icon} className="text-center">{icon}<div>{Math.round(val)}</div></div>)}</div>
            <div className="grid grid-cols-2 gap-2">
              <PlayButton icon={selectedMonster.is_locked?'🔓':'🔒'} label={selectedMonster.is_locked?'解除鎖定':'鎖定保護'} short="保護" disabled={loading} onClick={()=>handleAction(api.toggleLock,selectedMonster.monster_id)}/>
              <PlayButton icon="🗑️" label="永久放生" short="放生" tone="red" disabled={loading||selectedMonster.is_locked} onClick={()=>{if(window.confirm('確定永久放生「'+selectedMonster.name+'」？放生後無法恢復。'+(selectedMonster.is_rescue?'免費救援機體不會獲得金幣。':'')))handleAction(api.release,selectedMonster.monster_id)}}/>
            </div>
           </details>
          </>}
        </div>}

        {subTab === 'chips' && selectedMonster && (
          <div className="flex flex-col gap-4">
            <div className="glass-card p-5">
              <h3 className="text-lg font-bold text-cyan-400 mb-4 flex items-center gap-2">
                <span className="text-2xl">🔧</span> 晶片鑲嵌面板
              </h3>
              
              {!canManageMonsterChips(selectedMonster) && (
                <p role="status" className="mb-4 text-sm text-rose-300">此怪獸已死亡，無法鑲嵌或拆除晶片。請切換其他怪獸。</p>
              )}
              <details className="text-xs text-slate-400 mb-4"><summary>ℹ️</summary>新晶片基本加成 +5。舊版強化晶片拆除後會保留原本加成，同種類下次鑲嵌優先恢復強化晶片。</details>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-4 flex flex-col items-center justify-between min-h-[120px]">
                  <span className="text-xs text-slate-400">插槽 1 (戰鬥機)</span>
                  <span className={`font-bold text-center w-full my-2 ${selectedMonster.chip_slot_1 ? 'text-amber-400' : 'text-slate-600'}`}>
                    {chipLabels[selectedMonster.chip_slot_1] || selectedMonster.chip_slot_1 || '【空位】'}
                  </span>
                  {selectedMonster.chip_slot_1 && (
                    <button
                      onClick={() => handleUnequip(1)}
                      disabled={loading || !canManageMonsterChips(selectedMonster) || getItemQty('chip_extractor') === 0}
                      className="text-xs text-rose-400 hover:text-rose-300 underline disabled:opacity-30 disabled:no-underline"
                    >
                      拆除 (需提取器)
                    </button>
                  )}
                </div>
                <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-4 flex flex-col items-center justify-between min-h-[120px]">
                  <span className="text-xs text-slate-400">插槽 2 (超限機)</span>
                  <span className={`font-bold text-center w-full my-2 ${selectedMonster.chip_slot_2 ? 'text-amber-400' : 'text-slate-600'}`}>
                    {chipLabels[selectedMonster.chip_slot_2] || selectedMonster.chip_slot_2 || '【空位】'}
                  </span>
                  {selectedMonster.chip_slot_2 && (
                    <button
                      onClick={() => handleUnequip(2)}
                      disabled={loading || !canManageMonsterChips(selectedMonster) || getItemQty('chip_extractor') === 0}
                      className="text-xs text-rose-400 hover:text-rose-300 underline disabled:opacity-30 disabled:no-underline"
                    >
                      拆除 (需提取器)
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-700/50">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">鑲嵌位置</label>
                  <select value={equipSlot} onChange={(e) => setEquipSlot(parseInt(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white outline-none">
                    <option value={1}>插槽 1</option>
                    <option value={2}>插槽 2</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-400 mb-1 block">選擇晶片</label>
                  <select value={selectedChipId} onChange={(e) => setSelectedChipId(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white outline-none">
                    <option value="">--請選擇背包內的晶片--</option>
                    {chipsInInventory.map(c => (
                      <option key={c.inventory_id} value={c.item_id}>
                        {chipLabels[c.item_id] || c.item_id} (庫存: {c.quantity})
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleEquip}
                  disabled={loading || !canManageMonsterChips(selectedMonster) || !selectedChipId || selectedMonster.life_stage < (equipSlot===1 ? 4 : 5)}
                  className="w-full neon-button neon-button-primary py-3 mt-2"
                >
                  確認鑲嵌 (覆蓋將損毀舊晶片)
                </button>
              </div>
            </div>
          </div>
        )}

        {subTab === 'breed' && (
          <div className="glass-card p-5 border-fuchsia-500/30">
            <h3 className="text-lg font-bold text-fuchsia-400 mb-1 flex items-center gap-2">
              <span className="text-2xl">🧬</span> 基因繁衍實驗室
            </h3>
            <p className="text-xs text-slate-400 mb-6">將兩隻戰鬥機以上的怪獸基因融合，產生更強大的後代。</p>
            
            <div className="space-y-4">
              <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700">
                <label className="text-xs text-fuchsia-300 font-bold mb-2 block">父親親代 (P1)</label>
                <select value={parent1} onChange={(e) => setParent1(e.target.value)} className="w-full bg-slate-950 border border-slate-600 rounded-lg p-3 text-white outline-none focus:border-fuchsia-500">
                  <option value="">--請選擇怪獸--</option>
                  {monsters.filter(m => m.life_stage >= 4 && !m.is_dead).map(m => (
                    <option key={m.monster_id} value={m.monster_id}>{m.name} (G{m.generation})</option>
                  ))}
                </select>
              </div>

              <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700">
                <label className="text-xs text-fuchsia-300 font-bold mb-2 block">母親親代 (P2)</label>
                <select value={parent2} onChange={(e) => setParent2(e.target.value)} className="w-full bg-slate-950 border border-slate-600 rounded-lg p-3 text-white outline-none focus:border-fuchsia-500">
                  <option value="">--請選擇怪獸--</option>
                  {monsters.filter(m => m.life_stage >= 4 && !m.is_dead).map(m => (
                    <option key={m.monster_id} value={m.monster_id}>{m.name} (G{m.generation})</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3 p-4 bg-fuchsia-900/10 border border-fuchsia-500/20 rounded-xl mt-2 cursor-pointer" onClick={() => setUseCatalyst(!useCatalyst)}>
                <div className={`w-6 h-6 rounded flex items-center justify-center border transition-colors ${useCatalyst ? 'bg-fuchsia-500 border-fuchsia-400' : 'bg-slate-800 border-slate-600'}`}>
                  {useCatalyst && <span className="text-white">✓</span>}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-white">使用繁衍催化劑</span>
                  <span className="text-xs text-fuchsia-300">突變機率翻倍 (庫存: {getItemQty('breed_catalyst')})</span>
                </div>
              </div>

              <button
                onClick={handleBreed}
                disabled={loading || !parent1 || !parent2 || parent1 === parent2 || (useCatalyst && getItemQty('breed_catalyst') < 1) || user.gold < 200}
                className="w-full py-4 font-bold rounded-xl text-white mt-4 bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 shadow-lg shadow-fuchsia-500/30 transform active:scale-95 transition-all disabled:opacity-50 disabled:transform-none"
              >
                融合繁衍一代 (-200G)
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Log message output */}
      {message && (
        <div className="glass-card p-3 text-center text-sm font-medium animate-pulse text-cyan-200 border-cyan-500/50 bg-cyan-900/20 mt-auto">
          {message}
        </div>
      )}
    </div>
  );
}
