import test from 'node:test';
import assert from 'node:assert/strict';
import { getHatchState, canCareForMonster, canHealMonster, canManageMonsterChips, EGG_PRICE, MAX_MONSTERS } from '../src/utils/gameRules.js';

const alive = { is_dead: false };
const dead = { is_dead: true };

test('unfunded empty account receives one rescue egg', () => {
  assert.deepEqual(getHatchState({ gold: 0 }, []), {
    available: true, isRescue: true, label: '免費領取救援核心',
  });
});
test('funded empty account pays normal hatch price', () => {
  assert.equal(EGG_PRICE, 100);
  assert.deepEqual(getHatchState({ gold: 100 }, []), {
    available: true, isRescue: false, label: '啟動新機械核心 (-100G)',
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

test('dead pet can neither receive care nor change chips', () => {
  const deadSick = { is_dead: true, is_sick: true, life_stage: 6 };
  assert.equal(canCareForMonster(deadSick), false);
  assert.equal(canHealMonster(deadSick), false);
  assert.equal(canManageMonsterChips(deadSick), false);
});
test('live pet care reflects sickness and stage', () => {
  assert.equal(canCareForMonster({ is_dead: false, life_stage: 1 }), false);
  assert.equal(canCareForMonster({ is_dead: false, life_stage: 3 }), true);
  assert.equal(canHealMonster({ is_dead: false, is_sick: false }), false);
  assert.equal(canHealMonster({ is_dead: false, is_sick: true }), true);
  assert.equal(canManageMonsterChips({ is_dead: false }), true);
  assert.equal(canManageMonsterChips(null), false);
});

import { resourcesForAction } from '../src/utils/gameRules.js';
test('successful actions refresh only changed groups',()=>{
 const api={feed:()=>{},buyItem:()=>{},joinGuild:()=>{},rename:()=>{}};
 assert.deepEqual(resourcesForAction(api,api.feed),['profile','monsters','inventory']);
 assert.deepEqual(resourcesForAction(api,api.buyItem),['profile','inventory']);
 assert.deepEqual(resourcesForAction(api,api.joinGuild),['guilds']);
 assert.deepEqual(resourcesForAction(api,api.rename),['monsters']);
 assert.equal(resourcesForAction(api,()=>{}),undefined);
});

import { refreshAfterCommit, COMMITTED_REFRESH_WARNING, canBattleMonster, selectBattleMonster } from '../src/utils/gameRules.js';
test('failed refresh never changes the outcome of a committed transaction', async()=>{
 assert.equal(await refreshAfterCommit(async()=>{throw Error('offline')},['profile']),COMMITTED_REFRESH_WARNING);
 assert.equal(await refreshAfterCommit(async resources=>assert.deepEqual(resources,['inventory']),['inventory']),null);
});
test('arena and raid share the same eligibility and preferred fighter selection',()=>{
 const ready={monster_id:'a',life_stage:3}, other={monster_id:'b',life_stage:2};
 const blocked=[{...ready,is_dead:true},{...ready,is_frozen:true},{...ready,repair_until:'2026-11-24'},{...ready,life_stage:1}];
 for(const m of blocked)assert.equal(canBattleMonster(m),false);
 assert.equal(selectBattleMonster([...blocked,ready,other],'b'),other);
 assert.equal(selectBattleMonster([...blocked,ready,other],'missing'),ready);
 assert.equal(selectBattleMonster(blocked,'a'),null);
});

import { SHOP_CATALOG, QUEST_CATALOG, GUILD_SHOP, dailyQuestConfig } from '../src/utils/gameCatalog.js';
import { buildCatalogSql } from '../scripts/game-catalog-sql.mjs';
test('one catalog generates V2 SQL and client rewards with stable legacy prices',()=>{
 assert.equal(SHOP_CATALOG.length,21);
 assert.equal(new Set(SHOP_CATALOG.map(x=>x.id)).size,21);
 assert.equal(SHOP_CATALOG.filter(x=>x.cosmetic).length,10);
 assert.deepEqual(dailyQuestConfig(false).map(q=>q.reward),[100,50,150,150]);
 assert.deepEqual(dailyQuestConfig(true).map(q=>q.reward),[50,30,70,100]);
 const sql=buildCatalogSql();
 for(const x of SHOP_CATALOG)assert.ok(sql.includes("('"+x.id+"',"+x.price+","+x.itemType+","+x.cosmetic+")"));
 for(const x of QUEST_CATALOG)assert.ok(sql.includes("('"+x.id+"','"+x.key+"',"+x.target+","+x.reward+")"));
 for(const x of GUILD_SHOP)assert.ok(sql.includes("('"+x.id+"',"+x.price+","+x.itemType+")"));
});
