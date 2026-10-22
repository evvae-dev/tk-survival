import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const events=read('data/history/events.json'),index=read('data/chapters/index.json'),facts=read('data/chapters/facts.json'),meta=read('data/history/catalog-metadata.json');
const ids=new Set(events.map(e=>e.id));const officers=new Set(read('data/reference/officer-abilities.json').map(e=>e.id));
assert.equal(ids.size,events.length);assert.equal(meta.eventCount,events.length);assert.equal(meta.orderPolicy,'chapter-file-order');
for(const chapter of index.chapters){
 const path=`data/chapters/${chapter.id}.json`;if(!existsSync(path))continue;
 const source=readFileSync(chapter.source,'utf8');const headings=[...source.matchAll(/^\d+\. /gm)];const definitions=read(path);
 assert.equal(definitions.events.length,headings.length,`${chapter.id}: 원본 전개 누락`);
 for(const fact of facts.filter(f=>f.chapterId===chapter.id))assert.equal(fact.sourceSha256,createHash('sha256').update(source).digest('hex'));
}
for(const event of events){
 assert.ok(index.chapters.some(c=>c.id===event.chapterId));assert.equal(event.month,null);assert.ok(event.summary&&event.source.record&&event.flow);assert.ok(facts.some(f=>f.id===event.id));
 for(const id of event.prerequisiteEventIds??[])assert.ok(ids.has(id));for(const c of event.connections??[])assert.ok(ids.has(c.targetId));
 for(const node of event.flow.nodes){
  if(node.type==='choice'){
   assert.equal(node.data.options.length,3,`${event.id}/${node.id}: A/B/C`);
   assert.ok(node.data.text.split(/(?<=[.!?])\s+/).length>=3);
  }
  const artwork=[node.data.artwork,...(node.data.options??[]).map(o=>o.artwork)].filter(Boolean);
  for(const art of artwork){assert.ok(existsSync('public'+art.src),art.src);assert.ok(art.alt);}
  if(node.data.check?.opponentId)assert.ok(officers.has(node.data.check.opponentId));
  for(const eff of node.data.effects??[])if(eff.type==='person')assert.ok(officers.has(eff.personId));
 }
}
console.log(`챕터 ${meta.chapterCount}개 / 사건 ${events.length}개 원본 대응·이미지 경로·참조 검증 통과`);
