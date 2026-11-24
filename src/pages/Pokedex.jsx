import React,{useState} from 'react';
import MonsterPixelArt from '../components/MonsterPixelArt';
import {FACTIONS,MONSTER_SPRITES} from '../utils/monsterSprites';
import {PlayButton} from '../components/PlayButton';
const glyphs=['🏎️','🛡️','✈️','🛸'];
export default function Pokedex({setPage}){
 const [filter,setFilter]=useState(0),[vehicle,setVehicle]=useState(false),[selected,setSelected]=useState(null);
 return <div className="flex flex-col gap-3">
  <div className="flex items-center justify-between"><span aria-label="40種圖鑑" className="text-xl font-bold">📖 40</span><PlayButton icon={vehicle?'🤖':'🚙'} label={vehicle?'顯示機器人形態':'顯示載具形態'} short="變" selected={vehicle} onClick={()=>setVehicle(v=>!v)} className="play-small"/></div>
  <div className="grid grid-cols-5 gap-1"><PlayButton icon="📖" label="全部種族" selected={!filter} onClick={()=>setFilter(0)} className="play-small"/>{FACTIONS.map(f=><PlayButton key={f.id} icon={glyphs[f.id-1]} label={f.name} selected={filter===f.id} onClick={()=>setFilter(f.id)} className="play-small" style={{borderColor:f.color}}/>)}</div>
  {FACTIONS.filter(f=>!filter||f.id===filter).map(f=><section key={f.id}>
   <div aria-label={f.name} className="flex items-center gap-2 my-2" style={{color:f.color}}><span className="text-xl">{glyphs[f.id-1]}</span><span className="h-1 flex-1 rounded" style={{background:f.color}}/><span className="text-xs">10</span></div>
   <div className="grid grid-cols-2 gap-2">{Object.values(MONSTER_SPRITES).filter(m=>m.faction===f.id).map(m=><button key={m.key} type="button" aria-label={m.name} onClick={()=>setSelected(m)} className="play-encounter border-slate-700">
     <MonsterPixelArt family={m.family} stage={m.stage} type={m.type} vehicle={vehicle&&m.stage>=4} displaySize={112}/>
     <div className="flex gap-1" aria-label={m.stageName}>{Array.from({length:6},(_,i)=><span key={i} className={'w-2 h-1 rounded '+(i<m.stage?'bg-cyan-300':'bg-slate-700')}/>)}</div>
   </button>)}</div>
  </section>)}
  <details className="text-xs text-slate-400"><summary>ℹ️ 克制</summary>疾風 → 鋼鐵 → 蒼空 → 星核 → 疾風　克制傷害 +20%</details>
  {selected&&<div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4" role="dialog" aria-label={selected.name} aria-modal="true">
   <div className="w-full max-w-xs rounded-2xl border border-slate-600 bg-slate-900 p-4 flex flex-col items-center gap-2">
    <MonsterPixelArt family={selected.family} stage={selected.stage} type={selected.type} vehicle={vehicle&&selected.stage>=4} displaySize={220}/>
    <div className="text-sm text-center">{selected.name}</div>{selected.skill&&<div className="text-xs text-cyan-300">{selected.skill}</div>}
    {selected.stage>=4&&<PlayButton icon={vehicle?'🤖':'🚙'} label="切換形態" short="變" onClick={()=>setVehicle(v=>!v)} className="w-full play-compact"/>}
    <PlayButton icon="back" label="關閉圖鑑詳情" short="返回" onClick={()=>setSelected(null)} className="w-full play-compact"/>
   </div>
  </div>}
 </div>
}
