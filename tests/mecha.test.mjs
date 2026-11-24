import test from 'node:test';import assert from 'node:assert/strict';
import {FACTIONS,MONSTER_SPRITES,getMecha,factionOf,counterMultiplier} from '../src/utils/monsterSprites.js';
import {spritePaths} from '../src/utils/mechaArt.js';
test('40 stable sprites, 10 per faction, every legacy combination has a valid target',()=>{const all=Object.values(MONSTER_SPRITES);assert.equal(all.length,40);for(const f of FACTIONS)assert.equal(all.filter(m=>m.faction===f.id).length,10);for(let family=1;family<=8;family++)for(let stage=1;stage<=6;stage++)for(let type=0;type<=3;type++)assert.ok(MONSTER_SPRITES[getMecha(family,stage,type).key]);});
test('four faction cycle and neutral reverse, exactly one advantage each',()=>{for(const a of FACTIONS){assert.equal(FACTIONS.filter(b=>counterMultiplier(a.legacy,b.legacy)===1.2).length,1);assert.equal(counterMultiplier(a.legacy,a.legacy),1);assert.equal(counterMultiplier(a.legacy,FACTIONS[a.id%4].legacy),1.2)}assert.equal(factionOf(8),4)});
test('40 robot sprites and 24 transformations are valid and individually distinct',()=>{const all=Object.values(MONSTER_SPRITES), art=all.map(m=>JSON.stringify(spritePaths(m.family,m.stage,m.type)));assert.equal(new Set(art).size,40);assert.ok(art.every(x=>x.length>300));const forms=all.filter(m=>m.stage>=4).map(m=>JSON.stringify(spritePaths(m.family,m.stage,m.type,true)));assert.equal(forms.length,24);assert.equal(new Set(forms).size,8);});

// Each fitted vehicle viewport includes every nontransparent pixel, without changing its aspect ratio.
test('vehicle fit preserves all eight original raster silhouettes',async()=>{
 const {spriteViewport,getSpriteGrid}=await import('../src/utils/mechaArt.js');
 for(const family of [1,4,7,3])for(const type of [1,2]){
  const [x,y,w,h]=spriteViewport(family,5,type,true).split(' ').map(Number);
  assert.ok(w>0&&h>0);
  const pixels=getSpriteGrid(family,5,type,true);
  for(let yy=0;yy<128;yy++)for(let xx=0;xx<128;xx++)if(pixels[yy][xx])assert.ok(xx>=x&&xx+1<=x+w&&yy>=y&&yy+1<=y+h);
 }
});

test('redesigned vehicles use the original 128px indexed raster and matching faction palette',async()=>{
 const {getSpriteGrid}=await import('../src/utils/mechaArt.js');
 for(const faction of FACTIONS)for(const type of [1,2]){
  const robot=getSpriteGrid(faction.legacy,5,type,false),vehicle=getSpriteGrid(faction.legacy,5,type,true);
  assert.equal(vehicle.length,128);assert.ok(vehicle.every(row=>row.length===128));
  const robotColors=new Set(robot.flat().filter(Boolean)),vehicleColors=new Set(vehicle.flat().filter(Boolean));
  const shared=[...vehicleColors].filter(c=>robotColors.has(c));
  assert.ok(shared.length>=7);assert.ok(vehicleColors.size>=7);
  assert.ok(vehicle.flat().includes(''));assert.ok(vehicle.flat().filter(Boolean).length>2000);
 }
});

test('approved alternate forms remain pixel-identical and robot sprites match preview',async()=>{
 const {getSpriteGrid}=await import('../src/utils/mechaArt.js');
 const {createHash}=await import('node:crypto');
 const digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
 const robots=[],vehicles=[];
 for(const f of FACTIONS)for(const r of [1,2]){
  for(const stage of [3,4,5,6])robots.push(getSpriteGrid(f.legacy,stage,r,false));
  const v=getSpriteGrid(f.legacy,5,r,true);vehicles.push(v);
  for(const stage of [4,6])assert.deepEqual(getSpriteGrid(f.legacy,stage,r,true),v);
 }
 assert.equal(digest(vehicles),'ab36bfd1b17b254a50986e8af9cc40148bd30f3b980aec7c7364c51a728c3688');
 assert.equal(digest(robots),'849ca4b4dbf5926f11a05fe13f3be464824e275af5eb1508341975f2af540961');
});
