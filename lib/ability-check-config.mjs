export function readAbilityCheckWeight(env) {
  const weight = Number(env.ABILITY_CHECK_WEIGHT ?? 1.5);
  if (!Number.isFinite(weight) || weight < 0) throw new Error('ABILITY_CHECK_WEIGHT는 0 이상의 수여야 합니다.');
  return weight;
}
