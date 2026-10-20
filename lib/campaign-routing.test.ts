import { beforeEach, describe, expect, it } from 'vitest';
import { newGame, migrateGame } from '@/stores/game-store';
import { getCatalogForSync, getEffectiveCatalog, useEventCatalogStore, migrateCatalog } from '@/stores/event-catalog-store';
import { historicalEvents } from './history';
import { getCurrentEvent, resolveChoice, choiceKey } from './event-engine';
import { validateEvent } from './event-flow';
import type { Game } from './game';
import { recordUpdates, recordStreamKey } from './record-focus';
import { restoreHistoryRecords, visibleHistoryRecords } from './history-records';

const service = historicalEvents.find(e => e.id === 'chapter-5-1-service')!;
function atService(region = 'jizhou', charisma = 60) {
  const game = newGame('합류 시험', 184, region, 'farmer');
  game.stats.charisma = charisma;
  game.world.appliedEventIds = historicalEvents.filter(e => e.year === 184 && e.id !== service.id).map(e => e.id);
  game.world.flags.chapterFinished = true;
  game.world.flags.chapter51AccompaniedCaoCao = true;
  return game;
}
function choose(game: Game, option: string, roll = 0, catalog = historicalEvents) {
  const event = getCurrentEvent(game, catalog)!;
  const selected = event.choices.find(c => c.id === option || c.id.endsWith(`:${option}`));
  expect(selected, `${event.id}/${event.state.flowProgress?.nodeId}: ${option}`).toBeDefined();
  return resolveChoice(game, choiceKey(event, selected!.id), catalog, () => roll);
}
beforeEach(() => useEventCatalogStore.getState().restoreDefaults());

describe('매력 합류와 소속별 경로', () => {
  it.each(['cao-cao', 'liu-bei'])('%s 지원 성공은 소속과 말단 병사 역할을 저장하며 재전송하지 않는다', faction => {
    const game = atService('jizhou', 75);
    game.world.flags.chapter51AccompaniedCaoCao = faction === 'cao-cao';
    game.world.flags.chapter51AccompaniedLiuBei = faction === 'liu-bei';
    const event = getCurrentEvent(game)!;
    const selected = event.choices.find(c => c.id.endsWith(`join-${faction}`))!;
    expect(selected.check?.successRate).toBe(75);
    expect(selected.check?.weights).toEqual({ charisma: 1 });
    const key = choiceKey(event, selected.id);
    const next = resolveChoice(game, key, undefined, () => .74);
    expect(next.factionId).toBe(faction);
    expect(next.role).toBe('soldier');
    expect(next.completed).toBe(false);
    expect(next.decisions.at(-1)?.detail).toContain('합류');
    expect(resolveChoice(JSON.parse(JSON.stringify(next)), key)).toEqual(next);
  });
  it('실패하면 소속이 생기지 않고 재야의 다음 지역 선택으로 이어진다', () => {
    let game = choose(atService('jizhou', 10), 'join-cao-cao', .99);
    expect(game.factionId).toBeNull();
    expect(game.decisions.at(-1)?.detail).toContain('받아들일 수 없다고');
    expect(getCurrentEvent(game)?.state.flowProgress?.nodeId).toBe('travel');
    game = choose(game, 'liangzhou');
    expect(game.region).toBe('liangzhou');
    const next = getCurrentEvent(game, undefined, true)!;
    expect(next.id).toBe('chapter-transition');
    expect(next.state).toMatchObject({ year: 185, age: 21, factionId: null, region: 'liangzhou' });
    expect(next.state.world.appliedEventIds).toContain(service.id);
  });
  it('죽은 군주·패망 세력·다른 지역·어린 인물에게 합류를 열지 않는다', () => {
    const game = atService();
    game.world.people['person-rtk14-0952'] = 'dead';
    game.world.factions['cao-cao'] = 'defeated';
    expect(getCurrentEvent(game)!.choices.map(c => c.id)).toEqual(['offers:travel']);
    expect(getCurrentEvent(atService('jingzhou'))!.choices.map(c => c.id)).toEqual(['offers:travel']);
    game.age = 12;
    expect(getCurrentEvent(game)!.choices).toHaveLength(1);
  });
  it('소속 유지는 재야 이동으로 바뀌지 않고 이탈은 실제 소속을 해제한다', () => {
    const game = atService(); game.factionId = 'liu-bei'; game.role = 'soldier';
    const stayed = choose(game, 'stay');
    expect(stayed).toMatchObject({ factionId: 'liu-bei', role: 'soldier', region: 'zhuo' });
    const left = choose(game, 'leave');
    expect(left).toMatchObject({ factionId: null, role: 'civilian' });
    expect(getCurrentEvent(left)?.state.flowProgress?.nodeId).toBe('offers');
  });
  it.each([['dong-zhuo', 'liangzhou'], ['gongsun-zan', 'zhuo'], ['sun', 'jingzhou']])('후속 장에서도 %s에 상황에 맞게 지원한다', (faction, region) => {
    const event = historicalEvents.find(e => e.id === 'chapter-5-2-service')!;
    const game = newGame('후속 합류', 185, region, 'farmer');
    game.world.flags[`contact-${faction}-185`] = true;
    const next = choose(game, `join-${faction}`, 0, [event]);
    expect(next.factionId).toBe(faction);
    expect(next.decisions.at(-1)?.check?.weights).toEqual({ charisma: 1 });
  });
  it('유비 휘하는 서방의 타 세력 전투로 순간 이동하지 않는다', () => {
    const event = historicalEvents.find(e => e.id === 'event-186-meiyang')!;
    const game = newGame('유비의 병사', 186, 'zhuo', 'farmer'); game.factionId = 'liu-bei';
    const current = getCurrentEvent(game, [event], true)!;
    expect(current.automatic).toBe(true);
    expect(current.state.region).toBe('zhuo');
    expect(current.state.world.historyLog).toHaveLength(1);
    expect(current.state.world.appliedEventIds).toContain(event.id);
  });
});

