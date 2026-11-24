import React,{useState} from 'react';
import MonsterPixelArt from '../components/MonsterPixelArt';
import {GAME_RULES_V2} from '../utils/api';
import {FACTIONS,MONSTER_SPRITES} from '../utils/monsterSprites';
import {PlayButton,GameIcon} from '../components/PlayButton';
const glyphs=['car','guild','wing','orbit'];
const canTransform=m=>m.stage>=4&&Boolean(m.vehicle);
export default function Pokedex(){
 const [filter,setFilter]=useState(0),[forms,setForms]=useState({}),[selected,setSelected]=useState(null),[page,setPage]=useState(0);
 const entries=Object.values(MONSTER_SPRITES).filter(m=>!filter||m.faction===filter),pages=Math.ceil(entries.length/6),current=Math.min(page,pages-1);
 const choose=f=>{setFilter(f);setPage(0)};
 const isVehicle=m=>canTransform(m)&&Boolean(forms[m.key]);
 const toggle=m=>setForms(old=>({...old,[m.key]:!old[m.key]}));
 return <div className="catalog-screen">
  <div className="catalog-heading"><h2>機甲圖鑑 <span>40 種</span></h2><span className="catalog-hint">點選變身預覽載具</span></div>
  <div className="grid grid-cols-5 gap-1"><PlayButton icon="pokedex" label="全部陣營" caption="全部" selected={!filter} onClick={()=>choose(0)} className="play-small"/>{FACTIONS.map(f=><PlayButton key={f.id} icon={glyphs[f.id-1]} label={f.name} selected={filter===f.id} onClick={()=>choose(f.id)} className="play-small" style={{'--control-accent':f.color}}/>)}</div>
  <div className="catalog-grid">{entries.slice(current*6,current*6+6).map(m=><article key={m.key} className="play-encounter catalog-entry" data-testid={'catalog-'+m.key} style={{'--entry-accent':FACTIONS[m.faction-1].color}}>
   <button type="button" aria-label={m.modelName||m.name} onClick={()=>setSelected(m)} className="catalog-art-button">
    <MonsterPixelArt family={m.family} stage={m.stage} type={m.type} vehicle={isVehicle(m)} fitVehicle displaySize={104}/>
    <span className="catalog-species" title={m.modelName||m.name}>{m.modelName||m.factionName+'・'+m.roleName}</span><strong>{isVehicle(m)?m.vehicle:m.stageName}</strong>
   </button>
   {canTransform(m)?<button type="button" aria-label={(isVehicle(m)?'還原：':'變身：')+(m.modelName||m.name)} aria-pressed={isVehicle(m)} onClick={()=>toggle(m)} className="catalog-transform"><GameIcon name="transform"/><span>{isVehicle(m)?'還原':'變身'}</span></button>:<span className="catalog-transform-placeholder">尚未解鎖變身</span>}
  </article>)}</div>
  <div className="page-controls"><button className="play-arrow" aria-label="上一頁圖鑑" disabled={!current} onClick={()=>setPage(current-1)}>‹</button><span>{current+1} / {pages}</span><button className="play-arrow" aria-label="下一頁圖鑑" disabled={current>=pages-1} onClick={()=>setPage(current+1)}>›</button></div>
  <details className="text-xs text-slate-400"><summary>陣營克制</summary>疾風 → 鋼鐵 → 蒼空 → 星核 → 疾風　克制傷害 +{GAME_RULES_V2?'4.5':'20'}%；不同職業另有技能優勢，不代表必勝。</details>
  {selected&&<div className="cockpit-overlay" role="dialog" aria-label={selected.modelName||selected.name} aria-modal="true"><div className="cockpit-dialog flex flex-col items-center gap-2">
    <div className="dialog-heading w-full"><h2>機甲資料</h2><button onClick={()=>setSelected(null)} aria-label="關閉圖鑑詳情">×</button></div>
    <MonsterPixelArt family={selected.family} stage={selected.stage} type={selected.type} vehicle={isVehicle(selected)} fitVehicle displaySize={200}/>
    <div className="text-base font-bold text-center">{selected.modelName||selected.name}</div>
    {selected.modelName&&<div className="text-xs text-slate-400">{selected.factionName}・{selected.roleName}・{selected.stageName}</div>}
    {isVehicle(selected)&&<div className="text-sm text-cyan-300">載具：{selected.vehicle}</div>}
    {selected.skill&&<div className="text-sm text-cyan-300">{selected.skill}</div>}
   </div></div>}
 </div>
}
