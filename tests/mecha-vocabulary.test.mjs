import test from 'node:test';import assert from 'node:assert/strict';import {SHOP_ITEMS,ITEM_BY_ID,presentGameMessage,BALANCED_SHOP_ITEMS} from '../src/utils/mechaVocabulary.js';
test('mechanical shop retains legacy IDs and prices',()=>{assert.deepEqual(SHOP_ITEMS.map(x=>x.price),[10,50,100,200,50,300,300,300,300,500,1000]);assert.equal(new Set(SHOP_ITEMS.map(x=>x.id)).size,11);assert.equal(ITEM_BY_ID.meat_basic.name,'標準電池');assert.equal(ITEM_BY_ID.vitamin.name,'效能增幅器');assert.ok(SHOP_ITEMS.every(x=>!/肉|藥|維他命|飽食|繁衍/.test(x.name+' '+x.description)));});

test('legacy server error is translated to mechanical terminology',()=>{assert.equal(presentGameMessage('怪獸太餓或生病，無法訓練'),'機體能源不足或系統故障，無法訓練');});

test('balanced shop is price-consistent and uses percentage chips',()=>{assert.deepEqual(BALANCED_SHOP_ITEMS.map(i=>i.price),[10,25,50,80,30,300,300,300,300,300,1000]);assert.ok(BALANCED_SHOP_ITEMS.filter(i=>i.id.startsWith('chip_')).every(i=>i.description.includes('5%')));});
