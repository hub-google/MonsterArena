// Original procedural 3D environment: all geometry, lighting and textures are computed.
export const vertexSource = 'attribute vec2 position; void main(){gl_Position=vec4(position,0.,1.);}';
export const fragmentSource = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 resolution;
uniform float time;
uniform float boss;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float boxSDF(vec3 p,vec3 b){vec3 q=abs(p)-b;return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.);}
vec2 scene(vec3 p){
 float floorD=p.y;
 vec2 result=vec2(floorD,1.);
 float platform=max(length(p.xz)-4.8,abs(p.y-.09)-.09);
 if(platform<result.x)result=vec2(platform,2.);
 float cell=floor((p.z+2.5)/5.);
 vec3 q=vec3(abs(p.x)-6.6,p.y,mod(p.z+2.5,5.)-2.5);
 float h=2.5+2.8*hash(vec2(cell,1.));
 float tower=boxSDF(q-vec3(0.,h*.5,0.),vec3(.8,h*.5,1.15));
 float cap=boxSDF(q-vec3(0.,h,.0),vec3(1.1,.14,1.4));
 float rib=boxSDF(q-vec3(-.84,h*.5,0.),vec3(.035,h*.42,.12));
 if(tower<result.x)result=vec2(tower,3.);
 if(cap<result.x)result=vec2(cap,3.);
 if(rib<result.x)result=vec2(rib,4.);
 vec3 wall=vec3(abs(p.x)-9.1,p.y-2.6,p.z);
 float cliff=boxSDF(wall,vec3(1.3,3.2,38.))+(.23*sin(p.z*1.8)*sin(p.y*2.6));
 if(cliff<result.x)result=vec2(cliff,3.);
 return result;
}
vec3 normalAt(vec3 p){vec2 e=vec2(.018,0.);return normalize(vec3(scene(p+e.xyy).x-scene(p-e.xyy).x,scene(p+e.yxy).x-scene(p-e.yxy).x,scene(p+e.yyx).x-scene(p-e.yyx).x));}
float lineMask(float x,float w){return 1.-smoothstep(w,w*2.,abs(x));}
void main(){
 vec2 uv=(gl_FragCoord.xy*2.-resolution)/resolution.y;
 vec3 accent=mix(vec3(.05,.78,1.),vec3(1.,.28,.12),boss);
 vec3 fog=mix(vec3(.025,.15,.22),vec3(.20,.07,.075),boss);
 vec3 ro=vec3(0.,2.6,10.3);
 vec3 target=vec3(0.,1.5,-5.);
 vec3 f=normalize(target-ro),r=normalize(cross(f,vec3(0.,1.,0.))),u=cross(r,f);
 vec3 rd=normalize(f*1.65+r*uv.x+u*uv.y);
 float d=0.;float id=0.;
 for(int i=0;i<64;i++){vec2 hit=scene(ro+rd*d);if(hit.x<.016){id=hit.y;break;}d+=max(.025,hit.x*.80);if(d>48.)break;}
 vec3 color=fog*(.65+.5*max(rd.y,0.));
 if(id>0.){
  vec3 p=ro+rd*d,n=normalAt(p);float light=.35+.65*max(dot(n,normalize(vec3(-.4,.9,.45))),0.);
  float radius=length(p.xz);
  if(id<2.5){
   vec2 grid=abs(fract(p.xz*.48+.5)-.5);
   float seam=1.-smoothstep(.009,.026,min(grid.x,grid.y));
   float tile=hash(floor(p.xz*.48+.5));
   color=mix(vec3(.035,.07,.10),vec3(.09,.17,.21),tile)*light;
   color+=accent*seam*.08;
   if(id>1.5){
    float ring=lineMask(radius-4.6,.035)+lineMask(radius-3.9,.025)+lineMask(radius-1.1,.022);
    float lanes=lineMask(abs(p.x)-2.7,.025)*step(abs(p.z),3.);
    float wave=pow(.5+.5*sin(radius*2.8-time*2.),10.);
    color+=accent*(ring*.85+lanes*.4+wave*.045);
   }
  }else{
   float strata=.65+.35*sin(p.y*4.+sin(p.z*1.4));
   color=vec3(.06,.12,.16)*light*strata;
   if(id>3.5)color=accent*(.75+.18*sin(time*2.+p.z));
  }
  color=mix(color,fog,1.-exp(-d*.037));
 }
 float beams=pow(max(0.,sin(uv.x*7.+uv.y*1.9+sin(time*.19)*.5)),18.);
 color+=accent*beams*.035*max(0.,uv.y+.4);
 vec2 cell=floor((uv+vec2(0.,-time*.018))*26.);
 vec2 fp=fract((uv+vec2(0.,-time*.018))*26.);
 float spark=step(.94,hash(cell))*(1.-smoothstep(0.,.095,length(fp-vec2(.5))));
 color+=accent*spark*.65;
 color*=1.-.20*min(1.,dot(uv,uv)*.35);
 gl_FragColor=vec4(pow(max(color,vec3(0.)),vec3(.78)),1.);
}
`;
export function arenaResolution(width,height,dpr=1){
 const w=Math.max(1,width),h=Math.max(1,height);
 const scale=Math.min(Math.max(1,dpr),1.25,640/w,360/h);
 return [Math.max(1,Math.round(w*scale)),Math.max(1,Math.round(h*scale))];
}
