// Original indexed pixel art. 128 x 128 transparent canvas, integer pixels only.
import {getMecha} from './monsterSprites.js';
const OUT='#17233a', STEEL='#758ca5', WHITE='#e7edf4', DARK='#34445e', GLASS='#7de7fb', GOLD='#f3c657';
const PALETTES=[
 ['#f05248','#a12633','#ffad69','#ffc253'],['#82ac50','#3c633a','#c8e27b','#ffca5a'],
 ['#479fe4','#265b99','#9cddff','#ffd673'],['#ad83e8','#6646a7','#e2c4ff','#64f1d9'],
 ['#d7dfe9','#647a95','#ffffff','#f4554d'],['#c4a15c','#75603b','#f6d68a','#94bf52'],
 ['#63bce9','#2b699f','#c5f0ff','#f8aa52'],['#e7e4f5','#9a86bc','#ffffff','#9f74e5']
];
const cache=new Map(),viewportCache=new Map();
function raster(f,r,s,vehicle){
 const pixels=Array.from({length:128},()=>Array(128).fill(''));
 const idx=r===2?f+3:f-1, [C,L,H,A]=PALETTES[idx];
 const scale=vehicle?1:s===1?0.63:s===2?0.59:[0,0,0,0.76,0.86,0.94,1][s];
 const P=([x,y])=>[Math.round(64+(x*2-64)*scale),Math.round(120+(y*2-120)*scale)];
 const put=(x,y,c)=>{if(x>=0&&y>=0&&x<128&&y<128)pixels[y][x]=c;};
 function line(a,b,c,w=1){let [x,y]=a;const [xx,yy]=b,dx=Math.abs(xx-x),dy=-Math.abs(yy-y),sx=x<xx?1:-1,sy=y<yy?1:-1;let err=dx+dy;for(;;){for(let v=-w;v<=w;v++)for(let u=-w;u<=w;u++)put(x+u,y+v,c);if(x===xx&&y===yy)break;const e=err*2;if(e>=dy){err+=dy;x+=sx}if(e<=dx){err+=dx;y+=sy}}}
 function poly(coords,c,edge=true){const a=coords.map(P);const minY=Math.min(...a.map(p=>p[1])),maxY=Math.max(...a.map(p=>p[1]));for(let y=minY;y<=maxY;y++){const intersections=[];for(let i=0,j=a.length-1;i<a.length;j=i++){const [x1,y1]=a[j],[x2,y2]=a[i];if((y1<=y&&y2>y)||(y2<=y&&y1>y))intersections.push(x1+(y-y1)*(x2-x1)/(y2-y1));}intersections.sort((x,y)=>x-y);for(let i=0;i+1<intersections.length;i+=2)for(let x=Math.ceil(intersections[i]);x<=Math.floor(intersections[i+1]);x++)put(x,y,c)}if(edge)for(let i=0;i<a.length;i++)line(a[i],a[(i+1)%a.length],OUT,1)}
 const rect=(x,y,w,h,c,edge=true)=>poly([[x,y],[x+w,y],[x+w,y+h],[x,y+h]],c,edge);
 const oct=(x,y,w,h,c,edge=true)=>{const q=Math.max(1,Math.min(3,Math.floor(Math.min(w,h)/3)));poly([[x+q,y],[x+w-q,y],[x+w,y+q],[x+w,y+h-q],[x+w-q,y+h],[x+q,y+h],[x,y+h-q],[x,y+q]],c,edge);};
 const detail=(x,y,w,h,c)=>rect(x,y,w,h,c,false);
 const wheel=(x,y,w=12,h=12)=>{oct(x,y,w,h,OUT);oct(x+2,y+2,w-4,h-4,DARK);detail(x+4,y+4,w-8,h-8,STEEL)};
 const armor=(x,y,w,h)=>{oct(x,y,w,h,C);detail(x+2,y+2,w-4,2,H);detail(x+2,y+h-4,w-4,2,L)};
 const head=(x,y,w,h,kind=0)=>{oct(x,y,w,h,C);detail(x+3,y+2,w-6,2,H);poly([[x+2,y+5],[x+w-2,y+5],[x+w-4,y+h-3],[x+4,y+h-3]],DARK);detail(x+4,y+7,w-8,3,GLASS);if(kind===1)detail(x+w/2-1,y+7,2,3,OUT);detail(x+5,y+h-2,w-10,1,WHITE);};
 const feet=(x=18,y=47,wide=12)=>{armor(x,y,wide,10);armor(64-x-wide,y,wide,10);rect(x-2,y+8,wide+3,3,L);rect(63-x-wide,y+8,wide+3,3,L)};
 const core=(x,y)=>{oct(x,y,9,9,OUT);oct(x+2,y+2,5,5,A,false)};
 const wing=(side,y=18)=>{const flip=pts=>side===0?pts:pts.map(([x,Y])=>[64-x,Y]);poly(flip([[24,y+2],[9,y-8],[3,y-4],[10,y+23],[22,y+16]]),C);poly(flip([[12,y+1],[6,y-5],[11,y+14],[17,y+14]]),WHITE,false)};
 const track=(x,y,w,h)=>{oct(x,y,w,h,OUT);detail(x+2,y+2,w-4,h-4,DARK);for(let i=x+3;i<x+w-2;i+=5)detail(i,y+3,2,h-6,STEEL)};
 const gun=(x,y,w,h)=>{rect(x,y,w,h,DARK);detail(x+2,y+1,w-4,2,STEEL);rect(x-2,y-1,4,h+2,OUT);};
 if(s===1){poly([[32,12],[49,23],[49,44],[32,55],[15,44],[15,23]],C);poly([[32,12],[49,23],[32,34],[15,23]],H);poly([[32,34],[49,23],[49,44],[32,55]],L);core(27,31);detail(20,27,4,3,A);detail(41,29,4,3,A);if(f===2)rect(17,42,30,4,STEEL);if(f===3)poly([[16,30],[5,39],[17,41]],WHITE);if(f===4){oct(8,27,6,12,A);oct(50,27,6,12,A)}return pixels;}
 if(s===2){feet(19,43,10);armor(20,29,24,18);armor(11,31,10,15);armor(43,31,10,15);head(19,12,26,19,1);core(28,33);if(f===1){wheel(10,35,8,8);wheel(46,35,8,8)}if(f===2){rect(10,27,9,12,L);rect(45,27,9,12,L)}if(f===3){wing(0,22);wing(1,22);head(20,12,24,18,1)}if(f===4){oct(12,29,9,9,A);oct(43,29,9,9,A);detail(27,13,10,3,A)}return pixels;}
 if(vehicle){
 // Reuse exactly the robot's palette, contours, and component shapes.
 if(f===1&&r===1){
   rect(44,20,16,4,C);rect(51,24,4,7,DARK);detail(45,21,13,1,H);
   poly([[3,37],[9,30],[22,29],[29,19],[44,19],[51,28],[60,32],[60,46],[4,46]],C);
   poly([[25,29],[30,22],[42,22],[47,29]],DARK);poly([[28,27],[32,23],[41,23],[44,27]],GLASS,false);
   poly([[5,37],[14,32],[22,32],[21,37],[8,40]],H,false);poly([[48,30],[58,34],[56,38],[48,36]],H,false);
   rect(4,40,56,6,L);rect(3,43,8,5,DARK);rect(53,43,8,5,DARK);detail(5,37,7,2,WHITE);detail(55,36,4,2,A);
   armor(22,31,20,11);core(28,32);wheel(8,38,14,14);wheel(44,38,14,14);detail(24,45,16,2,STEEL);
 }
 if(f===1&&r===2){
   wheel(5,36,20,20);wheel(39,36,20,20);
   poly([[13,43],[27,34],[39,32],[49,44],[40,47],[26,48]],DARK);
   poly([[12,35],[18,26],[25,24],[30,32],[24,40]],WHITE);poly([[42,29],[49,31],[56,39],[40,39],[36,34]],C);
   armor(24,29,17,14);core(28,32);poly([[30,27],[34,17],[40,14],[45,20],[40,26]],C);
   poly([[35,18],[40,16],[43,20],[39,23],[34,22]],GLASS);rect(27,23,8,3,DARK);
   poly([[9,32],[12,28],[20,28],[23,32],[22,36],[8,36]],C);detail(11,30,7,2,H);
   poly([[42,31],[50,29],[57,34],[59,39],[54,40],[49,35],[42,35]],C);detail(48,31,4,2,H);detail(55,34,3,2,WHITE);
   rect(28,44,13,4,STEEL);detail(31,45,7,1,L);
 }
 if(f===2&&r===1){
   track(4,39,56,15);armor(5,28,54,16);
   poly([[5,30],[11,19],[25,19],[31,25],[50,25],[59,31],[58,40],[5,40]],C);
   poly([[12,21],[23,21],[28,27],[10,27]],DARK);detail(13,23,10,3,GLASS);
   armor(33,19,20,10);rect(35,17,15,3,STEEL);rect(55,28,5,10,L);
   armor(9,31,15,10);armor(40,31,15,10);core(27,32);detail(7,29,4,2,WHITE);detail(55,30,3,2,A);
   detail(7,43,50,2,L);for(const x of [10,20,30,40,50])detail(x,47,3,3,STEEL);
 }
 if(f===2&&r===2){
   track(4,39,56,15);armor(5,31,54,13);armor(18,20,34,16);
   poly([[20,21],[26,16],[44,16],[51,22],[48,29],[21,29]],C);detail(27,18,16,2,H);
   gun(3,20,27,7);gun(15,13,20,5);armor(43,12,12,13);gun(36,8,22,5);
   armor(7,32,13,10);armor(42,32,15,10);core(28,32);detail(21,42,21,2,L);detail(54,30,3,2,WHITE);
   for(const x of [9,19,29,39,49])detail(x,46,3,4,STEEL);
 }
 if(f===3&&r===1){
   const flip=pts=>pts.map(([x,y])=>[64-x,y]);
   for(const side of [0,1]){const F=pts=>side?flip(pts):pts;
    poly(F([[26,23],[13,27],[4,39],[4,48],[15,45],[27,39]]),C);
    poly(F([[23,29],[13,32],[7,40],[11,42],[22,37]]),WHITE,false);
    poly(F([[7,44],[14,43],[23,38],[24,41],[16,47],[7,49]]),L,false);
    poly(F([[17,40],[10,54],[20,52],[28,47],[27,40]]),C);poly(F([[18,43],[14,51],[20,49],[24,44]]),H,false);
   }
   armor(20,36,10,15);armor(34,36,10,15);rect(21,50,8,6,DARK);rect(35,50,8,6,DARK);detail(23,53,4,2,A);detail(37,53,4,2,A);
   poly([[32,5],[37,15],[41,29],[39,43],[36,48],[28,48],[25,43],[23,29],[27,15]],C);
   poly([[32,9],[36,20],[36,28],[32,32],[28,28],[28,20]],DARK);poly([[32,12],[34,21],[34,27],[32,29],[30,27],[30,21]],GLASS,false);
   poly([[27,32],[32,35],[37,32],[36,40],[32,44],[28,40]],H,false);core(28,37);
   rect(11,34,4,10,DARK);rect(49,34,4,10,DARK);detail(12,35,2,5,STEEL);detail(50,35,2,5,STEEL);
 }
 if(f===3&&r===2){
   poly([[37,27],[54,20],[58,20],[58,14],[61,14],[61,31],[57,32],[55,25],[45,34]],C);detail(47,25,8,2,H);
   rect(52,14,3,17,DARK);rect(47,20,13,3,STEEL);oct(51,19,5,5,C);
   rect(29,13,6,9,STEEL);rect(6,11,52,3,DARK);detail(8,12,21,1,STEEL);detail(35,12,21,1,STEEL);oct(28,9,8,7,C);
   poly([[5,30],[14,21],[37,21],[46,26],[49,36],[42,44],[16,44],[6,39]],C);
   poly([[8,31],[16,24],[29,24],[31,34],[10,34]],DARK);poly([[11,30],[17,26],[27,26],[28,32],[12,32]],GLASS,false);
   armor(31,24,13,11);detail(34,26,7,2,H);rect(16,35,22,6,L);core(28,33);
   armor(38,35,15,9);for(const x of [41,45,49])detail(x,38,2,3,A);gun(4,39,11,4);
   rect(15,44,4,6,STEEL);rect(39,44,4,6,STEEL);rect(9,50,40,3,DARK);detail(11,50,34,1,STEEL);
 }
 if(f===4&&r===1){
   poly([[11,23],[24,17],[40,17],[53,23],[61,32],[58,43],[43,50],[21,50],[6,43],[3,32]],C);
   poly([[4,34],[15,41],[49,41],[60,34],[58,42],[43,48],[21,48],[6,42]],L,false);
   for(const x of [9,45]){armor(x,25,10,14);detail(x+3,29,4,6,A)}
   oct(19,12,26,26,C);oct(23,16,18,18,DARK);oct(26,19,12,12,A);oct(29,22,6,6,GLASS);
   poly([[19,16],[11,11],[5,19],[8,34],[16,40],[18,35],[13,31],[12,22]],H);poly([[45,16],[53,11],[59,19],[56,34],[48,40],[46,35],[51,31],[52,22]],H);
   rect(23,40,18,5,DARK);for(const x of [12,26,34,48])detail(x,43,4,2,A);
   oct(25,48,14,6,L);detail(28,51,8,2,A);
 }
 if(f===4&&r===2){
   poly([[32,9],[40,15],[44,28],[58,36],[60,47],[50,51],[39,46],[25,46],[14,51],[4,47],[6,36],[20,28],[24,15]],C);
   poly([[6,39],[16,31],[24,30],[21,43],[11,47]],L,false);poly([[58,39],[48,31],[40,30],[43,43],[53,47]],L,false);
   armor(6,36,13,12);armor(45,36,13,12);for(const x of [6,45]){detail(x+5,38,3,8,A);detail(x+2,41,9,2,A)}
   poly([[32,13],[38,20],[39,27],[25,27],[26,20]],DARK);poly([[32,16],[35,21],[36,25],[28,25],[29,21]],GLASS,false);
   armor(23,28,18,16);detail(29,30,6,12,A);detail(25,34,14,4,A);rect(24,44,16,7,DARK);detail(27,47,3,3,A);detail(34,47,3,3,A);
   detail(7,49,9,2,WHITE);detail(48,49,9,2,WHITE);
 }
 return pixels;
 }
 // Eight silhouettes, independently authored rather than recoloring a template.
 if(f===1&&r===1){wheel(6,26,14,14);wheel(44,26,14,14);feet(17,45,13);armor(19,26,26,22);armor(7,29,13,19);armor(44,29,13,19);head(22,12,20,17,1);poly([[19,28],[32,35],[45,28],[40,43],[24,43]],C);core(28,30);if(s>=4){armor(3,40,16,13);armor(45,40,16,13)}if(s>=5){poly([[10,26],[5,15],[17,19],[23,30]],H);poly([[54,26],[59,15],[47,19],[41,30]],H)}if(s===6){gun(5,11,13,5);gun(46,11,13,5);}}
 if(f===1&&r===2){wheel(20,44,11,14);wheel(34,44,11,14);poly([[25,28],[39,28],[38,43],[34,47],[30,47],[26,43]],C);head(23,13,18,15,1);poly([[19,24],[10,14],[15,31],[22,36]],WHITE);poly([[45,24],[54,14],[49,31],[42,36]],WHITE);armor(14,31,8,12);armor(42,31,8,12);core(28,31);if(s>=4){poly([[14,37],[3,51],[8,54],[22,42]],H);poly([[50,37],[61,51],[56,54],[42,42]],H)}if(s>=5){poly([[27,16],[15,5],[20,20]],C);poly([[37,16],[49,5],[44,20]],C)}if(s===6){poly([[19,30],[6,20],[3,24],[14,38]],L);poly([[45,30],[58,20],[61,24],[50,38]],L);}}
 if(f===2&&r===1){feet(15,45,15);armor(17,22,30,27);armor(9,25,12,23);armor(43,25,12,23);head(22,11,20,15);core(28,31);if(s>=4){poly([[3,30],[18,26],[22,32],[20,50],[12,57],[3,50]],C);detail(7,33,3,15,H);poly([[61,30],[46,26],[42,32],[44,50],[52,57],[61,50]],C);detail(54,33,3,15,H)}if(s>=5){rect(11,16,12,8,L);rect(41,16,12,8,L)}if(s===6){armor(3,24,17,8);armor(44,24,17,8);rect(24,39,16,5,STEEL);}}
 if(f===2&&r===2){track(6,43,23,14);track(35,43,23,14);armor(18,32,28,15);armor(22,17,22,18);head(25,11,14,12);gun(7,28,21,8);armor(42,28,10,13);core(29,35);if(s>=4){gun(3,17,24,8)}if(s>=5){armor(40,12,14,17);gun(38,8,20,7)}if(s===6){gun(1,6,32,9);detail(25,44,14,3,A);}}
 if(f===3&&r===1){wing(0,20);wing(1,20);feet(20,45,10);poly([[24,25],[40,25],[44,34],[35,47],[29,47],[20,34]],C);head(23,10,18,17,1);armor(13,31,10,12);armor(41,31,10,12);gun(3,38,41,6);core(28,28);if(s>=4){poly([[22,16],[16,3],[25,9],[30,15]],H);poly([[42,16],[48,3],[39,9],[34,15]],H)}if(s>=5){gun(2,32,33,5);poly([[13,23],[4,10],[7,32]],L);poly([[51,23],[60,10],[57,32]],L)}if(s===6){detail(22,50,3,7,A);detail(39,50,3,7,A);}}
 if(f===3&&r===2){rect(4,12,24,3,DARK);rect(36,12,24,3,DARK);rect(14,14,3,10,STEEL);rect(47,14,3,10,STEEL);feet(18,45,13);armor(19,24,26,23);head(22,14,20,13);armor(5,24,17,19);armor(42,24,17,19);core(28,31);if(s>=4){for(const x of [8,45])for(let y=29;y<=36;y+=4)detail(x,y,8,2,A)}if(s>=5){oct(2,20,18,12,L);oct(44,20,18,12,L);detail(5,24,11,3,H);detail(48,24,11,3,H)}if(s===6){rect(2,7,27,3,STEEL);rect(35,7,27,3,STEEL);gun(5,42,14,5);gun(45,42,14,5);}}
 if(f===4&&r===1){oct(16,19,32,30,C);oct(22,24,20,20,DARK);oct(26,28,12,12,A);oct(29,31,6,6,GLASS);poly([[20,45],[14,55],[21,58],[28,48]],L);poly([[44,45],[50,55],[43,58],[36,48]],L);armor(6,30,12,12);armor(46,30,12,12);if(s>=4){poly([[16,22],[6,10],[1,26],[5,43],[16,48],[16,40],[9,36],[8,23]],H);poly([[48,22],[58,10],[63,26],[59,43],[48,48],[48,40],[55,36],[56,23]],H)}if(s>=5){rect(29,10,6,9,STEEL);oct(26,4,12,8,A)}if(s===6){oct(2,22,12,12,L);oct(50,22,12,12,L);detail(5,25,6,6,A);detail(53,25,6,6,A);}}
 if(f===4&&r===2){feet(21,47,9);oct(17,23,30,27,C);head(20,10,24,19);core(28,32);armor(5,28,13,12);armor(46,28,13,12);rect(8,39,5,11,STEEL);rect(51,39,5,11,STEEL);detail(28,33,8,3,A);detail(30,31,3,8,A);if(s>=4){poly([[20,34],[9,18],[4,20],[8,31],[17,42]],L);poly([[44,34],[55,18],[60,20],[56,31],[47,42]],L);oct(2,15,11,10,C);oct(51,15,11,10,C)}if(s>=5){oct(3,44,13,13,H);oct(48,44,13,13,H);detail(8,46,3,9,A);detail(5,49,9,3,A);detail(53,46,3,9,A);detail(50,49,9,3,A)}if(s===6){poly([[23,19],[17,4],[27,8],[31,17]],L);poly([[41,19],[47,4],[37,8],[33,17]],L);}}
 return pixels;
}
export function getSpriteGrid(family,stage,type,vehicle=false){const m=getMecha(family,stage,type);return raster(m.faction,m.type,m.stage,vehicle&&m.stage>=4);}
export function spritePaths(family,stage,type,vehicle=false){
 const m=getMecha(family,stage,type),key=m.key+(vehicle&&m.stage>=4?'_v':'');
 if(cache.has(key))return cache.get(key);
 const pix=raster(m.faction,m.type,m.stage,vehicle&&m.stage>=4), paths={};
 let left=128,top=128,right=0,bottom=0;
 for(let y=0;y<128;y++){for(let x=0;x<128;){const c=pix[y][x];let end=x+1;while(end<128&&pix[y][end]===c)end++;if(c){paths[c]=(paths[c]||'')+'M'+x+' '+y+'h'+(end-x)+'v1h-'+(end-x)+'z';left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,end);bottom=Math.max(bottom,y+1);}x=end;}}
 // Trim transparent margins only when the cockpit requests a fitted vehicle.
 const pad=6;viewportCache.set(key,[left-pad,top-pad,right-left+pad*2,bottom-top+pad*2].join(' '));
 const result=Object.entries(paths).map(([color,d])=>({color,d}));cache.set(key,result);return result;
}

export function spriteViewport(family,stage,type,vehicle=false){
 const m=getMecha(family,stage,type),key=m.key+(vehicle&&m.stage>=4?'_v':'');
 spritePaths(family,stage,type,vehicle);
 return viewportCache.get(key)||'0 0 128 128';
}
