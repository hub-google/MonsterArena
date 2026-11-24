import { test, expect } from '@playwright/test';

// Local, isolated authenticated UI fixture. All Supabase calls are intercepted;
// no test account, real login or player data is created or modified.
const gameHost = 'https://fanffwnhkxpfhttylntw.supabase.co';
const uid = '11111111-1111-4111-8111-111111111111';
const timestamp = new Date().toISOString();
const user = {
  id: uid, email: 'arena-ui-fixture@example.invalid', aud: 'authenticated',
  role: 'authenticated', app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: { username: 'ArenaUITest' }, created_at: timestamp,
  updated_at: timestamp, confirmed_at: timestamp,
};
const profile = {
  user_id: uid, username: 'ArenaUITest', email: user.email,
  gold: 0, stamina: 100, max_stamina: 100, premium_gems: 0,
};
const dead = {
  monster_id: '22222222-2222-4222-8222-222222222222', user_id: uid,
  name: '已死亡怪獸', generation: 1, life_stage: 5, family: 1, type: 1,
  age_days: 10, is_dead: true, is_sick: true, is_locked: false, is_frozen: false,
  combat_hp: 500, combat_atk: 50, combat_def: 50, combat_spd: 50,
  fullness: 40, cleanliness: 40, battles: 60, wins: 45,
  chip_slot_1: 'chip_hp', chip_slot_1_val: 200,
  chip_slot_2: null, chip_slot_2_val: 0,
};
const inventory = [
  { inventory_id: '33333333-3333-4333-8333-333333333333', user_id: uid, item_id: 'chip_extractor', item_type: 4, quantity: 1 },
  { inventory_id: '44444444-4444-4444-8444-444444444444', user_id: uid, item_id: 'chip_hp', item_type: 4, quantity: 1 },
];

function json(route, body, status = 200) {
  return route.fulfill({
    status, contentType: 'application/json',
    headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, POST, PATCH, OPTIONS',
      'access-control-allow-headers': '*',
    },
    body: JSON.stringify(body),
  });
}

async function setupAuthenticatedGame(page, initialPets=[dead], profileOverrides={}) {
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({
    sub: uid, aud: 'authenticated', role: 'authenticated',
    exp: now + 36000, iat: now, iss: gameHost + '/auth/v1',
  })).toString('base64url');
  const token = 'eyJhbGciOiJIUzI1NiJ9.' + payload + '.test-signature';
  await page.addInitScript(({ session }) => {
    localStorage.setItem('sb-fanffwnhkxpfhttylntw-auth-token', JSON.stringify(session));
  }, {
    session: {
      access_token: token, token_type: 'bearer', refresh_token: 'fake-refresh',
      expires_in: 36000, expires_at: now + 36000, user,
    },
  });

  let pets = initialPets;
  let currentInventory=inventory.map(i=>({...i}));
  let currentProfile={...profile,...profileOverrides};
  const calls = [];
  await page.route(gameHost + '/**', async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (request.method() === 'OPTIONS') return json(route, {});
    calls.push(path);
    if (path === '/auth/v1/user') return json(route, user);
    if (path === '/rest/v1/rpc/game_ensure_profile') return json(route, currentProfile);
    if (path === '/rest/v1/rpc/game_claim_gifts') return json(route, 0);
    if (path === '/rest/v1/rpc/game_age_monsters') return json(route, null);
    if (path === '/rest/v1/monsters') return json(route, pets);
    if (path === '/rest/v1/user_inventory') return json(route, currentInventory);
    if (path === '/rest/v1/daily_quests') return json(route,{feed_count:0,clean_count:0,train_count:0,battle_count:0,claimed:[]});
    if (path === '/rest/v1/friends') return json(route, []);
    if (path === '/rest/v1/rpc/game_plaza_monsters') return json(route,pets.filter(m=>!m.is_dead).map(({user_id,monster_id,name,family,type,life_stage,is_dead,skin_id})=>({user_id,monster_id,name,family,type,life_stage,is_dead,skin_id})));
    if (path === '/rest/v1/rpc/game_public_profiles') return json(route,[{user_id:uid,username:currentProfile.username}]);
    if (path === '/rest/v1/raid_boss') return json(route,{id:'mock-raid',name:'巨型機甲首領測試',current_hp:500000,max_hp:500000,is_active:true});
    if (path === '/rest/v1/guilds') return json(route, []);
    if (path === '/rest/v1/guild_members') return json(route, null);
    if (path === '/rest/v1/rpc/game_action') {
      const args = request.postDataJSON();
      if (args.p_action === 'hatch') {
        pets = [...pets, {
          ...dead,
          monster_id: '55555555-5555-4555-8555-555555555555',
          name: '數位蛋', life_stage: 1, type: 0, is_dead: false,
          is_sick: false, chip_slot_1: null, chip_slot_1_val: 0,
        }];
        return json(route, { message: '核心啟動成功！' });
      }
      if(['feed','clean','heal','train'].includes(args.p_action)){
        pets=pets.map(p=>p.monster_id===args.p_data.monster_id?{...p,fullness:args.p_action==='feed'?70:p.fullness,cleanliness:args.p_action==='clean'?100:p.cleanliness,is_sick:args.p_action==='heal'?false:p.is_sick}:p);
        return json(route,{message:'操作成功！'});
      }
      if(args.p_action==='buy'&&args.p_data.item_id==='meat_basic'){
        if(currentProfile.gold<10)return json(route,{message:'金幣不足'},400);
        currentProfile={...currentProfile,gold:currentProfile.gold-10};
        const existing=currentInventory.find(i=>i.item_id==='meat_basic');
        if(existing)existing.quantity++;else currentInventory.push({user_id:uid,item_id:'meat_basic',quantity:1});
        return json(route,{message:'購買成功，花費 10G'});
      }
      if(args.p_action==='buy'&&args.p_data.item_id==='skin_husky'){currentProfile={...currentProfile,gold:currentProfile.gold-50};currentInventory.push({user_id:uid,item_id:'skin_husky',quantity:1});return json(route,{message:'購買成功，花費 50G'});}
      if(args.p_action==='skin_equip'){pets=pets.map(m=>m.monster_id===args.p_data.monster_id?{...m,skin_id:args.p_data.skin_id}:m);return json(route,{message:'造型已更新'});}
      if(args.p_action==='raid'){currentProfile={...currentProfile,stamina:currentProfile.stamina-15};return json(route,{message:'討伐成功',damage:100});}
      if(args.p_action==='battle')return json(route,{battleId:'mock-battle',won:true,events:[{attacker:'A',damage:50,ownHp:500,enemyHp:0}],enemyName:'失控巡邏機',enemyFamily:3,enemyType:1,enemyStage:3,ownMaxHp:500,enemyMaxHp:50,ownHp:500,enemyHp:0,reward:0});
      throw new Error('Unexpected UI issued a game_action: ' + args.p_action);
    }
    throw new Error('Unexpected Supabase request in isolated UI test: ' + request.method() + ' ' + path);
  });
  await page.goto('./', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('button', { name: '倉庫', exact: true })).toBeVisible({ timeout: 20000 });
  return calls;
}

