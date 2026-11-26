// Procedural industrial ruins: analytic geometry, layered stone and metal materials,
// ambient occlusion, soft shadows, atmospheric perspective and animated reactor light.
// No textures, models or external rendering dependencies.
export const vertexSource='attribute vec2 position; void main(){gl_Position=vec4(position,0.,1.);}';
export const fragmentSource=`
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 resolution;
uniform float time;
uniform float boss;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float hash3(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
float noise(vec3 p){
 vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(mix(hash3(i),hash3(i+vec3(1,0,0)),f.x),mix(hash3(i+vec3(0,1,0)),hash3(i+vec3(1,1,0)),f.x),f.y),
 mix(mix(hash3(i+vec3(0,0,1)),hash3(i+vec3(1,0,1)),f.x),mix(hash3(i+vec3(0,1,1)),hash3(i+vec3(1,1,1)),f.x),f.y),f.z);
}
float fbm(vec3 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*noise(p);p=p*2.05+vec3(3.1,1.7,4.2);a*=.5;}return v;}
float boxSDF(vec3 p,vec3 b){vec3 q=abs(p)-b;return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.);}
float cyl(vec3 p,float r,float h){vec2 d=abs(vec2(length(p.xz),p.y))-vec2(r,h);return min(max(d.x,d.y),0.)+length(max(d,0.));}
vec2 add(vec2 a,float d,float m){return d<a.x?vec2(d,m):a;}
float line(float x,float w){return 1.-smoothstep(w,w*2.,abs(x));}
vec2 scene(vec3 p){
 vec2 s=vec2(p.y+.18,1.);
 float rad=length(p.xz);
 s=add(s,cyl(p-vec3(0.,-.04,0.),4.7,.26),2.);
 s=add(s,max(abs(rad-4.67)-.06,abs(p.y-.17)-.065),4.);
 s=add(s,max(abs(rad-4.47)-.035,abs(p.y-.225)-.014),5.);
 // Tower ribs, inset panels, feet, caps and suspension pipes.
 float cell=floor((p.z+2.5)/5.);
 vec3 q=vec3(abs(p.x)-6.3,p.y,mod(p.z+2.5,5.)-2.5);
 float h=5.6+2.6*hash(vec2(cell,2.));
 s=add(s,boxSDF(q-vec3(0.,h*.5,0.),vec3(.77,h*.5,1.12))-.10,3.);
 s=add(s,boxSDF(q-vec3(-.88,h*.47,0.),vec3(.13,h*.37,.73))-.025,6.);
 s=add(s,boxSDF(q-vec3(-1.02,h*.47,0.),vec3(.035,h*.32,.045)),5.);
 s=add(s,boxSDF(q-vec3(0.,.42,0.),vec3(1.3,.42,1.55))-.09,3.);
 s=add(s,boxSDF(q-vec3(0.,h-.3,0.),vec3(1.10,.30,1.38))-.06,6.);
 float stripe=mod(p.y+.35,1.2)-.6;
 s=add(s,boxSDF(vec3(q.x,stripe,q.z),vec3(.97,.05,1.26)),6.);
 vec3 pipe=vec3(abs(p.x)-5.1,p.y-3.8,mod(p.z+2.5,5.)-2.5);
 s=add(s,length(pipe.xy)-.11,6.);
 s=add(s,length(vec2(pipe.x-.25,pipe.y+.33))-.07,6.);
 // Eroded basalt canyon walls with large scale real relief.
 float cliff=abs(p.x)-8.6-.8*sin(p.z*.52)-.28*sin(p.z*1.7+p.y*.9)-.19*sin(p.y*2.4-p.z*.72);
 s=add(s,max(-cliff,p.y-10.5),7.);
 // Broken buttresses interrupt the silhouette.
 float zcell=floor((p.z+3.)/6.);
 vec3 b=vec3(abs(p.x)-7.5,p.y,mod(p.z+3.,6.)-3.);
 float bh=2.5+2.*hash(vec2(zcell,5.));
 s=add(s,boxSDF(b-vec3(0.,bh*.5,0.),vec3(.85,bh*.5,.55))-.25,7.);
 // Rear containment gateway, stepped tiers and suspended reactor.
 vec3 g=p-vec3(0.,0.,-12.);
 s=add(s,boxSDF(vec3(abs(g.x)-3.6,g.y-3.8,g.z),vec3(.6,3.8,.6))-.12,3.);
 s=add(s,boxSDF(g-vec3(0.,7.2,0.),vec3(4.2,.45,.7))-.10,6.);
 s=add(s,max(abs(length(g.xy-vec2(0.,3.8))-2.55)-.27,abs(g.z)-.34),6.);
 s=add(s,max(abs(length(g.xy-vec2(0.,3.8))-2.32)-.065,abs(g.z+.38)-.04),5.);
 s=add(s,length(g-vec3(0.,3.8,0.))-1.22,8.);
 return s;
}
vec3 normalAt(vec3 p){vec2 e=vec2(.012,0.);return normalize(vec3(scene(p+e.xyy).x-scene(p-e.xyy).x,scene(p+e.yxy).x-scene(p-e.yxy).x,scene(p+e.yyx).x-scene(p-e.yyx).x));}
float ao(vec3 p,vec3 n){float a=0.,w=1.;for(int i=1;i<=4;i++){float h=.08*float(i)*float(i);a+=(h-scene(p+n*h).x)*w;w*=.55;}return clamp(1.-a*1.6,.22,1.);}
float shadow(vec3 p,vec3 l){float d=.09,k=1.;for(int i=0;i<14;i++){float h=scene(p+l*d).x;k=min(k,9.*h/d);d+=clamp(h,.07,.95);if(k<.05||d>10.)break;}return clamp(k,.12,1.);}
vec3 surface(vec3 p,vec3 n,float id,vec3 accent,out float rough,out vec3 emit){
 float grain=fbm(p*5.5),fine=noise(p*48.),macro=fbm(p*.65);
 rough=.72;emit=vec3(0.);
 vec3 c=mix(vec3(.055,.075,.084),vec3(.22,.26,.28),grain);
 if(id<2.5){
  vec2 tile=p.xz*1.15,uv=fract(tile),cell=floor(tile);
  float seam=min(min(uv.x,1.-uv.x),min(uv.y,1.-uv.y));
  float edge=smoothstep(.018,.065,seam);
  float scratch=pow(noise(vec3(p.x*3.,p.z*68.,p.y)),12.);
  c=mix(vec3(.035,.044,.052),vec3(.23,.28,.30)*(.65+.45*hash(cell)),edge)*(.72+.53*grain);
  c+=scratch*.16;rough=.29+.35*grain;
  if(id>1.5){
   float r=length(p.xz),angle=atan(p.z,p.x);
   float rings=line(r-3.93,.025)+line(r-1.65,.025)+line(r-4.12,.012);
   float segmented=step(.19,fract(angle*7.64));
   float ticks=line(r-4.29,.045)*step(.82,fract(angle*15.28));
   float spokes=line(sin(angle*8.),.032)*smoothstep(2.4,3.0,r)*step(r,4.3);
   emit=accent*(rings*.85*segmented+ticks*.5+spokes*.2);
  }
 }else if(id<4.5||abs(id-6.)<.1){
  vec2 panel=vec2(p.z+p.x,p.y)*vec2(1.2,.8);
  vec2 g=abs(fract(panel)-.5);
  float seam=smoothstep(.45,.49,max(g.x,g.y));
  float bolts=1.-smoothstep(.04,.10,length(abs(g)-vec2(.38)));
  float rust=smoothstep(.48,.76,macro)*(.55+.45*grain);
  c=mix(vec3(.12,.17,.19),vec3(.34,.37,.36),grain);
  c=mix(c,vec3(.28,.12,.048),rust*.63);c*=1.-seam*.58;c+=bolts*.15;
  rough=.38+grain*.27;
 }else if(id<5.5){c=accent*.35;emit=accent*(1.4+.24*sin(time*2.+p.z));rough=.23;}
 else if(id<7.5){
  float strata=sin(p.y*12.+fbm(p*1.7)*8.)*.5+.5;
  c=mix(vec3(.047,.059,.064),vec3(.29,.32,.30),grain*.75+strata*.25);
  float moss=smoothstep(.50,.77,macro)*max(.15,n.y);
  c=mix(c,vec3(.13,.20,.11),moss*.7);rough=.91;
 }else{
  float veins=pow(.5+.5*sin(19.*fbm(p*3.+vec3(0.,time*.07,0.))),8.);
  c=accent*.16;emit=accent*(.55+veins*2.7);rough=.18;
 }
 return c*(.94+.12*fine);
}
void main(){
 vec2 uv=(gl_FragCoord.xy*2.-resolution)/resolution.y;
 vec3 accent=mix(vec3(.10,.72,.95),vec3(1.,.31,.095),boss);
 vec3 fog=mix(vec3(.046,.11,.15),vec3(.14,.072,.053),boss);
 vec3 ro=vec3(0.,3.35,10.7),target=vec3(0.,2.1,-7.);
 vec3 f=normalize(target-ro),r=normalize(cross(f,vec3(0.,1.,0.))),u=cross(r,f);
 vec3 rd=normalize(f*1.55+r*uv.x+u*uv.y);
 float d=0.,id=0.;
 for(int i=0;i<88;i++){vec2 hit=scene(ro+rd*d);if(hit.x<max(.009,d*.0007)){id=hit.y;break;}d+=max(.015,hit.x*.66);if(d>55.)break;}
 vec3 col=fog*(.65+.65*max(rd.y,0.));
 vec3 light=normalize(vec3(-.46,.82,.32));
 if(id>0.){
  vec3 p=ro+rd*d,n=normalAt(p);
  // Fine material normal detail, without adding costly geometry to each ray step.
  float bump=id>6.5&&id<7.5?.26:.10;
  vec3 bn=vec3(noise(p*22.+vec3(.25,0.,0.))-noise(p*22.-vec3(.25,0.,0.)),noise(p*22.+vec3(0.,.25,0.))-noise(p*22.-vec3(0.,.25,0.)),noise(p*22.+vec3(0.,0.,.25))-noise(p*22.-vec3(0.,0.,.25)));
  vec3 sn=normalize(n+bn*bump);
  float rough;vec3 emission;vec3 base=surface(p,n,id,accent,rough,emission);
  float oc=ao(p,n),sh=shadow(p+n*.045,light);
  float diffuse=max(dot(sn,light),0.);
  vec3 h=normalize(light-rd);
  float spec=pow(max(dot(sn,h),0.),mix(90.,9.,rough))*(1.-rough*.75);
  vec3 ambient=mix(vec3(.15,.21,.25),vec3(.42,.51,.53),sn.y*.5+.5);
  float reactor=1./(1.+.12*dot(p-vec3(0.,3.8,-12.),p-vec3(0.,3.8,-12.)));
  float edgeLight=exp(-abs(length(p.xz)-4.5)*2.2)*exp(-max(p.y,0.)*.85);
  col=base*(ambient*oc+vec3(1.0,.88,.69)*diffuse*sh*.95)+spec*sh*vec3(.66,.81,.88);
  col+=accent*(reactor*.42+edgeLight*.15)*oc+emission;
  float haze=1.-exp(-d*.043);
  col=mix(col,fog*1.2,haze);
 }
 // Atmospheric shafts and depth-varying drifting dust, kept behind combat UI.
 float shaft=pow(max(0.,sin(uv.x*4.8+uv.y*2.1+.8)),12.);
 col+=vec3(.52,.68,.73)*shaft*.055*max(0.,uv.y+.55);
 for(int i=0;i<3;i++){
  float fi=float(i);vec2 q=uv*(18.+fi*15.)+vec2(fi*18.+time*(.12+fi*.03),-time*(.17+fi*.04));
  vec2 cell=floor(q);vec2 off=vec2(hash(cell),hash(cell+13.7))*.6+.2;
  float spark=step(.95,hash(cell+fi*7.))*(1.-smoothstep(.018,.085,length(fract(q)-off)));
  col+=accent*spark*(.26-fi*.045);
 }
 col*=1.-.16*min(1.,dot(uv,uv)*.37);
 col=col/(col+vec3(.72));
 gl_FragColor=vec4(pow(max(col,vec3(0.)),vec3(.455)),1.);
}
`;
export function arenaResolution(width,height,dpr=1){
 const w=Math.max(1,width),h=Math.max(1,height);
 const scale=Math.min(Math.max(1,dpr),2,1200/w,720/h);
 return [Math.max(1,Math.round(w*scale)),Math.max(1,Math.round(h*scale))];
}
