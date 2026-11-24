import React,{useEffect,useRef,useState} from 'react';
import MonsterPixelArt from './MonsterPixelArt';
import {getMecha} from '../utils/monsterSprites';
import {getSpriteGrid} from '../utils/mechaArt';
import {buildTurnMesh,redTint,turnAngle} from '../utils/mechaTurntable.js';

const meshCache=new Map();
const hex=rgb=>'#'+rgb.map(x=>x.toString(16).padStart(2,'0')).join('');
async function modelMesh(m,vehicle){
 const key=m.key+':'+vehicle;
 if(meshCache.has(key))return meshCache.get(key);
 const task=(async()=>{
  const asset=m.spriteAsset?.[vehicle?'vehicle':'robot'];
  if(!asset)return buildTurnMesh(getSpriteGrid(m.family,m.stage,m.type,vehicle),vehicle);
  const img=new Image();img.src=import.meta.env.BASE_URL+asset;await img.decode();
  const scratch=document.createElement('canvas');scratch.width=scratch.height=128;
  const ctx=scratch.getContext('2d',{willReadFrequently:true});ctx.imageSmoothingEnabled=false;ctx.drawImage(img,0,0,128,128);
  const p=ctx.getImageData(0,0,128,128).data;
  const grid=Array.from({length:128},(_,y)=>Array.from({length:128},(_,x)=>{
   const i=(y*128+x)*4;if(p[i+3]<100)return '';
   const rgb=[p[i],p[i+1],p[i+2]];return hex(m.faction===1?redTint(rgb):rgb);
  }));
  return buildTurnMesh(grid,vehicle);
 })();
 meshCache.set(key,task);try{return await task}catch(error){meshCache.delete(key);throw error}
}
const vertexSource=`attribute vec3 p;attribute vec3 color;uniform float angle;uniform float bob;varying vec3 v;
void main(){float c=cos(angle),s=sin(angle);vec3 q=vec3(p.x*c+p.z*s,p.y,-p.x*s+p.z*c);float a=.18;
float y=q.y*cos(a)-q.z*sin(a);float z=q.y*sin(a)+q.z*cos(a);
gl_Position=vec4(q.x,y+bob,-z*.6,1.);v=color;}`;
const fragmentSource=`precision mediump float;varying vec3 v;void main(){gl_FragColor=vec4(v,1.);}`;
function shader(gl,type,source){const sh=gl.createShader(type);gl.shaderSource(sh,source);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS)){const msg=gl.getShaderInfoLog(sh);gl.deleteShader(sh);throw Error(msg)}return sh}
export default function MechaTurntable({family,stage,type,vehicle=false,displaySize=104}){
 const m=getMecha(family,stage,type),canvas=useRef(null),[fallback,setFallback]=useState(true);
 useEffect(()=>{
  let live=true,raf=0,dispose=()=>{};setFallback(true);
  const el=canvas.current,gl=el?.getContext('webgl',{alpha:true,antialias:false,premultipliedAlpha:false});
  if(!gl)return;
  const lost=e=>{e.preventDefault();cancelAnimationFrame(raf);if(live)setFallback(true)};
  el.addEventListener('webglcontextlost',lost);
  (async()=>{
   const vertices=await modelMesh(m,vehicle);if(!live||!vertices.length)return;
   const vs=shader(gl,gl.VERTEX_SHADER,vertexSource),fs=shader(gl,gl.FRAGMENT_SHADER,fragmentSource);
   const program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
   gl.deleteShader(vs);gl.deleteShader(fs);
   if(!gl.getProgramParameter(program,gl.LINK_STATUS)){gl.deleteProgram(program);throw Error('turntable link failed')}
   const buffer=gl.createBuffer();dispose=()=>{gl.deleteBuffer(buffer);gl.deleteProgram(program)};
   gl.useProgram(program);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,vertices,gl.STATIC_DRAW);
   for(const [name,offset] of [['p',0],['color',12]]){const loc=gl.getAttribLocation(program,name);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,3,gl.FLOAT,false,24,offset)}
   const angle=gl.getUniformLocation(program,'angle'),bob=gl.getUniformLocation(program,'bob');
   gl.enable(gl.DEPTH_TEST);gl.clearColor(0,0,0,0);gl.viewport(0,0,128,128);
   const reduce=window.matchMedia('(prefers-reduced-motion: reduce)');let start=null,last=-100;
   const draw=t=>{
    if(!live)return;
    if(start===null)start=t;
    if(t-last>=1000/24){last=t;const elapsed=reduce.matches?0:t-start;gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.uniform1f(angle,turnAngle(elapsed,vehicle));gl.uniform1f(bob,reduce.matches?0:Math.sin(elapsed/1100)*.035);gl.drawArrays(gl.TRIANGLES,0,vertices.length/6)}
    raf=requestAnimationFrame(draw);
   };
   setFallback(false);raf=requestAnimationFrame(draw);
  })().catch(()=>{if(live)setFallback(true)});
  return()=>{live=false;cancelAnimationFrame(raf);el.removeEventListener('webglcontextlost',lost);dispose()};
 },[family,stage,type,vehicle]);
 return <div className="mecha-turntable" style={{maxWidth:displaySize}} role="img" aria-label={m.modelName+(vehicle?' 載具':' 機體')+' 360度預覽'}>
  <canvas ref={canvas} width={128} height={128} style={{visibility:fallback?'hidden':'visible'}} aria-hidden="true"/>
  {fallback&&<MonsterPixelArt family={family} stage={stage} type={type} vehicle={vehicle} displaySize={displaySize} fitVehicle/>}
 </div>
}