test('authenticated dead pet never exposes usable care or chip actions', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const calls = await setupAuthenticatedGame(page);
  await expect(page.getByRole('status',{name:'此機體核心已失效，無法維護或出戰'})).toBeVisible();
  await expect(page.getByRole('button', { name: /修復/ })).toBeDisabled();
  await page.getByRole('button', { name: '倉庫', exact: true }).click();
  await page.getByRole('button', { name: '裝備晶片' }).click();
  await expect(page.getByText('此機體核心已失效，無法安裝或拆除晶片。')).toBeVisible();
  await expect(page.getByRole('button', { name: /拆除 \(需提取器\)/ })).toBeDisabled();
  await page.locator('select').last().selectOption('chip_hp');
  await expect(page.getByRole('button', { name: /確認安裝/ })).toBeDisabled();
  expect(calls).not.toContain('/rest/v1/rpc/game_action');
  expect(errors).toEqual([]);
});

test('authenticated all-dead account can claim the rescue egg once', async ({ page }) => {
  const calls = await setupAuthenticatedGame(page);
  await page.getByRole('button', { name: '倉庫', exact: true }).click();
  const hatch = page.getByRole('button', { name: '免費領取救援核心' });
  await expect(hatch).toBeEnabled();
  await hatch.click();
  await expect(page.getByText('核心啟動成功！')).toBeVisible();
  await expect(page.getByRole('button', { name: '啟動新機械核心 (-100G)' })).toBeDisabled();
  expect(calls.filter(path => path === '/rest/v1/rpc/game_action')).toHaveLength(1);
});

test('existing stage-six legacy type-three unit retains custom name and converts to matching robot and vehicle',async({page})=>{
 await setupAuthenticatedGame(page,[{...dead,name:'老玩家收藏',family:4,type:3,life_stage:6,is_dead:false,is_sick:false}]);
 await expect(page.getByRole('heading',{name:'老玩家收藏'})).toBeVisible();
 await expect(page.getByTestId('mecha-details')).toHaveCount(0);
 await page.getByRole('button',{name:'機體詳細資料'}).click();
 await expect(page.getByTestId('mecha-details').getByText('鋼鐵族・重砲型',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'關閉詳細資料'}).click();
 await expect(page.getByRole('img',{name:'鋼鐵族・重砲型・終極機'})).toBeVisible();
 await page.getByRole('button',{name:'變形：重型坦克'}).click();
 await expect(page.getByRole('img',{name:'重型坦克'})).toBeVisible();
 await page.getByRole('button',{name:'切換機器人'}).click();
 await expect(page.getByRole('img',{name:'鋼鐵族・重砲型・終極機'})).toBeVisible();
});

