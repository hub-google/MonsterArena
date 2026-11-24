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
 test.setTimeout(120000);
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
  await expect(art).toHaveAttribute('aria-label','巨砲金剛');
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
 // All 40 model names and separate classification rows must appear on the published catalog.
 const {MONSTER_SPRITES}=await import('../src/utils/monsterSprites.js');
 await page.getByRole('button',{name:'圖鑑',exact:true}).click();
 const seen=new Set();
 for(let faction=1;faction<=4;faction++){
  const entries=Object.values(MONSTER_SPRITES).filter(m=>m.faction===faction);
  await page.getByRole('button',{name:entries[0].factionName,exact:true}).click();
  for(let n=0;n<2;n++){
   if(n)await page.getByRole('button',{name:'下一頁圖鑑'}).click();
   for(const m of entries.slice(n*6,n*6+6)){
    const card=page.getByTestId('catalog-'+m.key);
    await expect(card.locator('.catalog-model')).toHaveText(m.modelName);
    await expect(card.locator('.catalog-species')).toHaveText(m.factionName);
    await expect(card.locator('.catalog-classification')).toHaveText(m.roleName+'・'+m.stageName);
    const order=await card.evaluate(el=>{const name=el.querySelector('.catalog-model').getBoundingClientRect(),art=el.querySelector('.mecha-display').getBoundingClientRect(),species=el.querySelector('.catalog-species').getBoundingClientRect();return name.bottom<=art.top+1&&art.bottom<=species.top+1;});
    expect(order).toBe(true);seen.add(m.modelName);
   }
   await shell.screenshot({path:'test-results/ui-visual/named-faction-'+faction+'-page-'+n+'.png',animations:'disabled'});
  }
 }
 expect(seen.size).toBe(40);
 // Exercise every newly replaced species in the actual published catalog.
 const models=[
  [1,1,'雷霆暴龍','重裝戰車','thunder-rex'],
  [1,2,'炫藍閃電W','武裝警車','blue-lightning-w'],
  [2,1,'巡邏戰警','巡邏警車','patrol-guard'],
  [3,1,'翼龍機動裝甲','翼龍型態','wing-dragon'],
  [3,2,'風暴翼龍','風暴翼龍型態','storm-wyvern'],
  [4,1,'帝王暴龍','霸氣恐龍戰車','emperor-rex'],
  [4,2,'帝王暴龍 闇黑限定版','闇黑暴龍型態','dark-emperor']
 ];
 const factions=['疾風族','鋼鐵族','蒼空族','星核族'];
 for(const [width,height] of [[360,640],[1280,550]]){
  await page.setViewportSize({width,height});
  await page.getByRole('button',{name:'圖鑑',exact:true}).click();
  for(let faction=1;faction<=4;faction++){
   await page.getByRole('button',{name:factions[faction-1],exact:true}).click();
   await page.getByRole('button',{name:'下一頁圖鑑'}).click();
   for(const [,role,name,vehicle,file] of models.filter(m=>m[0]===faction)){
    const card=page.getByTestId('catalog-'+faction+'_6_'+role);
    await expect(card.getByText(name,{exact:true})).toBeVisible();
    const pic=card.getByRole('img',{name,exact:true});
    await expect(pic.locator('image')).toHaveAttribute('href',new RegExp(file+'-robot[.]png'+String.fromCharCode(36)));
    const check=async locator=>{
     const href=await locator.getAttribute('href');
     const size=await page.evaluate(async url=>{const image=new Image();image.src=url;await image.decode();return [image.naturalWidth,image.naturalHeight]},href);
     expect(size).toEqual([128,128]);
    };
    await check(pic.locator('image'));
    await card.getByRole('button',{name:'變身：'+name,exact:true}).click();
    await expect(card.locator('.catalog-model')).toHaveText(name);
    await expect(card.locator('.catalog-classification')).toContainText('終極機');
    const alternate=card.getByRole('img',{name:vehicle,exact:true});
    await expect(alternate.locator('image')).toHaveAttribute('href',new RegExp(file+'-vehicle[.]png'+String.fromCharCode(36)));
    await check(alternate.locator('image'));
    await card.getByRole('button',{name,exact:true}).click();
    await expect(page.getByRole('dialog').getByRole('img',{name:vehicle,exact:true})).toBeVisible();
    await page.getByRole('button',{name:'關閉圖鑑詳情'}).click();
    await shell.screenshot({path:'test-results/ui-visual/catalog-'+file+'-vehicle-'+width+'.png',animations:'disabled'});
    await card.getByRole('button',{name:'還原：'+name,exact:true}).click();
   }
   await shell.screenshot({path:'test-results/ui-visual/catalog-faction-'+faction+'-robot-'+width+'.png',animations:'disabled'});
  }
 }
 expect(errors).toEqual([]);
});
