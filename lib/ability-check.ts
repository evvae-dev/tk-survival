import type { Game, HistoricalEvent, AbilityRoll, Stats } from './game';
import type { FlowCheck, FlowNode } from './event-flow-types';
import opponents from '@/data/reference/officer-abilities.json';

export const checkKinds = { battle: '전투', duel: '일기토', strategy: '전략', politics: '정치', relationship: '사람 관계', custom: '복합 판정' };
export const checkWeights: Record<Exclude<FlowCheck['kind'], 'custom'>, Partial<Stats>> = {
  battle: { leadership: 1.5, strength: 1 }, duel: { strength: 1 }, strategy: { intelligence: 1 }, politics: { politics: 1 }, relationship: { charisma: 1 },
};
export function validCheck(check: FlowCheck): boolean {
  if (!check || !(check.kind in checkKinds) || typeof check.success !== 'string' || !check.success.trim() || typeof check.failure !== 'string' || !check.failure.trim()) return false;
  if (check.opponentId !== undefined && !opponents.some(officer => officer.id === check.opponentId)) return false;
  if (check.difficulty !== undefined && (!Number.isFinite(check.difficulty) || check.difficulty < 0 || check.difficulty > 100)) return false;
  if (check.fameReward !== undefined && (!Number.isFinite(check.fameReward) || check.fameReward <= 0)) return false;
  if (check.fameReason !== undefined && typeof check.fameReason !== 'string') return false;
  if (check.weights === undefined) return check.kind !== 'custom';
  const weights = Object.entries(check.weights ?? {});
  return weights.length > 0 && weights.every(([key, value]) => ['leadership','strength','intelligence','politics','charisma'].includes(key) && Number.isFinite(value) && value >= 0) && weights.some(([, value]) => value > 0);
}
export type ChoiceCheck = FlowCheck & { weights: Partial<Stats>; difficulty: number; fameReward: number; playerScore: number; opponentScore?: number; opponentName?: string; opponentStats?: Stats; multiplier: number; successRate: number; failureRate: number };
export function successRate(value: number): number { return Math.max(0, Math.min(100, Math.round(value * 100) / 100)); }
export function weightedScore(stats: Stats, weights: Partial<Stats>): number {
  return (Object.entries(weights) as [keyof Stats, number][]).reduce((sum, [key, weight]) => sum + stats[key] * weight, 0);
}
export function checkPreview(game: Game, check: FlowCheck, multiplier = Number(process.env.NEXT_PUBLIC_ABILITY_CHECK_WEIGHT ?? 1.5)): ChoiceCheck {
  const weights = check.weights ?? (check.kind === 'custom' ? {} : checkWeights[check.kind]);
  const difficulty = check.difficulty ?? 50;
  const opponent = check.opponentId ? opponents.find(officer => officer.id === check.opponentId) : undefined;
  if (check.opponentId && !opponent) throw new Error(`판정 상대 장수 ID가 없습니다: ${check.opponentId}`);
  const playerScore = weightedScore(game.stats, weights);
  const opponentScore = opponent ? weightedScore(opponent.stats, weights) : undefined;
  const chance = opponentScore === undefined
    ? playerScore / Object.values(weights).reduce((sum, weight) => sum + weight!, 0)
    : 50 + (playerScore - opponentScore) * multiplier;
  const rate = successRate(chance + 50 - difficulty);
  return { ...check, weights, difficulty, fameReward: check.fameReward ?? 4, playerScore, opponentScore, opponentName: opponent?.name, opponentStats: opponent?.stats, multiplier, successRate: rate, failureRate: successRate(100 - rate) };
}
export function getChoiceCheck(game: Game, event: HistoricalEvent, node: FlowNode, optionId: string): ChoiceCheck | undefined {
  const edge = event.flow?.edges.find(edge => edge.source === node.id && edge.sourceHandle === optionId);
  const next = event.flow?.nodes.find(next => next.id === edge?.target);
  return next?.type === 'check' && next.data.check ? checkPreview(game, next.data.check) : undefined;
}
export function rollAbility(game: Game, check: FlowCheck, random: () => number): AbilityRoll {
  const preview = checkPreview(game, check);
  const roll = random() * 100;
  return { weights: preview.weights, difficulty: preview.difficulty, fameReward: preview.fameReward, ...(check.opponentId ? { opponentId: check.opponentId } : {}), playerScore: preview.playerScore, ...(preview.opponentScore === undefined ? {} : { opponentScore: preview.opponentScore }), multiplier: preview.multiplier, chance: preview.successRate, roll, success: roll < preview.successRate };
}
