import React, { useState } from 'react';
import { api, GAME_RULES_V2 } from '../utils/api';
import { refreshAfterCommit } from '../utils/gameRules';
import {SKINS,ownsSkin} from '../utils/skins';
import SkinArt from './SkinArt';
import {SHOP_ITEMS,BALANCED_SHOP_ITEMS} from '../utils/mechaVocabulary';
import {GameIcon} from './PlayButton';

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
      const warning=await refreshAfterCommit(refreshData,['profile','inventory']);
      if(warning)setMessage(warning);
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
          <span className="text-2xl">⚙️</span> 商城
        </h3>
        
        <div className="flex justify-between items-center mb-4 text-sm font-bold bg-slate-900/50 p-3 rounded-lg border border-slate-700">
          <span className="text-slate-300">目前持有金幣</span>
          <span className="text-amber-400">💰 {user?.gold || 0}G</span>
        </div>

        <div className="skin-tabs" role="group" aria-label="商城分類"><button aria-pressed={tab==='items'} onClick={()=>setTab('items')}>道具</button><button aria-pressed={tab==='skins'} onClick={()=>setTab('skins')}>皮膚 · 10 款</button></div>
        {tab==='skins'?<div className="skin-shop-scroll"><p className="text-xs text-slate-300 mb-2">永久收藏，全機體共用，不影響戰力。</p><div className="skin-grid">{SKINS.map(s=>{const owned=ownsSkin(inventory,s.id);return <div key={s.id} className="skin-card"><SkinArt id={s.id}/><strong>{s.name}</strong><button className="skin-buy" disabled={owned||loading||Number(user.gold)<s.price} aria-label={owned?s.name+' 已收藏':'購買'+s.name+' '+s.price+'G'} onClick={()=>handleBuy(s.id)}>{owned?'已收藏':s.price+'G 購買'}</button></div>})}</div></div>:<div className="space-y-3 overflow-y-auto pr-2">
 {(GAME_RULES_V2?BALANCED_SHOP_ITEMS:SHOP_ITEMS).map(item=><div key={item.id} className="bg-slate-900/50 border border-slate-700/50 p-3 rounded-xl flex items-center justify-between gap-2">
 <div className="flex gap-2 items-center min-w-0"><span className="text-cyan-300 shrink-0"><GameIcon name={item.icon}/></span><div className="min-w-0"><div className="font-bold text-white text-sm">{item.name}</div><div className="text-xs text-slate-400">{item.description}</div><div className="text-xs text-slate-400">庫存 {inventory.find(i=>i.item_id===item.id)?.quantity||0}</div></div></div>
 <button type="button" onClick={()=>handleBuy(item.id)} disabled={loading||Number(user.gold)<item.price} className="neon-button bg-cyan-700 text-white px-3 py-2 text-sm shrink-0 whitespace-nowrap">{item.price}G 購買</button>
 </div>)}
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
