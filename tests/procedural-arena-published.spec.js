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
test('published procedural battle arena renders and responds to player actions',async({page})=>{
 test.setTimeout(240000);
 await mkdir('test-results/ui-visual',{recursive:true});
 const now=Math.floor(Date.now()/1000);
 const payload=Buffer.from(JSON.stringify({sub:uid,aud:'authenticated',role:'authenticated',exp:now+36000,iat:now,iss:host+'/auth/v1'})).toString('base64url');
 const session={access_token:'eyJhbGciOiJIUzI1NiJ9.'+payload+'.test-signature',token_type:'bearer',refresh_token:'fixture',expires_at:now+36000,expires_in:36000,user};
 await page.addInitScript(({key,session})=>localStorage.setItem(key,JSON.stringify(session)),{key:'sb-'+new URL(host).hostname.split('.')[0]+'-auth-token',session});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://*.supabase.co/**',async route=>{
  const req=route.request(),path=new URL(req.url()).pathname.replace('/rest/v1/rpc/arena_preview_','/rest/v1/rpc/').replace('/rest/v1/arena_preview_','/rest/v1/');
  let data=null;
  if(req.method()==='OPTIONS')data={};
  else if(path==='/auth/v1/user')data=user;
  else if(path==='/rest/v1/rpc/game_ensure_profile')data={user_id:uid,username:'AppearanceFixture',email:user.email,gold:100,stamina:100,max_stamina:100,premium_gems:0};
  else if(path==='/rest/v1/rpc/game_action'&&req.postDataJSON().p_action==='capabilities')data={version:2,combatBalance:3};
  else if(path==='/rest/v1/rpc/game_action'&&req.postDataJSON().p_action==='battle')data={battleId:'fixture-battle',won:true,events:[{attacker:'A',damage:115,ownHp:237,enemyHp:0}],enemyName:'廢棄機械兵',enemyFamily:3,enemyStage:2,enemyType:1,ownMaxHp:237,enemyMaxHp:115,ownHp:237,enemyHp:0,reward:10};
  else if(path==='/rest/v1/rpc/game_claim_gifts')data=0;
  else if(path==='/rest/v1/rpc/game_age_monsters')data=null;
  else if(path==='/rest/v1/monsters')data=pets;
  else if(['/rest/v1/user_inventory','/rest/v1/friends','/rest/v1/guilds'].includes(path))data=[];
  else if(path==='/rest/v1/guild_members')data=null;
  else {errors.push('Unexpected fixture call '+path);return route.abort();}
  return route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*','access-control-allow-methods':'GET, POST, OPTIONS','access-control-allow-headers':'*'},body:JSON.stringify(data)});
 });


 await page.addInitScript(()=>{
  const shaderSource=WebGLRenderingContext.prototype.shaderSource;
  WebGLRenderingContext.prototype.shaderSource=function(shader,source){
   if(source.includes('uniform float arenaVariant;')&&source.includes('Endless data-space'))this.canvas.dataset.qaDetailed='true';
   return shaderSource.call(this,shader,source);
  };
  const draw=WebGLRenderingContext.prototype.drawArrays;
  WebGLRenderingContext.prototype.drawArrays=function(...args){
   draw.apply(this,args);
   if(this.canvas.dataset.testid!=='procedural-arena')return;
   const w=this.canvas.width,h=this.canvas.height;
   const pix=new Uint8Array(w*h*4);this.readPixels(0,0,w,h,this.RGBA,this.UNSIGNED_BYTE,pix);
   let hash=2166136261,lo=255,hi=0;
   for(let i=0;i<pix.length;i+=4){let v=pix[i]+pix[i+1]+pix[i+2];hash=Math.imul(hash^v,16777619);lo=Math.min(lo,v);hi=Math.max(hi,v);}
   this.canvas.dataset.qaHash=String(hash);this.canvas.dataset.qaRange=String(hi-lo);
  };
 });
 await page.setViewportSize({width:360,height:640});
 await page.goto('./',{waitUntil:'domcontentloaded'});
 await expect(page.getByRole('button',{name:'倉庫',exact:true})).toBeVisible({timeout:30000});
 await page.getByRole('button',{name:'競技',exact:true}).click();
 await page.getByRole('button',{name:'手動戰術對戰',exact:true}).click();
 const duel=page.getByTestId('tactical-duel'),canvas=duel.getByTestId('procedural-arena');
 await expect(canvas).toHaveAttribute('data-ready','true',{timeout:30000});
 await expect(canvas).toHaveAttribute('data-qa-detailed','true');
 await expect.poll(async()=>Number(await canvas.getAttribute('data-qa-range'))).toBeGreaterThan(20);
 const firstVariant=await duel.locator('.ma-arena-backdrop').getAttribute('data-arena-variant');
 expect(['orbital','nebula','jumpgate','cybergrid']).toContain(firstVariant);
 const hash=await canvas.getAttribute('data-qa-hash');
 await expect.poll(()=>canvas.getAttribute('data-qa-hash'),{timeout:15000}).not.toBe(hash);
 for(const [name,width,height] of [['mobile',360,640],['desktop',1280,900],['short-desktop',1280,550]]){
  await page.setViewportSize({width,height});
  for(const label of ['攻擊','格擋反擊','破防重擊','蓄能'])await expect(duel.getByRole('button',{name:label,exact:true})).toBeInViewport({ratio:1});
  await page.evaluate(async()=>{await Promise.all([...document.querySelectorAll('.tactical-art svg image')].map(async el=>{const i=new Image();i.src=new URL(el.getAttribute('href'),location.href);await i.decode();}));});
  await page.screenshot({path:'test-results/ui-visual/ma-tactical-'+name+'.png'});
  if(name==='desktop')await duel.locator('.tactical-stage').screenshot({path:'test-results/ui-visual/ma-detailed-stage.png'});
 }
 await page.setViewportSize({width:360,height:640});
 await duel.getByRole('button',{name:'蓄能',exact:true}).click();
 await expect(duel.locator('.tactical-round')).toHaveText('2/16');
 await expect(duel.locator('.ma-arena-backdrop')).toHaveAttribute('data-arena-variant',firstVariant);
 const seen=new Set();
 for(let i=0;i<4;i++){
  if(i){await duel.getByRole('button',{name:'離開戰術對戰'}).click();await page.getByRole('button',{name:'手動戰術對戰',exact:true}).click();}
  await expect(canvas).toHaveAttribute('data-ready','true',{timeout:30000});
  await expect(canvas).toHaveAttribute('data-qa-detailed','true');
  const name=await duel.locator('.ma-arena-backdrop').getAttribute('data-arena-variant');
  expect(seen.has(name)).toBe(false);seen.add(name);
  await page.setViewportSize({width:1280,height:900});
  await page.evaluate(async()=>{await Promise.all([...document.querySelectorAll('.tactical-art svg image')].map(async el=>{const i=new Image();i.src=new URL(el.getAttribute('href'),location.href);await i.decode();}));});
  await duel.locator('.tactical-stage').screenshot({path:'test-results/ui-visual/arena-'+name+'.png'});
  await page.setViewportSize({width:360,height:640});
  await page.screenshot({path:'test-results/ui-visual/mobile-'+name+'.png'});
 }
 expect([...seen].sort()).toEqual(['cybergrid','jumpgate','nebula','orbital']);
 await duel.getByRole('button',{name:'離開戰術對戰'}).click();
 await page.getByRole('button',{name:'挑戰廢棄機械兵',exact:true}).click();
 await expect(page.getByTestId('procedural-arena')).toHaveAttribute('data-ready','true',{timeout:15000});
 await expect(page.getByRole('status',{name:'勝利'})).toBeVisible();
 await page.screenshot({path:'test-results/ui-visual/ma-auto-victory.png'});
 await page.getByRole('button',{name:'離開戰場'}).click();
 await page.getByRole('button',{name:'挑戰終極機甲首領',exact:true}).click();
 await expect(duel.getByTestId('procedural-arena')).toHaveAttribute('data-ready','true');
 await expect(duel.locator('.ma-arena-boss')).toBeVisible();
 const bossArt=duel.locator('.fighter-1 svg[role="img"] image');
 await expect(bossArt).toHaveCount(1);
 const href=await bossArt.getAttribute('href');
 const dimensions=await page.evaluate(async href=>{const img=new Image();img.src=new URL(href,location.href);await img.decode();return [img.naturalWidth,img.naturalHeight]},href);
 expect(dimensions).toEqual([128,128]);
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.waitForTimeout(300);
 await page.screenshot({path:'test-results/ui-visual/ma-boss-mobile.png'});
 await duel.getByRole('button',{name:'普通攻擊',exact:true}).click();
 await expect(duel.locator('.tactical-round')).toHaveText('2/20');
 expect(errors).toEqual([]);
});
