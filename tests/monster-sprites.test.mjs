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
