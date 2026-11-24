// Original indexed pixel art. 128 x 128 transparent canvas, integer pixels only.
import {getMecha} from './monsterSprites.js';
const OUT='#17233a', STEEL='#758ca5', WHITE='#e7edf4', DARK='#34445e', GLASS='#7de7fb', GOLD='#f3c657';
const PALETTES=[
 ['#f05248','#a12633','#ffad69','#ffc253'],['#82ac50','#3c633a','#c8e27b','#ffca5a'],
 ['#479fe4','#265b99','#9cddff','#ffd673'],['#ad83e8','#6646a7','#e2c4ff','#64f1d9'],
 ['#d7dfe9','#647a95','#ffffff','#f4554d'],['#c4a15c','#75603b','#f6d68a','#94bf52'],
 ['#63bce9','#2b699f','#c5f0ff','#f8aa52'],['#e7e4f5','#9a86bc','#ffffff','#9f74e5']
];
const cache=new Map();
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
  if(f===1&&r===1){wheel(8,39);wheel(43,39);poly([[4,37],[10,30],[22,28],[29,19],[46,19],[54,28],[60,32],[59,44],[5,44]],C);poly([[25,28],[31,21],[44,21],[50,28]],GLASS);detail(6,33,13,3,H);detail(50,32,7,4,WHITE);detail(19,39,23,2,L);wheel(8,38);wheel(44,38);}
  if(f===1&&r===2){wheel(8,39,17,16);wheel(40,39,17,16);poly([[13,37],[24,29],[29,20],[40,23],[48,37],[37,45],[24,42]],C);poly([[29,20],[36,15],[43,17],[41,23]],GLASS);gun(8,28,14,4);detail(27,32,12,3,H);wheel(8,39,17,16);wheel(40,39,17,16);}
  if(f===2&&r===1){track(6,39,52,13);armor(7,26,48,17);poly([[14,26],[21,16],[42,16],[51,26]],C);rect(23,20,18,5,GLASS);rect(6,29,6,12,STEEL);detail(15,35,32,3,H);}
  if(f===2&&r===2){track(4,40,56,14);armor(6,31,52,12);armor(21,21,29,15);gun(3,23,31,7);detail(32,23,12,3,H);}
  if(f===3&&r===1){poly([[32,5],[41,25],[60,43],[46,46],[37,38],[37,55],[27,55],[27,38],[17,46],[4,43],[23,25]],C);poly([[32,10],[36,22],[32,31],[28,22]],GLASS);poly([[32,35],[39,47],[32,51],[25,47]],WHITE);detail(29,52,6,4,GOLD);}
  if(f===3&&r===2){rect(10,12,44,3,DARK);rect(29,9,6,8,STEEL);poly([[13,27],[26,19],[43,19],[53,27],[51,42],[26,47],[12,41]],C);poly([[15,29],[27,23],[40,23],[42,34],[20,35]],GLASS);rect(42,36,17,6,L);rect(19,48,28,3,OUT);rect(23,43,3,6,STEEL);rect(42,43,3,6,STEEL);}
  if(f===4&&r===1){oct(3,30,58,16,C);oct(19,16,26,20,GLASS);oct(9,34,46,8,L);for(let i=12;i<55;i+=10)detail(i,36,4,3,A);}
  if(f===4&&r===2){poly([[6,32],[18,20],[45,20],[58,31],[58,44],[43,51],[13,49],[5,43]],C);poly([[16,23],[28,23],[25,33],[10,34]],GLASS);rect(33,26,14,15,WHITE);detail(38,28,4,11,A);detail(34,32,12,3,A);oct(8,41,12,9,L);oct(44,41,12,9,L);}
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
 for(let y=0;y<128;y++){for(let x=0;x<128;){const c=pix[y][x];let end=x+1;while(end<128&&pix[y][end]===c)end++;if(c)paths[c]=(paths[c]||'')+'M'+x+' '+y+'h'+(end-x)+'v1h-'+(end-x)+'z';x=end;}}
 const result=Object.entries(paths).map(([color,d])=>({color,d}));cache.set(key,result);return result;
}