describe('관리자·이전 저장·기록 계약', () => {
  it('이전 5.1 편집본에 새 사건을 더하고 명시적 삭제와 기존 문구를 보존한다', () => {
    const legacy = structuredClone(historicalEvents.filter(e => e.year === 184 && e.id !== service.id));
    legacy[0].title = '[관리자 편집 제목]';
    useEventCatalogStore.getState().importCatalog(legacy);
    expect(getEffectiveCatalog()).toHaveLength(historicalEvents.length);
    expect(getCatalogForSync().find(e => e.id === legacy[0].id)?.title).toBe('[관리자 편집 제목]');
    useEventCatalogStore.getState().deleteEvent(service.id);
    expect(getEffectiveCatalog().some(e => e.id === service.id)).toBe(false);
  });
  it('일부 사건만 편집했던 이전 브라우저에도 결말→합류 연결을 보완한다', () => {
    const closing = structuredClone(historicalEvents.find(e => e.id === 'chapter-5-1-closing')!);
    closing.title = '[관리자가 편집한 결말]';
    closing.connections = [];
    const saved = { overrides: { [closing.id]: closing }, deletedIds: [] };
    const migrated = migrateCatalog(saved);
    expect(migrated.overrides[closing.id].title).toBe(closing.title);
    expect(migrated.overrides[closing.id].flow).toEqual(closing.flow);
    expect(migrated.overrides[closing.id].connections?.map(c => c.targetId)).toContain(service.id);
    expect(saved.overrides[closing.id].connections).toEqual([]);
    expect(migrateCatalog({ ...saved, deletedIds: [service.id] }).overrides[closing.id].connections).toEqual([]);
  });
  it('조건·판정·효과를 저장하고 JSON 복원하면 실제 지원 결과에 반영된다', () => {
    const edited = structuredClone(service);
    const option = edited.flow!.nodes.find(n => n.id === 'offers')!.data.options!.find(o => o.id === 'join-cao-cao')!;
    option.conditions = [{ field: 'region', operator: 'eq', value: 'jingzhou' }];
    edited.flow!.nodes.find(n => n.id === 'accepted-cao-cao')!.data.text = '조조 측의 승낙을 받아 합류했다. 이제 나는 그 일행과 함께한다.';
    useEventCatalogStore.getState().saveEvent(edited);
    const exported = JSON.parse(JSON.stringify(getCatalogForSync()));
    useEventCatalogStore.getState().importCatalog(exported);
    const catalog = getEffectiveCatalog();
    const next = choose(atService('jingzhou'), 'join-cao-cao', 0, catalog);
    expect(next.decisions.at(-1)?.detail).toContain('승낙을 받아 합류했다');
    expect(next.factionId).toBe('cao-cao');
    for (const event of catalog) expect(validateEvent(event), event.id).toEqual([]);
  });
  it('이전 184년 일반 완료본을 이어가되 원정 처형·건국은 다시 열지 않는다', () => {
    const game = { ...atService(), completed: true };
    expect(migrateGame({ game }, 6).game?.completed).toBe(false);
    game.world.flags.playerExecuted = true;
    expect(migrateGame({ game }, 6).game?.completed).toBe(true);
    const advanced = { ...game, year: 187, age: 23 };
    expect(migrateGame({ game: advanced }, 7).game?.year).toBe(187);
  });
  it('예전 기록을 복원할 때 실제 패배 문장을 보존하고 누락된 역사를 지어내지 않는다', () => {
    const event = historicalEvents.find(e => e.id === 'battle-184-daxingshan')!;
    const game = atService();
    delete game.world.historyLog;
    game.world.log = [{ year: 184, month: null, title: event.title, detail: '유비군이 물러나고 황건군이 길목을 지켰다.', kind: 'fiction' }];
    const records = restoreHistoryRecords(game, historicalEvents);
    expect(records).toHaveLength(1);
    expect(records[0].detail).toBe(game.world.log[0].detail);
    expect(records[0].eventId).toBe(event.id);
  });
  it('역사 흐름은 실제 대체 결과를 기록하며 모바일은 개인→역사 순서로 읽는다', () => {
    const event = historicalEvents.find(e => e.id === 'battle-184-daxingshan')!;
    const game = newGame('대체 역사', 184, 'zhuo', 'farmer');
    game.factionId = 'yellow-turban'; game.stats.intelligence = 100;
    game.flowProgress = { eventId: event.id, nodeId: 'yellow-plan' };
    const next = choose(game, 'ambush', 0, [event]);
    const history = next.world.historyLog!;
    expect(history[0].detail).toContain('물러');
    expect(history[0].detail).not.toContain('장비가 등무를');
    const personal = next.world.log.filter(e => e.kind !== 'history');
    expect(recordUpdates({ personal: 0, history: 0 }, personal, history).map(item => item.panel)).toEqual(['personal', 'history']);
    expect(recordUpdates({ personal: personal.length, history: history.length }, personal, history)).toEqual([]);
  });
  it('사건이 끝나기 전의 자동 기록도 표시하고 완료된 카드로 바뀌면 갱신을 알린다', () => {
    const event = historicalEvents.find(e => e.id === 'battle-184-wan')!;
    const game = newGame('중간 기록', 184, 'jingzhou', 'farmer'); game.factionId = 'han';
    const progress = getCurrentEvent(game, [event], true)!;
    expect(progress.automatic).toBe(true);
    expect(progress.state.world.historyLog).toEqual([]);
    const pending = visibleHistoryRecords(progress.state.world);
    expect(pending).toHaveLength(1);
    expect(pending[0].detail).toBe(progress.scene);
    const completed = choose(progress.state, 'follow', 0, [event]);
    const visible = visibleHistoryRecords(completed.world);
    expect(visible).toHaveLength(1);
    expect(visible[0].detail).toContain(pending[0].detail);
    expect(recordUpdates({ personal: completed.world.log.length, history: 1, historyKey: recordStreamKey(pending) }, [], visible).map(x => x.panel)).toEqual(['history']);
  });
});
