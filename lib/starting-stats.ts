import type { Stats } from './game';
import { abilityKeys } from './game-presentation';
export const STARTING_STAT_MIN = 30;
export const STARTING_STAT_MAX = 80;
export function rollStartingStats(random: () => number = Math.random): Stats {
  return Object.fromEntries(abilityKeys.map(key => [key, STARTING_STAT_MIN + Math.floor(random() * (STARTING_STAT_MAX - STARTING_STAT_MIN + 1))])) as Stats;
}
export function validStartingStats(stats: Stats): boolean {
  return abilityKeys.every(key => Number.isInteger(stats[key]) && stats[key] >= STARTING_STAT_MIN && stats[key] <= STARTING_STAT_MAX);
}
