import React from 'react';
import {spritePaths} from '../utils/mechaArt';
import {getMecha} from '../utils/monsterSprites';
export default function MonsterPixelArt({family,stage,type,isDead,isSick,isPoop,isHappy,isHungry,vehicle=false,className=''}) {
 const m=getMecha(family,stage,type);
 const anim=!isDead&&!vehicle&&stage>1?(isHappy?'animate-bounce-happy':isSick||isHungry?'animate-shake-weak':'animate-walk-side'):'';
 return <div className={'relative flex items-center justify-center select-none '+className}>
  <svg width="96" height="96" viewBox="0 0 128 128" shapeRendering="crispEdges" className={anim} role="img" aria-label={isDead?'核心失效':vehicle?m.vehicle:m.name}>
   {isDead?<g><path d="M32 112V42L48 26H80L96 42V112Z" fill="#65748a" stroke="#18243a" strokeWidth="6"/><path d="M51 52H77V57H67V83H61V57H51Z" fill="#c6d0db"/><path d="M27 111H101V117H27Z" fill="#34445e"/></g>:spritePaths(family,stage,type,vehicle).map(p=><path key={p.color} fill={p.color} d={p.d}/>)}
  </svg>
  {!isDead&&isSick&&<span title="系統故障" className="absolute -top-1 -right-2 text-rose-500 text-lg">⚠</span>}
  {!isDead&&isPoop&&<span title="需要保養" className="absolute -bottom-1 -right-2 text-amber-400 text-sm">⚙</span>}
  {!isDead&&isHappy&&<span className="absolute -top-3 right-0 text-rose-400">♥</span>}
  {!isDead&&isHungry&&!isHappy&&<span title="能源不足" className="absolute -top-3 right-0 text-yellow-400">!</span>}
 </div>
}
