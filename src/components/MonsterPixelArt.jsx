import React from 'react';
import {spritePaths,spriteViewport} from '../utils/mechaArt';
import {getMecha} from '../utils/monsterSprites';
import {GameIcon} from './PlayButton';
import {getSkin} from '../utils/skins';
import {SkinBody} from './SkinArt';
export default function MonsterPixelArt({family,stage,type,isDead,isSick,isPoop,isHappy,isHungry,vehicle=false,skin=null,displaySize=96,fitVehicle=false,className=''}) {
 const m=getMecha(family,stage,type);
 const tintId=React.useId();
 const showVehicle=Boolean(vehicle&&m.stage>=4&&!isDead);
 const showSkin=!isDead&&!showVehicle&&m.stage>=2?getSkin(skin):null;
 const customSprite=!isDead&&!showSkin?m.spriteAsset?.[showVehicle?'vehicle':'robot']||null:null;
 const anim=!isDead&&!showVehicle&&m.stage>1?(isHappy?'animate-bounce-happy':isSick||isHungry?'animate-shake-weak':'animate-walk-side'):'';
 const statuses=isDead?[]:[
  isSick&&{key:'fault',icon:'tools',label:'系統故障',tone:'border-rose-500/50 text-rose-300'},
  isHungry&&{key:'energy',icon:'🔋',label:'能源不足',tone:'border-amber-500/50 text-amber-300'},
  isPoop&&{key:'maintenance',icon:'clean',label:'需要保養',tone:'border-slate-500/50 text-slate-300'},
  isHappy&&{key:'happy',icon:'check',label:'系統運轉正常',tone:'border-emerald-500/50 text-emerald-300'}
 ].filter(Boolean);
 return <div className={'mecha-display relative flex flex-col items-center justify-center min-w-0 max-w-full select-none '+className}>
  <svg width={displaySize} height={displaySize} viewBox={showSkin||customSprite?"0 0 128 128":fitVehicle&&showVehicle?spriteViewport(family,stage,type,true):"0 0 128 128"} preserveAspectRatio="xMidYMid meet" shapeRendering="crispEdges" className={'block max-w-full h-auto shrink-0 '+anim} role="img" aria-label={isDead?'核心失效':showSkin?showSkin.name:showVehicle?m.vehicle:m.name}>
   {customSprite&&m.faction===1&&<defs><filter id={tintId} colorInterpolationFilters="sRGB"><feColorMatrix type="matrix" values=".299 .587 .114 0 0 .299 .587 .114 0 0 .299 .587 .114 0 0 0 0 0 1 0"/><feComponentTransfer><feFuncR type="table" tableValues=".06 .22 .65 .94 1"/><feFuncG type="table" tableValues=".09 .08 .16 .35 .76"/><feFuncB type="table" tableValues=".16 .14 .19 .25 .55"/></feComponentTransfer></filter></defs>}
   {isDead?<g><path d="M25 52L43 34H85L103 52V94L85 110H43L25 94Z" fill="#65748a" stroke="#18243a" strokeWidth="6"/><path d="M48 54L80 86M80 54L48 86" fill="none" stroke="#c6d0db" strokeWidth="7"/><path d="M40 112H88V117H40Z" fill="#34445e"/></g>:showSkin?<SkinBody id={showSkin.id}/>:customSprite?<image href={import.meta.env.BASE_URL+customSprite} x="0" y="0" width="128" height="128" filter={m.faction===1?'url(#'+tintId+')':undefined} style={{imageRendering:'pixelated'}}/>:spritePaths(family,stage,type,showVehicle).map(p=><path key={p.color} fill={p.color} d={p.d}/>)}
  </svg>
  {statuses.length>0&&<div data-testid="mecha-status-list" aria-label="機體狀態" className="mecha-status-list">
   {statuses.map(s=><span key={s.key} data-testid={'mecha-status-'+s.key} title={s.label} aria-label={s.label} className={'mecha-status '+s.tone}><GameIcon name={s.icon}/><span>{s.label}</span></span>)}
  </div>}
 </div>
}
