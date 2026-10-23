import { describe, expect, it } from 'vitest';
import { narrativeText, personSegments, repairLegacyEditorialText } from './record-presentation';
import { historicalEvents } from './history';
import { upgradeLegacyEvent } from './catalog-upgrade';
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
  it('이미 저장된 해설은 표시에서만 제외하고 사건 경과와 확정 기록을 보존한다', () => {
    const record={recordId:'r001-01:market-background',detail:'장각은 신도를 모았고 장보·장량과 거사를 준비했다. 요술은 연의의 설정이다.',growth:{fame:4}};
    const saved=JSON.stringify(record);
    expect(narrativeText(record.detail)).toBe('장각은 신도를 모았고 장보·장량과 거사를 준비했다.');
    expect(JSON.stringify(record)).toBe(saved);
    expect(narrativeText('장보의 요술은 연의 속 전개다. 주준이 병사들을 모았다.')).toBe('주준이 병사들을 모았다.');
    expect(repairLegacyEditorialText('  나는 장보의 요술을 경계했다.  ')).toBe('  나는 장보의 요술을 경계했다.  ');
  });
  it('저장된 카탈로그의 알려진 옛 해설만 보완하고 관리자 문구·출처·분기는 유지한다', () => {
    const event=structuredClone(historicalEvents[0]);
    const node=event.flow!.nodes.find(n=>n.id==='market-background')!;
    node.data.text='장각이 거사를 준비했다. 요술은 연의의 설정이다. 내가 덧붙인 기록이다.';
    event.source.record='요술은 연의의 설정이다.';
    const before=structuredClone(event),next=upgradeLegacyEvent(event);
    expect(next.flow!.nodes.find(n=>n.id===node.id)!.data.text).toBe('장각이 거사를 준비했다. 내가 덧붙인 기록이다.');
    expect(next.source).toEqual(before.source);
    expect(next.flow!.edges).toEqual(before.flow!.edges);
    expect(next.flow!.nodes.map(n=>[n.id,n.data.condition,n.data.effects])).toEqual(before.flow!.nodes.map(n=>[n.id,n.data.condition,n.data.effects]));
    expect(event).toEqual(before);
    expect(upgradeLegacyEvent(next)).toBe(next);
  });
});
