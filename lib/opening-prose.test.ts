import { afterEach, describe, expect, it } from 'vitest';
import legacyProse from '@/data/history/legacy-narrative-5-1.json';
import { historicalEvents } from './history';
import { upgradeLegacyEvent } from './catalog-upgrade';
import { getEffectiveCatalog, useEventCatalogStore } from '@/stores/event-catalog-store';
import { choiceAbility } from './choice-growth';
import { choiceArt } from './choice-art';
import { newGame } from '@/stores/game-store';
import { getCurrentEvent } from './event-engine';

const opening = () => structuredClone(historicalEvents.find(event => event.id === 'chapter-5-1-opening')!);
const route = (event: ReturnType<typeof opening>) => event.flow!.nodes.find(node => node.id === 'yellow-route')!;
function oldOpening() {
  const event = opening();
  for (const rule of legacyProse.filter(rule => rule.eventId === event.id)) {
    const node = event.flow!.nodes.find(node => node.id === rule.nodeId)!;
    if (rule.optionId) {
      const option = node.data.options!.find(option => option.id === rule.optionId)!;
      option[rule.field as 'title' | 'description' | 'outcome'] = rule.before;
    } else node.data[rule.field as 'label' | 'text'] = rule.before;
  }
  return event;
}
afterEach(() => useEventCatalogStore.getState().restoreDefaults());
describe('황건군을 얼떨결에 따라가는 도입', () => {
  it('미래의 상대와 통일 의지를 미리 정하지 않고 황궁 행군에 섞인다', () => {
    const node = route(opening());
    expect(node.data.text).toContain('얼떨결에');
    expect(node.data.text).not.toMatch(/동탁|유비|조조|통일|처형/);
    expect(node.data.options![0].title).toBe('[황궁으로 가는 부대를 따라간다]');
    expect(node.data.options![0].description).not.toMatch(/통일|나라/);
    expect(node.data.options![0].outcome).not.toMatch(/동탁|유비|조조|처형/);
  });
  it('이전 공유·로컬 기본 문구를 보완하며 입력과 실행 구조를 보존한다', () => {
    const old = oldOpening(), before = structuredClone(old);
    const updated = upgradeLegacyEvent(old);
    expect(updated).toEqual(opening());
    expect(old).toEqual(before);
    expect(updated.flow!.edges).toEqual(old.flow!.edges);
    expect(updated.flow!.passiveEffects).toEqual(old.flow!.passiveEffects);
    useEventCatalogStore.getState().importCatalog(historicalEvents.map(event => event.id === old.id ? old : event));
    expect(route(getEffectiveCatalog().find(event => event.id === old.id)!).data).toEqual(route(opening()).data);
  });
  it('관리자가 바꾼 제목·상황·설명·이미지는 필드별로 보존한다', () => {
    const old = oldOpening(), node = route(old);
    node.data.text = '관리자가 작성한 상황';
    node.data.options![0].title = '[황궁으로 가는 부대를 따라간다]';
    node.data.options![0].description = '관리자가 작성한 속마음';
    node.data.options![0].artwork = null;
    const updated = route(upgradeLegacyEvent(old));
    expect(updated.data.text).toBe(node.data.text);
    expect(updated.data.options![0]).toMatchObject({title: node.data.options![0].title, description:'관리자가 작성한 속마음',artwork:null});
    expect(updated.data.options![0].outcome).toBe(route(opening()).data.options![0].outcome);
  });
  it('표시 제목을 고쳐도 기존 성장 능력과 선택 이미지를 유지한다', () => {
    expect(choiceAbility('[황궁으로 가는 부대를 따라간다]')).toBe(choiceAbility('[천하통일에 나선다]'));
    expect(choiceArt({title:'[황궁으로 가는 부대를 따라간다]'})).toEqual(choiceArt({title:'[천하통일에 나선다]'}));
    const game = {...newGame('기존 진행',184,'unknown','farmer'), factionId:'yellow-turban',flowProgress:{eventId:'chapter-5-1-opening',nodeId:'yellow-route'}};
    const current = getCurrentEvent(game,[upgradeLegacyEvent(oldOpening())])!;
    expect(current.choices[0].title).toBe('[황궁으로 가는 부대를 따라간다]');
    expect(current.state.flowProgress).toEqual(game.flowProgress);
  });
});
