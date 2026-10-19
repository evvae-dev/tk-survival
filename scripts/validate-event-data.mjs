import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const events = read('data/history/events.json');
const metadata = read('data/history/catalog-metadata.json');
const collected = read('data/collection/5-1-yellow-turban.json');
const people = new Set(collected.people.map(p => p.id));
const ids = new Set(events.map(e => e.id));
assert.equal(events.length, 8);
assert.equal(metadata.eventCount, events.length);
for (const event of events) {
  assert.equal(event.year, 184);
  assert.equal(event.month, null, '수집에서 확정하지 않은 월을 생성하지 않는다');
  assert.equal(event.chapterId, collected.id);
  assert.ok(event.flow && event.summary && event.source.record);
  assert.ok(!/https?:\/\//.test(JSON.stringify(event)));
  for (const id of event.prerequisiteEventIds ?? []) assert.ok(ids.has(id));
  for (const c of event.connections ?? []) assert.ok(ids.has(c.targetId));
  for (const node of event.flow.nodes) for (const effect of node.data.effects ?? []) if (effect.type === 'person') assert.ok(people.has(effect.personId), effect.personId);
}
console.log('5.1 사건 8개·인물 ID·의존 연결 검사 통과 (실행 분기는 단위 테스트에서 검사)');
