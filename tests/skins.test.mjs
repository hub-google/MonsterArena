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
