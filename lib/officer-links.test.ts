import { describe, expect, it } from 'vitest';
import { linkOfficers } from '../scripts/officer-links.mjs';

const roster = [
  { id: 'rtk14-0521', name: '조조' },
  { id: 'rtk14-0997', name: '노숙', birthYear: 172, deathYear: 217 },
  { id: 'rtk14-0998', name: '노숙', birthYear: 208, deathYear: 274 }
];
const entries = [{ id: 'event-215', year: 215, relatedPeople: ['조조', '노숙', '미등록인물'] }];
describe('연표 인물의 장수 ID 연결', () => {
  it('별도 추정 자료 없이는 동명이인을 임의 연결하지 않는다', () => {
    const [entry] = linkOfficers(entries, roster);
    expect(entry.relatedOfficerIds).toEqual(['rtk14-0521']);
    expect(entry.officerLinkIssues).toEqual([
      { name: '노숙', reason: 'ambiguous', candidateOfficerIds: ['rtk14-0997', 'rtk14-0998'] },
      { name: '미등록인물', reason: 'not-found', candidateOfficerIds: [] }
    ]);
  });
  it('사용자의 사건별 결정을 적용하고 재실행해도 유지한다', () => {
    const decisions = { 'event-215': { 노숙: 'rtk14-0997' } };
    const linked = linkOfficers(entries, roster, decisions);
    expect(linked[0].relatedOfficerIds).toEqual(['rtk14-0521', 'rtk14-0997']);
    expect(linkOfficers(linked, roster, decisions)).toEqual(linked);
  });
  it('사용자가 미연결로 지정한 인물은 자동 연결하지 않는다', () => {
    const [entry] = linkOfficers(entries, roster, { 'event-215': { 노숙: null } });
    expect(entry.relatedOfficerIds).toEqual(['rtk14-0521']);
    expect(entry.officerLinkIssues.find((issue: { name: string }) => issue.name === '노숙')?.reason).toBe('excluded');
  });
  it('다른 이름의 문서 ID와 존재하지 않는 사건의 결정을 거절한다', () => {
    expect(() => linkOfficers(entries, roster, { 'event-215': { 노숙: 'rtk14-0521' } })).toThrow('후보에 없는 장수 ID');
    expect(() => linkOfficers(entries, roster, { deleted: { 노숙: 'rtk14-0997' } })).toThrow('사건이 없습니다');
  });
  it('생몰년의 단일 후보를 연결하고 추정 근거를 보존한다', () => {
    const source = [{ id: 'event-273', year: 273, relatedPeople: ['노숙'] }];
    const inferences = { 'event-273': { 노숙: { officerId: 'rtk14-0998', method: 'lifespan', reason: '273년 생존 후보 한 명' } } };
    const [entry] = linkOfficers(source, roster, {}, inferences);
    expect(entry.relatedOfficerIds).toEqual(['rtk14-0998']);
    expect(entry.officerLinkInferences).toEqual([{ name: '노숙', ...inferences['event-273'].노숙 }]);
  });
  it('생몰년이 겹치면 단일 후보라는 추정 근거를 거절한다', () => {
    expect(() => linkOfficers(entries, roster, {}, { 'event-215': { 노숙: { officerId: 'rtk14-0997', method: 'lifespan', reason: '잘못된 단일 후보 추정' } } })).toThrow('단일 후보');
  });
  it('사용자의 미상 결정이 추정보다 우선하며 추정 표시는 남지 않는다', () => {
    const inferences = { 'event-215': { 노숙: { officerId: 'rtk14-0997', method: 'lifespan', reason: '기간 중복으로 사용할 수 없는 과거 추정' } } };
    const [entry] = linkOfficers(entries, roster, { 'event-215': { 노숙: null } }, inferences);
    expect(entry.relatedOfficerIds).toEqual(['rtk14-0521']);
    expect(entry.officerLinkInferences).toEqual([]);
  });
  it('고인의 배우자 언급은 문맥 추정으로 연결하며 생존 필터로 오인하지 않는다', () => {
    const source = [{ id: 'widow', year: 197, relatedPeople: ['장제'] }];
    const candidates = [{ id: 'rtk14-0638', name: '장제', birthYear: 144, deathYear: 196 }, { id: 'rtk14-0418', name: '장제', birthYear: 188, deathYear: 249 }];
    const [entry] = linkOfficers(source, candidates, {}, { widow: { 장제: { officerId: 'rtk14-0638', method: 'context', reason: '이미 사망한 장제의 미망인을 언급한다.' } } });
    expect(entry.relatedOfficerIds).toEqual(['rtk14-0638']);
    expect(entry.officerLinkInferences[0].method).toBe('context');
  });
});
