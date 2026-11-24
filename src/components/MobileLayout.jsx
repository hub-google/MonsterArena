import React,{useState,useEffect} from 'react';
import {PlayButton,GameIcon} from './PlayButton';
export default function MobileLayout({children,page,setPage,isConnected,onRefresh,onLogout}) {
 const [more,setMore]=useState(false);
 // The desktop is the same portrait game, fitted to the available height.
 const fit=()=>Math.min(1,Math.max(0.1,(window.innerHeight-12)/780));
 const [arenaFit,setArenaFit]=useState(fit);
 useEffect(()=>{const resize=()=>setArenaFit(fit());window.addEventListener('resize',resize);resize();return()=>window.removeEventListener('resize',resize)},[]);
 const tabs=[['dashboard','home','養成','家'],['roster','roster','倉庫','包'],['arena','battle','競技','打'],['pokedex','pokedex','圖鑑','圖']];
 const extras=[['raid','raid','機甲首領','王'],['guild','guild','公會','隊'],['social','social','社交','友']];
 useEffect(()=>setMore(false),[page]);
 const go=id=>{setMore(false);setPage(id)};
 return <div data-testid="game-shell" className="arena-shell" style={{'--arena-fit':arenaFit}}>
   <header className="cockpit-header">
    <div className="cockpit-brand"><GameIcon name="robot"/><span>MONSTER <strong>ARENA</strong></span></div>
    <span title={isConnected?'瀏覽器在線':'瀏覽器離線'} aria-label={isConnected?'瀏覽器在線':'瀏覽器離線'} className={'w-2.5 h-2.5 rounded-full '+(isConnected?'bg-emerald-400':'bg-rose-500')}/>
   </header>
   <main data-testid="game-main" className={'cockpit-main '+(page==='dashboard'?'cockpit-main-home':'')}>{children}</main>
   {more&&<div className="absolute z-30 inset-x-3 bottom-[68px] rounded-2xl bg-slate-900 border border-slate-600 shadow-xl p-3" data-testid="more-menu">
     <div className="grid grid-cols-3 gap-2">{extras.map(([id,icon,label,short])=><PlayButton key={id} icon={icon} label={label} short={short} onClick={()=>go(id)} selected={page===id}/>)}
     <PlayButton icon="refresh" label="重新整理" short="更新" onClick={()=>{setMore(false);onRefresh?.()}}/>
     <PlayButton icon="logout" label="安全登出" short="登出" onClick={()=>{if(window.confirm('確定登出？')){setMore(false);onLogout?.()}}}/>
     <PlayButton icon="back" label="關閉更多功能" short="返回" onClick={()=>setMore(false)}/></div>
   </div>}
   <nav aria-label="遊戲導覽" className="cockpit-nav">
    {tabs.map(([id,icon,label,short])=><PlayButton key={id} icon={icon} label={label} short={short} selected={page===id} onClick={()=>go(id)} className="play-nav"/>)}
    <PlayButton icon="more" label="更多功能" caption="更多功能" selected={more||extras.some(t=>t[0]===page)} onClick={()=>setMore(v=>!v)} className="play-nav" aria-expanded={more}/>
   </nav>
 </div>
}
