import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const file = process.argv[2] ?? 'data/collection/5-1-yellow-turban.json';
const chapter = JSON.parse(await readFile(file, 'utf8'));
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const registry = (items, name) => {
  const map = new Map(items.map(item => [item.id, item]));
  assert(map.size === items.length, `${name} ID 중복`);
  return map;
};
const officers = registry(JSON.parse(await readFile('data/reference/officers.json', 'utf8')), '장수');
const chronology = registry(JSON.parse(await readFile('data/reference/chronology.json', 'utf8')), '연표');
const entityData = JSON.parse(await readFile('data/history/entities.json', 'utf8'));
const regions = registry(entityData.regions, '지역');
const factions = registry(entityData.factions, '세력');
const people = registry(chapter.people, '수집 인물');
const places = registry(chapter.places, '수집 장소');
const sources = registry(chapter.sourceRecords, '문헌 근거');
const events = registry(chapter.events, '수집 사건');
registry(chapter.links, '사건 연결');
assert(chapter.schemaVersion === 1 && chapter.playable === false, '수집 자료의 스키마·실행 상태 오류');
assert(chapter.id === 'chapter-5-1-yellow-turban' && events.size === 5, '5.1 범위는 지정 전투 5개다.');
assert(chapter.metadata.scope.battleSections.join(',') === '4.1,4.2,4.3,4.4,4.5', '수집 절 범위 오류');
for (const key of ['officers']) {
  const hash = createHash('sha256').update(await readFile(`data/reference/${key}.json`)).digest('hex');
  assert(chapter.metadata.referenceFileHashes[key] === hash, `연결 기준 ${key} 자료가 달라졌다.`);
}
for (const person of people.values()) {
  if (person.officerId) assert(officers.get(person.officerId)?.name === person.name, `${person.name}: 장수 참조 오류`);
  for (const id of person.candidateOfficerIds) assert(officers.has(id), `후보 장수 없음: ${id}`);
}
for (const place of places.values()) assert(regions.has(place.parentRegionId), `상위 지역 없음: ${place.id}`);
const sourceIds = new Set(chapter.metadata.sources.map(source => source.id));
for (const source of sources.values()) {
  assert(sourceIds.has(source.collectionSourceId), `수집 출처 없음: ${source.id}`);
  assert(source.reviewStatus === 'secondary' && source.verifiedDirectly === false, '원사서 검증 상태가 과장됐다.');
  assert(source.work && source.secondarySummary && source.record === null, `2차 자료 요약과 미확인 사서기록을 구분해야 한다: ${source.id}`);
}
let stages = 0;
for (const event of events.values()) {
  assert(event.historicalDate.year === 184 && event.playable === false, `범위·실행 상태 오류: ${event.id}`);
  assert(!/탄생|출생|사망/.test(event.title), `독립 탄생·사망 항목: ${event.title}`);
  assert(event.overview && event.reportedOutcomes.length && event.stages.length, `개요·전개·결과 누락: ${event.id}`);
  for (const id of event.referenceEntryIds) assert(chronology.has(id), `연표 참조 없음: ${id}`);
  for (const id of event.placeIds) assert(places.has(id), `장소 참조 없음: ${id}`);
  for (const id of event.factionIds) assert(factions.has(id), `세력 참조 없음: ${id}`);
  for (const actor of event.participants) assert(people.has(actor.personId), `참여 인물 없음: ${actor.personId}`);
  registry(event.stages, '전개 단계');
  for (const [index, stage] of event.stages.entries()) {
    assert(stage.order === index + 1 && stage.action, `단계 순서·행동 누락: ${stage.id}`);
    assert(places.has(stage.placeId), `단계 장소 없음: ${stage.id}`);
    for (const id of stage.actorIds) assert(people.has(id), `단계 인물 없음: ${id}`);
    for (const id of stage.sourceRecordIds) assert(sources.has(id), `단계 근거 없음: ${id}`);
  }
  for (const id of event.sourceRecordIds) assert(sources.has(id), `사건 근거 없음: ${id}`);
  assert(event.gameplayDraft.authorship === 'game-fiction' && event.gameplayDraft.implementationStatus === 'not-implemented', '창작 분기와 실행 상태를 구분해야 한다.');
  stages += event.stages.length;
}
for (const group of chapter.eventGroups) {
  for (const id of group.eventIds) assert(events.has(id), `사건군 참조 없음: ${id}`);
  for (const id of group.referenceEntryIds) assert(chronology.has(id), `사건군 연표 없음: ${id}`);
  for (const observation of group.timelineObservations) assert(chronology.has(observation.referenceEntryId) && sourceIds.has(observation.collectionSourceId), '상위 경과의 자료 참조 오류');
}
for (const link of chapter.links) assert(events.has(link.from) && events.has(link.to) && link.status === 'candidate', `연결 참조·실행 상태 오류: ${link.id}`);
for (const [name, id] of [['조홍', 'rtk14-0620'], ['한충', 'rtk14-0173']]) {
  assert(chapter.people.some(person => person.name === name && person.officerId === id && person.linkStatus === 'user-confirmed'), `${name}: 사용자 지정 누락`);
}
const withoutMetadata = { ...chapter, metadata: undefined };
assert(!JSON.stringify(withoutMetadata).includes('https://'), '플레이용 출처에 사이트 URL이 포함됐다.');
console.log(JSON.stringify({ file, events: events.size, stages, people: people.size, sources: sources.size, links: chapter.links.length, playable: false, validation: '구조·ID 참조 검사 통과. 원사서 검증은 별개다.' }));
