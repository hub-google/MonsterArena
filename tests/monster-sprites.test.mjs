import test from 'node:test';
import assert from 'node:assert/strict';
import { MONSTER_SPRITES,FACTIONS } from '../src/utils/monsterSprites.js';
import { getSpriteGrid } from '../src/utils/mechaArt.js';
test('all 40 indexed color sprites have exactly 128 by 128 pixels with transparent background',()=>{
 for(const m of Object.values(MONSTER_SPRITES)){
  const grid=getSpriteGrid(m.family,m.stage,m.type);
  assert.equal(grid.length,128);
  for(const row of grid){assert.equal(row.length,128);assert.ok(row.every(c=>c===''||/^#[0-9a-f]{6}$/i.test(c)));}
  const colors=new Set(grid.flat());assert.ok(colors.has(''));assert.ok(colors.size>=4);
 }
});
test('eight terminal silhouettes are distinct without color',()=>{
 const masks=FACTIONS.flatMap(f=>[1,2].map(role=>getSpriteGrid(f.legacy,6,role).map(row=>row.map(c=>c?'1':'0').join('')).join('')));
 assert.equal(new Set(masks).size,8);
 for(let i=0;i<4;i++){let diff=0,union=0;for(let j=0;j<masks[2*i].length;j++){const a=masks[2*i][j],b=masks[2*i+1][j];if(a==='1'||b==='1')union++;if(a!==b)diff++;}assert.ok(diff/union>0.15,'same faction needs different outlines');}
});

import {createMechaModel,TURN_MS} from '../src/utils/mecha3d.js';
test('all 64 catalog forms have independently modelled three-dimensional volume',()=>{
 const shapes=new Set();let count=0;
 for(const m of Object.values(MONSTER_SPRITES))for(const vehicle of m.stage>=4?[false,true]:[false]){
  const data=createMechaModel(m.faction,m.stage,m.type,vehicle);assert.ok(data.length>0&&data.length%27===0&&data.every(Number.isFinite));
  for(let j=0;j<3;j++){let min=Infinity,max=-Infinity;for(let i=j;i<data.length;i+=9){min=Math.min(min,data[i]);max=Math.max(max,data[i]);}assert.ok(max-min>.12);}
  shapes.add(data.length+':'+Array.from(data.slice(0,180)).join(','));count++;
 }
 assert.equal(count,64);assert.ok(shapes.size>40);assert.equal(TURN_MS,14000);
});
