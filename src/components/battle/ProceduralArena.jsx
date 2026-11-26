import React,{useEffect,useRef,useState} from 'react';
import {vertexSource,fragmentSource,arenaResolution,ARENA_VARIANTS,nextArena} from './proceduralArenaShader.js';
import './ProceduralArena.css';

export default function ProceduralArena({boss=false}){
 const ref=useRef(null);
 const [variant]=useState(nextArena);
 useEffect(()=>{
  const canvas=ref.current;
  const gl=canvas.getContext('webgl',{alpha:false,antialias:false,depth:false,powerPreference:'high-performance'});
  if(!gl)return;
  let frame=0,program,buffer,observer,disposed=false;
  const shaders=[];
  const media=window.matchMedia('(prefers-reduced-motion: reduce)');
  const compile=(type,source)=>{
   const s=gl.createShader(type);shaders.push(s);gl.shaderSource(s,source);gl.compileShader(s);
   if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));
   return s;
  };
  const release=()=>{
   if(buffer)gl.deleteBuffer(buffer);
   if(program)gl.deleteProgram(program);
   shaders.forEach(s=>gl.deleteShader(s));
  };
  try{
   program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,vertexSource));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fragmentSource));gl.linkProgram(program);
   if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
   gl.useProgram(program);buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
   gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
   const p=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(p);gl.vertexAttribPointer(p,2,gl.FLOAT,false,0,0);
  }catch(error){release();console.warn('Procedural arena unavailable:',error);return;}
  const resolution=gl.getUniformLocation(program,'resolution'),time=gl.getUniformLocation(program,'time'),theme=gl.getUniformLocation(program,'boss');
  gl.uniform1f(theme,boss?1:0);
  gl.uniform1f(gl.getUniformLocation(program,'arenaVariant'),variant);
  let last=-Infinity;
  function render(now){
   if(disposed||gl.isContextLost())return;
   const [w,h]=arenaResolution(canvas.clientWidth,canvas.clientHeight,window.devicePixelRatio);
   if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
   gl.viewport(0,0,w,h);gl.uniform2f(resolution,w,h);gl.uniform1f(time,media.matches?0:now*.001);
   gl.drawArrays(gl.TRIANGLES,0,3);
   canvas.dataset.ready='true';last=now;
  }
  function tick(now){
   if(disposed)return;
   if(!document.hidden&&!media.matches&&now-last>=66)render(now);
   frame=requestAnimationFrame(tick);
  }
  function resize(){if(!disposed&&!document.hidden)render(performance.now());}
  function lost(event){event.preventDefault();delete canvas.dataset.ready;}
  function restored(){// Keep the CSS fallback until the next battle mounts a new renderer.
   delete canvas.dataset.ready;disposed=true;cancelAnimationFrame(frame);
  }
  canvas.addEventListener('webglcontextlost',lost);canvas.addEventListener('webglcontextrestored',restored);
  observer=new ResizeObserver(resize);observer.observe(canvas);
  media.addEventListener('change',resize);
  resize();frame=requestAnimationFrame(tick);
  return()=>{disposed=true;cancelAnimationFrame(frame);observer.disconnect();media.removeEventListener('change',resize);canvas.removeEventListener('webglcontextlost',lost);canvas.removeEventListener('webglcontextrestored',restored);delete canvas.dataset.ready;release();};
 },[boss,variant]);
 return <div className={'ma-arena-backdrop'+(boss?' ma-arena-boss':'')} data-arena-variant={ARENA_VARIANTS[variant]} aria-hidden="true"><canvas ref={ref} data-testid="procedural-arena"/></div>;
}
