import { describe, expect, it, vi } from 'vitest';
import { newGame, migrateGame } from '@/stores/game-store';
import { checkPreview, rollAbility, validCheck, weightedScore } from './ability-check';
import { getCurrentEvent, choiceKey, resolveChoice } from './event-engine';
import { historicalEvents } from './history';
import { validateEvent } from './event-flow';
import { upgradeLegacyEvent } from './catalog-upgrade';
import { readAbilityCheckWeight } from './ability-check-config.mjs';
import type { FlowCheck } from './event-flow-types';

const duel: FlowCheck = { kind: 'duel', opponentId: 'rtk14-0746', success: '등무를 생포한다.', failure: '등무를 놓친다.' };
const makeGame = () => newGame('확률 검증', 184, 'zhuo', 'farmer');

describe('A·B 능력 비교 판정', () => {
  it('실제 등무 무력 76과 비교해 동률 50%, 차이 × 1.5를 적용한다', () => {
    const game = makeGame();
    for (const [strength, rate] of [[76, 50], [96, 80], [56, 20]]) {
      game.stats.strength = strength;
      const preview = checkPreview(game, duel, 1.5);
      expect(preview.opponentName).toBe('등무');
      expect(preview.opponentScore).toBe(76);
      expect(preview.successRate).toBe(rate);
      expect(preview.failureRate + preview.successRate).toBe(100);
    }
  });
  it('전투 보정치는 통솔 × 1.5 + 무력이다', () => {
    const game = makeGame(); game.stats.leadership = 70; game.stats.strength = 80;
    const preview = checkPreview(game, { ...duel, kind: 'battle' }, 1.5);
    expect(preview.playerScore).toBe(185);
    expect(preview.opponentScore).toBe(61 * 1.5 + 76);
    expect(preview.successRate).toBe(76.25);
  });
  it('복합 비중과 상대가 없는 능력치%를 함께 지원한다', () => {
    const game = makeGame(); game.stats.strength = 60; game.stats.intelligence = 40;
    const custom: FlowCheck = { ...duel, kind: 'custom', weights: { strength: .5, intelligence: 1.5 } };
    expect(checkPreview(game, custom, 1.5).successRate).toBe(62.75);
    expect(weightedScore(game.stats, custom.weights!)).toBe(90);
    game.stats.charisma = 75;
    expect(checkPreview(game, { kind: 'relationship', success: '설득', failure: '거절' }).successRate).toBe(75);
    expect(checkPreview(game, { ...custom, opponentId: undefined }).successRate).toBe(45);
  });
  it('전략·정치·관계는 각각 지력·정치·매력을 사용한다', () => {
    const game = makeGame(); game.stats.intelligence = 61; game.stats.politics = 72; game.stats.charisma = 83;
    for (const [kind, rate] of [['strategy', 61], ['politics', 72], ['relationship', 83]] as const) {
      expect(checkPreview(game, { kind, success: '성공', failure: '실패' }).successRate).toBe(rate);
    }
  });
  it('가중치 설정과 0~100% 경계, 잘못된 판정 구성을 검증한다', () => {
    const game = makeGame(); game.stats.strength = 96;
    expect(checkPreview(game, duel, 0).successRate).toBe(50);
    expect(checkPreview(game, duel, 3).successRate).toBe(100);
    game.stats.strength = 0;
    expect(checkPreview(game, duel).successRate).toBe(0);
    expect(readAbilityCheckWeight({ ABILITY_CHECK_WEIGHT: '2' })).toBe(2);
    for (const value of ['-1', 'abc', 'Infinity']) expect(() => readAbilityCheckWeight({ ABILITY_CHECK_WEIGHT: value })).toThrow();
    expect(validCheck({ ...duel, kind: 'custom', weights: { strength: -1 } })).toBe(false);
    expect(validCheck({ ...duel, kind: 'custom', weights: {} })).toBe(false);
    expect(validCheck({ ...duel, opponentId: '없는-ID' })).toBe(false);
  });
  it('정확한 확률 경계를 사용하고 0%와 100%를 보장한다', () => {
    const game = makeGame(); game.stats.strength = 96;
    expect(rollAbility(game, duel, () => .79999).success).toBe(true);
    expect(rollAbility(game, duel, () => .8).success).toBe(false);
    const noOpponent: FlowCheck = { kind: 'duel', success: '성공', failure: '실패' };
    game.stats.strength = 0; expect(rollAbility(game, noOpponent, () => 0).success).toBe(false);
    game.stats.strength = 100; expect(rollAbility(game, noOpponent, () => .99999).success).toBe(true);
  });
  it('미리보기는 추첨하지 않고 선택할 때 한 번만 추첨·저장한다', () => {
    let game = makeGame();
    for (const option of ['side:han', 'front:north']) {
      const event = getCurrentEvent(game)!;
      game = resolveChoice(game, choiceKey(event, option));
    }
    game.stats.strength = 96;
    const random = vi.fn(() => .1);
    const current = getCurrentEvent(game)!;
    expect(current.choices.find(choice => choice.id === 'han-plan:duel')!.check?.successRate).toBe(80);
    const key = choiceKey(current, 'han-plan:duel');
    const next = resolveChoice(game, key, historicalEvents, random);
    expect(random).toHaveBeenCalledTimes(1);
    expect(next.decisions.at(-1)?.check).toMatchObject({ opponentId: 'rtk14-0746', chance: 80, roll: 10, success: true });
    expect(next.world.flags.daxingshanCapturedLeaders).toBe(true);
    const restored = JSON.parse(JSON.stringify(next));
    getCurrentEvent(restored); getCurrentEvent(restored);
    expect(resolveChoice(restored, key, historicalEvents, random)).toBe(restored);
    expect(random).toHaveBeenCalledTimes(1);
    const failure = resolveChoice(game, key, historicalEvents, () => .99);
    expect(failure.decisions.at(-1)?.check?.success).toBe(false);
    expect(failure.world.people['person-rtk14-0746']).toBe('dead');
  });
  it('이전 저장에서 체력·자금을 제거해도 진행과 세계를 보존한다', () => {
    const game = makeGame();
    const legacy = { game: { ...game, stats: { ...game.stats, health: 3, money: 999 } } };
    const migrated = migrateGame(legacy, 5).game!;
    expect(migrated.stats).toEqual(game.stats);
    expect(migrated.world).toEqual(game.world);
    expect(migrated.turn).toBe(game.turn);
  });
  it('이전 편집본은 문구를 보존하면서 폐기된 효과와 판정을 이관한다', () => {
    const legacy = structuredClone(historicalEvents.find(event => event.id === 'battle-184-daxingshan')!);
    const node = legacy.flow!.nodes.find(node => node.id === 'duel-check')!;
    node.type = 'condition'; node.data = { label: '예전 무력 조건', condition: { field: 'stats.strength', operator: 'gte', value: 65 } };
    legacy.flow!.nodes.find(node => node.type === 'result')!.data.effects!.push({ type: 'stat', key: 'health', value: -15 } as never);
    legacy.title = '관리자 편집 제목';
    const upgraded = upgradeLegacyEvent(legacy);
    expect(upgraded.title).toBe(legacy.title);
    expect(validateEvent(upgraded)).toEqual([]);
    expect(upgraded.flow!.nodes.find(node => node.id === 'duel-check')!.type).toBe('check');
    expect(JSON.stringify(upgraded.flow)).not.toContain('"key":"health"');
    expect(legacy.flow!.nodes.find(node => node.id === 'duel-check')!.type).toBe('condition');
  });
});
