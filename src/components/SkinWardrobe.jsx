import React from 'react';
import {SKINS,ownsSkin} from '../utils/skins';
import SkinArt from './SkinArt';
import {PlayButton} from './PlayButton';
export default function SkinWardrobe({monster,inventory,onEquip,onClose,loading,error}){
 const owned=SKINS.filter(s=>ownsSkin(inventory,s.id));
 return <div className="cockpit-overlay" role="dialog" aria-modal="true" aria-label="皮膚衣櫃"><section className="cockpit-dialog skin-dialog">
 <div className="dialog-heading"><h2>皮膚衣櫃 · {owned.length}/10</h2><button onClick={onClose} aria-label="關閉衣櫃">×</button></div>
 <p className="text-xs text-slate-300">永久收藏，開戰自動露出真身。養成頁變形鍵可在皮膚、機器人及已解鎖載具間切換。</p>
 <div className="skin-grid">{owned.map(s=><button type="button" key={s.id} aria-label={'穿戴'+s.name} aria-pressed={monster.skin_id===s.id} disabled={loading} className="skin-card" onClick={()=>onEquip(s.id)}><SkinArt id={s.id}/><strong>{s.name}</strong><span>{monster.skin_id===s.id?'使用中':'穿戴'}</span></button>)}</div>
 {!owned.length&&<p className="text-center text-sm text-slate-300 py-5">尚無皮膚，商城最低 50G。</p>}
 {error&&<p role="alert" className="text-sm text-rose-300">{error}</p>}
 <PlayButton icon="robot" label="卸下皮膚" disabled={loading||!monster.skin_id} onClick={()=>onEquip(null)} className="w-full play-compact"/>
 <p className="text-xs text-slate-400 text-center">新皮膚請至商城的皮膚分類購買。</p>
 </section></div>;
}
