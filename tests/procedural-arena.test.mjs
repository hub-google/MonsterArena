import test from 'node:test';
import assert from 'node:assert/strict';
import {arenaResolution,fragmentSource} from '../src/components/battle/proceduralArenaShader.js';
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

test('orbital stage has procedural astronomical sky and floating deck',()=>{assert.match(fragmentSource,/vec3 cosmos\(/);assert.match(fragmentSource,/Floating layered alloy deck/);assert.doesNotMatch(fragmentSource,/rust|cliff|moss/);});
