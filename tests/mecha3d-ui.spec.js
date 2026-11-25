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
test('all 40 catalog models and 24 alternate forms render genuine unclipped WebGL; animated rotation',async({page})=>{
 test.setTimeout(240000);
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

 await page.addInitScript(()=>{
   const original=WebGLRenderingContext.prototype.drawArrays;
   WebGLRenderingContext.prototype.drawArrays=function(...args){
     original.apply(this,args);
     const canvas=this.canvas;
     if(!(canvas instanceof HTMLCanvasElement)||canvas.width!==128||canvas.height!==128)return;
     if(!canvas.isConnected)return;
     const pixels=new Uint8Array(128*128*4);this.readPixels(0,0,128,128,this.RGBA,this.UNSIGNED_BYTE,pixels);
     let n=0,left=128,right=-1,top=128,bottom=-1,hash=2166136261;
     for(let y=0;y<128;y++)for(let x=0;x<128;x++){const i=(y*128+x)*4;if(!pixels[i+3])continue;n++;left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);hash=Math.imul(hash^pixels[i],16777619);hash=Math.imul(hash^pixels[i+1],16777619);hash=Math.imul(hash^pixels[i+2],16777619);hash=Math.imul(hash^i,16777619);}
     canvas.dataset.meshProbe=JSON.stringify({n,left,right,top,bottom,hash});
   };
 });
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.setViewportSize({width:360,height:640});
 await page.goto('./',{waitUntil:'domcontentloaded'});
 await page.getByRole('button',{name:'圖鑑',exact:true}).click();
 await page.getByRole('button',{name:'360° 立體預覽'}).click();
 const {MONSTER_SPRITES}=await import('../src/utils/monsterSprites.js');
 const all=Object.values(MONSTER_SPRITES);
 const verify=async card=>{
   const model=card.locator('.mecha3d');
   await expect(model).toHaveAttribute('data-rendered','true',{timeout:15000});
   const canvas=model.locator('canvas');
   await expect(canvas).toHaveAttribute('data-mesh-probe',/./,{timeout:10000});
   const stats=JSON.parse(await canvas.getAttribute('data-mesh-probe'));
   expect(stats.n).toBeGreaterThan(200);
   expect(stats.left).toBeGreaterThan(0);expect(stats.right).toBeLessThan(127);
   expect(stats.top).toBeGreaterThan(0);expect(stats.bottom).toBeLessThan(127);
   return stats.hash;
 };
 let checked=0,transformed=0;
 for(let faction=1;faction<=4;faction++){
   const entries=all.filter(m=>m.faction===faction);
   await page.getByRole('button',{name:entries[0].factionName,exact:true}).click();
   for(let n=0;n<2;n++){
     if(n)await page.getByRole('button',{name:'下一頁圖鑑'}).click();
     for(const m of entries.slice(n*6,n*6+6)){
       const card=page.getByTestId('catalog-'+m.key);
       const robot=await verify(card);checked++;
       if(m.stage>=4){
         await card.getByRole('button',{name:'變身：'+m.modelName,exact:true}).click();
         await expect.poll(()=>card.locator('canvas').getAttribute('data-mesh-probe').then(x=>x?JSON.parse(x).hash:null)).not.toBe(robot);
         await verify(card);transformed++;
         await card.getByRole('button',{name:'還原：'+m.modelName,exact:true}).click();
         await expect.poll(()=>card.locator('canvas').getAttribute('data-mesh-probe').then(x=>x?JSON.parse(x).hash:null)).toBe(robot);
       }
     }
     await page.getByTestId('game-shell').screenshot({path:'test-results/ui-visual/3d-faction-'+faction+'-page-'+n+'.png'});
   }
 }
 expect(checked).toBe(40);expect(transformed).toBe(24);
 const chosen=page.getByTestId('catalog-'+all.filter(m=>m.faction===4).at(-1).key);
 const canvas=chosen.locator('canvas');
 await page.emulateMedia({reducedMotion:'no-preference'});
 const first=JSON.parse(await canvas.getAttribute('data-mesh-probe')).hash;
 await expect.poll(async()=>JSON.parse(await canvas.getAttribute('data-mesh-probe')).hash,{timeout:5000}).not.toBe(first);
 for(let i=0;i<4;i++){
   await verify(chosen);
   await chosen.screenshot({path:'test-results/ui-visual/3d-rotation-'+i+'.png'});
   if(i<3)await page.waitForTimeout(3500);
 }
 await page.getByRole('button',{name:'切換原圖'}).click();
 await expect(chosen.locator('svg[role="img"]')).toBeVisible();
 expect(errors).toEqual([]);
});
