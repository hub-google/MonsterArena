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
    label: isRescue ? '免費領取救援數位蛋' : '孵化新怪獸蛋 (-100G)',
  };
}

// Client guards mirror the server-side rejection of deceased pets.
export const canCareForMonster = monster => Boolean(monster && !monster.is_dead && monster.life_stage > 1);
export const canHealMonster = monster => Boolean(monster && !monster.is_dead && monster.is_sick);
export const canManageMonsterChips = monster => Boolean(monster && !monster.is_dead);
