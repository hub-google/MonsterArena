import React,{useEffect,useRef,useState} from 'react';
import MonsterPixelArt from './MonsterPixelArt';
import {getMecha} from '../utils/monsterSprites';
import {createMechaModel,createRenderer,TURN_MS} from '../utils/mecha3d';
const meshes=new Map();
export default function Mecha3D({family,stage,type,vehicle=false,displaySize=104}){
 const model=getMecha(family,stage,type),canvas=useRef(null),[ready,setReady]=useState(false);
 useEffect(()=>{
  const el=canvas.current;let renderer,raf=0,active=true,start=null,last=-100;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  const lost=e=>{e.preventDefault();cancelAnimationFrame(raf);if(active)setReady(false)};
  const restored=()=>setup();
  const key=model.key+':'+vehicle;
  function setup(){
   try{
    cancelAnimationFrame(raf);
    if(renderer)renderer.dispose();
    if(!meshes.has(key))meshes.set(key,createMechaModel(model.faction,model.stage,model.type,vehicle));
    renderer=createRenderer(el,meshes.get(key));
    renderer.draw(Math.PI/5,0);setReady(true);
    const tick=t=>{
     if(!active)return;
     if(start===null)start=t;
     if(t-last>=1000/24){last=t;const e=reduced.matches?0:(t-start);renderer.draw(Math.PI/5+e/TURN_MS*Math.PI*2,reduced.matches?0:Math.sin(e/1200)*.038);}
     raf=requestAnimationFrame(tick);
    };
    raf=requestAnimationFrame(tick);
   }catch(error){setReady(false);}
  }
  el.addEventListener('webglcontextlost',lost);el.addEventListener('webglcontextrestored',restored);setup();
  return()=>{active=false;cancelAnimationFrame(raf);el.removeEventListener('webglcontextlost',lost);el.removeEventListener('webglcontextrestored',restored);if(renderer)renderer.dispose()};
 },[model.key,vehicle]);
 return <div className="mecha3d" style={{maxWidth:displaySize}} data-testid={'3d-'+model.key} data-rendered={ready?'true':'false'}>
   <canvas ref={canvas} width={128} height={128} role="img" aria-label={model.name+(vehicle?' 載具':' 機體')+'立體預覽'} style={{visibility:ready?'visible':'hidden'}}/>
   {!ready&&<MonsterPixelArt family={family} stage={stage} type={type} vehicle={vehicle} fitVehicle displaySize={displaySize}/>}
 </div>;
}
