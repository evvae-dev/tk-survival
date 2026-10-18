import { beforeEach, describe, expect, it } from 'vitest';
import { newGame, migrateGame, useGameStore } from './game-store';
import { getCurrentEvent, choiceKey, resolveChoice } from '@/lib/event-engine';
import { historicalEvents } from '@/lib/history';
import { applyFlowEffects } from '@/lib/event-flow';
import { useEventCatalogStore } from './event-catalog-store';
import type { Game } from '@/lib/game';

function choose(game: Game, option: string): Game {
  const current = getCurrentEvent(game)!;
  const selected = current.choices.find(c => c.id.endsWith(`:${option}`) || c.id === option);
  if (!selected) throw new Error(`${current.id}: ${option} 선택 불가 (${current.choices.map(c => c.id)})`);
  return resolveChoice(game, choiceKey(current, selected.id), historicalEvents, () => 0);
}
function setup(side: string, front: string, ability = 70) {
  let game = newGame('시험', 184, 'zhuo', 'farmer');
  game.stats = { ...game.stats, leadership: ability, strength: ability, intelligence: ability, charisma: ability };
  return choose(choose(game, side), front);
}
function finish(game: Game) {
  for (let i = 0; i < 20 && !game.completed; i++) {
    const event = getCurrentEvent(game)!;
    const option = event.choices.find(c => /:(follow|done|hide|support)$/.test(c.id)) ?? event.choices[0];
    game = resolveChoice(game, choiceKey(event, option.id), historicalEvents, () => 0);
  }
  expect(game.completed).toBe(true);
  return game;
}
beforeEach(() => useEventCatalogStore.getState().restoreDefaults());
describe('184년 5.1 실행', () => {
  it('시작은 184년·20세이며 이전 세이브와 사건을 재사용하지 않는다', () => {
    useGameStore.getState().startGame('새 인물');
    expect(useGameStore.getState().game).toMatchObject({ year: 184, age: 20, factionId: null, role: 'civilian' });
    expect(migrateGame({ game: newGame('옛 인물', 190, 'luoyang', 'farmer') })).toEqual({ game: null });
    expect(historicalEvents).toHaveLength(7);
    expect(historicalEvents.every(e => e.year === 184 && e.flow)).toBe(true);
  });
  it('대흥산 패배는 연의 청주 구원전을 취소하며 황건 거점을 남긴다', () => {
    let game = choose(setup('yellow', 'north'), 'ambush');
    const next = getCurrentEvent(game)!;
    expect(next.id).toBe('chapter-5-1-closing');
    expect(next.state.world.flags.qingzhouRescueBlocked).toBe(true);
    game = finish(game);
    expect(game.world.factions['yellow-turban']).toBe('preserved');
    expect(game.world.control['place-daxingshan']).toBe('yellow-turban');
    expect(game.world.people['person-rtk14-0690']).toBe('alive');
    expect(game.year).toBe(184); expect(game.age).toBe(20);
  });
  it('부족한 지력으로 대흥산 매복을 시도하면 지휘부를 잃고 청주 방어로 이어진다', () => {
    const game = choose(setup('yellow', 'north', 30), 'ambush');
    expect(game.world.people['person-rtk14-0690']).toBe('dead');
    expect(getCurrentEvent(game)?.id).toBe('battle-184-qingzhou-city');
  });
  it('관군이 대흥산 지휘부를 생포하고 청주 구원에 성공한다', () => {
    let game = choose(setup('han', 'north'), 'duel');
    expect(game.world.flags.daxingshanCapturedLeaders).toBe(true);
    game = choose(game, 'trap');
    expect(game.world.flags.qingzhouRelieved).toBe(true);
    expect(game.world.people['person-rtk14-0746']).toBe('alive');
    expect(finish(game).world.factions['yellow-turban']).toBe('defeated');
  });
  it('완성 항복 협상 뒤 한충 보호 여부를 다시 고르며 조홍 ID를 구별한다', () => {
    let game = choose(setup('han', 'south'), 'negotiate');
    expect(game.flowProgress?.nodeId).toBe('surrender');
    const snapshot = JSON.parse(JSON.stringify(game));
    game = choose(snapshot, 'protect');
    expect(game.world.flags.wanNegotiated).toBe(true);
    expect(game.world.people['person-rtk14-0173']).toBe('alive');
    expect(game.world.people['person-rtk14-0620']).toBe('dead');
    expect(game.world.people['person-rtk14-0511']).toBeUndefined();
    expect(game.world.people['person-b8fbc382199a']).toBe('alive');
  });
  it('광종 방어는 하곡양 후속 공격을 차단한다', () => {
    const game = choose(setup('yellow', 'central'), 'guard');
    const next = getCurrentEvent(game)!;
    expect(next.state.world.flags.xiaquyangAttackBlocked).toBe(true);
    expect(next.state.world.people['person-rtk14-0659']).toBe('alive');
    expect(finish(game).world.control['place-guangzong']).toBe('yellow-turban');
  });
  it('노식 지휘 유지 효과는 재접속 시 중복 적용되지 않으며 하곡양 항복으로 이어진다', () => {
    let game = choose(setup('han', 'central', 60), 'expose');
    expect(game.stats.leadership).toBe(70);
    game = JSON.parse(JSON.stringify(game));
    expect(getCurrentEvent(game)!.state.stats.leadership).toBe(70);
    game = choose(game, 'lead');
    game.stats.charisma = 70;
    game = choose(game, 'offer');
    expect(game.world.flags.zhangBaoSurrendered).toBe(true);
    expect(game.world.people['person-rtk14-0659']).toBe('alive');
    expect(finish(game).world.flags.luZhiRetained).toBe(true);
  });
  it('이미 사망한 장보의 전투를 열거나 부활시키지 않는다', () => {
    let game = choose(setup('han', 'central'), 'follow');
    game = applyFlowEffects(game, [{ type: 'person', personId: 'person-rtk14-0659', value: 'dead' }]);
    const next = getCurrentEvent(game)!;
    expect(next.state.world.flags.xiaquyangCancelled).toBe(true);
    expect(applyFlowEffects(next.state, [{ type: 'person', personId: 'person-rtk14-0659', value: 'alive' }]).world.people['person-rtk14-0659']).toBe('dead');
  });
  it('주민 구호는 지력으로 판정하고 성공하면 매력을 얻는다', () => {
    let game = setup('civilian', 'south');
    const charisma = game.stats.charisma;
    game = choose(game, 'supplies');
    expect(game.stats.charisma).toBe(charisma + 5);
    expect(game.world.flags['battle-184-wan-refugees']).toBe(true);
    expect(game.world.flags.wanHanVictory).toBe(true);
  });
  it('지난 선택 키를 다시 제출해도 결과를 중복 적용하지 않는다', () => {
    const start = setup('han', 'south');
    const event = getCurrentEvent(start)!;
    const key = choiceKey(event, 'han-plan:negotiate');
    const next = resolveChoice(start, key);
    expect(resolveChoice(next, key)).toBe(next);
  });
  it('전선 이동에 체력과 자금을 사용하지 않는다', () => {
    let game = choose(newGame('시험', 184, 'zhuo', 'farmer'), 'civilian');
    const stats = { ...game.stats };
    game = choose(game, 'north');
    expect(game.stats).toEqual(stats);
    expect(game.stats).not.toHaveProperty("money");
    expect(game.stats).not.toHaveProperty("health");
  });
  it('5.1 기존 저장을 유지하면서 정치 능력을 보충한다', () => {
    const game = setup('han', 'south');
    const { politics: _politics, ...oldStats } = game.stats;
    const migrated = migrateGame({ game: { ...game, stats: oldStats } }, 4).game!;
    expect(migrated.name).toBe(game.name);
    expect(migrated.flowProgress).toEqual(game.flowProgress);
    expect(migrated.stats.politics).toBe(50);
    expect(migrated.stats.strength).toBe(game.stats.strength);
    expect(migrated.world).toEqual(game.world);
  });
  it.each(['han', 'yellow', 'civilian'].flatMap(side => ['north', 'south', 'central'].flatMap(front => [30, 70].map(ability => [side, front, ability] as const))))('%s/%s/능력 %d: 막힘 없이 결말까지 진행한다', (side, front, ability) => {
    const game = finish(setup(side, front, ability));
    expect(new Set(game.world.appliedEventIds).size).toBe(7);
    expect(game.world.appliedEventIds).toHaveLength(7);
    expect(game.year).toBe(184);
  });
});
