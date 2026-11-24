import React from 'react';
import {spritePaths,spriteViewport} from '../utils/mechaArt';
import {getMecha} from '../utils/monsterSprites';
import {GameIcon} from './PlayButton';
import {getSkin} from '../utils/skins';
import {SkinBody} from './SkinArt';
export default function MonsterPixelArt({family,stage,type,isDead,isSick,isPoop,isHappy,isHungry,vehicle=false,skin=null,displaySize=96,fitVehicle=false,className=''}) {
 const m=getMecha(family,stage,type);
 const showVehicle=Boolean(vehicle&&m.stage>=4&&!isDead);
 const showSkin=!isDead&&!showVehicle&&m.stage>=2?getSkin(skin):null;
 const anim=!isDead&&!showVehicle&&m.stage>1?(isHappy?'animate-bounce-happy':isSick||isHungry?'animate-shake-weak':'animate-walk-side'):'';
 const statuses=isDead?[]:[
  isSick&&{key:'fault',icon:'💊',label:'系統故障',tone:'border-rose-500/50 text-rose-300'},
  isHungry&&{key:'energy',icon:'🔋',label:'能源不足',tone:'border-amber-500/50 text-amber-300'},
  isPoop&&{key:'maintenance',icon:'🧼',label:'需要保養',tone:'border-slate-500/50 text-slate-300'},
  isHappy&&{key:'happy',icon:'💚',label:'心情愉快',tone:'border-emerald-500/50 text-emerald-300'}
 ].filter(Boolean);
 return <div className={'mecha-display relative flex flex-col items-center justify-center min-w-0 max-w-full select-none '+className}>
  <svg width={displaySize} height={displaySize} viewBox={showSkin?"0 0 64 64":fitVehicle&&showVehicle?spriteViewport(family,stage,type,true):"0 0 128 128"} preserveAspectRatio="xMidYMid meet" shapeRendering="crispEdges" className={'block max-w-full h-auto shrink-0 '+anim} role="img" aria-label={isDead?'核心失效':showSkin?showSkin.name:showVehicle?m.vehicle:m.name}>
   {isDead?<g><path d="M32 112V42L48 26H80L96 42V112Z" fill="#65748a" stroke="#18243a" strokeWidth="6"/><path d="M51 52H77V57H67V83H61V57H51Z" fill="#c6d0db"/><path d="M27 111H101V117H27Z" fill="#34445e"/></g>:showSkin?<SkinBody id={showSkin.id}/>:spritePaths(family,stage,type,showVehicle).map(p=><path key={p.color} fill={p.color} d={p.d}/>)}
  </svg>
  {statuses.length>0&&<div data-testid="mecha-status-list" aria-label="機體狀態" className="mecha-status-list">
   {statuses.map(s=><span key={s.key} data-testid={'mecha-status-'+s.key} title={s.label} aria-label={s.label} className={'mecha-status '+s.tone}><GameIcon name={s.icon}/><span>{s.label}</span></span>)}
  </div>}
 </div>
}
