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
test('published site renders different robots and transformations for stage 5 and 6',async({page})=>{
 await mkdir('test-results/ui-visual',{recursive:true});
 const now=Math.floor(Date.now()/1000);
 const payload=Buffer.from(JSON.stringify({sub:uid,aud:'authenticated',role:'authenticated',exp:now+36000,iat:now,iss:host+'/auth/v1'})).toString('base64url');
 const session={access_token:'eyJhbGciOiJIUzI1NiJ9.'+payload+'.test-signature',token_type:'bearer',refresh_token:'fixture',expires_at:now+36000,expires_in:36000,user};
 await page.addInitScript(({key,session})=>localStorage.setItem(key,JSON.stringify(session)),{key:'sb-'+new URL(host).hostname.split('.')[0]+'-auth-token',session});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route(host+'/**',async route=>{
  const req=route.request(),path=new URL(req.url()).pathname.replace('/rest/v1/rpc/arena_preview_','/rest/v1/rpc/').replace('/rest/v1/arena_preview_','/rest/v1/');
  let data=null;
  if(req.method()==='OPTIONS')data={};
  else if(path==='/auth/v1/user')data=user;
  else if(path==='/rest/v1/rpc/game_ensure_profile')data={user_id:uid,username:'AppearanceFixture',email:user.email,gold:100,stamina:100,max_stamina:100,premium_gems:0};
  else if(path==='/rest/v1/rpc/game_action'&&req.postDataJSON().p_action==='capabilities')data={version:2,combatBalance:3};
  else if(path==='/rest/v1/rpc/game_claim_gifts')data=0;
  else if(path==='/rest/v1/rpc/game_age_monsters')data=null;
  else if(path==='/rest/v1/monsters')data=pets;
  else if(['/rest/v1/user_inventory','/rest/v1/friends','/rest/v1/guilds'].includes(path))data=[];
  else if(path==='/rest/v1/guild_members')data=null;
  else {errors.push('Unexpected fixture call '+path);return route.abort();}
  return route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*','access-control-allow-methods':'GET, POST, OPTIONS','access-control-allow-headers':'*'},body:JSON.stringify(data)});
 });
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('./',{waitUntil:'domcontentloaded'});
 const screen=page.getByTestId('mecha-screen'),shell=page.getByTestId('game-shell');
 const art=screen.locator('svg[role="img"]');
 for(const [width,height] of [[360,640],[1280,550]]){
  await page.setViewportSize({width,height});
  await expect(page.getByRole('heading',{name:'終極機驗收'})).toBeVisible({timeout:20000});
  await expect(art.locator('image')).toHaveAttribute('href',/tyranno-robot\.png$/);
  const robot=await art.locator('image').getAttribute('href');
  const dims=await page.evaluate(async href=>{const i=new Image();i.src=href;await i.decode();return [i.naturalWidth,i.naturalHeight]},robot);
  expect(dims).toEqual([128,128]);
  await shell.screenshot({path:'test-results/ui-visual/final-robot-'+width+'.png',animations:'disabled'});
  await page.getByRole('button',{name:'變形：暴龍型態'}).click();
  await expect(art.locator('image')).toHaveAttribute('href',/tyranno-rex\.png$/);
  const rex=await art.locator('image').getAttribute('href');
  expect(rex).not.toBe(robot);
  await page.evaluate(async href=>{const i=new Image();i.src=href;await i.decode();if(i.naturalWidth!==128||i.naturalHeight!==128)throw Error('invalid rex dimensions')},rex);
  await shell.screenshot({path:'test-results/ui-visual/final-rex-'+width+'.png',animations:'disabled'});
  await page.getByRole('button',{name:'切換機器人'}).click();
  await page.getByRole('button',{name:'下一隻機甲'}).click();
  await expect(page.getByRole('heading',{name:'超限機驗收'})).toBeVisible();
  await expect(art.locator('image')).toHaveCount(0);
  await expect(art).toHaveAttribute('aria-label','鋼鐵族・重砲型・超限機');
  const superRobot=await art.innerHTML();
  expect(superRobot).toContain('<path');
  await shell.screenshot({path:'test-results/ui-visual/super-robot-'+width+'.png',animations:'disabled'});
  await page.getByRole('button',{name:'變形：重型坦克'}).click();
  await expect(art).toHaveAttribute('aria-label','重型坦克');
  await expect(art.locator('image')).toHaveCount(0);
  expect(await art.innerHTML()).not.toBe(superRobot);
  await shell.screenshot({path:'test-results/ui-visual/super-tank-'+width+'.png',animations:'disabled'});
  await page.getByRole('button',{name:'切換機器人'}).click();
  await page.getByRole('button',{name:'上一隻機甲'}).click();
 }
 expect(errors).toEqual([]);
});