test('three simultaneous status warnings stay separate from each other and the machine on mobile',async({page})=>{
 await page.setViewportSize({width:360,height:800});
 await page.emulateMedia({reducedMotion:'reduce'});
 const calls=await setupAuthenticatedGame(page,[{...dead,name:'警示測試',family:4,type:3,life_stage:6,is_dead:false,is_sick:true,fullness:20,cleanliness:20}]);
 const screen=page.getByTestId('mecha-screen');
 const statuses=screen.getByTestId('mecha-status-list');
 const fault=statuses.getByTestId('mecha-status-fault');
 const energy=statuses.getByTestId('mecha-status-energy');
 const maintenance=statuses.getByTestId('mecha-status-maintenance');
 await expect(fault).toBeVisible();
 await expect(energy).toBeVisible();
 await expect(maintenance).toBeVisible();
 const assertLayout=async(name)=>{
  const sprite=screen.getByRole('img',{name});
  await expect(sprite).toBeVisible();
  const [art,a,b,c,frame]=await Promise.all([sprite.boundingBox(),fault.boundingBox(),energy.boundingBox(),maintenance.boundingBox(),screen.boundingBox()]);
  const overlap=(x,y)=>x.x<y.x+y.width&&x.x+x.width>y.x&&x.y<y.y+y.height&&x.y+x.height>y.y;
  const warningBoxes=[a,b,c];
  for(const w of warningBoxes){
   expect(w.y).toBeGreaterThanOrEqual(art.y+art.height);
   expect(w.x).toBeGreaterThanOrEqual(frame.x);
   expect(w.x+w.width).toBeLessThanOrEqual(frame.x+frame.width);
   expect(w.y+w.height).toBeLessThanOrEqual(frame.y+frame.height);
  }
  expect(overlap(a,b)||overlap(a,c)||overlap(b,c)).toBe(false);
  expect(art.width).toBeGreaterThan(140);
  expect(await sprite.evaluate(el=>getComputedStyle(el).filter)).toBe('none');
 };
 await assertLayout('鋼鐵族・重砲型・終極機');
 await expect(page.getByTestId('mecha-current-form')).toHaveText('目前形態：機器人');
 await page.getByRole('button',{name:'變形：重型坦克'}).click();
 await assertLayout('重型坦克');
 await expect(page.getByTestId('mecha-current-form')).toHaveText('目前形態：重型坦克');
 await page.getByRole('button',{name:'切換機器人'}).click();
 await assertLayout('鋼鐵族・重砲型・終極機');
 expect(calls).not.toContain('/rest/v1/rpc/game_action');
});

