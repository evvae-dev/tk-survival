import { describe, expect, it } from 'vitest';
import { applyEventExclusions } from '../scripts/event-exclusions.mjs';
import { timeline, officers } from './reference-data';
import { historicalEvents } from './history';
describe('5.1만 남긴 활성 자료', () => {
  it('삭제한 상위 항목의 자식을 남은 상위 항목으로 연결한다', () => {
    expect(applyEventExclusions([{ id: 'root', parentId: null }, { id: 'life', parentId: 'root' }, { id: 'detail', parentId: 'life' }], { life: '삭제' })).toEqual([{ id: 'root', parentId: null }, { id: 'detail', parentId: 'root' }]);
  });
  it('독립 출생·사망 및 5.2 이후 사건 없이 장수 자료는 보존한다', () => {
    expect(timeline).toHaveLength(6);
    expect(timeline.every(e => e.year === 184)).toBe(true);
    expect(timeline.some(e => /탄생|출생/.test(e.content))).toBe(false);
    expect(historicalEvents.some(e => /^h\d|^n\d/.test(e.id))).toBe(false);
    expect(officers).toHaveLength(1000);
  });
});
