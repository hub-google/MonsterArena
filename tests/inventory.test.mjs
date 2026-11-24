import test from 'node:test';
import assert from 'node:assert/strict';
import {getItemQuantity} from '../src/utils/inventory.js';

test('inventory quantity keeps original value and returns zero for missing items',()=>{
  const inventory=[{item_id:'a',quantity:3},{item_id:'b',quantity:'2'},{item_id:'c',quantity:0}];
  assert.equal(getItemQuantity(inventory,'a'),3);
  assert.equal(getItemQuantity(inventory,'b'),'2');
  assert.equal(getItemQuantity(inventory,'c'),0);
  assert.equal(getItemQuantity(inventory,'missing'),0);
  assert.equal(getItemQuantity([],'a'),0);
});
