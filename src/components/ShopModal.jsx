import React, { useState } from 'react';
import { api } from '../utils/api';
import {SKINS,ownsSkin} from '../utils/skins';
import SkinArt from './SkinArt';

export default function ShopModal({ user, inventory=[], initialTab='items', onClose, refreshData }) {
  const [tab,setTab]=useState(initialTab);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleBuy = async (itemId) => {
    setLoading(true);
    setMessage('');
    try {
      const res = await api.buyItem(itemId, 1);
      setMessage(res.message);
      await refreshData(['profile','inventory']);
    } catch (err) {
      setMessage(`❌ ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="商城" className="cockpit-overlay">
      <div className="cockpit-dialog relative skin-shop-dialog">
        <button 
          onClick={onClose} aria-label="關閉商城"
          className="absolute top-4 right-4 text-slate-400 hover:text-white text-xl"
        >
          ✕
        </button>

        <h3 className="text-xl font-bold text-amber-400 mb-2 flex items-center gap-2">
          <span className="text-2xl">🏪</span> 商城
        </h3>
        
        <div className="flex justify-between items-center mb-4 text-sm font-bold bg-slate-900/50 p-3 rounded-lg border border-slate-700">
          <span className="text-slate-300">目前持有金幣</span>
          <span className="text-amber-400">💰 {user?.gold || 0}G</span>
        </div>

        <div className="skin-tabs" role="group" aria-label="商城分類"><button aria-pressed={tab==='items'} onClick={()=>setTab('items')}>道具</button><button aria-pressed={tab==='skins'} onClick={()=>setTab('skins')}>皮膚 · 10 款</button></div>
        {tab==='skins'?<div className="skin-shop-scroll"><p className="text-xs text-slate-300 mb-2">永久收藏，全機體共用，不影響戰力。</p><div className="skin-grid">{SKINS.map(s=>{const owned=ownsSkin(inventory,s.id);return <div key={s.id} className="skin-card"><SkinArt id={s.id}/><strong>{s.name}</strong><button className="skin-buy" disabled={owned||loading||Number(user.gold)<s.price} aria-label={owned?s.name+' 已收藏':'購買'+s.name+' '+s.price+'G'} onClick={()=>handleBuy(s.id)}>{owned?'已收藏':s.price+'G 購買'}</button></div>})}</div></div>:<div className="space-y-3 overflow-y-auto pr-2">
          <div className="bg-slate-900/50 border border-slate-700/50 p-4 rounded-xl flex justify-between items-center hover:border-amber-500/30 transition-colors">
            <div className="flex flex-col">
              <span className="font-bold text-white text-sm">🍖 基本肉</span>
              <span className="text-xs text-slate-400">恢復 20 飽食度</span>
            </div>
            <button onClick={() => handleBuy('meat_basic')} disabled={loading || user.gold < 10} className="neon-button bg-amber-600 text-white px-4 py-2 text-sm shadow-amber-500/20">10G 購買</button>
          </div>

          <div className="bg-slate-900/50 border border-slate-700/50 p-4 rounded-xl flex justify-between items-center hover:border-amber-500/30 transition-colors">
            <div className="flex flex-col">
              <span className="font-bold text-white text-sm">🥩 頂級肉</span>
              <span className="text-xs text-slate-400">恢復 60 飽食度</span>
            </div>
            <button onClick={() => handleBuy('meat_premium')} disabled={loading || user.gold < 50} className="neon-button bg-amber-600 text-white px-4 py-2 text-sm shadow-amber-500/20">50G 購買</button>
          </div>

          <div className="bg-slate-900/50 border border-slate-700/50 p-4 rounded-xl flex justify-between items-center hover:border-amber-500/30 transition-colors">
            <div className="flex flex-col">
              <span className="font-bold text-white text-sm">🥤 能量飲</span>
              <span className="text-xs text-slate-400">30 飽食 + 20 體力</span>
            </div>
            <button onClick={() => handleBuy('energy_drink')} disabled={loading || user.gold < 100} className="neon-button bg-amber-600 text-white px-4 py-2 text-sm shadow-amber-500/20">100G 購買</button>
          </div>

          <div className="bg-slate-900/50 border border-slate-700/50 p-4 rounded-xl flex justify-between items-center hover:border-amber-500/30 transition-colors">
            <div className="flex flex-col">
              <span className="font-bold text-white text-sm">💊 特效藥</span>
              <span className="text-xs text-slate-400">解除生病狀態</span>
            </div>
            <button onClick={() => handleBuy('medicine_standard')} disabled={loading || user.gold < 200} className="neon-button bg-rose-600 text-white px-4 py-2 text-sm shadow-rose-500/20">200G 購買</button>
          </div>

          <div className="bg-slate-900/50 border border-slate-700/50 p-4 rounded-xl flex justify-between items-center hover:border-amber-500/30 transition-colors">
            <div className="flex flex-col">
              <span className="font-bold text-white text-sm">🧪 維他命</span>
              <span className="text-xs text-slate-400">訓練時自動使用 1 顆，屬性提升量 +10%</span>
            </div>
            <button onClick={() => handleBuy('vitamin')} disabled={loading || user.gold < 50} className="neon-button bg-cyan-600 text-white px-4 py-2 text-sm shadow-cyan-500/20">50G 購買</button>
          </div>
          
          {[
            { id:'chip_atk', title:'攻擊晶片', stat:'攻擊力' },
            { id:'chip_def', title:'防禦晶片', stat:'防禦力' },
            { id:'chip_hp', title:'生命晶片', stat:'生命值' },
            { id:'chip_spd', title:'速度晶片', stat:'速度' }
          ].map(chip => (
            <div key={chip.id} className="bg-slate-900/50 border border-slate-700/50 p-4 rounded-xl flex justify-between items-center gap-2">
              <div className="flex flex-col">
                <span className="font-bold text-white text-sm">晶片：{chip.title}</span>
                <span className="text-xs text-slate-400">鑲嵌後 {chip.stat} +5；拆除需提取器，覆蓋會損毀舊晶片</span>
              </div>
              <button onClick={() => handleBuy(chip.id)} disabled={loading || user.gold < 300}
                className="neon-button bg-cyan-600 text-white px-4 py-2 text-sm shrink-0 disabled:opacity-40">
                300G 購買
              </button>
            </div>
          ))}

          <div className="bg-slate-900/50 border border-slate-700/50 p-4 rounded-xl flex justify-between items-center hover:border-amber-500/30 transition-colors">
            <div className="flex flex-col">
              <span className="font-bold text-white text-sm">🧪 繁衍催化劑</span>
              <span className="text-xs text-slate-400">突變機率翻倍</span>
            </div>
            <button onClick={() => handleBuy('breed_catalyst')} disabled={loading || user.gold < 500} className="neon-button bg-fuchsia-600 text-white px-4 py-2 text-sm shadow-fuchsia-500/20">500G 購買</button>
          </div>

          <div className="bg-slate-900/50 border border-slate-700/50 p-4 rounded-xl flex justify-between items-center hover:border-amber-500/30 transition-colors">
            <div className="flex flex-col">
              <span className="font-bold text-white text-sm">🧬 究極進化核心</span>
              <span className="text-xs text-slate-400">進化究極體必備</span>
            </div>
            <button onClick={() => handleBuy('ultimate_core')} disabled={loading || user.gold < 1000} className="neon-button bg-gradient-to-r from-yellow-500 to-amber-600 text-white px-4 py-2 text-sm shadow-[0_0_10px_rgba(245,158,11,0.5)]">1000G 購買</button>
          </div>
        </div>}

        {message && (
          <div className="mt-4 p-3 text-center text-sm font-medium animate-pulse text-cyan-200 border border-cyan-500/50 bg-cyan-900/20 rounded">
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
