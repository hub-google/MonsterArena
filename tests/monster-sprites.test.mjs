import test from 'node:test';
import assert from 'node:assert/strict';
import { MONSTER_SPRITES,getMonsterGrid } from '../src/utils/monsterSprites.js';
test('every compact sprite decodes to a valid 16x16 grid',()=>{
 assert.equal(Object.keys(MONSTER_SPRITES).length,100);
 for(const key of Object.keys(MONSTER_SPRITES)){
  const grid=getMonsterGrid(key);assert.equal(grid.length,16);
  for(const row of grid){assert.equal(row.length,16);assert.ok(row.every(x=>x===0||x===1));}
 }
});
