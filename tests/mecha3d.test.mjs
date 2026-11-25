import test from 'node:test';import assert from 'node:assert/strict';
import {createMechaModel,TURN_MS} from '../src/utils/mecha3d.js';
import {MONSTER_SPRITES} from '../src/utils/monsterSprites.js';
test('all 64 genuine meshes fit the rotating viewport for every angle',()=>{
 const models=Object.values(MONSTER_SPRITES);let count=0;
 assert.equal(TURN_MS,14000);
 for(const m of models)for(const vehicle of m.stage>=4?[false,true]:[false]){
   const mesh=createMechaModel(m.faction,m.stage,m.type,vehicle);assert.ok(mesh.length>=81&&mesh.length%27===0);assert.ok(mesh.every(Number.isFinite));
   const axes=[new Set(),new Set(),new Set()];
   for(let i=0;i<mesh.length;i+=9){const [x,y,z]=mesh.subarray(i,i+3);const rad=Math.hypot(x,z);assert.ok(rad<=.921,m.key+' x/z clipping');assert.ok(Math.abs(y)*Math.cos(.30)+rad*Math.sin(.30)+.038<=.919,m.key+' y clipping');axes[0].add(x);axes[1].add(y);axes[2].add(z);}
   assert.ok(axes.every(a=>a.size>3),m.key+' is not 3D');count++;
 }
 assert.equal(count,64);
});
