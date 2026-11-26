import test from 'node:test';
import assert from 'node:assert/strict';
import {arenaResolution,fragmentSource,createArenaPicker,ARENA_VARIANTS} from '../src/components/battle/proceduralArenaShader.js';
test('procedural arena limits pixel cost and preserves aspect',()=>{
 assert.deepEqual(arenaResolution(320,160,2),[640,320]);
 assert.deepEqual(arenaResolution(1280,720,2),[1200,675]);
 assert.deepEqual(arenaResolution(0,0,1),[1,1]);
});
test('arena shader computes 3D signed distances without textures',()=>{
 assert.match(fragmentSource,/boxSDF/);
 assert.match(fragmentSource,/scene\(ro\+rd\*d\)/);
 assert.doesNotMatch(fragmentSource,/sampler2D|texture2D/);
});

test('detailed arena includes procedural materials, soft shadows and ambient occlusion',()=>{for(const name of ['fbm','shadow','ao','surface'])assert.match(fragmentSource,new RegExp('\\b'+name+'\\('));});

test('orbital stage has procedural astronomical sky and floating deck',()=>{assert.match(fragmentSource,/vec3 cosmos\(/);assert.match(fragmentSource,/Floating layered alloy deck/);assert.doesNotMatch(fragmentSource,/\b(?:rust|cliff|moss)\b/);});

test('shuffle picker covers all four stages before repeats and avoids consecutive duplicates',()=>{
 const pick=createArenaPicker(()=>.42);
 let previous=-1;
 for(let round=0;round<8;round++){
  const bag=new Set();
  for(let n=0;n<ARENA_VARIANTS.length;n++){
   const value=pick();assert.notEqual(value,previous);previous=value;bag.add(value);
  }
  assert.equal(bag.size,4);
 }
});
