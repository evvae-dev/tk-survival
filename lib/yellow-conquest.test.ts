import { beforeEach, describe, expect, it } from 'vitest';
import { newGame, useGameStore } from '@/stores/game-store';
import { getEffectiveCatalog, useEventCatalogStore } from '@/stores/event-catalog-store';
import { choiceKey, getCurrentEvent, resolveChoice } from './event-engine';
import type { Game } from './game';
import { historicalEvents } from './history';
import { currentCourtLabel } from './world';
import { upgradeLegacyCatalog } from './catalog-upgrade';
import { validateEvent } from './event-flow';

const campaignId = 'chapter-5-1-yellow-conquest';
const stages = ['dong', 'liu', 'cao'] as const;
const factions = ['dong-zhuo', 'liu-bei', 'cao-cao'];
function choose(game: Game, option: string, random = () => 0) {
  const event = getCurrentEvent(game)!;
  const choice = event.choices.find(item => item.id.endsWith(`:${option}`))!;
  expect(choice, `${event.id}/${event.state.flowProgress?.nodeId}/${option}`).toBeDefined();
  return resolveChoice(game, choiceKey(event, choice.id), undefined, random);
}
function start() {
  const game = newGame('황건 원정대', 184, 'unknown', 'farmer');
  game.stats = { leadership: 90, strength: 90, intelligence: 90, politics: 90, charisma: 90 };
  return choose(choose(game, 'yellow'), 'conquest');
}
function legacyCatalog() {
  const catalog = structuredClone(historicalEvents.filter(event => event.year === 184 && event.id !== 'chapter-5-1-service' && event.id !== campaignId));
  const opening = catalog.find(event => event.id === 'chapter-5-1-opening')!;
  opening.flow!.nodes = opening.flow!.nodes.filter(node => !['yellow-route', 'begin-conquest'].includes(node.id));
  opening.flow!.edges = opening.flow!.edges.filter(edge => !['yellow-route', 'begin-conquest'].includes(edge.source));
  opening.flow!.edges.find(edge => edge.source === 'join-yellow')!.target = 'front';
  opening.connections = opening.connections!.filter(connection => connection.targetId !== campaignId);
  return catalog;
}
beforeEach(() => useEventCatalogStore.getState().restoreDefaults());

describe('황건 천하통일 가상 원정', () => {
  it.each(Array.from({ length: 8 }, (_, mask) => stages.map((_, index) => mask & (1 << index) ? 'battle' : 'strategy')))(
    '작전 조합 %s/%s/%s는 동탁 → 유비 → 조조 → 황제 생포·건국 순서로 끝난다', (...options) => {
      let game = start();
      const before = structuredClone(game.world.people);
      for (const [index, stage] of stages.entries()) {
        const event = getCurrentEvent(game)!;
        expect(event.id).toBe(campaignId);
        expect(event.state.flowProgress?.nodeId).toBe(`${stage}-plan`);
        expect(event.choices.every(choice => choice.check?.opponentName === ['동탁', '유비', '조조'][index])).toBe(true);
        const key = choiceKey(event, event.choices.find(choice => choice.id.endsWith(`:${options[index]}`))!.id);
        game = resolveChoice(game, key, undefined, () => 0);
        expect(game.world.flags[`${stage}ArmyDefeated`]).toBe(true);
        expect(game.world.factions[factions[index]]).toBe('defeated');
        expect(game.completed).toBe(false);
        expect(game.world.flags.emperorCaptured).toBeUndefined();
        game = JSON.parse(JSON.stringify(game));
        expect(resolveChoice(game, key)).toBe(game);
      }
      expect(getCurrentEvent(game)!.state.flowProgress?.nodeId).toBe('emperor');
      game = choose(game, 'found', () => { throw new Error('건국은 추가 전투 판정이 아니다'); });
      expect(game.completed).toBe(true);
      expect(game.world.flags).toMatchObject({ emperorCaptured: true, yellowEmpireFounded: true, yellowUnification: true, chapterFinished: true });
      expect(game.factionId).toBe('yellow-turban');
      expect(game.world.factions).toMatchObject({ han: 'defeated', 'yellow-turban': 'preserved' });
      expect(Object.values(game.world.control).every(owner => owner === 'yellow-turban')).toBe(true);
      expect(currentCourtLabel(game.world)).toContain('황건국');
      expect(game.world.people).toEqual(before);
      expect(game.world.appliedEventIds).toEqual(['chapter-5-1-opening', campaignId]);
      expect(getCurrentEvent(game)).toBeNull();
      expect(game.year).toBe(184);
      expect(game.age).toBe(20);
    },
  );
  it.each(stages.flatMap((stage, index) => ['strategy', 'battle'].map(option => [stage, index, option] as const)))(
    '%s의 %s단계에서 %s 판정 실패 시 생포·처형하고 즉시 종료한다', (stage, index, option) => {
      let game = start();
      for (let previous = 0; previous < index; previous++) game = choose(game, 'strategy');
      game.stats = { leadership: 1, strength: 1, intelligence: 1, politics: 1, charisma: 1 };
      const event = getCurrentEvent(game)!;
      const key = choiceKey(event, event.choices.find(choice => choice.id.endsWith(`:${option}`))!.id);
      game = resolveChoice(game, key, undefined, () => .999);
      expect(game.completed).toBe(true);
      expect(game.world.flags).toMatchObject({ playerCaptured: true, playerExecuted: true, chapterFinished: true, [`${stage}ArmyDefeated`]: false });
      expect(game.world.flags.emperorCaptured).toBeUndefined();
      expect(game.world.flags.yellowEmpireFounded).toBeUndefined();
      expect(game.world.factions[factions[index]]).toBe('active');
      expect(game.decisions.at(-1)?.detail).toContain('처형당했고');
      expect(game.decisions.at(-1)?.growth).toBeUndefined();
      expect(game.world.appliedEventIds).toEqual(['chapter-5-1-opening', campaignId]);
      expect(getCurrentEvent(game)).toBeNull();
      game = JSON.parse(JSON.stringify(game));
      expect(resolveChoice(game, key)).toBe(game);
      useGameStore.setState({ game });
      useGameStore.getState().nextTurn(key);
      expect(useGameStore.getState().game).toBe(game);
    },
  );
  it.each(['han', 'civilian'])('%s 진영에는 황건 원정 진입 선택이 나타나지 않는다', side => {
    const game = choose(newGame('다른 진영', 184, 'unknown', 'farmer'), side);
    expect(getCurrentEvent(game)!.state.flowProgress?.nodeId).toBe(side === 'han' ? 'han-company' : 'front');
    expect(game.world.flags.yellowConquestStarted).toBeUndefined();
  });
  it('황건 거점 방어를 택하면 기존 전선을 진행한다', () => {
    let game = choose(newGame('수비대', 184, 'unknown', 'farmer'), 'yellow');
    game = choose(choose(game, 'defend'), 'north');
    expect(getCurrentEvent(game)?.id).toBe('battle-184-daxingshan');
    expect(game.world.flags.yellowConquestStarted).toBeUndefined();
  });
});

