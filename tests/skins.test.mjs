import test from 'node:test';
import assert from 'node:assert/strict';
import {SKINS,ownsSkin,appearance,hasDisguise} from '../src/utils/skins.js';
test('ten affordable permanent cosmetics',()=>{assert.equal(SKINS.length,10);assert.equal(new Set(SKINS.map(s=>s.id)).size,10);assert.equal(Math.min(...SKINS.map(s=>s.price)),50);assert.equal(Math.max(...SKINS.map(s=>s.price)),300);for(const s of SKINS){assert.equal(ownsSkin([{item_id:s.id,quantity:1}],s.id),true);assert.equal(ownsSkin([{item_id:s.id,quantity:0}],s.id),false);}});
test('vehicle independent of disguise and dead/egg forms stay canonical',()=>{const m={life_stage:4,skin_id:'skin_husky',combat_atk:22};assert.deepEqual(appearance(m),{vehicle:false,skin:'skin_husky'});assert.deepEqual(appearance(m,true),{vehicle:true,skin:null});assert.equal(hasDisguise(m),true);assert.equal(hasDisguise({...m,is_dead:true},true),false);assert.equal(hasDisguise({...m,life_stage:1},true),false);assert.equal(m.combat_atk,22);});
