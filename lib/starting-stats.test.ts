import { describe, expect, it } from 'vitest';
import { rollStartingStats, validStartingStats } from './starting-stats';
import { useGameStore } from '@/stores/game-store';
import { getCurrentEvent, resolveChoice, choiceKey } from './event-engine';

describe('시작 능력치 룰렛', () => {
  it('30과 80을 포함한 모든 정수를 생성한다', () => {
    for (let value=30;value<=80;value++) expect(Object.values(rollStartingStats(()=> (value-30+.5)/51))).toEqual(Array(5).fill(value));
    expect(Object.values(rollStartingStats(()=>0))).toEqual(Array(5).fill(30));
    expect(Object.values(rollStartingStats(()=>.999999))).toEqual(Array(5).fill(80));
  });
  it('능력치를 각각 추첨하고 범위 밖이나 소수는 확정하지 않는다', () => {
    let n=0;const result=rollStartingStats(()=>n++/5);
    expect(new Set(Object.values(result)).size).toBe(5);
    expect(validStartingStats(result)).toBe(true);
    for(const value of [29,81,30.5,NaN]) expect(validStartingStats({...result,strength:value})).toBe(false);
  });
  it('확정된 룰렛 값을 가정 보정 없이 저장하고 탁현으로 시작한다', () => {
    const stats={leadership:30,strength:80,intelligence:51,politics:42,charisma:73};
    useGameStore.getState().startGame('룰렛',stats);
    const game=useGameStore.getState().game!;
    expect(game.stats).toEqual(stats);expect(game.region).toBe('zhuo');expect(game.introChoicePending).toBe(true);
    const event=getCurrentEvent(game)!;expect(event.id).toBe('r001-01');
    const next=resolveChoice(game,choiceKey(event,event.choices[0].id));
    expect(next.introChoicePending).toBe(false);expect(next.region).toBe('zhuo');
    useGameStore.getState().resetGame();
  });
});
