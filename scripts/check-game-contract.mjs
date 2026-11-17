import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { GAME_FUNCTIONS } from '../supabase/schema/manifest.mjs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const api = read('src/utils/api.js');
const arena = read('src/pages/Arena.jsx');
const dashboard = read('src/pages/Dashboard.jsx');
const roster = read('src/pages/Roster.jsx');
const pkg = JSON.parse(read('package.json'));

// Historical migrations remain intact but must NEVER be used as the authoritative
// definition. One active definition per RPC is maintained under schema/functions.
assert.equal(GAME_FUNCTIONS.length, 8);
const seen = new Set();
const sql = new Map();
for (const { name, signature } of GAME_FUNCTIONS) {
  assert.ok(!seen.has(name), 'Duplicate current RPC: ' + name);
  seen.add(name);
  const source = read(`supabase/schema/functions/${name}.sql`);
  const declared = [...source.matchAll(/create or replace function\s+public\.(game_\w+)\s*\(/gi)];
  assert.deepEqual(declared.map(x => x[1]), [name], 'Only one current function per source file');
  assert.match(source, /security definer/i);
  assert.match(source, /set search_path/i);
  assert.ok(source.includes('REVOKE ALL ON FUNCTION public.' + name + signature + ' FROM PUBLIC, anon;'));
  assert.ok(source.includes('GRANT EXECUTE ON FUNCTION public.' + name + signature + ' TO authenticated;'));
  sql.set(name, source);
}
const current = sql.get('game_action');
assert.match(current, /p_action\s*=\s*'hatch'/i);
assert.match(current, /p_action\s*=\s*'battle'/i);
assert.match(current, /gen_random_uuid\(\)::text/);
assert.doesNotMatch(current, /v_won\s*:=\s*\(p_data->>'won'\)/);
assert.match(current, /v_value\s*:=\s*v_value\s*\*\s*1\.1/);
assert.match(current, /if p_action in \('feed','clean','train'\)/);
assert.match(current, /created_at\s*>\s*clock_timestamp\(\)\s*-\s*interval '5 seconds'/);
assert.match(current, /v_slot is null or v_slot not in \(1,2\)/);
assert.equal((current.match(/v_slot is null or v_slot not in \(1,2\)/g) || []).length, 2);
assert.match(current, /game_chip_reserves/);
assert.match(current, /chip_slot_1_val\s*=\s*v_bonus/);
assert.match(current, /chip_slot_2_val\s*=\s*v_bonus/);
assert.match(current, /v_rescue\s*:=\s*true/);
assert.match(current, /v_reward\s*:=\s*case when coalesce\(v_m\.is_rescue,false\) then 0/);
assert.match(current, /if not coalesce\(v_m\.is_dead,false\)/);
assert.match(sql.get('game_plaza_monsters'), /recent_players/);
assert.match(sql.get('game_plaza_monsters'), /pet_rank\s*<=\s*3/);
assert.match(sql.get('game_friend_action'), /get diagnostics v_changed=row_count/);
assert.match(api, /game_age_monsters/);
assert.match(api, /game_public_profiles/);
assert.match(api, /game_plaza_monsters/);
assert.match(arena, /api\.startBattle/);
assert.doesNotMatch(arena, /recordBattleResult/);
assert.doesNotMatch(api, /from\('monsters'\)\.update/);
assert.doesNotMatch(api, /from\('users'\)\.select\('user_id,username'\)/);
assert.match(dashboard, /getHatchState/);
assert.match(roster, /getHatchState/);
assert.match(dashboard, /此怪獸已死亡/);
assert.match(dashboard, /disabled=\{loading \|\| !canHealMonster\(monster\)\}/);
assert.match(roster, /!canManageMonsterChips\(selectedMonster\)/);
assert.match(read('src/pages/Social.jsx'), /disabled=\{sendingChat \|\| !chatMessage\.trim\(\)\}/);
assert.match(dashboard, /monster\.is_dead \|\| getItemQty\('ultimate_core'\)/);
assert.ok(!('firebase' in pkg.dependencies));
assert.ok(!('firebase-tools' in pkg.devDependencies));
assert.ok(!readdirSync(new URL('../src/utils/', import.meta.url)).includes('firebaseClient.js'));
console.log('Canonical Arena RPC contracts and current frontend rules passed.');
