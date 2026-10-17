import { beforeEach, describe, expect, it } from 'vitest';
import { newGame } from '@/stores/game-store';
import { getCurrentEvent, resolveChoice, choiceKey } from './event-engine';
import { createDefaultFlow, validateFlow, validateEvent } from './event-flow';
import { historicalEvents } from './history';
import { getEffectiveCatalog, useEventCatalogStore } from '@/stores/event-catalog-store';
const sample = () => { const event = { ...historicalEvents[0], id: 'test-custom', sequence: -1, prerequisiteEventIds: [], connections: [] }; return { ...event, flow: createDefaultFlow(event) }; };
beforeEach(() => useEventCatalogStore.getState().restoreDefaults());
describe('관리자 흐름과 실행 계약', () => {
  it('5.1의 모든 그래프는 연결·조건·효과가 유효하다', () => {
    for (const event of historicalEvents) expect(validateEvent(event), event.id).toEqual([]);
  });
  it('추가·수정·삭제가 같은 사건 목록과 실행에 반영된다', () => {
    const event = sample();
    useEventCatalogStore.getState().saveEvent(event);
    const game = newGame('시험', 184, 'luoyang', 'farmer');
    expect(getCurrentEvent(game, getEffectiveCatalog())?.id).toBe(event.id);
    useEventCatalogStore.getState().saveEvent({ ...event, title: '수정 제목' });
    expect(getCurrentEvent(game, getEffectiveCatalog())?.title).toBe('수정 제목');
    useEventCatalogStore.getState().deleteEvent(event.id);
    expect(getCurrentEvent(game, getEffectiveCatalog())?.id).not.toBe(event.id);
  });
  it('기존 사건 JSON을 가져와 복구하는 것을 거절한다', () => {
    expect(() => useEventCatalogStore.getState().importCatalog([{ ...sample(), chapterId: undefined }])).toThrow('5.1');
  });
  it('순환과 무한 효과, 중복 ID를 거절한다', () => {
    const event = sample();
    event.flow.edges.find(e => e.source === 'result')!.target = 'start';
    expect(validateFlow(event.flow).length).toBeGreaterThan(0);
    expect(() => useEventCatalogStore.getState().importCatalog([sample(), sample()])).toThrow();
    event.flow = createDefaultFlow(event);
    event.flow.nodes.find(n => n.type === 'result')!.data.effects = [{ type: 'stat', key: 'leadership', value: Infinity }];
    expect(() => useEventCatalogStore.getState().saveEvent(event)).toThrow();
  });
  it('수정한 결과 노드가 실제 능력치를 한 번 변경한다', () => {
    const event = sample();
    event.flow.nodes.find(n => n.type === 'result')!.data.effects = [{ type: 'stat', key: 'leadership', value: 7 }];
    const game = newGame('시험', 184, 'luoyang', 'farmer');
    const current = getCurrentEvent(game, [event])!;
    const next = resolveChoice(game, choiceKey(current, current.choices[0].id), [event]);
    expect(next.stats.leadership).toBe(game.stats.leadership + 7);
    expect(next.world.appliedEventIds).toContain(event.id);
  });
  it('순서가 뒤집혀도 선행 사건을 처리하고 순환 의존은 거절한다', () => {
    const first = sample();
    const later = { ...sample(), id: 'later', sequence: -10, prerequisiteEventIds: [first.id] };
    const game = newGame('시험', 184, 'luoyang', 'farmer');
    expect(getCurrentEvent(game, [later, first])?.id).toBe(first.id);
    useEventCatalogStore.getState().saveEvent(first);
    useEventCatalogStore.getState().saveEvent(later);
    expect(() => useEventCatalogStore.getState().saveEvent({ ...first, prerequisiteEventIds: [later.id] })).toThrow('순환');
  });
  it('삭제한 선행 사건 때문에 남은 사건을 중단하지 않는다', () => {
    const event = { ...sample(), prerequisiteEventIds: ['deleted'] };
    expect(getCurrentEvent(newGame('시험', 184, 'luoyang', 'farmer'), [event])?.id).toBe(event.id);
  });
});
