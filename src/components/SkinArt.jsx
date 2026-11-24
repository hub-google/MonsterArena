import React from 'react';
import {getSkin} from '../utils/skins';

// Shared 128×128 transparent pixel-art PNGs, used by every cosmetic surface.
// SVG wrapper preserves existing sizing, accessibility and battle reveal animation.
export function SkinBody({id}){
 const s=getSkin(id);
 return s?<image href={import.meta.env.BASE_URL+'skins/'+s.id+'.png'} x="0" y="0" width="128" height="128" preserveAspectRatio="xMidYMid meet" style={{imageRendering:'pixelated'}}/>:null;
}
export default function SkinArt({id,size=88}){
 const s=getSkin(id);
 return s?<svg width={size} height={size} viewBox="0 0 128 128" shapeRendering="crispEdges" role="img" aria-label={s.name} className="skin-preview"><SkinBody id={id}/></svg>:null;
}