test('mobile pictogram controls perform care, form selection, battle and navigation',async({page})=>{
 await page.setViewportSize({width:360,height:800});await page.emulateMedia({reducedMotion:'reduce'});
 const calls=await setupAuthenticatedGame(page,[{...dead,name:'小機甲',family:4,type:3,life_stage:6,is_dead:false,is_sick:true,fullness:20,cleanliness:20}]);
 const actions=page.getByTestId('care-actions');
 await expect(actions.getByRole('button')).toHaveCount(5);
 for(const button of await actions.getByRole('button').all()){const b=await button.boundingBox();expect(b.width).toBeGreaterThanOrEqual(44);expect(b.height).toBeGreaterThanOrEqual(44);}
 await actions.getByRole('button',{name:'補充能源'}).click();
 await page.getByRole('button',{name:'免費基礎充能'}).click();
 await expect(page.getByRole('progressbar',{name:'能源'})).toHaveAttribute('aria-valuenow','70');
 await actions.getByRole('button',{name:'保養'}).click();
 await expect(page.getByRole('progressbar',{name:'機體維護'})).toHaveAttribute('aria-valuenow','100');
 await actions.getByRole('button',{name:'修復'}).click();
 await expect(page.getByRole('button',{name:'緊急修復程序，扣減20%耐久'})).toBeEnabled();
 await page.getByRole('button',{name:'取消返回'}).click();
 await actions.getByRole('button',{name:'訓練'}).click();
 await expect.poll(()=>calls.filter(x=>x==='/rest/v1/rpc/game_action').length).toBe(3);
 await page.getByRole('button',{name:'競技',exact:true}).click();
 await expect(page.getByTestId('wild-challenges')).toBeVisible();
 await page.getByRole('button',{name:'挑戰失控巡邏機'}).click();
 await expect(page.getByRole('status',{name:'勝利'})).toBeVisible();
 await page.getByRole('button',{name:'離開戰場'}).click();
 await page.getByRole('button',{name:'圖鑑',exact:true}).click();
 await expect(page.getByRole('button',{name:'疾風族',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'更多功能'}).click();
 await expect(page.getByRole('button',{name:'機甲首領',exact:true})).toBeVisible();
});

test('cockpit shows readable labels, all main metrics and five actions within one mobile viewport',async({page})=>{
 await page.setViewportSize({width:360,height:640});await page.emulateMedia({reducedMotion:'reduce'});
 await setupAuthenticatedGame(page,[{...dead,name:'機甲測試',family:4,type:3,life_stage:6,is_dead:false,is_sick:true,fullness:20,cleanliness:20}]);
 const main=page.getByTestId('game-main'),home=page.getByTestId('cockpit-home'),actions=page.getByTestId('care-actions');
 await expect(home.getByRole('heading',{name:'機甲測試'})).toBeVisible();
 await expect(home.getByText('鋼鐵族・重砲型',{exact:true})).toBeVisible();
 await expect(home.getByText('能源',{exact:true})).toBeVisible();
 await expect(home.getByText('機體維護',{exact:true})).toBeVisible();
 await expect(home.getByTestId('combat-readouts')).toBeVisible();
 for(const label of ['補充能源','機體保養','系統修復','機體訓練','機體變形'])await expect(actions.getByText(label,{exact:true})).toBeVisible();
 const container=await main.boundingBox();
 for(const el of [home.getByTestId('mecha-screen'),home.getByTestId('combat-readouts'),actions,...await actions.getByRole('button').all()]){
  const b=await el.boundingBox();expect(b.y).toBeGreaterThanOrEqual(container.y-1);expect(b.y+b.height).toBeLessThanOrEqual(container.y+container.height+1);
 }
 expect(await main.evaluate(el=>el.scrollHeight-el.clientHeight)).toBeLessThanOrEqual(2);
 await actions.getByRole('button',{name:'補充能源'}).click();
 await expect(page.getByRole('dialog',{name:'選擇補給'})).toBeVisible();
 await page.getByRole('button',{name:'取消返回'}).click();
 await page.setViewportSize({width:1280,height:720});
 await expect.poll(()=>main.evaluate(el=>el.scrollHeight-el.clientHeight)).toBeLessThanOrEqual(2);
 await page.getByRole('button',{name:'圖鑑',exact:true}).click();
 await expect(page.locator('.catalog-entry')).toHaveCount(6);
 await page.getByRole('button',{name:'下一頁圖鑑'}).click();
 await expect(page.locator('.catalog-entry')).toHaveCount(6);
});

test('visual acceptance: actual painted robot stays prominent with real-world short desktop and phone layouts',async({page})=>{
 const {mkdir}=await import('node:fs/promises');
 await mkdir('test-results/ui-visual',{recursive:true});
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.setViewportSize({width:1280,height:550});
 await setupAuthenticatedGame(page,[{...dead,name:'鋼鐵族・重砲型・超限機',family:4,type:3,life_stage:5,is_dead:false,is_sick:true,fullness:0,cleanliness:0,combat_hp:1725,combat_atk:78,combat_def:71,combat_spd:37,age_days:119.9,battles:3,wins:1}],{gold:99088711,stamina:85});
 const main=page.getByTestId('game-main'),screen=page.getByTestId('mecha-screen'),home=page.getByTestId('cockpit-home'),actions=page.getByTestId('care-actions');
 const assertVisiblePaint=async(minimum)=>{
  const sprite=screen.locator('svg[role="img"]');
  await expect(sprite).toBeVisible();
  const paint=await sprite.evaluate(el=>{
   const b=el.getBBox(),m=el.getScreenCTM(),p=new DOMPoint(b.x,b.y).matrixTransform(m),q=new DOMPoint(b.x+b.width,b.y+b.height).matrixTransform(m);
   return {x:Math.min(p.x,q.x),y:Math.min(p.y,q.y),w:Math.abs(q.x-p.x),h:Math.abs(q.y-p.y)};
  });
  console.log('UI_VISUAL '+JSON.stringify({viewport:page.viewportSize(),paint,svg:await sprite.boundingBox(),frame:await screen.boundingBox()}));
  expect(paint.w).toBeGreaterThanOrEqual(minimum);
  expect(paint.h).toBeGreaterThanOrEqual(minimum);
  const frame=await screen.boundingBox(),area=await main.boundingBox();
  expect(paint.y).toBeGreaterThanOrEqual(frame.y-1);
  expect(paint.y+paint.h).toBeLessThanOrEqual(frame.y+frame.height+1);
  const warnings=await screen.getByTestId('mecha-status-list').boundingBox();
  expect(paint.y+paint.h).toBeLessThanOrEqual(warnings.y+1);
  for(const el of await actions.getByRole('button').all()){
   const b=await el.boundingBox();const logical=await el.evaluate(e=>({w:e.offsetWidth,h:e.offsetHeight}));expect(logical.w).toBeGreaterThanOrEqual(44);expect(logical.h).toBeGreaterThanOrEqual(44);expect(b.y+b.height).toBeLessThanOrEqual(area.y+area.height+1);
   expect(await el.evaluate(e=>{const r=e.getBoundingClientRect();return e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))})).toBe(true);
  }
  expect(await main.evaluate(el=>el.scrollHeight-el.clientHeight)).toBeLessThanOrEqual(2);
 };
 await expect(home.getByRole('heading',{name:'鋼鐵族・重砲型・超限機'})).toBeVisible();
 await assertVisiblePaint(90);
 await page.getByTestId('game-shell').screenshot({path:'test-results/ui-visual/desktop.png',animations:'disabled'});
 const shell=page.getByTestId('game-shell');
 const portrait=await shell.boundingBox();
 expect(portrait.width).toBeLessThanOrEqual(400);
 expect(portrait.height).toBeGreaterThan(portrait.width);
 const assertSingleColumn=async()=>{await expect.poll(()=>home.evaluate(el=>{const hero=el.querySelector('.cockpit-hero').getBoundingClientRect(),panel=el.querySelector('.cockpit-console').getBoundingClientRect();return Math.max(Math.abs(hero.x-panel.x),Math.abs(hero.width-panel.width),hero.bottom-panel.top)})).toBeLessThanOrEqual(1)};
 await assertSingleColumn();
 await expect(home.getByRole('heading',{name:'鋼鐵族・重砲型・超限機'})).toBeVisible();
 await expect(home.locator('.cockpit-species')).toContainText('鋼鐵族');
 await expect(home.locator('.cockpit-species')).not.toContainText('重砲型');
 await expect(home.locator('.cockpit-species')).not.toContainText('超限機');
 await actions.getByRole('button',{name:'變形：重型坦克'}).click();
 await page.getByTestId('game-shell').screenshot({path:'test-results/ui-visual/desktop-vehicle.png',animations:'disabled'});
 await assertVisiblePaint(90);
 await actions.getByRole('button',{name:'切換機器人'}).click();
 await page.setViewportSize({width:1280,height:800});
 await expect.poll(()=>shell.evaluate(el=>el.getBoundingClientRect().width)).toBeCloseTo(400,0);
 await assertSingleColumn();
 await assertVisiblePaint(150);
 await shell.screenshot({path:'test-results/ui-visual/desktop-tall.png',animations:'disabled'});
 // Compare actual relative positions at the same logical phone dimensions.
 const layoutSignature=()=>shell.evaluate(el=>{
  const origin=el.getBoundingClientRect();
  return ['.cockpit-header','.cockpit-toolbar','.cockpit-hero','.cockpit-readouts','.cockpit-actions','.cockpit-nav'].map(selector=>{
   const r=el.querySelector(selector).getBoundingClientRect();return [r.x-origin.x,r.y-origin.y,r.width,r.height];
  });
 });
 const desktopLayout=await layoutSignature();
 await page.setViewportSize({width:400,height:780});
 await expect.poll(()=>shell.evaluate(el=>el.getBoundingClientRect().width)).toBeCloseTo(400,0);
 await assertSingleColumn();
 await assertVisiblePaint(150);
 const phoneLayout=await layoutSignature();
 for(let i=0;i<desktopLayout.length;i++)for(let j=0;j<4;j++)expect(Math.abs(desktopLayout[i][j]-phoneLayout[i][j])).toBeLessThanOrEqual(2);
 await shell.screenshot({path:'test-results/ui-visual/mobile-matched.png',animations:'disabled'});
 await page.setViewportSize({width:360,height:640});
 await expect.poll(()=>shell.evaluate(el=>el.getBoundingClientRect().width)).toBeCloseTo(360,0);
 await assertSingleColumn();
 await expect(home.getByRole('heading',{name:'鋼鐵族・重砲型・超限機'})).toBeVisible();
 expect(await home.locator('.cockpit-name h2').evaluate(el=>el.scrollWidth-el.clientWidth)).toBeLessThanOrEqual(1);
 await page.getByTestId('game-shell').screenshot({path:'test-results/ui-visual/mobile.png',animations:'disabled'});
 await assertVisiblePaint(85);
 await actions.getByRole('button',{name:'變形：重型坦克'}).click();
 await page.getByTestId('game-shell').screenshot({path:'test-results/ui-visual/mobile-vehicle.png',animations:'disabled'});
 await assertVisiblePaint(85);
});

