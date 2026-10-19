import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const events = read('data/history/events.json');
const metadata = read('data/history/catalog-metadata.json');
const collected = read('data/collection/5-1-yellow-turban.json');
const people = new Set(collected.people.map(p => p.id));
const ids = new Set(events.map(e => e.id));
assert.equal(events.filter(e => e.year === 184 && e.id !== 'chapter-5-1-service').length, 8);
assert.equal(new Set(events.map(e => e.id)).size, events.length);
assert.equal(metadata.eventCount, events.length);
for (const event of events) {
  assert.ok(event.year >= 184 && event.year <= 188);
  assert.equal(event.month, null, '수집에서 확정하지 않은 월을 생성하지 않는다');
  assert.ok([collected.id, 'chapter-5-2', 'chapter-5-3', 'chapter-5-4', 'chapter-5-5'].includes(event.chapterId));
  assert.ok(event.flow && event.summary && event.source.record);
  assert.ok(!/https?:\/\//.test(JSON.stringify(event)));
  for (const id of event.prerequisiteEventIds ?? []) assert.ok(ids.has(id));
  for (const c of event.connections ?? []) assert.ok(ids.has(c.targetId));
  for (const node of event.flow.nodes) for (const effect of node.data.effects ?? []) if (effect.type === 'person') assert.ok(people.has(effect.personId), effect.personId);
}
console.log(`5.1~5.5 사건 ${events.length}개·인물 ID·의존 연결 검사 통과`);
