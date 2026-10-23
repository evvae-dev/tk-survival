import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const write = (path, value) => writeFileSync(path, JSON.stringify(value, null, 2) + '\n');
const index = read('data/chapters/index.json');
const events = [], facts = [];
function compile(definition, chapter, sequence) {
  const d = definition, nodes = [], edges = [];
  const node = (id, type, data) => { if (nodes.some(n => n.id === id)) throw Error(`중복 노드 ${id}`); nodes.push({id, type, position:{x:0,y:0}, data:{label:id,...data}}); return id; };
  const edge = (source, target, sourceHandle='next') => edges.push({id:`${source}-${sourceHandle}`,source,target,sourceHandle});
  const conditions = (prefix, values, yes, no, label) => {
    if (!values?.length) return yes;
    values.forEach((condition, i) => { const id=node(`${prefix}-${i}`,'condition',{label,condition}); edge(id, i+1<values.length?`${prefix}-${i+1}`:yes,'yes'); edge(id,no,'no'); });
    return `${prefix}-0`;
  };
  const result = (id, value, next, extra={}) => { node(id,'result',{text:value.text??'',effects:value.effects??[],artwork:value.artwork??d.artwork,...extra}); edge(id,next); return id; };
  node('start','start',{label:chapter.title}); node('end','end',{label:'다음 사건'});
  const outcomes = d.outcomes?.length ? d.outcomes : [{text:d.fact,effects:[]}];
  // World outcomes are shared semantically, never unconditionally applied at finish.
  const resolution = (prefix, remote) => {
    let next='end';
    for(let i=outcomes.length-1;i>=0;i--) {
      const o=outcomes[i], id=`${prefix}-${i}`;
      result(id,{...o,text:remote?(o.news??o.text):o.text,artwork:remote?{src:'/art/scenes/v2-news-courier.png',alt:'행인이 전하는 먼 곳의 소식을 길가 찻집에서 듣는 주인공'}:o.artwork},'end',{label:remote?'전해 들은 소식':'실제 결말',recordType:remote?'news':'outcome',silent:!remote&&d.outcomes===undefined});
      next=conditions(`${id}-when`,o.when,id,next,'현재 세계의 결말 조건');
    }
    return next;
  };
  const localEnd=resolution('outcome',false);
  let remoteEnd=resolution('news',true);
  // Unrelated news still updates the world, without creating a personal card.
  if(d.newsWhen?.length){
    let silentNext='end';
    for(let i=outcomes.length-1;i>=0;i--){const o=outcomes[i],id=`world-${i}`;result(id,o,'end',{label:'불참 세계 처리',silent:true});silentNext=conditions(`${id}-when`,o.when,id,silentNext,'세계 결말 조건');}
    remoteEnd=conditions('news-related',d.newsWhen,remoteEnd,silentNext,'나의 여정에 관련된 소식인가');
  }
  let routeEntry=remoteEnd;
  if(!d.routes?.length)throw Error(`${chapter.id}/${sequence}: routes required`);
  for(let r=d.routes.length-1;r>=0;r--){
    const route=d.routes[r], id=route.id;
    if(!route.choices?.length)throw Error(`${id}: empty choice route`);
    node(id,'choice',{label:route.label??d.title,text:route.text,artwork:route.artwork??d.artwork,options:route.choices.map(c=>({id:c.id,title:`[${c.title}]`,description:c.description,artwork:c.artwork??route.artwork??d.artwork,...(c.conditions?{conditions:c.conditions}:{}),...(!c.check?{outcome:c.success.hint??c.success.text}:{})}))});
    for(const choice of route.choices){
      const prefix=`${id}-${choice.id}`;
      const ok=result(`${prefix}-ok`,{...choice.success,artwork:choice.success.artwork??choice.artwork??route.artwork??d.artwork},localEnd,{label:`${choice.title} 결과`});
      if(choice.check){
        const check=node(`${prefix}-check`,'check',{label:`${choice.title} 판정`,check:{...choice.check,success:choice.success.hint??choice.success.text,failure:choice.failure.hint??choice.failure.text,successNarrative:choice.success.text,failureNarrative:choice.failure.text}});
        const fail=result(`${prefix}-fail`,{...choice.failure,artwork:choice.failure.artwork??choice.artwork??route.artwork??d.artwork},localEnd,{label:`${choice.title} 실패`});
        edge(id,check,choice.id);edge(check,ok,'yes');edge(check,fail,'no');
      }else edge(id,ok,choice.id);
    }
    const background=result(`${id}-background`,{text:route.background??d.background??d.fact,artwork:route.artwork??d.artwork},id,{label:'현장 배경',recordType:'background'});
    const arrival=result(`${id}-arrival`,{text:route.arrival??'',effects:[...(route.region?[{type:'region',value:route.region}]:[]),...(route.entryEffects??[])],artwork:route.artwork??d.artwork},background,{label:'허가된 현장 진입',silent:!route.arrival});
    routeEntry=conditions(`${id}-eligible`,route.when,arrival,routeEntry,'참여 자격·진영 확인');
  }
  const cancel=result('cancel',{text:d.cancelText??'사건의 전제가 달라져 원래 전개는 일어나지 않았다.'},'end',{label:'원래 사건 취소',silent:!d.cancelText,recordType:'news'});
  const requirements=[...(d.requires??[]),...(d.requiredAlive??[]).map(id=>({field:`world.people.${id}`,operator:'neq',value:'dead'}))];
  // No unreachable cancellation node for an event without world requirements.
  if(!requirements.length){nodes.splice(nodes.findIndex(n=>n.id==='cancel'),1);edges.splice(edges.findIndex(e=>e.source==='cancel'),1);}
  edge('start',conditions('world-requires',requirements,routeEntry,'cancel','세계에서 사건이 성립하는가'));
  // Deterministic layered layout; every branch remains editable in the common graph.
  const degree=new Map(nodes.map(n=>[n.id,0])),depth=new Map(nodes.map(n=>[n.id,0]));
  for(const e of edges)degree.set(e.target,degree.get(e.target)+1);
  const ready=nodes.filter(n=>!degree.get(n.id)).map(n=>n.id);
  for(let i=0;i<ready.length;i++)for(const e of edges.filter(e=>e.source===ready[i])){depth.set(e.target,Math.max(depth.get(e.target),depth.get(e.source)+1));degree.set(e.target,degree.get(e.target)-1);if(!degree.get(e.target))ready.push(e.target);}
  if(ready.length!==nodes.length)throw Error('순환 그래프');
  const layers=new Map();for(const n of nodes){const level=depth.get(n.id);if(!layers.has(level))layers.set(level,[]);layers.get(level).push(n);}
  for(const [level,layer]of layers)layer.forEach((n,i)=>{n.position={x:(i-(layer.length-1)/2)*420,y:level*300};});
  const id=`r${String(chapter.order).padStart(3,'0')}-${String(sequence).padStart(2,'0')}`;
  return {id,edition:index.edition,chapterId:chapter.id,sequence,prerequisiteEventIds:events.length?[events.at(-1).id]:[],connections:[],year:d.year??184,month:null,precision:d.precision??'approximate',calendar:'lunar',title:`[${d.title}]`,summary:d.fact,regionIds:d.regions??[d.region],factionIds:d.factions??['han','yellow-turban','liu-bei'],relatedPeople:d.people??[],relatedOfficerIds:d.officers??[],category:'novel',source:{title:`삼국지연의 제${chapter.order}회`,record:d.fact},dateNote:d.dateNote??'원작 회차의 전개 순서이며 월 미상. 선택·개입·대안역사는 게임 창작.',flow:{nodes,edges,passiveEffects:[]}};
}
for(const chapter of index.chapters){
 const path=`data/chapters/${chapter.id}.json`;if(!existsSync(path))continue;
 const book=read(path),source=readFileSync(chapter.source,'utf8');
 if(book.edition!==index.edition)throw Error(`${path}: 폐기된 판본은 생성할 수 없습니다.`);
 for(const [i,d]of book.events.entries()){
  const event=compile(d,chapter,i+1);
  if(events.length)events.at(-1).connections=[{targetId:event.id,label:events.at(-1).chapterId===chapter.id?'다음 시대 흐름':'다음 챕터'}];
  events.push(event);facts.push({id:event.id,chapterId:chapter.id,order:i+1,sourceFile:chapter.source,sourceSha256:createHash('sha256').update(source).digest('hex'),sourceStage:d.sourceStage??i+1,title:d.title,fact:d.fact,category:'novel',people:d.people??[],officers:d.officers??[]});
 }
}
write('data/history/events.json',events);
write('data/chapters/facts.json',facts);
write('data/history/catalog-metadata.json',{edition:index.edition,eventCount:events.length,chapterCount:new Set(events.map(e=>e.chapterId)).size,orderPolicy:'chapter-file-order',sourceType:'삼국지연의 회차 원본',generatedBy:'scripts/build-story.mjs'});
write('data/chapters/balance-review.json',{edition:index.edition,choices:events.flatMap(event=>event.flow.nodes.filter(n=>n.type==='check').map(n=>({eventId:event.id,nodeId:n.id,...n.data.check,failureFame:-n.data.check.fameReward/2})))});
write('data/reference/chronology.json',events.map(e=>({id:e.id,year:e.year,month:null,precision:e.precision,calendar:e.calendar,leapMonth:null,title:e.title,content:e.summary,regionIds:e.regionIds,factionIds:e.factionIds,relatedPeople:e.relatedPeople,relatedOfficerIds:e.relatedOfficerIds,officerLinkInferences:[],officerLinkIssues:[],category:e.category,parentId:null,source:{title:e.source.title,record:null},verification:'secondary',section:e.chapterId,dateNote:e.dateNote})));
const meta=read('data/reference/metadata.json');
write('data/reference/metadata.json',{...meta,timelineCount:events.length,playableTimelineCount:events.length,collectedTimelineCount:events.length,yearRange:events.length?[Math.min(...events.map(e=>e.year)),Math.max(...events.map(e=>e.year))]:[],headings:[...new Set(events.map(e=>e.chapterId))]});
console.log(`새 판본 ${index.edition}: 챕터 ${new Set(events.map(e=>e.chapterId)).size}개 · 사건 ${events.length}개`);
