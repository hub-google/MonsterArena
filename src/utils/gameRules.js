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
 clean:['monsters'],heal:['monsters','inventory'],train:['profile','monsters','inventory'],
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
