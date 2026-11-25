import {test,expect} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
// Verify the actual published frontend with isolated, read-only fixture data.
// Never send a real player mutation to Supabase.
const host=process.env.ARENA_TEST_SUPABASE_URL||'https://fanffwnhkxpfhttylntw.supabase.co';
const uid='11111111-1111-4111-8111-111111111111';
const stamp=new Date().toISOString();
const user={id:uid,email:'appearance-fixture@example.invalid',aud:'authenticated',role:'authenticated',app_metadata:{provider:'email',providers:['email']},user_metadata:{username:'AppearanceFixture'},created_at:stamp,updated_at:stamp,confirmed_at:stamp};
const common={user_id:uid,generation:1,family:4,type:3,age_days:10,is_dead:false,is_sick:false,is_frozen:false,is_locked:false,fullness:60,cleanliness:80,combat_hp:237,combat_atk:51,combat_def:37,combat_spd:39,battles:60,wins:45};
const pets=[{...common,monster_id:'22222222-2222-4222-8222-222222222222',name:'終極機驗收',life_stage:6},{...common,monster_id:'22222222-2222-4222-8222-222222222223',name:'超限機驗收',life_stage:5}];
test('published main uses only preview tables and RPCs, including embedded guild relationship',async({page})=>{
 test.setTimeout(60000);
 const guild={guild_id:'33333333-3333-4333-8333-333333333333',guild_name:'測試站公會',leader_id:uid,level:2,created_at:stamp};
 const seen=new Set();
 const now=Math.floor(Date.now()/1000);
 const payload=Buffer.from(JSON.stringify({sub:uid,aud:'authenticated',role:'authenticated',exp:now+36000,iat:now,iss:host+'/auth/v1'})).toString('base64url');
 const session={access_token:'eyJhbGciOiJIUzI1NiJ9.'+payload+'.test-signature',token_type:'bearer',refresh_token:'fixture',expires_at:now+36000,expires_in:36000,user};
 await page.addInitScript(({key,session})=>localStorage.setItem(key,JSON.stringify(session)),{key:'sb-'+new URL(host).hostname.split('.')[0]+'-auth-token',session});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route(host+'/**',async route=>{
  const req=route.request(),url=new URL(req.url()),rawPath=url.pathname;if(rawPath.startsWith('/rest/v1/')){expect(rawPath).toMatch(/^\/rest\/v1\/(?:rpc\/)?arena_preview_/);seen.add(rawPath);}const path=rawPath.replace('/rest/v1/rpc/arena_preview_','/rest/v1/rpc/').replace('/rest/v1/arena_preview_','/rest/v1/');
  let data=null;
  if(req.method()==='OPTIONS')data={};
  else if(path==='/auth/v1/user')data=user;
  else if(path==='/rest/v1/rpc/game_ensure_profile')data={user_id:uid,username:'AppearanceFixture',email:user.email,gold:100,stamina:100,max_stamina:100,premium_gems:0};
  else if(path==='/rest/v1/rpc/game_action'&&req.postDataJSON().p_action==='capabilities')data={version:2,combatBalance:3};
  else if(path==='/rest/v1/rpc/game_claim_gifts')data=0;
  else if(path==='/rest/v1/rpc/game_age_monsters')data=null;
  else if(path==='/rest/v1/monsters')data=pets;
  else if(['/rest/v1/user_inventory','/rest/v1/friends'].includes(path))data=[];
  else if(path==='/rest/v1/guilds')data=[guild];
  else if(path==='/rest/v1/rpc/game_public_profiles')data=[{user_id:uid,username:'AppearanceFixture'}];
  else if(path==='/rest/v1/guild_members'){expect(url.searchParams.get('select')).toBe('*,guilds:arena_preview_guilds(*)');data={user_id:uid,guild_id:guild.guild_id,role:1,contribution:42,guilds:guild};}
  else {errors.push('Unexpected fixture call '+path);return route.abort();}
  return route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*','access-control-allow-methods':'GET, POST, OPTIONS','access-control-allow-headers':'*'},body:JSON.stringify(data)});
 });

 await page.setViewportSize({width:360,height:640});
 await page.goto('./',{waitUntil:'domcontentloaded'});
 await expect(page.getByRole('button',{name:'倉庫',exact:true})).toBeVisible({timeout:20000});
 await page.getByRole('button',{name:'更多功能',exact:true}).click();
 await page.getByRole('button',{name:'公會',exact:true}).click();
 await expect(page.getByRole('heading',{name:/測試站公會/})).toBeVisible();
 await expect(page.getByText('42 分',{exact:true})).toBeVisible();
 expect(seen.has('/rest/v1/arena_preview_guild_members')).toBe(true);
 expect(seen.has('/rest/v1/rpc/arena_preview_game_action')).toBe(true);
 await mkdir('test-results/ui-visual',{recursive:true});
 await page.getByTestId('game-shell').screenshot({path:'test-results/ui-visual/published-guild-mobile.png'});
 expect(errors).toEqual([]);
});
