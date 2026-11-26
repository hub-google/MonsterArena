import test from 'node:test';
import assert from 'node:assert/strict';
import {arenaResolution,fragmentSource} from '../src/components/battle/proceduralArenaShader.js';
test('procedural arena limits pixel cost and preserves aspect',()=>{
 assert.deepEqual(arenaResolution(320,160,2),[400,200]);
 assert.deepEqual(arenaResolution(1280,720,2),[640,360]);
 assert.deepEqual(arenaResolution(0,0,1),[1,1]);
});
test('arena shader computes 3D signed distances without textures',()=>{
 assert.match(fragmentSource,/boxSDF/);
 assert.match(fragmentSource,/scene\(ro\+rd\*d\)/);
 assert.doesNotMatch(fragmentSource,/sampler2D|texture2D/);
});