test('skin shop, permanent wardrobe, first-step reveal and vehicle restoration',async({page})=>{
 await page.setViewportSize({width:390,height:780});
 await setupAuthenticatedGame(page,[{...dead,name:'皮膚測試',family:4,type:3,is_dead:false,is_sick:false,life_stage:4}],{gold:100});
 await page.getByRole('button',{name:'商城',exact:true}).click();
 await page.getByRole('button',{name:'皮膚 · 10 款'}).click();
 await expect(page.locator('.skin-card')).toHaveCount(10);
 await expect(page.getByRole('button',{name:'購買暗影惡魔 300G'})).toBeDisabled();
 await expect(page.getByRole('button',{name:'購買哈士奇 50G'})).toBeEnabled();
 await page.getByTestId('game-shell').screenshot({path:'test-results/ui-visual/skin-shop.png',animations:'disabled'});
 await page.getByRole('button',{name:'購買哈士奇 50G'}).click();
 await expect(page.getByRole('button',{name:'哈士奇 已收藏'})).toBeDisabled();
 await page.getByRole('button',{name:'關閉商城'}).click();
 await page.getByRole('button',{name:'皮膚衣櫃'}).click();
 await page.getByRole('button',{name:'穿戴哈士奇'}).click();
 await expect(page.getByTestId('mecha-current-form')).toHaveText('目前形態：哈士奇');
 await page.getByTestId('game-shell').screenshot({path:'test-results/ui-visual/skin-home.png',animations:'disabled'});
 await page.getByRole('button',{name:'競技',exact:true}).click();
 await page.getByRole('button',{name:'挑戰失控巡邏機'}).click();
 await expect(page.getByTestId('battle-reveal')).toBeVisible();
 await expect(page.getByRole('button',{name:'跳過戰鬥動畫'})).toBeDisabled();
 await page.getByTestId('game-shell').screenshot({path:'test-results/ui-visual/skin-reveal.png'});
 await expect(page.getByRole('status',{name:'勝利'})).toBeVisible({timeout:10000});
 await expect(page.getByTestId('battle-restored').getByRole('img',{name:'哈士奇'})).toBeVisible();
 await page.getByTestId('game-shell').screenshot({path:'test-results/ui-visual/skin-result.png',animations:'disabled'});
 await page.getByRole('button',{name:'離開戰場'}).click();
 await page.getByRole('button',{name:'養成',exact:true}).click();
 await expect(page.getByTestId('mecha-current-form')).toHaveText('目前形態：哈士奇');
 await page.getByRole('button',{name:'切換機器人'}).click();
 await expect(page.getByTestId('mecha-current-form')).toHaveText('目前形態：機器人');
 await page.getByRole('button',{name:'變形：重型坦克'}).click();
 await expect(page.getByTestId('mecha-current-form')).toHaveText('目前形態：重型坦克');
 await page.getByRole('button',{name:'競技',exact:true}).click();
 await page.getByRole('button',{name:'挑戰失控巡邏機'}).click();
 await expect(page.getByTestId('battle-reveal')).toBeVisible();
 await expect(page.getByRole('status',{name:'勝利'})).toBeVisible({timeout:10000});
 await expect(page.getByTestId('battle-restored').getByRole('img',{name:'重型坦克'})).toBeVisible();
 await page.getByRole('button',{name:'離開戰場'}).click();
 await page.getByRole('button',{name:'養成',exact:true}).click();
 await expect(page.getByTestId('mecha-current-form')).toHaveText('目前形態：重型坦克');
 await page.getByRole('button',{name:'恢復偽裝'}).click();
 await expect(page.getByTestId('mecha-current-form')).toHaveText('目前形態：哈士奇');
 await page.reload({waitUntil:'domcontentloaded'});
 await expect(page.getByTestId('mecha-current-form')).toHaveText('目前形態：哈士奇');
 await page.getByRole('button',{name:'更多功能'}).click();
 await page.getByRole('button',{name:'社交',exact:true}).click();
 await expect(page.getByRole('img',{name:'哈士奇'})).toBeVisible();
 await expect(page.getByText('偽裝造型',{exact:true})).toBeVisible();
 await page.getByTestId('game-shell').screenshot({path:'test-results/ui-visual/skin-plaza.png',animations:'disabled'});
 await page.getByRole('button',{name:'更多功能'}).click();
 await page.getByRole('button',{name:'機甲首領',exact:true}).click();
 await expect(page.getByTestId('raid-fighter').getByRole('img',{name:'哈士奇'})).toBeVisible();
 await page.getByRole('button',{name:/發動討伐突襲/}).click();
 await expect(page.getByTestId('battle-reveal')).toBeVisible();
 await expect(page.getByText(/造成 100 點傷害/)).toBeVisible({timeout:10000});
 await expect(page.getByTestId('raid-fighter').getByRole('img',{name:'哈士奇'})).toBeVisible();
 await page.getByRole('button',{name:'養成',exact:true}).click();
 await page.getByRole('button',{name:'皮膚衣櫃'}).click();
 await expect(page.getByRole('button',{name:'穿戴哈士奇'})).toHaveAttribute('aria-pressed','true');
 await page.getByRole('button',{name:'卸下皮膚'}).click();
 await expect(page.getByTestId('mecha-current-form')).toHaveText('目前形態：機器人');
});

