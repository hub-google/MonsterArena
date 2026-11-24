// Solid, original low-poly mecha geometry. No image-based extrusion or texture cards.
export const TURN_MS=14000;
const PALETTE=[['#f04b43','#a52a36','#ff9a67','#ffd16a'],['#8cbd55','#466b3e','#c7e68b','#ffd16a'],['#439de5','#285c98','#96d9ff','#ffd16a'],['#ad82ea','#60409d','#d9bfff','#73e6db']];
const DARK='#273750',JOINT='#465a71',METAL='#91a8be',WHITE='#e2ecf5',GLASS='#78e2f4';
const rgb=s=>[1,3,5].map(i=>parseInt(s.slice(i,i+2),16)/255);
function builder(){
 const data=[];
 function face(p,c){const u=p[1].map((x,i)=>x-p[0][i]),v=p[2].map((x,i)=>x-p[0][i]);let n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];const l=Math.hypot(...n)||1;n=n.map(x=>x/l);for(let i=1;i<p.length-1;i++)for(const q of [p[0],p[i],p[i+1]])data.push(...q,...n,...rgb(c));}
 function box(x,y,z,w,h,d,c,o={}){
  const {top=w,bottom=w,topD=d,bottomD=d,bevel=.26,rx=0,ry=0,rz=0}=o;
  function ring(W,D,Y){let X=W/2,Z=D/2,b=Math.min(X,Z)*bevel;return [[-X+b,Y,Z],[X-b,Y,Z],[X,Y,Z-b],[X,Y,-Z+b],[X-b,Y,-Z],[-X+b,Y,-Z],[-X,Y,-Z+b],[-X,Y,Z-b]];}
  const transform=([u,v,w])=>{let q=u*Math.cos(rz)-v*Math.sin(rz),r=u*Math.sin(rz)+v*Math.cos(rz);u=q;v=r;q=v*Math.cos(rx)-w*Math.sin(rx);r=v*Math.sin(rx)+w*Math.cos(rx);v=q;w=r;q=u*Math.cos(ry)+w*Math.sin(ry);r=-u*Math.sin(ry)+w*Math.cos(ry);return [q+x,v+y,r+z];};
  const inset=Math.min(h,w,d)*.15;
  const layers=[ring(bottom*.87,bottomD*.87,-h/2),ring(bottom,bottomD,-h/2+inset),ring(top,topD,h/2-inset),ring(top*.87,topD*.87,h/2)].map(layer=>layer.map(transform));
  for(let l=0;l<3;l++)for(let i=0;i<8;i++){const j=(i+1)%8;face([layers[l][i],layers[l][j],layers[l+1][j],layers[l+1][i]],c);}
  face(layers[3],c);face([...layers[0]].reverse(),c);
 }
 function cylinder(x,y,z,r,len,c,axis='x',sides=10){const ring=t=>Array.from({length:sides},(_,i)=>{const q=i*2*Math.PI/sides,u=r*Math.cos(q),v=r*Math.sin(q);return axis==='x'?[x+t,y+u,z+v]:axis==='y'?[x+v,y+t,z+u]:[x+u,y+v,z+t]});const a=ring(-len/2),b=ring(len/2);for(let i=0;i<sides;i++){let j=(i+1)%sides;face([a[i],a[j],b[j],b[i]],c)}face([...a].reverse(),c);face(b,c);}
 function wing(p,c){const [a,b,d]=p,e=a.map((x,i)=>x+(i===1?.075:0)),f=b.map((x,i)=>x+(i===1?.075:0)),g=d.map((x,i)=>x+(i===1?.075:0));face([a,b,d],c);face([g,f,e],c);face([a,e,f,b],c);face([b,f,g,d],c);face([d,g,e,a],c);}
 function finish(stage){let lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];for(let i=0;i<data.length;i+=9)for(let j=0;j<3;j++){lo[j]=Math.min(lo[j],data[i+j]);hi[j]=Math.max(hi[j],data[i+j]);}const center=lo.map((v,i)=>(v+hi[i])/2),scale=(stage===1?1.15:stage===2?1.36:1.66)/Math.max(...hi.map((v,i)=>v-lo[i]));for(let i=0;i<data.length;i+=9)for(let j=0;j<3;j++)data[i+j]=(data[i+j]-center[j])*scale;return new Float32Array(data);}
 return {box,cylinder,wing,finish};
}
export function createMechaModel(faction,stage,role,vehicle=false){
 const f=Number(faction),s=Number(stage),r=Number(role)||1,final=s===6;
 const {box:b,cylinder:t,wing:w,finish}=builder();let [C,S,H,A]=PALETTE[f-1];
 // Keep the individually commissioned final forms recognizable. Gale units retain red armor.
 if(final&&f===2&&r===1)[C,S,H,A]=['#4679b9','#294674','#92b8ea','#ebc05e'];
 if(final&&f===2&&r===2)[C,S,H,A]=['#354d87','#243452','#6889c7','#ffb841'];
 if(final&&f===3&&r===1)[C,S,H,A]=['#cf4d45','#8b293b','#f18a69','#f0bd57'];
 if(final&&f===3&&r===2)[C,S,H,A]=['#385c50','#273b38','#75a58b','#dbb962'];
 if(final&&f===4&&r===1)[C,S,H,A]=['#447abb','#294979','#90bce8','#efc35f'];
 if(final&&f===4&&r===2)[C,S,H,A]=['#606177','#39394c','#9291a4','#c8a15e'];
 const light=(x,y,z,W=.12)=>b(x,y,z,W,.065,.04,GLASS);
 const nozzle=(x,y,z,R=.13)=>{t(x,y,z,R,.22,DARK,'z');t(x,y,z-.125,R*.68,.045,A,'z');};
 const wheel=(x,y,z,R=.22)=>{t(x,y,z,R,.16,DARK,'x',14);t(x+Math.sign(x)*.088,y,z,R*.57,.028,METAL,'x',12);t(x+Math.sign(x)*.108,y,z,R*.25,.02,A,'x',8);};
 const fin=(k,y,z,L=.7)=>w([[k*.16,y,z],[k*L,y+.22,z-.28],[k*.24,y-.16,z-.48]],C);
 if(s===1){b(0,0,0,.82,.82,.82,C,{bevel:.52});b(0,.39,0,.58,.13,.58,H,{bevel:.50});b(0,-.38,0,.60,.16,.60,S,{bevel:.50});for(let i=0;i<4;i++){const a=i*Math.PI/2,x=Math.sin(a)*.42,z=Math.cos(a)*.42;b(x,0,z,.32,.34,.08,DARK,{ry:a});b(x*1.09,0,z*1.09,.18,.19,.04,A,{ry:a});}return finish(s);}
 if(s===2){b(0,0,0,.72,.57,.54,C,{top:.65});b(0,.46,.02,.78,.44,.59,C,{top:.66});b(0,.46,.32,.56,.20,.05,DARK);light(0,.47,.36,.43);b(0,.04,.29,.29,.24,.07,DARK);b(0,.04,.34,.15,.15,.04,A);for(const k of [-1,1]){b(k*.48,-.03,0,.24,.36,.34,C);b(k*.23,-.39,.08,.27,.16,.46,DARK);b(k*.22,.01,-.32,.18,.26,.13,S);nozzle(k*.22,-.05,-.41,.09);}b(0,.24,-.33,.44,.33,.12,S);return finish(s);}
 if(!vehicle){
  const slim=r===2,wide=r===1&&(f===1||f===2),q=s-3,W=wide?.79:slim?.55:.67,leg=slim?.23:.30,arm=slim?.23:.30;
  b(0,.18,0,W,.60,.46,C,{top:W*1.12,bottom:W*.67,topD:.48,bottomD:.33});b(0,.18,.27,W*.70,.34,.11,S,{top:W*.8,bottom:W*.49});b(0,.26,.34,.24,.25,.07,DARK,{bevel:.48});b(0,.26,.39,.15,.15,.035,A,{bevel:.50});
  b(0,-.18,0,W*.68,.19,.35,JOINT);b(0,-.34,0,W*.76,.19,.37,C);b(0,-.34,.21,.20,.12,.045,H);
  for(const k of [-1,1]){
   const x=k*(W*.32+.03),ax=k*(W/2+arm*.63);
   b(x,-.59,.01,leg,.34,.29,S);b(x,-.59,.17,leg*.80,.21,.10,C);b(x,-.80,0,leg*.76,.13,.25,JOINT);
   b(x,-1.02,0,leg*(1+.08*q),.35,.35,C,{top:leg*.86,bottom:leg*1.14});b(x,-.98,.20,leg*.68,.22,.08,H);b(x,-1.17,.12,leg*1.24,.17,.51,DARK);b(x,-1.15,.30,leg*1.03,.11,.20,C);b(x,-1.02,-.20,leg*.68,.20,.10,S);
   b(ax,.32,0,arm*(1.22+.11*q),.29+.035*q,.41,C,{top:arm*(1.43+.08*q),bottom:arm*.90});b(ax,.39,.24,arm*.93,.10,.07,H);
   b(ax,.06,0,arm*.72,.26,.25,JOINT);b(ax,-.19,.02,arm*(1+.05*q),.32,.35,C,{top:arm*.80,bottom:arm*1.08});b(ax,-.18,.21,arm*.70,.13,.08,S);b(ax,-.41,.02,arm*.75,.17,.24,METAL);
   if(s>=4){b(k*(W/2+.13),.48,-.06,arm*1.25,.15,.43,H,{rz:-k*.26});b(x,-.84,.21,leg*.85,.13,.11,C);}
   if(s>=5){b(k*W*.32,.13,-.31,.21,.44,.28,S);nozzle(k*W*.32,-.08,-.47,.10);}
   if(f===1){if(slim){b(ax,.03,-.21,.17,.38,.22,S);if(s>=4)fin(k,.52,-.11,.68+.04*q);}else{wheel(ax,.38,-.24,.15+.025*q);}}
   if(f===2&&r===2&&s>=4){b(ax,.58,-.13,.19,.50,.24,DARK);b(ax,.67,.03,.15,.17,.48,S);b(ax,.67,.31,.14,.14,.09,METAL);}
   if(f===2&&r===1&&s>=4){b(ax,-.16,.26,.36,.48,.12,C,{top:.36,bottom:.23});b(ax,-.13,.34,.23,.30,.045,S);}
   if(f===3){fin(k,.36,-.23,.73+.11*q);nozzle(k*.28,.14,-.39,.13);}
   if(f===4&&s>=4){b(ax,.28,-.21,.26,.34,.23,S);b(ax,.29,-.35,.15,.15,.06,A);}
  }
  b(0,.56,0,.21,.13,.24,JOINT);const hw=slim?.32:.39;b(0,.77,.03,hw,.33,.33,C,{top:hw*.85,bottom:hw*.83});b(0,.78,.215,hw*.84,.14,.055,DARK);light(-hw*.19,.79,.25,hw*.29);light(hw*.19,.79,.25,hw*.29);b(0,.665,.22,hw*.48,.075,.06,METAL);b(0,.79,-.16,hw*.75,.18,.08,S);b(0,.92,.06,.12,.14,.16,H);
  b(0,.20,-.26,W*.59,.40,.12,S);b(0,.25,-.33,W*.33,.18,.045,H);for(const k of [-1,1])b(k*W*.18,.05,-.34,.10,.10,.055,METAL);
  if(final){for(const k of [-1,1]){b(k*.15,.96,0,.07,.28,.14,A,{rz:-k*.40});b(k*.27,.33,.30,.13,.17,.08,A);b(k*(W/2+.12),.54,.07,.25,.15,.36,C,{rz:-k*.34});b(k*(W/2+.16),.57,.20,.18,.06,.11,A,{rz:-k*.34});b(k*(W*.32+.03),-.94,.23,leg*.50,.17,.075,A);b(k*.15,.13,-.33,.13,.24,.14,JOINT);nozzle(k*.15,-.03,-.44,.085);}b(0,.24,-.39,.16,.21,.06,H);if(f===2&&r===2){b(.63,-.24,.06,.14,.84,.15,METAL,{rz:.23});b(.66,-.13,.10,.10,.50,.05,A,{rz:.23});b(-.55,-.18,.17,.18,.55,.16,C);b(-.55,-.12,.27,.13,.31,.06,H);for(const k of [-1,1]){fin(k,.49,-.23,.77);b(k*.40,.54,-.11,.14,.33,.18,A,{rz:-k*.45});}}if(f===4&&r===2)for(const k of [-1,1])fin(k,.36,-.35,.94);}
  return finish(s);
 }
 // Vehicle geometry uses +z as the nose. Side and rear are modeled individually.
 if(f===1&&r===2&&!final){
  for(const z of [-.63,.64]){t(0,-.24,z,.32,.18,DARK,'x',14);for(const k of [-1,1]){t(k*.10,-.24,z,.19,.03,METAL,'x',12);t(k*.12,-.24,z,.08,.025,A);}}
  b(0,-.01,-.06,.31,.25,.88,JOINT,{rx:-.09});b(0,.13,.11,.43,.32,.49,C,{top:.32,bottom:.44});b(0,.16,-.36,.34,.13,.37,DARK);b(0,.36,.49,.32,.24,.24,C,{rx:.23});b(0,.39,.64,.21,.105,.065,WHITE);b(0,.49,.43,.25,.11,.14,GLASS,{rx:.32});
  for(const k of [-1,1]){b(k*.15,.03,.55,.08,.61,.08,METAL,{rx:-.30});b(k*.18,-.08,-.29,.12,.13,.61,S);b(k*.25,.47,.38,.24,.065,.08,DARK);b(k*.19,.08,.03,.12,.22,.41,H);}
  b(0,.11,-.70,.19,.075,.06,A);b(0,-.01,.58,.31,.10,.45,C);if(s===5){b(0,.24,-.50,.33,.17,.29,S);for(const k of [-1,1])b(k*.22,.14,-.42,.14,.15,.35,C);}return finish(s);
 }
 if(f===2&&r===2&&!final){for(const k of [-1,1]){b(k*.48,-.25,0,.26,.38,1.51,DARK,{bevel:.60});for(const z of [-.55,-.25,.05,.35,.60])t(k*.62,-.25,z,.125,.04,METAL);}b(0,-.02,0,.94,.31,1.44,C,{top:.78,bottom:.94});b(0,.22,-.06,.66,.28,.73,S,{top:.52,bottom:.66});b(0,.27,.57,.19,.19,.91,JOINT);b(0,.27,1.03,.24,.23,.12,METAL);b(0,.43,-.12,.26,.08,.25,A);if(s===5)b(.22,.38,-.25,.15,.14,.46,H);return finish(s);}
 if(f===1||f===2&&r===1){
  const truck=final&&f===1&&r===1,police=final&&!truck,carrier=f===2&&!final,W=truck?.86:carrier?.9:.80,L=truck?1.68:1.52;
  b(0,-.10,0,W,.24,L,C,{top:W*.96,bottom:W*.90,bevel:.28});b(0,-.25,0,W*.84,.13,L*.94,DARK);
  const cz=truck?.28:carrier?.14:-.10;b(0,.14,cz,W*.73,truck?.47:.30,.66,C,{top:W*.60,bottom:W*.76,topD:.42,bottomD:.65});
  b(0,truck?.23:.19,cz+.32,W*.56,.20,.055,DARK,{rx:-.24});b(0,truck?.24:.20,cz+.36,W*.48,.15,.035,GLASS,{rx:-.24});
  for(const k of [-1,1]){b(k*W*.37,.16,cz,.06,.17,.42,GLASS);b(k*W*.48,-.02,0,.09,.13,.59,S);b(k*W*.34,-.06,L*.48,.17,.11,.065,WHITE);b(k*W*.34,-.06,-L*.50,.14,.09,.055,'#ff664d');wheel(k*W*.53,-.24,L*.29,truck?.25:.21);wheel(k*W*.53,-.24,-L*.32,truck?.25:.21);if(truck)wheel(k*W*.53,-.24,-L*.08,.23);}
  b(0,-.09,L*.51,W*.48,.15,.07,DARK);for(const k of [-1,0,1])b(k*.11,-.09,L*.56,.036,.10,.035,METAL);b(0,-.23,L*.53,W*.87,.10,.08,METAL);
  if(truck||carrier){b(0,.11,-.45,W*.85,.43,.69,C);for(const k of [-1,1]){b(k*W*.47,.12,-.45,.065,.28,.57,S);b(k*W*.30,.37,-.44,.15,.10,.56,H);}}
  else{b(0,.065,-L*.42,W*.86,.08,.23,S);for(const k of [-1,1])b(k*.27,.17,-L*.42,.065,.21,.09,DARK);b(0,.27,-L*.44,W*.93,.09,.22,C);}
  if(police||truck){b(-.15,.36+(truck?.12:0),cz,.24,.08,.11,'#f04b45');b(.15,.36+(truck?.12:0),cz,.24,.08,.11,GLASS);}
  if(final&&f===1&&r===2)for(const k of [-1,1]){b(k*.30,.13,-.49,.13,.19,.28,A,{rz:k*.25});b(k*.25,-.01,.61,.07,.12,.27,A);}if(s===5)for(const k of [-1,1])b(k*.31,.08,-.30,.14,.16,.41,H);
  return finish(s);
 }
 if(final&&(f===2&&r===2||f===4)){ // dinosaur: independent skull, jaw, neck, thighs, articulated tail and claws
  b(0,.12,-.13,.59,.48,.84,C,{top:.45,bottom:.62});b(0,.34,.23,.37,.52,.42,S,{rx:-.32});b(0,.57,.57,.45,.34,.47,C);b(0,.45,.80,.41,.13,.29,DARK);b(0,.38,.80,.34,.11,.28,METAL);
  for(const k of [-1,1]){b(k*.22,.59,.74,.05,.09,.10,A);b(k*.27,-.16,-.26,.28,.43,.34,C,{rz:k*.15});b(k*.34,-.43,.02,.25,.28,.29,S);b(k*.35,-.57,.18,.31,.15,.41,C);for(const dx of [-.08,0,.08])b(k*.35+dx,-.59,.41,.06,.07,.17,A);b(k*.25,.15,.41,.13,.24,.19,C,{rx:-.45});b(k*.26,.05,.55,.11,.12,.25,METAL);b(k*.17,.75,.56,.11,.28,.13,A,{rz:k*.33});}
  for(let i=0;i<4;i++)b(0,.12-i*.045,-.67-i*.20,.34-i*.064,.30-i*.05,.28,S,{rx:-.25});for(const z of [-.43,-.15,.10])b(0,.40,z,.12,.16,.14,A,{rx:.15});for(const k of [-1,1]){b(k*.29,.13,-.12,.10,.29,.51,H);b(k*.37,-.25,-.20,.075,.24,.28,S);b(k*.38,-.43,.02,.07,.15,.17,A);for(const z of [.68,.76,.84])b(k*.15,.415,z,.055,.055,.045,WHITE);b(k*.22,.64,.61,.08,.07,.14,S);}b(0,.61,.82,.28,.10,.16,H);return finish(s);
 }
 if(f===3&&final){ // solid winged dragon
  b(0,.04,0,.40,.34,.87,C,{top:.29});b(0,.28,.34,.27,.44,.34,S,{rx:-.30});b(0,.43,.56,.29,.24,.39,C);b(0,.36,.79,.22,.12,.24,A);
  for(const k of [-1,1]){b(k*.15,.44,.68,.045,.075,.09,A);b(k*.15,.58,.48,.08,.23,.12,H,{rz:k*.30});b(k*.20,-.15,-.24,.18,.34,.20,C);b(k*.21,-.34,-.10,.18,.12,.32,A);w([[k*.16,.12,.19],[k*1.02,.35,-.30],[k*.43,-.04,-.64]],A);b(k*.57,.22,-.10,.10,.08,.82,C,{ry:k*.77});b(k*.40,.09,-.42,.08,.09,.57,C,{ry:k*.60});}for(let i=0;i<4;i++)b(0,.04,-.52-i*.19,.23-i*.045,.20-i*.035,.25,S,{rx:.12});return finish(s);
 }
 if(f===3){
  if(r===1){b(0,0,0,.36,.26,1.50,C,{bevel:.5});b(0,.13,.27,.27,.18,.47,GLASS,{top:.19});for(const k of [-1,1]){w([[k*.15,0,.35],[k*.88,0,-.35],[k*.17,0,-.55]],C);b(k*.23,.02,-.58,.24,.22,.40,S);nozzle(k*.23,.03,-.81,.10);b(k*.18,.19,-.55,.08,.39,.27,H,{rz:-k*.26});if(s===5)b(k*.55,-.08,-.20,.13,.13,.49,METAL);}b(0,-.03,.78,.20,.16,.26,H);}
  else{b(0,.04,.11,.49,.39,.79,C,{top:.38});b(0,.14,.46,.36,.24,.23,GLASS);b(0,.09,-.55,.18,.20,.87,S,{rx:-.12});b(0,.23,-.94,.08,.38,.19,H);t(0,.34,.02,.12,.23,METAL,'y');b(0,.48,.02,1.68,.065,.13,DARK);b(0,.48,.02,.13,.065,1.68,METAL);for(const k of [-1,1]){b(k*.30,-.27,.05,.07,.07,.95,DARK);b(k*.22,-.15,.23,.08,.29,.08,METAL,{rz:k*.32});b(k*.22,-.15,-.22,.08,.29,.08,METAL,{rz:k*.32});if(s===5)b(k*.40,-.04,.05,.15,.15,.52,S);}t(.08,.23,-.96,.24,.055,DARK,'x',6);}return finish(s);
 }
 if(r===1){t(0,0,0,.84,.22,S,'y',16);t(0,.14,0,.73,.12,C,'y',16);t(0,.29,0,.36,.24,GLASS,'y',12);t(0,-.15,0,.39,.17,DARK,'y',12);for(let i=0;i<8;i++){const a=i*Math.PI/4;b(Math.sin(a)*.70,-.02,Math.cos(a)*.70,.14,.10,.07,A,{ry:a});if(s===5)b(Math.sin(a)*.52,.18,Math.cos(a)*.52,.14,.10,.08,H,{ry:a});}}
 else{b(0,.04,.05,.45,.29,1.25,C,{top:.36});b(0,.21,.31,.31,.19,.39,GLASS);for(const k of [-1,1]){b(k*.48,0,-.12,.37,.25,.94,S,{ry:k*.12});b(k*.48,.15,.07,.20,.075,.34,H);nozzle(k*.48,0,-.64,.13);b(k*.48,.10,.22,.16,.075,.07,A);if(s===5)b(k*.68,.08,-.17,.18,.20,.41,C);}b(0,-.15,.05,.28,.15,.57,DARK);}
 return finish(s);
}
export const VERTEX_SHADER=`attribute vec3 p;attribute vec3 n;attribute vec3 c;uniform float angle;uniform float bob;varying vec3 color;vec3 turn(vec3 v){float a=cos(angle),b=sin(angle);return vec3(v.x*a+v.z*b,v.y,-v.x*b+v.z*a);}vec3 tilt(vec3 v){float a=.30;return vec3(v.x,v.y*cos(a)-v.z*sin(a),v.y*sin(a)+v.z*cos(a));}void main(){vec3 q=tilt(turn(p));vec3 normal=normalize(tilt(turn(n)));float l=.58+.40*abs(dot(normal,normalize(vec3(-.45,.75,.63))));float rim=.08*abs(normal.z);color=clamp(c*(l+rim),0.,1.);gl_Position=vec4(q.x,q.y+bob,-q.z*.55,1.);}`;
const FRAGMENT_SHADER=`precision mediump float;varying vec3 color;void main(){gl_FragColor=vec4(color,1.);}`;
export function createRenderer(canvas,mesh){const gl=canvas.getContext('webgl',{alpha:true,antialias:false,premultipliedAlpha:false});if(!gl)throw Error('WebGL unavailable');function sh(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}const v=sh(gl.VERTEX_SHADER,VERTEX_SHADER),f=sh(gl.FRAGMENT_SHADER,FRAGMENT_SHADER),p=gl.createProgram();gl.attachShader(p,v);gl.attachShader(p,f);gl.linkProgram(p);gl.deleteShader(v);gl.deleteShader(f);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));gl.useProgram(p);const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,mesh,gl.STATIC_DRAW);for(const [name,offset] of [['p',0],['n',12],['c',24]]){const l=gl.getAttribLocation(p,name);gl.enableVertexAttribArray(l);gl.vertexAttribPointer(l,3,gl.FLOAT,false,36,offset);}const angle=gl.getUniformLocation(p,'angle'),bob=gl.getUniformLocation(p,'bob');gl.enable(gl.DEPTH_TEST);gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(0,0,0,0);return {draw(a,y=0){gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.uniform1f(angle,a);gl.uniform1f(bob,y);gl.drawArrays(gl.TRIANGLES,0,mesh.length/9);},dispose(){gl.deleteBuffer(b);gl.deleteProgram(p);}};}
