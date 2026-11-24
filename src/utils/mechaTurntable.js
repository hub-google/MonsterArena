// A solid, depth-tested voxel reconstruction of the canonical 128px sprite.
// Authored front/side pixels are retained; hidden surfaces are inferred, not mirrored billboards.
export const TURN_PERIOD=12000;
export const VOXEL_STEP=3;
const RAMP=[[.06,.09,.16],[.22,.08,.14],[.65,.16,.19],[.94,.35,.25],[1,.76,.55]];
export function redTint(rgb){
 const l=(rgb[0]*.299+rgb[1]*.587+rgb[2]*.114)/255*4;
 const i=Math.min(3,Math.floor(l)),t=l-i;
 return RAMP[i].map((v,j)=>Math.round(255*(v+(RAMP[i+1][j]-v)*t)));
}
export function buildTurnMesh(grid,vehicle=false){
 const n=Math.ceil(128/VOXEL_STEP),cells=Array.from({length:n},()=>Array(n).fill(null));
 let minX=n,maxX=0,minY=n,maxY=0;
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){
  const count=new Map();
  for(let dy=0;dy<VOXEL_STEP;dy++)for(let dx=0;dx<VOXEL_STEP;dx++){
   const c=grid[y*VOXEL_STEP+dy]?.[x*VOXEL_STEP+dx];if(c)count.set(c,(count.get(c)||0)+1);
  }
  if(!count.size)continue;
  const [color]=[...count].sort((a,b)=>b[1]-a[1])[0];
  cells[y][x]={color};minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
 }
 if(minX>maxX)return new Float32Array();
 const cx=(minX+maxX+1)/2,cy=(minY+maxY+1)/2,w=maxX-minX+1,h=maxY-minY+1;
 // An independent volume for each occupied pixel column, with tapered shoulders/wheels.
 for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){
  const cell=cells[y][x];if(!cell)continue;
  const u=Math.abs((x+.5-cx)/(w/2)),v=(y-minY+.5)/h;
  const thickness=vehicle?(v>.62?.36:v<.23?.19:.31):v<.23?.27:v<.52?.30:v<.72?.23:.18;
  cell.d=Math.max(1,Math.round((vehicle?w:h)*thickness*(1-.35*u)/2));
 }
 const out=[],colorCache=new Map();
 const rgb=c=>{if(!colorCache.has(c))colorCache.set(c,[1,3,5].map(i=>parseInt(c.slice(i,i+2),16)/255));return colorCache.get(c)};
 const scale=2/Math.max(w,h)*.71;
 const vertex=(p,c,shade)=>{out.push((p[0]-cx)*scale,(cy-p[1])*scale,p[2]*scale,c[0]*shade,c[1]*shade,c[2]*shade)};
 function quad(a,b,c,d,col,shade){for(const p of [a,b,c,a,c,d])vertex(p,col,shade)}
 for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){
  const cell=cells[y][x];if(!cell)continue;
  const d=cell.d,c=rgb(cell.color),X=x+1,Y=y+1;
  quad([x,y,d],[X,y,d],[X,Y,d],[x,Y,d],c,1);
  // Rear plates have a separate darker finish, without a duplicate glowing face.
  const lum=(c[0]+c[1]+c[2])/3;
  const rear=vehicle?c:lum>.72?[c[0]*.52,c[1]*.52,c[2]*.52]:c;
  quad([x,y,-d],[x,Y,-d],[X,Y,-d],[X,y,-d],rear,vehicle?.88:.74);
  const sides=[
   [cells[y][x-1],(a,b)=>[[x,y,a],[x,Y,a],[x,Y,b],[x,y,b]],.72],
   [cells[y][x+1],(a,b)=>[[X,y,a],[X,y,b],[X,Y,b],[X,Y,a]],.84],
   [cells[y-1]?.[x],(a,b)=>[[x,y,a],[x,y,b],[X,y,b],[X,y,a]],1.08],
   [cells[y+1]?.[x],(a,b)=>[[x,Y,a],[X,Y,a],[X,Y,b],[x,Y,b]],.60]
  ];
  for(const [neighbor,points,shade] of sides){
   const nd=neighbor?.d||0;if(nd>=d)continue;
   if(!nd)quad(...points(-d,d),c,shade);
   else {quad(...points(nd,d),c,shade);quad(...points(-d,-nd),c,shade);}
  }
 }
 return new Float32Array(out);
}
export function turnAngle(ms,vehicle=false){return (vehicle?Math.PI/5:0)+ms/TURN_PERIOD*Math.PI*2;}
