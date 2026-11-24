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

async function setupAuthenticatedGame(page) {
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

  let pets = [dead];
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
      throw new Error('Disabled UI issued a game_action: ' + args.p_action);
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
  await expect(page.getByText('此怪獸已死亡，無法補充能源、打掃、治療、訓練或進化。')).toBeVisible();
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
