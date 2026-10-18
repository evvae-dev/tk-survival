import { beforeEach, describe, expect, it } from 'vitest';
import { newGame, useGameStore } from '@/stores/game-store';
import { useEventCatalogStore } from '@/stores/event-catalog-store';
import { choiceKey, getCurrentEvent, resolveChoice } from './event-engine';
import { playbackDelay, playbackKey } from './record-playback';
import type { Game } from './game';

function choose(game: Game, option: string) {
  const event = getCurrentEvent(game)!;
  const choice = event.choices.find(item => item.id.endsWith(`:${option}`))!;
  return resolveChoice(game, choiceKey(event, choice.id));
}
function startSouth() {
  return choose(choose(newGame('기록 시험', 184, 'zhuo', 'farmer'), 'han'), 'south');
}
beforeEach(() => useEventCatalogStore.getState().restoreDefaults());

describe('기록을 한 건씩 진행한다', () => {
  it('완성 이동 뒤 대흥산, 청주, 완성 사전 기록을 차례로 저장하고 선택에서 멈춘다', () => {
    let game = startSouth();
    const initialLogCount = game.world.log.length;
    const snapshot = JSON.stringify(game);
    const first = getCurrentEvent(game, undefined, true)!;
    expect(JSON.stringify(game)).toBe(snapshot);
    expect(first.id).toBe('battle-184-daxingshan');
    expect(first.automatic).toBe(true);
    expect(first.choices).toEqual([]);
    expect(first.state.world.log).toHaveLength(initialLogCount + 1);
    expect(first.state.world.appliedEventIds).not.toContain('battle-184-qingzhou-city');
    useGameStore.setState({ game });
    for (const id of ['battle-184-daxingshan', 'battle-184-qingzhou-city', 'battle-184-wan']) {
      game = useGameStore.getState().game!;
      const next = getCurrentEvent(game, undefined, true)!;
      expect(next.id).toBe(id);
      expect(next.automatic).toBe(true);
      useGameStore.getState().advanceRecord(playbackKey(game));
    }
    game = useGameStore.getState().game!;
    expect(game.world.log).toHaveLength(initialLogCount + 3);
    const wan = getCurrentEvent(game, undefined, true)!;
    expect(wan.id).toBe('battle-184-wan');
    expect(wan.automatic).not.toBe(true);
    expect(wan.choices.length).toBeGreaterThan(0);
    expect(game.flowProgress?.eventId).toBe('battle-184-wan');
    const checkpoint = JSON.parse(JSON.stringify(game));
    expect(getCurrentEvent(checkpoint, undefined, true)).toEqual(wan);
  });
  it('남은 자동 기록을 건너뛰는 선택과 같은 재생 요청의 중복 적용을 막는다', () => {
    const game = startSouth();
    useGameStore.setState({ game });
    const future = getCurrentEvent(game)!;
    useGameStore.getState().nextTurn(choiceKey(future, future.choices[0].id));
    expect(useGameStore.getState().game).toBe(game);
    const key = playbackKey(game);
    useGameStore.getState().advanceRecord(key);
    const advanced = useGameStore.getState().game;
    expect(advanced).not.toBe(game);
    useGameStore.getState().advanceRecord(key);
    expect(useGameStore.getState().game).toBe(advanced);
  });
  it.each([['han', 'north'], ['han', 'south'], ['han', 'central'], ['yellow', 'north'], ['yellow', 'south'], ['yellow', 'central'], ['civilian', 'north'], ['civilian', 'south'], ['civilian', 'central']])('%s/%s 경로는 기록 재생 후 선택으로 이어진다', (side, front) => {
    let game = choose(choose(newGame('기록 시험', 184, 'zhuo', 'farmer'), side), front);
    for (let i = 0; i < 7; i++) {
      const next = getCurrentEvent(game, undefined, true)!;
      if (!next.automatic) {
        expect(next.choices.length).toBeGreaterThan(0);
        return;
      }
      expect(next.state.world.log.length).toBe(game.world.log.length + 1);
      game = next.state;
    }
    throw new Error('자동 기록이 선택 지점에 도착하지 않았습니다.');
  });
  it('간격 배율은 기본 3초에 곱한다', () => {
    expect([0.5, 1, 1.5, 2].map(value => playbackDelay(value as 0.5 | 1 | 1.5 | 2))).toEqual([1500, 3000, 4500, 6000]);
  });
  it.each(['han', 'yellow', 'civilian'].flatMap(side => ['north', 'south', 'central'].map(front => [side, front])))('%s/%s 경로는 한 기록씩 재생해도 결말까지 이어진다', (side, front) => {
    let game = choose(choose(newGame('완주 시험', 184, 'zhuo', 'farmer'), side), front);
    for (let i = 0; i < 40 && !game.completed; i++) {
      const next = getCurrentEvent(game, undefined, true)!;
      game = next.automatic ? next.state : resolveChoice(game, choiceKey(next, next.choices[0].id), undefined, () => 0);
      game = JSON.parse(JSON.stringify(game));
    }
    expect(game.completed).toBe(true);
    expect(new Set(game.world.appliedEventIds).size).toBe(7);
    expect(game.world.appliedEventIds).toHaveLength(7);
  });
});
