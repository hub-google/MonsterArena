// Orbital electronic combat arena: machined alloys and a procedural astronomical sky,
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
uniform float arenaVariant;
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
 float radius=length(p.xz);
 vec2 s=vec2(100.,0.);
 if(arenaVariant>2.5){
  // Electronic simulation: hexagonal floating deck and tall data pylons.
  vec2 q=abs(p.xz);float hex=max(q.x*.866025+q.y*.5,q.y);
  s=add(s,max(hex-6.2,abs(p.y+.24)-.24),1.);
  s=add(s,max(hex-5.65,abs(p.y-.10)-.12),2.);
  s=add(s,max(abs(hex-5.63)-.055,abs(p.y-.23)-.035),5.);
  vec3 tower=vec3(abs(p.x)-5.8,p.y-2.4,mod(p.z+8.,4.)-2.);
  s=add(s,boxSDF(tower,vec3(.45,2.4,.5))-.04,6.);
  s=add(s,boxSDF(tower-vec3(-.46,0.,0.),vec3(.045,2.1,.19)),5.);
  return s;
 }
 // Floating layered alloy deck with inset emitters and segmented armor.
 s=add(s,cyl(p-vec3(0.,-.38,0.),6.7,.38),1.);
 s=add(s,cyl(p-vec3(0.,.05,0.),5.5,.16),2.);
 s=add(s,max(abs(radius-5.44)-.075,abs(p.y-.22)-.055),5.);
 s=add(s,max(abs(radius-6.35)-.13,abs(p.y+.02)-.055),5.);
 s=add(s,cyl(p-vec3(0.,-.82,0.),5.9,.19),6.);
 float a=atan(p.z,p.x),sector=6.2831853/12.;
 float local=mod(a+sector*.5,sector)-sector*.5;
 vec3 q=vec3(radius*sin(local),p.y,radius*cos(local)-6.22);
 s=add(s,boxSDF(q-vec3(0.,.12,0.),vec3(.65,.16,.38))-.07,6.);
 s=add(s,boxSDF(q-vec3(0.,.30,-.1),vec3(.48,.035,.18)),5.);
 // Low docking pylons on the flanks keep the stellar horizon open.
 vec3 d=vec3(abs(p.x)-6.0,p.y,p.z+2.3);
 s=add(s,boxSDF(d-vec3(0.,.65,0.),vec3(.52,.65,.8))-.12,3.);
 s=add(s,boxSDF(d-vec3(0.,1.40,0.),vec3(.35,.14,.68))-.05,6.);
 s=add(s,boxSDF(d-vec3(-.55,.85,0.),vec3(.055,.35,.47)),5.);
 if(arenaVariant>.5&&arenaVariant<1.5){
  // Nebula station: tall paired thruster housings, layered metal arches.
  vec3 t=vec3(abs(p.x)-5.4,p.y-2.,p.z+5.6);
  s=add(s,boxSDF(t,vec3(.62,2.0,.58))-.12,6.);
  s=add(s,boxSDF(t-vec3(-.64,0.,0.),vec3(.045,1.65,.22)),5.);
 }
 if(arenaVariant>1.5&&arenaVariant<2.5){
  // Jump gate: full circular segmented energy accelerator, suspended behind deck.
  vec3 v=p-vec3(0.,4.2,-9.);
  float rr=length(v.xy);
  s=add(s,max(abs(rr-3.9)-.28,abs(v.z)-.23),6.);
  s=add(s,max(abs(rr-3.57)-.09,abs(v.z+.1)-.07),5.);
  float a2=atan(v.y,v.x);
  s=add(s,max(max(abs(rr-4.25)-.13,abs(v.z)-.32),abs(sin(a2*12.))-.26),3.);
 }
 // Two precision orbital hoops behind the deck; open at the top to reveal space.
 vec3 g=p-vec3(0.,1.2,-7.1);
 float ring=length(g.xy);
 float cut=max(g.y-3.1,-g.y-4.0);
 s=add(s,max(max(abs(ring-6.6)-.22,abs(g.z)-.19),cut),6.);
 s=add(s,max(max(abs(ring-6.32)-.055,abs(g.z+.16)-.045),cut),5.);
 // Holographic electronic display pods on the sides.
 vec3 pod=vec3(abs(p.x)-4.7,p.y-1.55,p.z+5.2);
 s=add(s,boxSDF(pod,vec3(.92,.48,.10))-.07,6.);
 s=add(s,boxSDF(pod-vec3(0.,0.,.14),vec3(.82,.39,.025)),9.);
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
  c=mix(vec3(.035,.044,.052),vec3(.26,.36,.48)*(.65+.45*hash(cell)),edge)*(.72+.53*grain);
  c+=scratch*.025;rough=.29+.35*grain;
  if(id>1.5){
   float r=length(p.xz),angle=atan(p.z,p.x);
   float rings=line(r-4.72,.025)+line(r-1.65,.025)+line(r-5.03,.012);
   float segmented=step(.19,fract(angle*7.64));
   float ticks=line(r-5.18,.045)*step(.82,fract(angle*15.28));
   float spokes=line(sin(angle*8.),.032)*smoothstep(2.4,3.0,r)*step(r,5.1);
   emit=accent*(rings*.85*segmented+ticks*.5+spokes*.2);
  }
 }else if(id<4.5||abs(id-6.)<.1){
  vec2 panel=vec2(p.z+p.x,p.y)*vec2(1.2,.8);
  vec2 g=abs(fract(panel)-.5);
  float seam=smoothstep(.45,.49,max(g.x,g.y));
  float bolts=1.-smoothstep(.04,.10,length(abs(g)-vec2(.38)));
  float brushed=noise(vec3(p.x*36.,p.y*3.,p.z*36.));
  float ceramic=step(.48,hash(floor(panel)));
  c=mix(vec3(.075,.13,.21),vec3(.42,.53,.65),ceramic);
  c*=.88+.15*brushed;c*=1.-seam*.62;c+=bolts*.11;
  rough=.19+.22*grain;
 }else if(id<5.5){c=accent*.35;emit=accent*(1.4+.24*sin(time*2.+p.z));rough=.23;}
 else if(id<7.5){
  c=vec3(.12,.19,.28);rough=.35;
 }else{
  vec2 uv=vec2(abs(p.x)-4.7,p.y-1.55);
  vec2 g=abs(fract(uv*vec2(20.,18.))-.5);
  float dots=1.-smoothstep(.28,.48,max(g.x,g.y));
  float bar=step(.30,fract(uv.x*3.))*step(abs(uv.y),.14);
  float scan=.8+.2*sin(uv.y*100.-time*3.);
  c=vec3(.012,.028,.055);emit=accent*dots*scan*(.15+bar*1.0);rough=.19;
 }

 return c*(.94+.12*fine);
}