describe('이전 공유 목록과 진행 저장의 원정 호환성', () => {
  it('기존 기본 공유본을 불러와도 새 분기가 나타나며 원본·노드 배치를 보존한다', () => {
    const legacy = legacyCatalog();
    const opening = legacy.find(event => event.id === 'chapter-5-1-opening')!;
    opening.flow!.nodes.find(node => node.id === 'front')!.position = { x: 123, y: 456 };
    const before = structuredClone(legacy);
    useEventCatalogStore.getState().importCatalog(legacy);
    const effective = getEffectiveCatalog();
    expect(effective).toHaveLength(historicalEvents.length);
    const updated = effective.find(event => event.id === opening.id)!;
    expect(updated.flow!.nodes.find(node => node.id === 'front')!.position).toEqual({ x: 123, y: 456 });
    expect(updated.flow!.edges.find(edge => edge.source === 'join-yellow')!.target).toBe('yellow-route');
    expect(legacy).toEqual(before);
    const saved = { ...newGame('이전 진행', 184, 'unknown', 'farmer'), factionId: 'yellow-turban', flowProgress: { eventId: opening.id, nodeId: 'front' } };
    expect(getCurrentEvent(saved, effective)!.state.flowProgress?.nodeId).toBe('front');
  });
  it('도입 문구를 편집한 구 공유본에도 원정을 추가하며 기존 내용을 보존한다', () => {
    const legacy = legacyCatalog();
    const opening = legacy.find(event => event.id === 'chapter-5-1-opening')!;
    opening.title = '관리자가 바꾼 사건 제목';
    opening.flow!.nodes.find(node => node.id === 'side')!.data.text = '관리자가 편집한 도입부';
    const before = structuredClone(legacy);
    useEventCatalogStore.getState().importCatalog(legacy);
    const effective = getEffectiveCatalog();
    const updated = effective.find(event => event.id === opening.id)!;
    expect(effective.some(event => event.id === campaignId)).toBe(true);
    expect(updated.title).toBe(opening.title);
    for (const node of opening.flow!.nodes) expect(updated.flow!.nodes.find(item => item.id === node.id)).toEqual(node);
    for (const event of effective) expect(validateEvent(event)).toEqual([]);
    expect(legacy).toEqual(before);
    const game = choose(newGame('편집본 원정',184,'unknown','farmer'), 'yellow');
    const scene = getCurrentEvent(game, effective)!;
    expect(scene.state.flowProgress?.nodeId).toBe('yellow-route');
    const selected = scene.choices.find(choice => choice.id.endsWith(':conquest'))!;
    const next = resolveChoice(game,choiceKey(scene,selected.id),effective);
    expect(getCurrentEvent(next,effective)?.id).toBe(campaignId);
  });
  it('기존의 황건 합류 후 연결을 거점 방어 경로로 보존한다', () => {
    const legacy = legacyCatalog();
    const opening = legacy.find(event => event.id === 'chapter-5-1-opening')!;
    opening.flow!.nodes.find(node => node.id === 'front')!.id = 'custom-front';
    for (const edge of opening.flow!.edges) {
      if (edge.source === 'front') edge.source = 'custom-front';
      if (edge.target === 'front') edge.target = 'custom-front';
    }
    const upgraded = upgradeLegacyCatalog(legacy).find(event => event.id === opening.id)!;
    expect(upgraded.flow!.edges.find(edge => edge.source === 'yellow-route' && edge.sourceHandle === 'defend')!.target).toBe('custom-front');
    expect(validateEvent(upgraded)).toEqual([]);
  });
  it('새 목록에서 의도적으로 원정을 삭제한 경우 되살리지 않는다', () => {
    useEventCatalogStore.getState().deleteEvent(campaignId);
    expect(getEffectiveCatalog().some(event => event.id === campaignId)).toBe(false);
  });
});
