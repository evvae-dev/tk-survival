import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { linkOfficers } from './officer-links.mjs';
const read = name => JSON.parse(readFileSync(new URL(`../data/reference/${name}.json`, import.meta.url), 'utf8'));
const chronology = read('chronology'), officers = read('officers'), metadata = read('metadata');
const exclusions = read('event-exclusions');
assert.ok(chronology.every(entry => !Object.hasOwn(exclusions.chronology, entry.id)), '제외한 연표 항목이 남아 있다.');
const expectedLinks = linkOfficers(chronology, officers, read('officer-link-decisions').decisions, read('officer-link-inferences').inferences);
for (const [index, item] of chronology.entries()) {
  assert.deepEqual(item.relatedOfficerIds, expectedLinks[index].relatedOfficerIds, `${item.id}: 장수 ID 연결 불일치`);
  assert.deepEqual(item.officerLinkIssues, expectedLinks[index].officerLinkIssues, `${item.id}: 확인 대기 정보 불일치`);
  assert.deepEqual(item.officerLinkInferences, expectedLinks[index].officerLinkInferences, `${item.id}: 추정 근거 불일치`);
  for (const id of item.relatedOfficerIds) {
    const officer = officers.find(person => person.id === id);
    assert.ok(officer && item.relatedPeople.includes(officer.name), `${item.id}: 존재하지 않는 장수 또는 이름 불일치`);
  }
}
assert.equal(chronology.length, metadata.timelineCount);
assert.equal(officers.length, metadata.officerCount);
assert.equal(officers.length, 1000, '기준 시트는 1,000명이다. 수량 변경은 원본을 확인한다.');
assert.deepEqual(officers.map(item => item.gameId).sort((a, b) => a - b), Array.from({ length: 1000 }, (_, i) => i + 1));
const ids = new Set(chronology.map(item => item.id));
assert.equal(ids.size, chronology.length);
assert.equal(chronology.length, 6, '5.1 상위 연표 6개만 유지');
assert.ok(chronology.every(item => item.year === 184));
const entities = JSON.parse(readFileSync(new URL('../data/history/entities.json', import.meta.url), 'utf8'));
for (const item of chronology) {
  assert.ok(Number.isInteger(item.year));
  assert.ok(item.month === null || Number.isInteger(item.month) && item.month >= 1 && item.month <= 12);
  assert.ok(item.precision !== 'month' || item.month !== null);
  assert.ok(item.precision !== 'approximate' || item.dateNote);
  assert.ok(item.parentId === null || ids.has(item.parentId));
  if (item.parentId) assert.equal(chronology.find(parent => parent.id === item.parentId).year, item.year, '상위 사건과 같은 연도');
  assert.ok(item.regionIds.every(id => entities.regions.some(entity => entity.id === id)));
  assert.ok(item.factionIds.every(id => entities.factions.some(entity => entity.id === id)));
  assert.equal(item.source.record, null, '원사서 미대조 자료에 사서기록을 생성하면 안 된다.');
  assert.ok(!/https?:\/\//.test(JSON.stringify(item)));
}
for (const officer of officers) {
  assert.ok(officer.name && officer.location);
  assert.ok(Object.values(officer.stats).every(value => Number.isInteger(value) && value >= 0 && value <= 100));
  assert.ok(officer.birthYear <= officer.deathYear);
}
assert.equal(officers.find(item => item.gameId === 521).name, '조조');
assert.equal(officers.find(item => item.gameId === 952).name, '유비');
console.log(`연표 ${chronology.length}개, 장수 ${officers.length}명, 활성 범위 5.1 검증 완료.`);
