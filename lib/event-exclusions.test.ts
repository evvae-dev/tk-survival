import { describe, expect, it } from 'vitest';
import { applyEventExclusions } from '../scripts/event-exclusions.mjs';
import { timeline, officers } from './reference-data';
import { historicalEvents } from './history';
describe('챕터 문서만 사용하는 활성 자료', () => {
  it('삭제한 상위 항목의 자식을 남은 상위 항목으로 연결한다', () => {
    expect(applyEventExclusions([{ id: 'root', parentId: null }, { id: 'life', parentId: 'root' }, { id: 'detail', parentId: 'life' }], { life: '삭제' })).toEqual([{ id: 'root', parentId: null }, { id: 'detail', parentId: 'root' }]);
  });
  it('활성 연표가 현재 챕터 사건과 일치하고 장수 자료는 보존한다', () => {
    expect(timeline.map(e=>e.id)).toEqual(historicalEvents.map(e=>e.id));
    expect(timeline.every(e => /^chapter-00[123]$/.test(e.section))).toBe(true);
    expect(timeline.some(e => /탄생|출생/.test(e.content))).toBe(false);
    expect(historicalEvents.some(e => /^h\d|^n\d/.test(e.id))).toBe(false);
    expect(officers).toHaveLength(1000);
  });
});
