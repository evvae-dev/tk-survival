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
 assert.equal(event.edition,index.edition);assert.ok(index.chapters.some(c=>c.id===event.chapterId));assert.equal(event.month,null);assert.ok(event.summary&&event.source.record&&event.flow);assert.ok(facts.some(f=>f.id===event.id));
 for(const id of event.prerequisiteEventIds??[])assert.ok(ids.has(id));for(const c of event.connections??[])assert.ok(ids.has(c.targetId));
 for(const node of event.flow.nodes){
  const narrative=[node.data.text,...(node.data.options??[]).flatMap(o=>[o.title,o.description,o.outcome]),node.data.check?.success,node.data.check?.failure,node.data.check?.successNarrative,node.data.check?.failureNarrative].filter(v=>typeof v==='string');
  for(const text of narrative)assert.ok(!/(?:연의|정사|게임)(?:의| 속)? (?:기본 |요술 )?(?:설정|전개)(?:이다|다|이며|에서)/.test(text),`${event.id}/${node.id}: 출처·설정 해설은 게임 서술에 넣지 말고 관리자 근거로 분리하세요.`);
  if(node.type==='choice'){
   assert.ok(node.data.options.length>=1,`${event.id}/${node.id}: 유효한 현장 행동 필요`);
   assert.ok(node.data.text.split(/(?<=[.!?])\s+/).length>=3);
   assert.ok(node.data.artwork,`${event.id}/${node.id}: 상황 이미지 필요`);
   for(const option of node.data.options)assert.ok(option.artwork,`${event.id}/${node.id}/${option.id}: 선택 이미지 필요`);
  }
  const artwork=[node.data.artwork,...(node.data.options??[]).map(o=>o.artwork)].filter(Boolean);
  for(const art of artwork){assert.ok(existsSync('public'+art.src),art.src);assert.ok(art.alt);assert.ok(!art.src.startsWith('/art/characters/'),`${event.id}/${node.id}: 인물 단독 이미지 금지`);}
  if(node.type==='check'){assert.ok(node.data.check.weights);assert.ok(Number.isFinite(node.data.check.difficulty));assert.ok(node.data.check.fameReward>0);}
  if(node.data.check?.opponentId)assert.ok(officers.has(node.data.check.opponentId));
  for(const eff of node.data.effects??[])if(eff.type==='person')assert.ok(officers.has(eff.personId));
 }
}
console.log(`챕터 ${meta.chapterCount}개 / 사건 ${events.length}개 원본 대응·이미지 경로·참조 검증 통과`);
