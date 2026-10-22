import assert from 'node:assert/strict';
import {readFileSync}from'node:fs';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const chronology=read('data/reference/chronology.json'),officers=read('data/reference/officers.json'),meta=read('data/reference/metadata.json'),facts=read('data/chapters/facts.json');
assert.equal(chronology.length,meta.timelineCount);assert.equal(officers.length,1000);assert.equal(new Set(chronology.map(e=>e.id)).size,chronology.length);
assert.deepEqual(chronology.map(e=>e.id),facts.map(e=>e.id));
for(const e of chronology){
 assert.equal(e.source.record,null);assert.ok(e.precision!=='approximate'||e.dateNote);assert.equal(e.month,null);
 for(const id of e.relatedOfficerIds){const person=officers.find(o=>o.id===id);assert.ok(person&&e.relatedPeople.includes(person.name),`${e.id}: ${id} 장수 연결`);}
}
for(const o of officers){assert.ok(Object.values(o.stats).every(n=>Number.isInteger(n)&&n>=0&&n<=100));assert.ok(o.birthYear<=o.deathYear);}
console.log(`챕터 사실 ${chronology.length}개·명시 장수 연결·능력 자료 ${officers.length}명 검증 통과`);
