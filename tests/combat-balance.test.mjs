import test from 'node:test';
import assert from 'node:assert/strict';
import {STAGE_ROLE_STATS,autoBattle,affinityAdvantage,FIXED_ENCOUNTERS,initialBossDuel,resolveBossRound,unitStats} from '../src/utils/tacticalDuel.js';
const rngFor=seed=>()=>((seed=Math.imul(seed,1664525)+1013904223|0)>>>0)/4294967296;
const families=[1,1,4,4,7,7,3,3];
const unit=(stage,role)=>({life_stage:stage,family:families[role-1],type:(role-1)%2+1,training_hp:0,training_atk:0,training_def:0,training_spd:0});
test('each class has strengths; all 28 matchups per stage run 10000 trials',()=>{
 for(const stage of [3,4,5,6]){
  const profiles=STAGE_ROLE_STATS[stage],wins=Array(8).fill(0),counters=[],neutral=[];
  for(let a=1;a<=8;a++)for(let b=a+1;b<=8;b++){
   const rng=rngFor(234789+((a-1)*8+b-1)*101);let w=0;
   for(let n=0;n<10000;n++)w+=Number(autoBattle(profiles[a],profiles[b],a,b,rng).won);
   const rate=w/10000;wins[a-1]+=w;wins[b-1]+=10000-w;
   if(affinityAdvantage(a,b))counters.push(rate);else if(affinityAdvantage(b,a))counters.push(1-rate);else neutral.push(rate);
  }
  const overall=wins.map(v=>v/70000),adv=counters.reduce((a,b)=>a+b,0)/counters.length;
  assert.ok(overall.every(x=>x>=.45&&x<=.55),'stage '+stage+' '+JSON.stringify(overall));
  assert.ok(counters.every(x=>x>.50),'a counter cannot be a disadvantage '+stage+' '+JSON.stringify(counters));
  assert.ok(adv>=.60&&adv<=.70,'counter average '+adv);
  assert.ok(neutral.every(x=>x>=.40&&x<=.62),'non-affinity matchup outlier '+stage+' '+JSON.stringify(neutral));
  console.log('stage',stage,'class win%',overall.map(x=>(100*x).toFixed(1)).join(','),'affinity average%',(100*adv).toFixed(1),'counter range',Math.min(...counters),Math.max(...counters));
 }
});
test('fixed encounters have achievable difficulty for their recommended stage',()=>{
 for(const [id,name,hp,atk,def,spd,reward,stage,role] of FIXED_ENCOUNTERS.filter(x=>x[0]!=='boss')){
  let rates=[];
  for(let a=stage===2?0:1;a<STAGE_ROLE_STATS[stage].length;a++){
   let w=0;const rng=rngFor(89345+a*30+role);
   for(let n=0;n<10000;n++)w+=Number(autoBattle(STAGE_ROLE_STATS[stage][a],[hp,atk,def,spd],a,role,rng).won);
   rates.push(w/10000);
  }
  const avg=rates.reduce((a,b)=>a+b,0)/rates.length;
  assert.ok(stage===2?avg>=.90:avg>=.70&&avg<=.85,id+' average '+avg);
  console.log(name,'average win%',(avg*100).toFixed(1),'individual range',Math.min(...rates),Math.max(...rates));
 }
});
test('every ultimate class can use tactics to beat boss; mindless attack loses',()=>{
 for(let role=1;role<=8;role++){
  let s=initialBossDuel(unit(6,role)),plain=initialBossDuel(unit(6,role));
  while(!s.result)s=resolveBossRound(s,s.phase==='heavy'?'guard':s.phase==='stunned'&&s.energy[0]>=2?'special':'attack');
  while(!plain.result)plain=resolveBossRound(plain,'attack');
  assert.equal(s.result,'win','role '+role);assert.equal(plain.result,'loss','role '+role);
 }
});
test('growth is monotonic; legacy values, skin and generation cannot inflate combat',()=>{
 for(let role=1;role<=8;role++){
  const m=unit(5,role),a=unitStats(m);
  assert.deepEqual(unitStats({...m,combat_hp:50000,combat_atk:20000,generation:100,skin_id:'skin_husky'}),a);
  const enhanced=unitStats({...m,chip_slot_1:'chip_atk',chip_slot_1_val:200});
  assert.deepEqual(enhanced,unitStats({...m,chip_slot_1:'chip_atk',chip_slot_1_val:5}));
  for(let stage=3;stage<6;stage++)assert.ok(STAGE_ROLE_STATS[stage][role].every((v,i)=>v<=STAGE_ROLE_STATS[stage+1][role][i]));
 }
});