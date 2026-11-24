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
 // Bipedal robot bodies; alternate forms stay unchanged.
 const k=(f-1)*2+r-1;
 const [shoulder,waist,hip,shin,arm]=[[12,10,11,10,9],[11,8,9,7,6],[15,13,13,12,11],[14,12,12,11,10],[12,8,9,8,7],[15,11,11,10,9],[12,9,10,8,8],[13,10,10,9,8]][k];
 const mirror=pts=>pts.map(([x,y])=>[64-x,y]);
 const pair=(pts,c,edge=true)=>{poly(pts,c,edge);poly(mirror(pts),c,edge)};
 const both=(x,y,w,h,c)=>{detail(x,y,w,h,c);detail(64-x-w,y,w,h,c)};
 const twin=(x,y,w,h)=>{armor(x,y,w,h);armor(64-x-w,y,w,h)};
 if(k===0){wheel(5,18,13,13);wheel(46,18,13,13);if(s>=5){pair([[12,19],[8,10],[18,14],[23,21]],C);if(s===6){armor(8,8,9,13);armor(47,8,9,13)}}}
 if(k===1){wheel(13,43,11,11);wheel(40,43,11,11);if(s>=4)pair([[20,22],[9,13],[12,29],[19,34]],WHITE);if(s>=6)pair([[17,25],[6,17],[10,34]],L);}
 if(k===2){if(s>=4)twin(8,16,12,18);if(s>=5){armor(5,11,13,13);armor(46,11,13,13)}if(s===6)twin(2,22,13,14);}
 if(k===3){track(6,42,12,15);track(46,42,12,15);if(s>=4){armor(5,12,10,21);rect(6,5,8,14,DARK);detail(8,6,3,10,STEEL);rect(5,3,10,5,OUT)}if(s>=5){armor(48,14,10,18);rect(50,8,7,12,DARK);detail(52,9,3,9,STEEL);rect(49,5,9,5,OUT)}if(s===6){rect(2,10,5,15,DARK);detail(3,12,2,10,STEEL)}}
 if(k===4){pair([[19,24],[8,9],[5,14],[9,31],[20,37]],C);pair([[11,15],[8,13],[12,27],[17,30]],WHITE,false);if(s>=5)pair([[10,20],[2,14],[4,33],[11,39]],L);if(s===6)both(8,26,3,7,A);}
 if(k===5){pair([[18,24],[5,9],[3,12],[14,29]],DARK);pair([[14,21],[6,12],[7,16],[16,27]],STEEL,false);if(s>=4)twin(5,20,12,14);if(s>=6){pair([[9,22],[2,17],[2,23],[10,31]],C)}}
 if(k===6){pair([[19,23],[12,10],[5,15],[3,29],[9,39],[14,40],[14,35],[9,28],[12,20]],C);pair([[12,13],[7,17],[5,28],[9,34],[10,22]],H,false);if(s>=5){oct(2,23,10,10,L);oct(52,23,10,10,L);detail(5,26,4,4,A);detail(55,26,4,4,A)}if(s===6){oct(27,3,10,6,A)}}
 if(k===7){pair([[19,23],[8,12],[4,17],[9,30],[16,34]],C);pair([[10,15],[7,18],[11,25],[14,26]],H,false);if(s>=5){twin(4,17,12,14);both(8,20,3,8,A);both(6,23,7,2,A)}if(s===6)pair([[13,17],[6,7],[10,21]],L);}
 const lx=32-hip, sx=lx-1;
 pair([[lx,36],[30,36],[29,44],[lx-1,46],[lx-2,41]],DARK);
 pair([[lx+1,38],[29,38],[28,43],[lx,43]],C,false);
 pair([[sx-1,44],[sx+shin,44],[sx+shin+1,52],[sx+shin-1,56],[sx-2,56],[sx-3,52]],C);
 pair([[sx,46],[sx+shin-1,46],[sx+shin-2,49],[sx-1,49]],H,false);
 pair([[sx-1,53],[sx+shin,52],[sx+shin-1,56],[sx-2,56]],L,false);
 both(sx+1,50,Math.max(2,shin-3),2,DARK);
 pair([[sx-2,54],[sx+shin,54],[sx+shin+1,58],[sx-4,58],[sx-4,56]],DARK);
 pair([[sx-2,55],[sx+shin-1,55],[sx+shin-1,57],[sx-3,57]],C,false);
 both(sx-2,57,Math.max(3,shin),1,STEEL);
 if(s>=4){pair([[sx-1,44],[sx+shin-1,44],[sx+shin-1,48],[sx+1,48]],C);both(sx+1,45,Math.max(2,shin-3),1,H)}
 if(s>=5)both(sx+2,51,2,3,A);
 if(s===6){pair([[sx-3,49],[sx-5,53],[sx-4,57],[sx-1,55]],L);}
 oct(32-hip,33,hip*2,7,C);detail(28,36,8,2,L);rect(27,28,10,8,DARK);
 const ax=32-shoulder-arm+2;
 pair([[ax+3,23],[ax+arm+2,23],[ax+arm+3,31],[ax+2,33],[ax,29]],DARK);
 pair([[ax+2,30],[ax+arm,30],[ax+arm+1,35],[ax+arm-1,41],[ax+1,41],[ax-1,37]],C);
 pair([[ax+1,31],[ax+arm-1,31],[ax+arm-2,34],[ax,34]],H,false);
 both(ax+1,37,Math.max(2,arm-3),2,L);
 oct(ax+1,40,arm-1,6,DARK);oct(64-ax-arm,40,arm-1,6,DARK);both(ax+2,41,Math.max(2,arm-3),2,STEEL);
 if(k===0||k===4){poly([[32-shoulder,19],[32+shoulder,19],[32+waist,33],[32+5,35],[27,35],[32-waist,33]],C);pair([[32-shoulder+2,21],[31,25],[27,29],[32-waist+1,26]],H,false);pair([[32-waist,28],[31,31],[28,34],[32-waist+2,33]],L,false);}
 else if(k===2||k===3){armor(32-shoulder+1,19,(shoulder-1)*2,16);pair([[32-shoulder+3,23],[30,23],[28,27],[32-shoulder+3,27]],L,false);both(32-shoulder+3,28,6,2,STEEL);}
 else if(k===1){poly([[22,19],[42,19],[43,25],[38,33],[26,33],[21,25]],C);pair([[23,21],[30,22],[28,27],[24,26]],H,false);pair([[22,27],[28,30],[28,33],[25,32]],L,false);}
 else if(k===6){poly([[21,19],[43,19],[46,25],[40,33],[32,36],[24,33],[18,25]],C);oct(26,23,12,12,DARK);pair([[21,21],[25,23],[24,29],[20,26]],H,false);}
 else {oct(32-shoulder+1,19,(shoulder-1)*2,16,C);pair([[32-shoulder+3,22],[30,22],[29,26],[32-shoulder+3,27]],H,false);both(32-shoulder+3,29,5,2,L);}
 core(28,25);
 if(k===7){detail(30,25,3,9,A);detail(27,28,9,3,A)}
 const bx=32-shoulder-arm+1;
 if(k===0||k===4){pair([[bx,21],[bx+4,16],[32-shoulder+5,19],[32-shoulder+5,24],[bx+3,27],[bx,25]],C);pair([[bx+3,20],[bx+5,18],[32-shoulder+3,20],[32-shoulder+1,22]],H,false);}
 else if(k===1){pair([[bx,20],[bx+4,16],[32-shoulder+4,19],[32-shoulder+1,25],[bx+1,26]],WHITE);pair([[bx+2,21],[32-shoulder+2,20],[32-shoulder,23]],C,false);}
 else if(k===2||k===3||k===5){twin(bx,17,arm+5,11);both(bx+3,19,arm,2,H);if(s>=5)both(bx+2,24,arm,2,A);}
 else {pair([[bx,19],[bx+4,16],[32-shoulder+4,18],[32-shoulder+5,24],[bx+4,27],[bx,24]],C);pair([[bx+2,19],[bx+5,18],[32-shoulder+2,19],[32-shoulder,22]],H,false);}
 rect(28,16,8,5,DARK);
 const hw=k===2||k===3?16:k===1||k===4?12:14,hx=32-hw/2;
 oct(hx,7,hw,12,C);
 detail(hx+3,9,hw-6,2,H);
 poly([[hx+2,12],[hx+hw-2,12],[hx+hw-3,16],[hx+3,16]],DARK);
 detail(hx+3,13,Math.max(2,hw/2-4),2,GLASS);detail(34,13,Math.max(2,hw/2-4),2,GLASS);
 detail(29,17,6,1,WHITE);
 if(k===0){pair([[24,10],[23,5],[28,7],[28,11]],C);detail(31,8,2,3,H)}
 if(k===1){poly([[29,8],[32,3],[35,8],[32,11]],C);detail(31,9,2,2,A)}
 if(k===2){rect(23,8,3,9,L);rect(38,8,3,9,L);detail(29,9,6,1,STEEL)}
 if(k===3){rect(23,8,3,8,L);rect(38,8,3,8,L);detail(27,8,10,2,H)}
 if(k===4){pair([[26,10],[21,4],[27,6],[29,10]],C);detail(31,8,2,3,H)}
 if(k===5){oct(23,9,5,8,L);oct(36,9,5,8,L);detail(30,9,4,2,A)}
 if(k===6){poly([[28,8],[32,4],[36,8],[32,11]],A);detail(30,9,4,1,H)}
 if(k===7){detail(31,8,2,4,A);detail(29,9,6,2,A)}
 if(k===0&&s>=4){twin(4,31,10,10);both(7,34,4,2,H);if(s===6){both(7,38,4,2,A)}}
 if(k===1&&s>=4){pair([[14,33],[8,36],[9,48],[15,42]],C);pair([[10,37],[10,45],[13,40]],H,false);if(s>=5)both(11,35,3,2,A)}
 if(k===2&&s>=4){poly([[3,28],[15,26],[21,30],[20,43],[12,49],[3,43]],C);poly([[6,30],[14,29],[17,32],[15,35],[6,35]],H,false);poly([[6,42],[12,46],[17,42],[17,39],[6,39]],L,false);oct(9,34,6,6,DARK);detail(11,36,2,2,A);if(s===6){armor(48,31,12,12);detail(51,34,6,2,H)}}
 if(k===3){armor(2,30,12,11);rect(3,39,6,9,DARK);detail(5,40,2,6,STEEL);rect(2,46,8,4,OUT);if(s>=5)detail(5,34,6,2,H);if(s===6)both(10,30,3,4,A)}
 if(k===4&&s>=4){rect(6,22,5,21,DARK);detail(8,24,2,15,STEEL);rect(5,20,7,5,OUT);armor(6,35,8,9);if(s>=5){rect(6,11,5,11,DARK);detail(8,12,2,7,STEEL)}if(s===6)detail(7,29,3,3,A);}
 if(k===5&&s>=4){twin(4,25,13,10);for(const x of [7,11,49,53]){detail(x,27,2,2,A);detail(x,31,2,2,A)}if(s===6){both(5,35,8,2,STEEL)}}
 if(k===6&&s>=4){oct(7,31,9,9,L);oct(48,31,9,9,L);oct(9,33,5,5,A);oct(50,33,5,5,A);if(s===6)both(10,35,3,2,GLASS)}
 if(k===7&&s>=4){twin(6,31,12,11);both(11,33,3,7,A);both(8,36,9,2,A);if(s>=5){both(8,40,7,1,WHITE)}if(s===6){oct(7,44,7,5,GLASS);oct(50,44,7,5,GLASS)}}

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
