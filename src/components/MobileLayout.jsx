import React,{useState,useEffect} from 'react';
import {PlayButton} from './PlayButton';
export default function MobileLayout({children,page,setPage,isConnected,onRefresh,onLogout}) {
 const [more,setMore]=useState(false);
 const tabs=[['dashboard','home','養成','家'],['roster','roster','倉庫','包'],['arena','battle','競技','打'],['pokedex','pokedex','圖鑑','圖']];
 const extras=[['raid','raid','世界王','王'],['guild','guild','公會','隊'],['social','social','社交','友']];
 useEffect(()=>setMore(false),[page]);
 const go=id=>{setMore(false);setPage(id)};
 return <div className="w-full max-w-[480px] h-[100dvh] mx-auto bg-slate-950 text-slate-200 relative shadow-2xl flex flex-col overflow-hidden sm:rounded-3xl sm:h-[min(850px,96dvh)] sm:my-2 border-x border-slate-700/30 sm:border-y">
   <header className="shrink-0 h-9 flex items-center justify-between px-4 border-b border-slate-800">
    <span className="text-xs font-bold tracking-wider text-cyan-300">MONSTER ARENA</span>
    <span title={isConnected?'瀏覽器在線':'瀏覽器離線'} aria-label={isConnected?'瀏覽器在線':'瀏覽器離線'} className={'w-2.5 h-2.5 rounded-full '+(isConnected?'bg-emerald-400':'bg-rose-500')}/>
   </header>
   <main className="flex-1 overflow-y-auto overflow-x-hidden relative p-3">{children}</main>
   {more&&<div className="absolute z-30 inset-x-3 bottom-[86px] rounded-2xl bg-slate-900 border border-slate-600 shadow-xl p-3" data-testid="more-menu">
     <div className="grid grid-cols-3 gap-2">{extras.map(([id,icon,label,short])=><PlayButton key={id} icon={icon} label={label} short={short} onClick={()=>go(id)} selected={page===id}/>)}
     <PlayButton icon="refresh" label="重新整理" short="更新" onClick={()=>{setMore(false);onRefresh?.()}}/>
     <PlayButton icon="logout" label="安全登出" short="登出" onClick={()=>{if(window.confirm('確定登出？')){setMore(false);onLogout?.()}}}/>
     <PlayButton icon="back" label="關閉更多功能" short="返回" onClick={()=>setMore(false)}/></div>
   </div>}
   <nav aria-label="遊戲導覽" className="grid grid-cols-5 gap-1 px-2 pt-2 pb-[max(8px,env(safe-area-inset-bottom))] border-t border-slate-700 shrink-0 bg-slate-900 z-20">
    {tabs.map(([id,icon,label,short])=><PlayButton key={id} icon={icon} label={label} short={short} selected={page===id} onClick={()=>go(id)} className="play-nav"/>)}
    <PlayButton icon="more" label="更多功能" short="更多" selected={more||extras.some(t=>t[0]===page)} onClick={()=>setMore(v=>!v)} className="play-nav" aria-expanded={more}/>
   </nav>
 </div>
}
