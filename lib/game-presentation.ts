import type { Stats } from './game';

export const abilityKeys = ['leadership', 'strength', 'intelligence', 'politics', 'charisma'] as const;
export type AbilityKey = typeof abilityKeys[number];
export const abilityLabels: Record<AbilityKey, string> = { leadership: '통솔', strength: '무력', intelligence: '지력', politics: '정치', charisma: '매력' };
export function radarPoint(index: number, value: number, radius = 72) {
  const angle = index * Math.PI * 2 / abilityKeys.length - Math.PI / 2;
  return { x: 140 + Math.cos(angle) * radius * value / 100, y: 121 + Math.sin(angle) * radius * value / 100 };
}
export function radarPolygon(values: number[], radius = 72) {
  return values.map((value, index) => { const point = radarPoint(index, value, radius); return `${point.x},${point.y}`; }).join(' ');
}
export function testAbilityDelta(stats: Stats): Partial<Stats> {
  return { ...Object.fromEntries(abilityKeys.map(key => [key, 70 - stats[key]])) };
}
