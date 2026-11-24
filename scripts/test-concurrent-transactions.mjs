import assert from 'node:assert/strict';
import {spawn,execFileSync} from 'node:child_process';
import {namespaceSql} from './preview-namespace.mjs';
// Real independent PostgreSQL sessions; test-only DB, never a live project.
const container=process.env.PG_CONTAINER;
if(!container)throw Error('PG_CONTAINER is required');
const args=['exec','-i',container,'psql','-X','-qAt','-U','postgres','-d','arena_test','-v','ON_ERROR_STOP=1'];
const sql=s=>namespaceSql(s);
const db=s=>execFileSync('docker',args,{input:sql(s),encoding:'utf8',timeout:30000}).trim();
const quote=s=>"'"+String(s).replaceAll("'","''")+"'";
const u=i=>'55555555-5555-4555-8555-'+String(i).padStart(12,'0');
const pet=i=>'66666666-6666-4666-8666-'+String(i).padStart(12,'0');
const request=i=>'77777777-7777-4777-8777-'+String(i).padStart(12,'0');
const action=(name,data={})=>'SELECT public.game_action('+quote(name)+','+quote(JSON.stringify(data))+'::jsonb);';
const run=(i,s)=>new Promise((resolve,reject)=>{
 const p=spawn('docker',args,{stdio:['pipe','pipe','pipe']});
 let out='',err='';p.stdout.on('data',d=>out+=d);p.stderr.on('data',d=>err+=d);
 const timeout=setTimeout(()=>{p.kill();reject(Error('parallel SQL timed out'));},30000);
 p.on('error',reject);p.on('close',code=>{clearTimeout(timeout);resolve({code,out,err});});
 p.stdin.end(sql("SET statement_timeout='20s'; SET ROLE authenticated; SET request.jwt.claim.sub="+quote(u(i))+"; "+s));
});
function accepted(r){assert.equal(r.code,0,r.err);return JSON.parse(r.out.trim().split('\n').at(-1));}
function rejected(r,pattern){assert.notEqual(r.code,0);assert.match(r.err,pattern);assert.doesNotMatch(r.err,/deadlock detected|statement timeout/i);}
function num(s){return Number(db(s));}
for(let i=1;i<=8;i++){
 db("INSERT INTO auth.users(id,email) VALUES("+quote(u(i))+","+quote('parallel-'+i+'@example.invalid')+"); INSERT INTO public.users(user_id,username,email,gold,stamina,max_stamina) VALUES("+quote(u(i))+","+quote('Parallel'+i)+","+quote('parallel-'+i+'@example.invalid')+",2000,100,100); INSERT INTO public.monsters(monster_id,user_id,name,life_stage,type,family,age_days,fullness,cleanliness) VALUES("+quote(pet(i))+","+quote(u(i))+",'parallel',6,1,1,8,100,100);");
}
try{
 const buy=action('buy',{item_id:'meat_basic',quantity:1,request_id:request(1)});
 const same=await Promise.all(Array.from({length:8},()=>run(1,buy)));
 const receipts=same.map(accepted);assert.equal(new Set(receipts.map(JSON.stringify)).size,1);
 assert.equal(num("SELECT gold FROM public.users WHERE user_id="+quote(u(1))),1990);
 assert.equal(num("SELECT quantity FROM public.user_inventory WHERE user_id="+quote(u(1))+" AND item_id='meat_basic'"),1);
 // Both directions race; exactly one pending request, then exactly one acceptance.
 const friend=(peer)=>"SELECT public.game_friend_action('request',"+quote(peer)+");";
 const fr=await Promise.all([run(1,friend(u(2))),run(2,friend(u(1)))]);
 assert.equal(fr.filter(r=>r.code===0).length,1);
 rejected(fr.find(r=>r.code!==0),/已邀請/);
 const sender=fr[0].code===0?1:2,receiver=sender===1?2:1;
 accepted(await run(receiver,"SELECT public.game_friend_action('accept',"+quote(u(sender))+");"));
 assert.equal(num("SELECT count(*) FROM public.friends WHERE user_id IN ("+quote(u(1))+","+quote(u(2))+") AND status=1"),2);
 accepted(await run(1,action('pvp_register',{monster_id:pet(1)})));
 accepted(await run(2,action('pvp_register',{monster_id:pet(2)})));
 const pvp=await Promise.all([run(1,action('battle',{monster_id:pet(1),encounter:'pvp',opponent_id:u(2),request_id:request(50)})),run(2,action('battle',{monster_id:pet(2),encounter:'pvp',opponent_id:u(1),request_id:request(51)}))]);
 pvp.forEach(accepted);
 assert.equal(num('SELECT count(*) FROM arena_internal.pvp_results'),2);
 assert.equal(num('SELECT count(*) FROM public.battle_records'),2);
 // Independent simultaneous boss attacks: damage cannot overrun boss HP.
 accepted(await run(1,action('raid_status')));
 db("UPDATE public.raid_boss SET current_hp=250,max_hp=250,is_active=true WHERE id LIKE 'daily:%';");
 const raid=await Promise.all(Array.from({length:8},(_,k)=>run(k+1,action('raid',{monster_id:pet(k+1),strategy:'assault',request_id:request(k+10)}))));
 for(const x of raid){if(x.code===0)accepted(x);else rejected(x,/已被討伐/);}
 assert.equal(num("SELECT current_hp FROM public.raid_boss WHERE id LIKE 'daily:%'"),0);
 assert.equal(num("SELECT coalesce(sum(damage),0) FROM arena_internal.raid_contributions"),250);
 const winners=raid.map((r,i)=>r.code===0?i+1:null).filter(Boolean);
 const boss=db("SELECT id FROM public.raid_boss WHERE id LIKE 'daily:%';");
 const claims=await Promise.all(winners.flatMap(i=>[run(i,action('raid_claim',{boss_id:boss,request_id:request(i+30)})),run(i,action('raid_claim',{boss_id:boss,request_id:request(i+30)}))]));
 claims.forEach(accepted);
 assert.equal(num("SELECT count(*) FROM arena_internal.raid_contributions WHERE claimed_at IS NOT NULL"),winners.length);
 assert.equal(num("SELECT count(*) FROM arena_internal.gold_ledger WHERE action='raid_claim'"),winners.length);
 assert.ok(num("SELECT coalesce(sum(amount),0) FROM arena_internal.gold_ledger WHERE action='raid_claim'")<=150);
 // Guild disband/donate/join can be serialized in either order, but must not
 // deadlock, charge a former member, or leave a dangling guild membership.
 accepted(await run(1,action('guild_create',{name:'parallel-guild'})));
 const guild=db("SELECT guild_id FROM public.guilds WHERE leader_id="+quote(u(1)));
 accepted(await run(2,action('guild_join',{guild_id:guild})));
 const before=num("SELECT gold FROM public.users WHERE user_id="+quote(u(2)));
 const race=await Promise.all([run(1,action('guild_leave')),run(2,action('guild_donate',{amount:25})),run(3,action('guild_join',{guild_id:guild}))]);
 accepted(race[0]);
 if(race[1].code!==0)rejected(race[1],/未加入公會/);else accepted(race[1]);
 if(race[2].code!==0)rejected(race[2],/公會不存在/);else accepted(race[2]);
 assert.equal(num("SELECT gold FROM public.users WHERE user_id="+quote(u(2))),before-(race[1].code===0?25:0));
 assert.equal(num("SELECT count(*) FROM public.guild_members WHERE guild_id="+quote(guild)),0);
 console.log('CONCURRENCY PASS: 8 identical purchases, reciprocal friendship, reciprocal PvP, 8 simultaneous raid attacks, duplicate raid claims, guild disband/donate/join race');
}finally{
 // Remove only synthetic fixture identities and the raid spawned by this isolated test.
 db("DELETE FROM public.raid_boss WHERE id LIKE 'daily:%'; DELETE FROM auth.users WHERE id IN ("+Array.from({length:8},(_,k)=>quote(u(k+1))).join(',')+");");
}
