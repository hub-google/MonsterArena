import test from 'node:test';
import assert from 'node:assert/strict';
import {initialDuel,resolveRound,timingGrade,chooseEnemy,MAX_ROUNDS} from '../src/utils/tacticalDuel.js';
test('perfect block protects and counters, ordinary reduces, miss takes full damage',()=>{
 const s=initialDuel();
 assert.deepEqual(resolveRound(s,'guard','perfect','attack','good').hp,[100,75]);
 assert.deepEqual(resolveRound(s,'guard','good','attack','good').hp,[92,100]);
 assert.deepEqual(resolveRound(s,'guard','miss','attack','good').hp,[80,100]);
 assert.equal(resolveRound(s,'guard','perfect','attack','good').energy[0],2);
});
test('attack interrupts heavy, heavy defeats guard, energy cost enforced',()=>{
 const s={...initialDuel(),energy:[2,2]};
 assert.deepEqual(resolveRound(s,'attack','good','break').hp,[100,80]);
 assert.deepEqual(resolveRound(s,'break','good','guard','perfect').hp,[100,65]);
 assert.equal(resolveRound(s,'break','good','guard').energy[0],0);
 const fresh=initialDuel();assert.equal(resolveRound(fresh,'break'),fresh);
});
test('charge heals, perfect attack and ultimate reward skill without random damage',()=>{
 const s={...initialDuel(),hp:[70,100],energy:[3,1]};
 const c=resolveRound(s,'charge','good','charge');
 assert.deepEqual(c.hp,[80,100]);assert.equal(c.energy[0],5);
 const u=resolveRound(c,'attack','perfect','charge');
 assert.equal(u.hp[1],40);assert.equal(u.energy[0],0);
 assert.equal(timingGrade(.5),'perfect');assert.equal(timingGrade(.3),'good');assert.equal(timingGrade(.9),'miss');
});
test('AI is deterministic and affordable; duel terminates at cap and cannot advance',()=>{
 let s=initialDuel();
 for(let i=0;i<MAX_ROUNDS&&!s.result;i++){const a=chooseEnemy(s);assert.equal(a,chooseEnemy(s));assert.ok(a!=='break'||s.energy[1]>=2);s=resolveRound(s,'charge');}
 assert.ok(s.result);assert.equal(resolveRound(s,'attack'),s);
});

import {initialBossDuel,resolveBossRound,bossHint,balancedFighter,BOSS_STATS} from '../src/utils/tacticalDuel.js';
test('ultimate boss is beatable through the advertised eight-turn strategy',()=>{
 let s=initialBossDuel({life_stage:6});
 for(const move of ['attack','attack','guard','special','attack','guard','special','attack'])s=resolveBossRound(s,move);
 assert.equal(s.result,'win');
 assert.equal(s.hp[0],134);
 assert.equal(s.hp[1],0);
 assert.equal(s.history.length,8);
});
test('mindless attack loses and guard has a real strategic effect',()=>{
 let s=initialBossDuel({life_stage:6});
 while(!s.result)s=resolveBossRound(s,'attack');
 assert.equal(s.result,'loss');
 s=initialBossDuel({life_stage:6});
 assert.equal(resolveBossRound(s,'special'),s);
 s=resolveBossRound(resolveBossRound(s,'attack'),'attack');
 assert.match(bossHint(s),/重擊/);
 s=resolveBossRound(s,'guard');
 assert.equal(s.phase,'stunned');
 assert.equal(s.hp[0],168);
 assert.equal(s.hp[1],198);
});
test('legacy stats cannot exceed 125% of stage base and fights never mutate monster',()=>{
 const m=Object.freeze({life_stage:5,combat_hp:1725,combat_atk:2000,combat_def:200,combat_spd:200});
 assert.deepEqual(balancedFighter(m),{hp:250,atk:50,def:37,spd:37});
 assert.equal(initialBossDuel(m).hp[1],BOSS_STATS.hp);
 assert.equal(m.combat_hp,1725);
});