// Astronomical background: star clusters, dust filaments, a spherical gas giant
// with procedural atmospheric bands, terminator and a tilted ring system.
vec3 cosmos(vec3 rd,vec3 accent){
 vec3 c=vec3(.009,.016,.045);
 if(arenaVariant>2.5){
  // Endless data-space: perspective grid, drifting packet columns and circuit nodes.
  vec2 uv=rd.xy/max(.12,-rd.z);
  float depth=1./max(.12,abs(rd.y+.06));
  vec2 plane=vec2(rd.x*depth,rd.z*depth);
  vec2 gr=abs(fract(plane*1.7)-.5);
  float grid=(1.-smoothstep(.43,.49,min(gr.x,gr.y)))*.025;
  float edges=smoothstep(.465,.495,max(gr.x,gr.y));
  float fade=exp(-depth*.07);
  float columns=step(.87,hash(vec2(floor(uv.x*38.),1.)));
  float packet=step(.72,fract(uv.y*15.+time*.65+hash(vec2(floor(uv.x*38.),3.))));
  float nodes=pow(max(0.,sin(uv.x*43.+sin(uv.y*23.))),22.)*pow(max(0.,sin(uv.y*37.)),16.);
  return vec3(.008,.022,.043)+accent*(edges*fade*.30+grid+columns*packet*.10+nodes*.22);
 }
 float cloud=fbm(rd*4.5+vec3(1.2,-1.5,3.4));
 float fil=fbm(rd*13.+vec3(2.,1.,5.));
 float band=exp(-pow((rd.y+.15*rd.x-.06)*3.6,2.));
 float neb=pow(clamp(cloud*1.45-.24,0.,1.),2.)*band;
 c+=mix(vec3(.045,.034,.15),vec3(.07,.20,.34),fil)*neb*2.8;
 c+=vec3(.20,.08,.23)*pow(max(0.,fil-.36),2.)*band;
 if(arenaVariant>.5&&arenaVariant<1.5){
  // Violet and rose nebula with turbulent dust lanes and a bright ionized core.
  float spiral=fbm(rd*7.+vec3(8.,3.,-5.));
  float plume=exp(-pow((rd.y-rd.x*.36+.10+spiral*.22)*4.8,2.));
  c+=mix(vec3(.15,.025,.32),vec3(.78,.13,.32),fil)*plume*(.35+spiral)*1.5;
  c*=.6+.65*cloud;
 }
 if(arenaVariant>1.5&&arenaVariant<2.5){
  // Hyperspace tunnel: radially stretched stars, concentric shock fronts.
  vec2 z=rd.xy-vec2(0.,.12);float rad=length(z);float an=atan(z.y,z.x);
  float streak=pow(max(0.,sin(an*94.+sin(an*31.)*3.)),18.);
  float pulse=pow(.5+.5*sin(rad*61.-time*3.),8.);
  c+=accent*(streak*exp(-rad*2.)*.45+pulse*exp(-rad*4.)*.21);
  c+=vec3(.24,.42,.85)*exp(-rad*rad*32.)*.48;
 }
 for(int i=0;i<3;i++){
  float fi=float(i);
  vec3 q=rd*(92.+fi*107.);
  vec3 cell=floor(q),f=fract(q)-.5;
  float star=step(.971+fi*.006,hash3(cell+fi*2.))*exp(-dot(f,f)*(32.+fi*12.));
  c+=star*mix(vec3(.5,.7,1.),vec3(1.,.87,.68),hash3(cell+6.))*(1.2-fi*.22);
 }
 if(arenaVariant>1.5)return c;
 vec3 pc=normalize(arenaVariant>.5?vec3(-.54,.20,-1.):vec3(.43,.16,-1.));
 vec3 rel=rd-pc;float dist=length(rel);
 float pr=arenaVariant>.5?.13:.245;
 vec3 axis=normalize(vec3(.18,.87,.46));
 float denom=dot(rd,axis);
 if(abs(denom)>.001){
  float k=dot(pc,axis)/denom;
  vec3 ringPoint=rd*k-pc;
  float rr=length(ringPoint);
  if(arenaVariant<.5&&k>0.&&rr>pr*1.23&&rr<pr*2.24&&(dist>pr||k<dot(rd,pc))){
   float rings=.44+.30*sin(rr*340.)+.18*sin(rr*770.);
   float gaps=smoothstep(.005,.02,abs(rr-pr*1.72));
   c=mix(c,vec3(.46,.60,.83)*rings,gaps*.48);
  }
 }
 if(dist<pr){
  vec3 v=rel/pr;
  vec3 n=normalize(v-pc*sqrt(max(0.,1.-dot(v,v))));
  float lat=dot(n,axis);
  float clouds=fbm(n*9.+vec3(2.,0.,1.));
  float bands=.5+.5*sin(lat*34.+clouds*3.8);
  vec3 gas=mix(vec3(.12,.25,.49),vec3(.68,.80,.96),bands*.68+clouds*.22);
  float lit=max(0.,dot(n,normalize(vec3(-.65,.65,.48))));
  float rim=pow(clamp(dist/pr,0.,1.),9.);
  c=gas*(.10+.95*lit)+vec3(.19,.49,.95)*rim*.47;
 }else c+=vec3(.15,.35,.8)*exp(-(dist-pr)*75.)*.23;
 // A sparse distant moon.
 float moon=length(rd-normalize(vec3(-.58,.25,-1.)));
 if(moon<.061)c=mix(vec3(.09,.13,.25),vec3(.52,.65,.81),sqrt(max(0.,1.-pow(moon/.061,2.))));
 return c;
}
void main(){
 vec2 uv=(gl_FragCoord.xy*2.-resolution)/resolution.y;
 vec3 tint=arenaVariant<.5?vec3(.10,.72,.95):arenaVariant<1.5?vec3(.67,.23,1.):arenaVariant<2.5?vec3(.26,.49,1.):vec3(.05,1.,.62);
 vec3 accent=mix(tint,vec3(1.,.31,.095),boss*.78);
 vec3 fog=mix(vec3(.046,.11,.15),vec3(.14,.072,.053),boss);
 vec3 ro=vec3(0.,3.15,10.5),target=vec3(0.,1.5,-5.);
 vec3 f=normalize(target-ro),r=normalize(cross(f,vec3(0.,1.,0.))),u=cross(r,f);
 vec3 rd=normalize(f*1.55+r*uv.x+u*uv.y);
 float d=0.,id=0.;
 for(int i=0;i<88;i++){vec2 hit=scene(ro+rd*d);if(hit.x<max(.009,d*.0007)){id=hit.y;break;}d+=max(.015,hit.x*.66);if(d>55.)break;}
 vec3 col=cosmos(rd,accent);
 vec3 light=normalize(vec3(-.46,.82,.32));
 if(id>0.){
  vec3 p=ro+rd*d,n=normalAt(p);
  // Fine material normal detail, without adding costly geometry to each ray step.
  float bump=.035;
  vec3 bn=vec3(noise(p*22.+vec3(.25,0.,0.))-noise(p*22.-vec3(.25,0.,0.)),noise(p*22.+vec3(0.,.25,0.))-noise(p*22.-vec3(0.,.25,0.)),noise(p*22.+vec3(0.,0.,.25))-noise(p*22.-vec3(0.,0.,.25)));
  vec3 sn=normalize(n+bn*bump);
  float rough;vec3 emission;vec3 base=surface(p,n,id,accent,rough,emission);
  float oc=ao(p,n),sh=shadow(p+n*.045,light);
  float diffuse=max(dot(sn,light),0.);
  vec3 h=normalize(light-rd);
  float spec=pow(max(dot(sn,h),0.),mix(90.,9.,rough))*(1.-rough*.75);
  vec3 ambient=mix(vec3(.15,.21,.25),vec3(.42,.51,.53),sn.y*.5+.5);
  float reactor=1./(1.+.12*dot(p-vec3(0.,.1,-3.),p-vec3(0.,.1,-3.)));
  float edgeLight=exp(-abs(length(p.xz)-4.5)*2.2)*exp(-max(p.y,0.)*.85);
  col=base*(ambient*oc+vec3(.83,.93,1.)*diffuse*sh*1.2)+spec*sh*vec3(.66,.81,.88);
  col+=accent*(reactor*.25+edgeLight*.22)*oc+emission;
  float haze=1.-exp(-d*.012);
  col=mix(col,vec3(.025,.055,.10),haze);
 }
 // Atmospheric shafts and depth-varying drifting dust, kept behind combat UI.
 float shaft=pow(max(0.,sin(uv.x*4.8+uv.y*2.1+.8)),12.);
 col+=vec3(.24,.44,.8)*shaft*.015*max(0.,uv.y+.55);
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

export const ARENA_VARIANTS=Object.freeze(['orbital','nebula','jumpgate','cybergrid']);
// Shuffle without replacement, including no immediate repeat across bag boundaries.
export function createArenaPicker(random=Math.random){
 let bag=[],last=-1;
 return ()=>{
  if(!bag.length){
   bag=ARENA_VARIANTS.map((_,i)=>i);
   for(let i=bag.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]];}
   if(bag.at(-1)===last)[bag[0],bag[bag.length-1]]=[bag[bag.length-1],bag[0]];
  }
  last=bag.pop();return last;
 };
}
export const nextArena=createArenaPicker();
