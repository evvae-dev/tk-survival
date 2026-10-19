import { beforeEach, describe, expect, it } from 'vitest';
import { validArtwork } from './artwork';
import { historicalEvents } from './history';
import { choiceArt } from './choice-art';
import { sceneArt } from './scene-art';
import { getCurrentEvent } from './event-engine';
import { newGame } from '@/stores/game-store';
import { getEffectiveCatalog, useEventCatalogStore } from '@/stores/event-catalog-store';

const campaignId = 'chapter-5-1-yellow-conquest';
function campaign() { return structuredClone(historicalEvents.find(event => event.id === campaignId)!); }
function savedScene() {
  const game = newGame('그림 편집 확인',184,'luoyang','farmer');
  game.factionId = 'yellow-turban';
  game.world.flags.yellowConquestStarted = true;
  game.world.appliedEventIds = ['chapter-5-1-opening'];
  game.flowProgress = { eventId: campaignId, nodeId: 'dong-plan' };
  return getCurrentEvent(game,getEffectiveCatalog())!;
}
beforeEach(() => useEventCatalogStore.getState().restoreDefaults());

describe('관리자의 상황·선택 이미지 편집', () => {
  it('이미지와 설명을 저장·JSON 복원한 뒤 게임의 상황 카드와 선택에 반영한다', () => {
    const event = campaign();
    const node = event.flow!.nodes.find(node => node.id === 'dong-plan')!;
    const situation = { src: '/art/scenes/opening.png', alt: '관리자가 고른 상황 이미지' };
    const choice = { src: '/art/choices/yellow-supplies.png', alt: '관리자가 고른 행동 이미지' };
    node.data.artwork = situation;
    node.data.options![0].artwork = choice;
    node.data.options![0].title = '[관리자가 바꾼 행동 제목]';
    useEventCatalogStore.getState().saveEvent(event);
    const exported = JSON.parse(JSON.stringify(getEffectiveCatalog()));
    useEventCatalogStore.getState().restoreDefaults();
    useEventCatalogStore.getState().importCatalog(exported);
    const current = savedScene();
    expect(sceneArt(current)).toEqual(situation);
    expect(choiceArt(current.choices[0])).toEqual(choice);
  });
  it('명시적인 이미지 없음 설정은 기본 그림을 되살리지 않는다', () => {
    const event = campaign();
    const node = event.flow!.nodes.find(node => node.id === 'dong-plan')!;
    node.data.artwork = null;
    node.data.options![0].artwork = null;
    useEventCatalogStore.getState().saveEvent(event);
    const current = savedScene();
    expect(sceneArt(current)).toBeNull();
    expect(choiceArt(current.choices[0])).toBeNull();
  });
  it('구 공유본에 이미지 설정이 없어도 새 원정 그림을 표시한다', () => {
    const event = campaign();
    for (const node of event.flow!.nodes) {
      delete node.data.artwork;
      for (const option of node.data.options ?? []) delete option.artwork;
    }
    useEventCatalogStore.getState().saveEvent(event);
    const current = savedScene();
    expect(sceneArt(current)?.src).toContain('conquest-dong-plan');
    expect(choiceArt(current.choices[0])?.src).toContain('conquest-dong-strategy');
  });
  it.each(['https://example.com/photo.png','javascript:alert(1)','/art/choices/../other.png','/art/choices/unsafe.svg'])('지원하지 않는 경로 %s는 저장하지 않는다', src => {
    const event = campaign();
    event.flow!.nodes.find(node => node.id === 'dong-plan')!.data.options![0].artwork = { src, alt: '잘못된 이미지' };
    expect(() => useEventCatalogStore.getState().saveEvent(event)).toThrow('선택 이미지');
  });
  it('기존 공개 아트 경로와 설명을 함께 요구한다', () => {
    expect(validArtwork({ src: '/art/choices/conquest-found.png', alt: '황건국 건국' })).toBe(true);
    expect(validArtwork({ src: '/art/choices/conquest-found.png', alt: ' ' })).toBe(false);
  });
});
