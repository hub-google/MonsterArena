import React,{useState} from 'react';
import MonsterPixelArt from '../components/MonsterPixelArt';
import {FACTIONS,MONSTER_SPRITES} from '../utils/monsterSprites';
import {PlayButton} from '../components/PlayButton';
const glyphs=['car','guild','wing','orbit'];
export default function Pokedex(){
 const [filter,setFilter]=useState(0),[vehicle,setVehicle]=useState(false),[selected,setSelected]=useState(null),[page,setPage]=useState(0);
 const entries=Object.values(MONSTER_SPRITES).filter(m=>!filter||m.faction===filter),pages=Math.ceil(entries.length/6),current=Math.min(page,pages-1);
 const choose=f=>{setFilter(f);setPage(0)};
 return <div className="catalog-screen">
  <div className="catalog-heading"><h2>機甲圖鑑 <span>40 種</span></h2><PlayButton icon="transform" label={vehicle?'顯示機器人形態':'顯示載具形態'} caption={vehicle?'機器人':'載具形態'} selected={vehicle} onClick={()=>setVehicle(v=>!v)} className="play-small"/></div>
  <div className="grid grid-cols-5 gap-1"><PlayButton icon="pokedex" label="全部種族" caption="全部" selected={!filter} onClick={()=>choose(0)} className="play-small"/>{FACTIONS.map(f=><PlayButton key={f.id} icon={glyphs[f.id-1]} label={f.name} selected={filter===f.id} onClick={()=>choose(f.id)} className="play-small" style={{'--control-accent':f.color}}/>)}</div>
  <div className="catalog-grid">{entries.slice(current*6,current*6+6).map(m=><button key={m.key} type="button" aria-label={m.name} onClick={()=>setSelected(m)} className="play-encounter catalog-entry" style={{'--entry-accent':FACTIONS[m.faction-1].color}}>
   <MonsterPixelArt family={m.family} stage={m.stage} type={m.type} vehicle={vehicle&&m.stage>=4} displaySize={104}/>
   <span className="catalog-species">{m.factionName}・{m.roleName}</span><strong>{m.stageName}</strong>
  </button>)}</div>
  <div className="page-controls"><button className="play-arrow" aria-label="上一頁圖鑑" disabled={!current} onClick={()=>setPage(current-1)}>‹</button><span>{current+1} / {pages}</span><button className="play-arrow" aria-label="下一頁圖鑑" disabled={current>=pages-1} onClick={()=>setPage(current+1)}>›</button></div>
  <details className="text-xs text-slate-400"><summary>種族克制</summary>疾風 → 鋼鐵 → 蒼空 → 星核 → 疾風　克制傷害 +20%</details>
  {selected&&<div className="cockpit-overlay" role="dialog" aria-label={selected.name} aria-modal="true"><div className="cockpit-dialog flex flex-col items-center gap-2">
    <div className="dialog-heading w-full"><h2>機甲資料</h2><button onClick={()=>setSelected(null)} aria-label="關閉圖鑑詳情">×</button></div>
    <MonsterPixelArt family={selected.family} stage={selected.stage} type={selected.type} vehicle={vehicle&&selected.stage>=4} displaySize={200}/>
    <div className="text-base font-bold text-center">{selected.name}</div>{selected.skill&&<div className="text-sm text-cyan-300">{selected.skill}</div>}
    {selected.stage>=4&&<PlayButton icon="transform" label="切換形態" caption={vehicle?'切換機器人':'切換載具'} onClick={()=>setVehicle(v=>!v)} className="w-full play-compact"/>}
   </div></div>}
 </div>
}
