import React,{useState} from 'react';
import MonsterPixelArt from '../components/MonsterPixelArt';
import {FACTIONS,MONSTER_SPRITES} from '../utils/monsterSprites';
export default function Pokedex({setPage}){
 const [filter,setFilter]=useState(0),[vehicle,setVehicle]=useState(false);
 return <div className="flex flex-col h-full animate-fade-in">
 <div className="flex justify-between items-center mb-3"><h2 className="text-xl font-bold neon-text">機甲圖鑑・40種</h2><button onClick={()=>setPage('dashboard')} className="bg-slate-800 text-slate-300 px-3 py-1 rounded text-sm">返回養成</button></div>
 <div className="text-xs text-slate-300 mb-2">疾風 → 鋼鐵 → 蒼空 → 星核 → 疾風　克制傷害 +20%</div>
 <div className="flex gap-2 overflow-x-auto pb-2"><button onClick={()=>setFilter(0)} className={'rounded px-2 py-1 text-xs '+(!filter?'bg-cyan-700':'bg-slate-800')}>全部</button>{FACTIONS.map(f=><button key={f.id} onClick={()=>setFilter(f.id)} className={'whitespace-nowrap rounded px-2 py-1 text-xs '+(filter===f.id?'bg-cyan-700':'bg-slate-800')}>{f.name}</button>)}</div>
 <button onClick={()=>setVehicle(v=>!v)} className="text-xs mb-2 text-cyan-300 text-left">{vehicle?'顯示機器人形態':'顯示戰鬥機以上載具形態'}</button>
 <div className="flex-1 overflow-y-auto pb-10">{FACTIONS.filter(f=>!filter||f.id===filter).map(f=><section key={f.id} className="mb-5"><h3 className="font-bold mb-2" style={{color:f.color}}>{f.name}・10種</h3>
 {[0,1,2].map(role=><div key={role} className="mb-2"><p className="text-xs text-slate-400 mb-1">{role?f.roles[role-1].name+'｜'+f.roles[role-1].skill:'共同初始階段'}</p><div className="grid grid-cols-2 gap-2">{Object.values(MONSTER_SPRITES).filter(m=>m.faction===f.id&&m.type===role).map(m=><div key={m.key} className="glass-card flex flex-col items-center py-2 px-1"><span className="text-[10px] text-slate-500">#{String(m.id).padStart(2,'0')}</span><MonsterPixelArt family={m.family} stage={m.stage} type={m.type} vehicle={vehicle&&m.stage>=4}/><span className="text-xs font-bold text-cyan-200">{m.stageName}</span>{vehicle&&m.stage>=4&&<span className="text-[10px] text-slate-400">{m.vehicle}</span>}</div>)}</div></div>)}
 </section>)}</div></div>
}
