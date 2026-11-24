import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';
import {SKINS,ownsSkin,appearance,hasDisguise,appearanceMode,nextAppearanceMode} from '../src/utils/skins.js';
test('ten affordable permanent cosmetics',()=>{assert.equal(SKINS.length,10);assert.equal(new Set(SKINS.map(s=>s.id)).size,10);assert.equal(Math.min(...SKINS.map(s=>s.price)),50);assert.equal(Math.max(...SKINS.map(s=>s.price)),300);for(const s of SKINS){assert.equal(ownsSkin([{item_id:s.id,quantity:1}],s.id),true);assert.equal(ownsSkin([{item_id:s.id,quantity:0}],s.id),false);}});
test('vehicle independent of disguise and dead/egg forms stay canonical',()=>{const m={life_stage:4,skin_id:'skin_husky',combat_atk:22};assert.deepEqual(appearance(m),{vehicle:false,skin:'skin_husky'});assert.deepEqual(appearance(m,'vehicle'),{vehicle:true,skin:null});assert.equal(hasDisguise(m),true);assert.equal(hasDisguise({...m,is_dead:true},'vehicle'),false);assert.equal(hasDisguise({...m,life_stage:1},'vehicle'),false);assert.equal(m.combat_atk,22);});

test('three-form cycle never removes an equipped cosmetic',()=>{
 const m={life_stage:4,skin_id:'skin_husky'};
 assert.equal(nextAppearanceMode(m),'robot');
 assert.deepEqual(appearance(m,'robot'),{vehicle:false,skin:null});
 assert.equal(nextAppearanceMode(m,'robot'),'vehicle');
 assert.equal(nextAppearanceMode(m,'vehicle'),'skin');
 assert.equal(appearanceMode(m,'skin'),'skin');
 assert.equal(m.skin_id,'skin_husky');
 assert.equal(nextAppearanceMode({...m,life_stage:2}),'robot');
 assert.equal(nextAppearanceMode({...m,life_stage:2},'robot'),'skin');
 assert.equal(nextAppearanceMode({...m,life_stage:2,skin_id:null}),null);
 assert.equal(nextAppearanceMode({...m,is_dead:true}),null);
});

test('all ten approved skin PNGs retain exact source bytes, 128×128 RGBA and distinct IDs',()=>{
 const hashes={"skin_angel":"7e4f5c4c0c99352581cba4bd1b12a2d0524d2112","skin_demon":"57b5cfa354a8e4c54e28c05de55ab2da2b147339","skin_dino":"d3684f1fb55f91eec1a57903920a8e7cfad41aa8","skin_dragon":"04b3772587cdcea62b80e1a6827d73e85d787ac3","skin_flerken":"be5ec6cc47df5e18a58d5f7cb310afcfba2e965a","skin_fox":"72984cf6f2703b283517d00b01b391a4f82c823b","skin_ghost":"b4b8848fa8103439822ef1dd84e4de115279ca80","skin_husky":"cb711c8a3f0c7bc07bc568509f7a0d19f0e5a63d","skin_panda":"1f872585fd171f9050b64a2446f0d10d94705837","skin_slime":"f40321e66ad6afbadf881967ad6b4287ba1f4240"};
 for(const {id} of SKINS){
  const data=readFileSync(new URL('../public/skins/'+id+'.png',import.meta.url));
  assert.equal(data.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  assert.equal(data.readUInt32BE(16),128);assert.equal(data.readUInt32BE(20),128);
  assert.equal(data[24],8);assert.equal(data[25],6); // 8-bit RGBA
  assert.equal(createHash('sha1').update('blob '+data.length+'\0').update(data).digest('hex'),hashes[id]);
 }
});