test('manual tactical duel is playable with timing, energy and no economy writes',async({page})=>{
 await page.setViewportSize({width:360,height:640});
 await page.emulateMedia({reducedMotion:'reduce'});
 const calls=await setupAuthenticatedGame(page,[{...dead,name:'戰術機甲',life_stage:5,is_dead:false,is_sick:false,skin_id:'skin_husky'}]);
 await page.getByRole('button',{name:'競技',exact:true}).click();
 await page.getByRole('button',{name:'手動戰術對戰'}).click();
 const duel=page.getByTestId('tactical-duel');
 await expect(duel).toBeVisible();
 await expect(duel.getByTestId('battle-reveal')).toBeVisible();
 await expect(duel.getByRole('button',{name:'格擋反擊'})).toBeDisabled();
 await expect(duel.getByRole('button',{name:'格擋反擊'})).toBeEnabled({timeout:5000});
 await expect(duel.getByRole('button',{name:'破防重擊'})).toBeDisabled();
 await expect(duel.getByTestId('tactical-hp-0')).toHaveText('100 / 100');
 await page.getByTestId('game-shell').screenshot({path:'test-results/ui-visual/tactical-mobile.png',animations:'disabled'});
 await page.clock.install();
 await duel.getByRole('button',{name:'格擋反擊'}).click();
 await page.clock.runFor(900);
 await duel.getByRole('button',{name:'立即格擋'}).click();
 await expect(duel.getByTestId('tactical-hp-0')).toHaveText('100 / 100');
 await expect(duel.getByTestId('tactical-hp-1')).toHaveText('75 / 100');
 await expect(duel.getByText(/完美格擋！反擊 25/)).toBeVisible();
 await expect(duel.getByRole('button',{name:'破防重擊'})).toBeEnabled();
 await duel.getByRole('button',{name:'破防重擊'}).click();
 await expect(duel.getByTestId('tactical-hp-1')).toHaveText('40 / 100');
 await page.setViewportSize({width:1280,height:550});
 await page.getByTestId('game-shell').screenshot({path:'test-results/ui-visual/tactical-short-desktop.png',animations:'disabled'});
 await page.setViewportSize({width:1280,height:900});
 await page.getByTestId('game-shell').screenshot({path:'test-results/ui-visual/tactical-desktop.png',animations:'disabled'});
 for(let i=0;i<16;i++){const btn=duel.getByRole('button',{name:'蓄能'});if(!(await btn.isVisible()))break;await btn.click();}
 await expect(duel.getByRole('button',{name:'再戰一場'})).toBeVisible();
 await expect(duel.getByTestId('battle-restored').getByRole('img',{name:'哈士奇'})).toBeVisible();
 await duel.getByRole('button',{name:'再戰一場'}).click();
 await expect(duel.getByTestId('battle-reveal')).toBeVisible();
 await expect(duel.getByTestId('tactical-hp-0')).toHaveText('100 / 100');
 await duel.getByRole('button',{name:'離開戰術對戰'}).click();
 await expect(page.getByRole('button',{name:'手動戰術對戰'})).toBeVisible();
 expect(calls).not.toContain('/rest/v1/rpc/game_action');
});

