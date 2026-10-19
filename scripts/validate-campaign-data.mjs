import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const collection = read('data/collection/5-2-to-5-5.json');
const events = read('data/history/events.json');
const prose = read('data/history/campaign-narrative.json');
const officers = new Map(read('data/reference/officers.json').map(p => [p.id, p]));
const sources = new Map(collection.sources.map(s => [s.id, s]));
assert.equal(collection.collector, 'Codex web');
assert.equal(collection.events.length, 16);
assert.equal(new Set(collection.events.map(e => e.id)).size, collection.events.length);
assert.equal(sources.size, collection.sources.length);
for (const source of sources.values()) {
  assert.ok(source.url.startsWith('https://') && source.title && source.locator && source.license);
  assert.ok(['body-read', 'search-excerpt'].includes(source.access));
}
for (const card of collection.events) {
  assert.ok([2, 3, 4, 5].includes(card.chapter));
  assert.equal(card.chapterYear, 183 + card.chapter);
  assert.ok(!/탄생|출생|사망/.test(card.title), card.id);
  assert.ok(card.background && card.reportedOutcome && card.dateNote && card.stages.length);
  assert.ok(card.sourceIds.length && card.sourceIds.every(id => sources.has(id)));
  assert.equal(new Set(card.stages.map(s => s.id)).size, card.stages.length);
  card.stages.forEach((stage, index) => { assert.equal(stage.order, index + 1); assert.ok(stage.action); });
  for (const person of card.participants) if (person.officerId) assert.equal(officers.get(person.officerId)?.name, person.name, card.id);
  if (card.runtimeEnabled) {
    const event = events.find(e => e.id === card.id);
    assert.ok(event?.flow && prose[card.id]);
    assert.equal(event.chapterId, `chapter-5-${card.chapter}`);
    assert.equal(event.year, card.chapterYear);
    assert.ok(event.flow.nodes.some(n => n.id === 'report' && n.data.text === card.reportedOutcome));
  }
}
for (const chapter of [1, 2, 3, 4]) {
  const route = events.find(e => e.id === `chapter-5-${chapter}-service`);
  assert.ok(route?.flow);
  const offers = route.flow.nodes.find(n => n.id === 'offers').data.options.filter(o => o.id.startsWith('join-'));
  for (const option of offers) {
    assert.ok(option.conditions.some(c => c.field.startsWith('world.people.')));
    assert.ok(option.conditions.some(c => c.field === 'region'));
    const edge = route.flow.edges.find(e => e.source === 'offers' && e.sourceHandle === option.id);
    assert.equal(route.flow.nodes.find(n => n.id === edge.target).data.check.kind, 'relationship');
  }
}
console.log(`5.2~5.5 수집 ${collection.events.length}개·출처 ${sources.size}개·장수 참조·매력 합류 구조 검사 통과`);
