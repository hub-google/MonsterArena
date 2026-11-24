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

async function setupAuthenticatedGame(page, initialPets=[dead]) {
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
  const calls = [];
  await page.route(gameHost + '/**', async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (request.method() === 'OPTIONS') return json(route, {});
    calls.push(path);
    if (path === '/auth/v1/user') return json(route, user);
    if (path === '/rest/v1/rpc/game_ensure_profile') return json(route, profile);
    if (path === '/rest/v1/rpc/game_claim_gifts') return json(route, 0);
    if (path === '/rest/v1/rpc/game_age_monsters') return json(route, null);
    if (path === '/rest/v1/monsters') return json(route, pets);
    if (path === '/rest/v1/user_inventory') return json(route, inventory);
    if (path === '/rest/v1/friends') return json(route, []);
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
      if(args.p_action==='battle')return json(route,{battleId:'mock-battle',won:true,events:[{attacker:'A',damage:50,ownHp:500,enemyHp:0}],enemyName:'野外失控機甲',enemyFamily:3,enemyType:1,enemyStage:3,ownMaxHp:500,enemyMaxHp:50,ownHp:500,enemyHp:0,reward:0});
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
  await expect(page.getByRole('status',{name:'此怪獸已死亡，無法照顧或出戰'})).toBeVisible();
  await expect(page.getByRole('button', { name: /治療/ })).toBeDisabled();
  await page.getByRole('button', { name: '倉庫', exact: true }).click();
  await page.getByRole('button', { name: '裝備晶片' }).click();
  await expect(page.getByText('此怪獸已死亡，無法鑲嵌或拆除晶片。')).toBeVisible();
  await expect(page.getByRole('button', { name: /拆除 \(需提取器\)/ })).toBeDisabled();
  await page.locator('select').last().selectOption('chip_hp');
  await expect(page.getByRole('button', { name: /確認鑲嵌/ })).toBeDisabled();
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
 await expect(actions.getByRole('button')).toHaveCount(6);
 for(const button of await actions.getByRole('button').all()){const b=await button.boundingBox();expect(b.width).toBeGreaterThanOrEqual(44);expect(b.height).toBeGreaterThanOrEqual(44);}
 await actions.getByRole('button',{name:'補充能源'}).click();
 await page.getByRole('button',{name:'免費基礎飼料'}).click();
 await expect(page.getByRole('progressbar',{name:'能源'})).toHaveAttribute('aria-valuenow','70');
 await actions.getByRole('button',{name:'打掃'}).click();
 await expect(page.getByRole('progressbar',{name:'機體維護'})).toHaveAttribute('aria-valuenow','100');
 await actions.getByRole('button',{name:'治療'}).click();
 await expect(page.getByRole('button',{name:'免費急救草藥，扣減20%生命'})).toBeEnabled();
 await page.getByRole('button',{name:'取消返回'}).click();
 await actions.getByRole('button',{name:'訓練'}).click();
 await expect.poll(()=>calls.filter(x=>x==='/rest/v1/rpc/game_action').length).toBe(3);
 await actions.getByRole('button',{name:'開始戰鬥'}).click();
 await expect(page.getByTestId('wild-challenges')).toBeVisible();
 await page.getByRole('button',{name:'挑戰野外失控機甲'}).click();
 await expect(page.getByRole('status',{name:'勝利'})).toBeVisible();
 await page.getByRole('button',{name:'離開戰場'}).click();
 await page.getByRole('button',{name:'圖鑑',exact:true}).click();
 await expect(page.getByRole('button',{name:'疾風族',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'更多功能'}).click();
 await expect(page.getByRole('button',{name:'世界王',exact:true})).toBeVisible();
});

test('cockpit shows readable labels, all main metrics and six actions within one mobile viewport',async({page})=>{
 await page.setViewportSize({width:360,height:640});await page.emulateMedia({reducedMotion:'reduce'});
 await setupAuthenticatedGame(page,[{...dead,name:'機甲測試',family:4,type:3,life_stage:6,is_dead:false,is_sick:true,fullness:20,cleanliness:20}]);
 const main=page.getByTestId('game-main'),home=page.getByTestId('cockpit-home'),actions=page.getByTestId('care-actions');
 await expect(home.getByRole('heading',{name:'機甲測試'})).toBeVisible();
 await expect(home.getByText('鋼鐵族・重砲型',{exact:true})).toBeVisible();
 await expect(home.getByText('能源',{exact:true})).toBeVisible();
 await expect(home.getByText('機體維護',{exact:true})).toBeVisible();
 await expect(home.getByTestId('combat-readouts')).toBeVisible();
 for(const label of ['補充能源','清潔保養','修復治療','機體訓練','開始戰鬥','機體變形'])await expect(actions.getByText(label,{exact:true})).toBeVisible();
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