test('single feature entrances and independent catalog transformation previews',async({page})=>{
 await page.setViewportSize({width:360,height:640});await page.emulateMedia({reducedMotion:'reduce'});
 const calls=await setupAuthenticatedGame(page,[{...dead,name:'圖鑑測試',family:4,type:3,life_stage:6,is_dead:false,is_sick:false}]);
 const home=page.getByTestId('cockpit-home'),nav=page.getByRole('navigation',{name:'遊戲導覽'}),main=page.getByTestId('game-main');
 await expect(home.getByRole('button',{name:'開始戰鬥'})).toHaveCount(0);
 await expect(nav.getByRole('button',{name:'競技',exact:true})).toHaveCount(1);
 await expect(home.getByRole('button',{name:'改名',exact:true})).toHaveCount(1);
 await home.getByRole('button',{name:'機體詳細資料'}).click();
 await expect(home.getByRole('button',{name:'改名',exact:true})).toHaveCount(1);
 await page.getByRole('button',{name:'關閉詳細資料'}).click();
 await nav.getByRole('button',{name:'競技',exact:true}).click();
 await expect(main.getByRole('button',{name:'好友名單'})).toHaveCount(0);
 await expect(main.getByRole('button',{name:'世界聊天'})).toHaveCount(0);
 await expect(main.getByRole('button',{name:'手動戰術對戰'})).toBeVisible();
 await nav.getByRole('button',{name:'更多功能'}).click();
 await page.getByRole('button',{name:'社交',exact:true}).click();
 await expect(main.getByRole('button',{name:/好友/})).toBeVisible();
 await expect(main.getByRole('button',{name:/頻道/})).toBeVisible();
 await nav.getByRole('button',{name:'倉庫',exact:true}).click();
 await expect(main.getByRole('button',{name:'回家照顧選定機體'})).toHaveCount(0);
 await nav.getByRole('button',{name:'圖鑑',exact:true}).click();
 await page.getByRole('button',{name:'鋼鐵族',exact:true}).click();
 const first=page.getByTestId('catalog-2_4_1'),second=page.getByTestId('catalog-2_4_2'),early=page.getByTestId('catalog-2_3_1');
 await expect(early.locator('.catalog-transform')).toHaveCount(0);
 await expect(first.getByRole('img',{name:'鋼鐵族・堡壘型・戰鬥機'})).toBeVisible();
 await expect(second.getByRole('img',{name:'鋼鐵族・重砲型・戰鬥機'})).toBeVisible();
 await first.getByRole('button',{name:'變身：鋼鐵族・堡壘型・戰鬥機'}).click();
 await expect(first.getByRole('img',{name:'裝甲運輸車'})).toBeVisible();
 await expect(second.getByRole('img',{name:'鋼鐵族・重砲型・戰鬥機'})).toBeVisible();
 await second.getByRole('button',{name:'變身：鋼鐵族・重砲型・戰鬥機'}).click();
 await expect(second.getByRole('img',{name:'重型坦克'})).toBeVisible();
 await first.getByRole('button',{name:'還原：鋼鐵族・堡壘型・戰鬥機'}).click();
 await expect(first.getByRole('img',{name:'鋼鐵族・堡壘型・戰鬥機'})).toBeVisible();
 await expect(second.getByRole('img',{name:'重型坦克'})).toBeVisible();
 const bounds=await main.boundingBox();
 for(const btn of await main.locator('.catalog-transform').all()){const b=await btn.boundingBox();expect(b.height).toBeGreaterThanOrEqual(44);expect(b.y+b.height).toBeLessThanOrEqual(bounds.y+bounds.height+1);}
 expect(await main.evaluate(el=>el.scrollHeight-el.clientHeight)).toBeLessThanOrEqual(2);
 await page.getByTestId('game-shell').screenshot({path:'test-results/ui-visual/catalog-mobile.png',animations:'disabled'});
 await page.setViewportSize({width:1280,height:800});
 await expect.poll(()=>page.getByTestId('game-shell').evaluate(el=>el.getBoundingClientRect().width)).toBeCloseTo(400,0);
 await page.getByTestId('game-shell').screenshot({path:'test-results/ui-visual/catalog-desktop.png',animations:'disabled'});
 await second.getByRole('button',{name:'鋼鐵族・重砲型・戰鬥機',exact:true}).click();
 await expect(page.getByRole('dialog').getByRole('img',{name:'重型坦克'})).toBeVisible();
 await page.getByRole('button',{name:'關閉圖鑑詳情'}).click();
 expect(calls).not.toContain('/rest/v1/rpc/game_action');
});

 test('zero stock opens checkout without visiting the store and buying updates stock',async({page})=>{
 const calls=await setupAuthenticatedGame(page,[{...dead,name:'補給測試機',is_dead:false,is_sick:false}],{gold:50});
 await page.getByRole('button',{name:'補充能源'}).click();
 await page.getByRole('button',{name:'標準電池',exact:true}).click();
 const checkout=page.getByRole('dialog',{name:'購買確認'});
 await expect(checkout).toBeVisible();
 await expect(checkout.getByText('10G',{exact:true})).toBeVisible();
 expect(calls.filter(x=>x==='/rest/v1/rpc/game_action')).toHaveLength(0);
 await checkout.getByRole('button',{name:'確認購買 10G'}).click();
 await expect(checkout).toHaveCount(0);
 const menu=page.getByTestId('item-menu');
 await expect(menu.getByRole('button',{name:'標準電池',exact:true})).toContainText('庫存 1');
 expect(calls.filter(x=>x==='/rest/v1/rpc/game_action')).toHaveLength(1);
});
test('zero gold checkout explains deficit without charging',async({page})=>{
 const calls=await setupAuthenticatedGame(page,[{...dead,name:'補給測試機',is_dead:false,is_sick:false}]);
 await page.getByRole('button',{name:'補充能源'}).click();
 await page.getByRole('button',{name:'標準電池',exact:true}).click();
 const checkout=page.getByRole('dialog',{name:'購買確認'});
 await expect(checkout.getByText('金幣不足，還需 10G')).toBeVisible();
 await expect(checkout.getByRole('button',{name:'確認購買 10G'})).toBeDisabled();
 await checkout.getByRole('button',{name:'取消',exact:true}).click();
 await expect(page.getByTestId('item-menu')).toBeVisible();
 expect(calls.filter(x=>x==='/rest/v1/rpc/game_action')).toHaveLength(0);
});
