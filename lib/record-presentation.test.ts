import { describe, expect, it } from 'vitest';
import { narrativeText, personSegments } from './record-presentation';
describe('기록 문맥 표시', () => {
  it('일반 명사 장수·전의를 인명으로 연결하지 않는다', () => {
    const parts = personSegments('관군 장수가 전의를 다졌다. 유비의 군대가 왔다.', ['장수', '전의', '유비']);
    expect(parts.filter(part => part.person).map(part => part.person)).toEqual(['유비']);
  });
  it('장비라는 일반 물건을 장수 장비로 오인하지 않는다', () => {
    expect(personSegments('장비 좋은 쪽으로 가자.', ['장비']).some(part => part.person)).toBe(false);
    expect(personSegments('관우와 장비의 매복이다.', ['관우', '장비']).filter(part => part.person).map(part => part.person)).toEqual(['관우', '장비']);
  });
  it('결과 요약을 본문과 구분하고 문장 사이 구분점을 없앤다', () => {
    expect(narrativeText('성공 · 병졸이 된다.\n나는 관군에 합류했다. · 이제 살아남아야겠다.')).toBe('나는 관군에 합류했다. 이제 살아남아야겠다.');
  });
});
