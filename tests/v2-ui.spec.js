import {test,expect} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {namespaceSql} from '../scripts/preview-namespace.mjs';
import {initialBossDuel,resolveBossRound} from '../src/utils/tacticalDuel.js';
// Auth transport is isolated. Every mutation uses the actual PostgreSQL RPC under
// the authenticated role; no real Supabase account or production data is used.
const host='https://arena-v2-ci.supabase.co';
const uid='11111111-1111-4111-8111-111111111111',peer='11111111-1111-4111-8111-111111111112';
const pet='22222222-2222-4222-8222-222222222221',peerPet='22222222-2222-4222-8222-222222222222';
const stamp=new Date().toISOString();
const user={id:uid,email:'v2-ui@example.invalid',aud:'authenticated',role:'authenticated',app_metadata:{provider:'email',providers:['email']},user_metadata:{username:'V2_UI'},created_at:stamp,updated_at:stamp,confirmed_at:stamp};
const literal=s=>"'"+String(s).replaceAll("'","''")+"'";
function db(statement,as=null){
 if(!process.env.PG_CONTAINER)throw Error('isolated PG_CONTAINER is required');
 return execFileSync('docker',['exec','-i',process.env.PG_CONTAINER,'psql','-X','-qAt','-U','postgres','-d','arena_test','-v','ON_ERROR_STOP=1'],{input:(as?'SET ROLE authenticated; SET request.jwt.claim.sub='+literal(as)+';\n':'') +namespaceSql(statement)+'\n',encoding:'utf8',timeout:15000}).trim();
}
const value=(q,as=null)=>JSON.parse(db('SELECT '+q+';',as)||'null');
const action=(name,data={},as=uid)=>value('public.game_action('+literal(name)+','+literal(JSON.stringify(data))+'::jsonb)',as);
const ownPet=()=>value('to_jsonb(m) FROM public.monsters m WHERE monster_id='+literal(pet));
const profile=()=>value('to_jsonb(u) FROM public.users u WHERE user_id='+literal(uid));
const reply=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',headers:{'access-control-allow-origin':'*','access-control-allow-methods':'GET, POST, OPTIONS','access-control-allow-headers':'*'},body:JSON.stringify(body)});
test('V2 browser training, economy, boss settlement, affinity and raid use the real isolated SQL',async({page})=>{
 test.setTimeout(90000);
 db("INSERT INTO auth.users(id,email) VALUES ('"+uid+"','v2-ui@example.invalid'),('"+peer+"','v2-peer@example.invalid'); INSERT INTO public.users(user_id,username,email,gold,stamina,max_stamina) VALUES ('"+uid+"','V2_UI','v2-ui@example.invalid',1000,100,100),('"+peer+"','V2_PEER','v2-peer@example.invalid',500,100,100); INSERT INTO public.monsters(monster_id,user_id,name,life_stage,type,family,age_days,fullness,cleanliness) VALUES ('"+pet+"','"+uid+"','戰術驗收機',6,1,1,8,100,100),('"+peerPet+"','"+peer+"','克制驗收機',6,1,4,8,100,100);");
 action('pvp_register',{monster_id:peerPet},peer);
 await page.setViewportSize({width:360,height:640});await page.emulateMedia({reducedMotion:'reduce'});
 const now=Math.floor(Date.now()/1000),payload=Buffer.from(JSON.stringify({sub:uid,aud:'authenticated',role:'authenticated',exp:now+36000,iat:now,iss:host+'/auth/v1'})).toString('base64url');
 await page.addInitScript(session=>localStorage.setItem('sb-arena-v2-ci-auth-token',JSON.stringify(session)),{access_token:'eyJhbGciOiJIUzI1NiJ9.'+payload+'.test-signature',token_type:'bearer',refresh_token:'test',expires_at:now+36000,expires_in:36000,user});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 let loseBuyResponse=false,buyCalls=0,optionalUnavailable=true;const buyRequests=[];
 await page.route(host+'/**',async route=>{
  const req=route.request(),rawPath=new URL(req.url()).pathname;
  if(rawPath.startsWith('/rest/v1/'))expect(rawPath).toMatch(/^\/rest\/v1\/(?:rpc\/)?arena_preview_/);
  const path=rawPath.replace('/rest/v1/rpc/arena_preview_','/rest/v1/rpc/').replace('/rest/v1/arena_preview_','/rest/v1/');
  if(req.method()==='OPTIONS')return reply(route,{});
  try{
   if(path==='/auth/v1/user')return reply(route,user);
   if(path==='/rest/v1/rpc/game_ensure_profile')return reply(route,value('to_jsonb(public.game_ensure_profile())',uid));
   if(path==='/rest/v1/rpc/game_claim_gifts')return reply(route,value('public.game_claim_gifts()',uid));
   if(path==='/rest/v1/rpc/game_age_monsters'){db('SELECT public.game_age_monsters();',uid);return reply(route,null);}
   if(path==='/rest/v1/rpc/game_action'){const a=req.postDataJSON();const result=action(a.p_action,a.p_data);if(loseBuyResponse&&a.p_action==='buy'){buyRequests.push(a.p_data.request_id);if(++buyCalls<=2)return route.abort('failed');}return reply(route,result);}
   if(path==='/rest/v1/monsters')return reply(route,value("coalesce(jsonb_agg(to_jsonb(m)),'[]'::jsonb) FROM public.monsters m WHERE user_id="+literal(uid)));
   if(path==='/rest/v1/user_inventory')return reply(route,value("coalesce(jsonb_agg(to_jsonb(i)),'[]'::jsonb) FROM public.user_inventory i WHERE user_id="+literal(uid)));
   if(path==='/rest/v1/daily_quests')return reply(route,value("coalesce((SELECT to_jsonb(q) FROM public.daily_quests q WHERE user_id="+literal(uid)+" LIMIT 1),'null'::jsonb)"));
   if(path==='/rest/v1/users')return reply(route,profile());
   if(path==='/rest/v1/friends'||path==='/rest/v1/guilds'){if(optionalUnavailable)return reply(route,{message:'optional unavailable',code:'PGRST002'},503);return reply(route,[]);}
   if(path==='/rest/v1/guild_members')return reply(route,null);
   throw Error('unexpected fixture request '+path);
  }catch(e){errors.push(e.stderr?.toString()||e.message);return reply(route,{message:e.stderr?.toString()||e.message,code:'P0001'},400);}
 });
 await page.goto('./',{waitUntil:'domcontentloaded'});
 await expect(page.getByRole('button',{name:'倉庫',exact:true})).toBeVisible({timeout:20000});
 optionalUnavailable=false;
 await page.getByRole('button',{name:'訓練',exact:true}).click();
 const train=page.getByRole('dialog',{name:'選擇訓練項目'});
 await expect(train).toContainText('總配點 0/60');
 await page.getByTestId('game-shell').screenshot({path:'test-results/ui-visual/v2-training-mobile.png',animations:'disabled'});
 await train.getByRole('button',{name:'訓練耐久'}).click();
 await expect.poll(()=>ownPet().training_hp).toBe(1);
 await expect(page.getByRole('button',{name:'訓練',exact:true})).toBeEnabled();
 await page.getByRole('button',{name:'訓練',exact:true}).click();await expect(train).toContainText('總配點 1/60');
 await train.getByRole('button',{name:'關閉訓練'}).click();
 await page.getByRole('button',{name:'商城',exact:true}).click();
 const item=page.getByText('標準修復套件',{exact:true}).locator('../..').locator('..');
 const before=profile().gold;
 loseBuyResponse=true;
 await item.getByRole('button',{name:'80G 購買'}).click();await expect.poll(()=>profile().gold).toBe(before-80);
 await expect(page.getByRole('dialog',{name:'尚未確認的交易'})).toBeVisible({timeout:15000});
 // A full page reload must retain the receipt; the two lost responses actually committed.
 await page.reload({waitUntil:'domcontentloaded'});
 await page.getByRole('button',{name:'恢復交易',exact:true}).click();
 await expect(page.getByRole('dialog',{name:'尚未確認的交易'})).toContainText('交易已恢復',{timeout:15000});
 expect(profile().gold).toBe(before-80);expect(buyRequests).toHaveLength(3);expect(new Set(buyRequests).size).toBe(1);
 await page.getByRole('dialog',{name:'尚未確認的交易'}).getByRole('button',{name:'返回遊戲',exact:true}).click();
 await page.getByRole('button',{name:'競技',exact:true}).click();
 for(const label of ['廢棄機械兵','失控巡邏機','重裝守衛','疾風獵手','深淵機甲','終極機甲首領'])await expect(page.getByRole('button',{name:'挑戰'+label,exact:true})).toBeVisible();
 await page.getByRole('button',{name:'挑戰終極機甲首領',exact:true}).click();
 const duel=page.getByTestId('tactical-duel');let s=initialBossDuel(ownPet());
 await expect(page.getByRole('button',{name:'倉庫',exact:true})).toBeDisabled();
 await expect(duel.getByTestId('tactical-hp-0')).toHaveText(s.hp[0]+' / '+s.hp[0]);
 const labels={attack:'普通攻擊',guard:'格擋反擊',special:'特殊技能'};
 while(!s.result){const move=s.phase==='heavy'?'guard':s.phase==='stunned'&&s.energy[0]>=2?'special':'attack';await duel.getByRole('button',{name:labels[move],exact:true}).click();s=resolveBossRound(s,move);}
 await expect(duel.getByRole('status')).toContainText('戰鬥勝利');
 await expect(duel.getByText('戰績已儲存 · 120G')).toBeVisible({timeout:15000});
 expect(value('count(*) FROM public.battle_records WHERE user_id='+literal(uid))).toBe(1);
 await page.getByTestId('game-shell').screenshot({path:'test-results/ui-visual/v2-boss-settled-mobile.png',animations:'disabled'});
 await duel.getByRole('button',{name:'離開戰術對戰'}).click();
 await expect(page.getByRole('button',{name:'倉庫',exact:true})).toBeEnabled();
 await page.getByRole('button',{name:'玩家對戰',exact:true}).click();
 await expect(page.getByText(/克制優勢/)).toBeVisible();
 await expect(page.getByRole('button',{name:'挑戰',exact:true})).toBeEnabled();
 await page.getByRole('button',{name:'更多功能'}).click();
 await page.getByRole('button',{name:'機甲首領',exact:true}).click();
 await expect(page.getByTestId('raid-boss-art').getByRole('img')).toBeVisible();
 await expect(page.getByRole('button',{name:/發動討伐突襲/})).toBeInViewport({ratio:1});
 await page.getByLabel('共鬥策略').selectOption('defend');
 await page.getByTestId('game-shell').screenshot({path:'test-results/ui-visual/v2-raid-mobile.png',animations:'disabled'});
 await page.getByRole('button',{name:/發動討伐突襲/}).click();
 await expect.poll(()=>value('coalesce((SELECT attempts FROM arena_internal.raid_contributions WHERE user_id='+literal(uid)+'),0)')).toBe(1);
 await expect(page.getByText(/有效支援.*參與獎勵/)).toBeVisible({timeout:15000});
 expect(value('coalesce((SELECT support FROM arena_internal.raid_contributions WHERE user_id='+literal(uid)+'),0)')).toBeGreaterThan(0);
 await page.setViewportSize({width:1280,height:550});await page.getByTestId('game-shell').screenshot({path:'test-results/ui-visual/v2-raid-short-desktop.png',animations:'disabled'});
 await page.setViewportSize({width:1280,height:900});await page.getByTestId('game-shell').screenshot({path:'test-results/ui-visual/v2-raid-desktop.png',animations:'disabled'});
 expect(errors).toEqual([]);
});
