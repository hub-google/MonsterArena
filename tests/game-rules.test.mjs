import test from 'node:test';
import assert from 'node:assert/strict';
import { getHatchState, EGG_PRICE, MAX_MONSTERS } from '../src/utils/gameRules.js';

const alive = { is_dead: false };
const dead = { is_dead: true };

test('unfunded empty account receives one rescue egg', () => {
  assert.deepEqual(getHatchState({ gold: 0 }, []), {
    available: true, isRescue: true, label: '免費領取救援數位蛋',
  });
});
test('funded empty account pays normal hatch price', () => {
  assert.equal(EGG_PRICE, 100);
  assert.deepEqual(getHatchState({ gold: 100 }, []), {
    available: true, isRescue: false, label: '孵化新怪獸蛋 (-100G)',
  });
});
test('unfunded account with an alive monster cannot farm rescue eggs', () => {
  assert.equal(getHatchState({ gold: 99 }, [alive]).available, false);
  assert.equal(getHatchState({ gold: 99 }, [alive]).isRescue, false);
});
test('all-dead account can recover even when it has zero gold', () => {
  assert.equal(getHatchState({ gold: 0 }, [dead, dead]).available, true);
  assert.equal(getHatchState({ gold: 0 }, [dead, dead]).isRescue, true);
});
test('warehouse capacity prevents hatching regardless of gold or death', () => {
  assert.equal(MAX_MONSTERS, 50);
  assert.equal(getHatchState({ gold: 10000 }, Array(50).fill(alive)).available, false);
  assert.equal(getHatchState({ gold: 0 }, Array(50).fill(dead)).available, false);
});
