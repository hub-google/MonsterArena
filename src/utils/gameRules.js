// Shared hatch eligibility and copy, aligned with game_action('hatch').
// No Supabase calls here: logic can be unit-tested without live player data.
export const EGG_PRICE = 100;
export const MAX_MONSTERS = 50;

export function getHatchState(user, monsters = []) {
  const stocked = monsters.length >= MAX_MONSTERS;
  const canAfford = Number(user?.gold ?? 0) >= EGG_PRICE;
  const hasLivingMonster = monsters.some(monster => !monster.is_dead);
  const isRescue = !canAfford && !hasLivingMonster;
  return {
    available: !stocked && (canAfford || isRescue),
    isRescue,
    label: isRescue ? '免費領取救援核心' : '啟動新機械核心 (-100G)',
  };
}

// Client guards mirror the server-side rejection of deceased pets.
export const canCareForMonster = monster => Boolean(monster && !monster.is_dead && monster.life_stage > 1);
export const canHealMonster = monster => Boolean(monster && !monster.is_dead && monster.is_sick);
export const canManageMonsterChips = monster => Boolean(monster && !monster.is_dead);

// Refresh only the resources a successful server action can change.
export const ACTION_RESOURCES=Object.freeze({
 hatchEgg:['profile','monsters'],feed:['profile','monsters','inventory'],
 clean:['monsters'],heal:['monsters','inventory'],train:['profile','monsters','inventory'],allocateTraining:['profile','monsters'],
 evolve:['monsters','inventory'],release:['profile','monsters','inventory'],
 toggleLock:['monsters'],equipChip:['monsters','inventory'],unequipChip:['monsters','inventory'],
 breed:['profile','monsters','inventory'],buyItem:['profile','inventory'],equipSkin:['monsters'],
 rename:['monsters'],claimQuest:['profile'],startBattle:['profile','monsters'],claimRaid:['profile'],
 attackRaidBoss:['profile'],createGuild:['profile','guilds'],joinGuild:['guilds'],
 leaveGuild:['guilds'],donateGuild:['profile','guilds'],buyGuildShop:['guilds','inventory'],
 addFriend:['friends']
});
export function resourcesForAction(api,action){
 const name=Object.keys(ACTION_RESOURCES).find(key=>api[key]===action);
 return name ? ACTION_RESOURCES[name] : undefined;
}

// A committed mutation must never be reported as failed just because a subsequent read fails.
export const COMMITTED_REFRESH_WARNING = '操作已成功，但資料更新失敗，請重新整理；不要重複操作。';
export async function refreshAfterCommit(refresh, resources) {
  try { await refresh(resources); return null; }
  catch { return COMMITTED_REFRESH_WARNING; }
}
export const canBattleMonster = monster => Boolean(monster && !monster.is_dead &&
  Number(monster.life_stage)>=2 && !monster.is_frozen && !monster.repair_until);
export function selectBattleMonster(monsters, preferredId) {
  return monsters.find(m=>m.monster_id===preferredId && canBattleMonster(m)) ||
    monsters.find(canBattleMonster) || null;
}
