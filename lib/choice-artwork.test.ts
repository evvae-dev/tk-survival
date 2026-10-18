import { describe, expect, it } from 'vitest';
import { historicalEvents } from './history';
import { popupArtwork } from './choice-artwork';
import type { GameEvent } from './event-engine';
import { newGame } from '@/stores/game-store';
function eventAt(id: string, nodeId: string): GameEvent {
  const historical = historicalEvents.find(event => event.id === id)!;
  const node = historical.flow!.nodes.find(node => node.id === nodeId)!;
  const state = newGame('이미지 점검',184,'zhuo','farmer');
  state.flowProgress = { eventId:id,nodeId };
  return { id, state, historical, year:184, month:null, title:historical.title, scene:node.data.text!, choices:(node.data.options ?? []).map(option => ({...option,effects:{},note:''})), annual:false };
}
describe('선택 팝업의 중복 이미지 생략', () => {
  it('세 갈래 수레 선택은 같은 이미지가 반복되므로 텍스트만 표시한다', () => {
    expect(popupArtwork(eventAt('chapter-5-1-opening','front'))).toEqual([null,null,null]);
  });
  it('현재 상황 이미지와 같은 그림을 반복하는 팝업도 텍스트만 표시한다', () => {
    expect(popupArtwork(eventAt('battle-184-qingzhou-city','yellow-plan'))).toEqual([null,null,null]);
    expect(popupArtwork(eventAt('chapter-5-1-closing','record'))).toEqual([null]);
  });
  it('장면과 다르고 서로 다른 선택 행동 이미지는 유지한다', () => {
    const images = popupArtwork(eventAt('battle-184-daxingshan','yellow-plan'));
    expect(images.every(Boolean)).toBe(true);
    expect(images[0]?.src).toContain('yellow-lure');
    expect(images[1]?.src).toContain('yellow-retreat');
    expect(images[2]?.src).toContain('yellow-formation');
  });
  it('모든 팝업은 텍스트 전용이거나 서로 다른 이미지로 구성한다', () => {
    for (const event of historicalEvents) for (const node of event.flow?.nodes ?? []) {
      if(node.type !== 'choice') continue;
      const images=popupArtwork(eventAt(event.id,node.id));
      const paths=images.flatMap(image=>image ? [image.src] : []);
      expect(paths.length===0 || new Set(paths).size===paths.length).toBe(true);
    }
  });
});
