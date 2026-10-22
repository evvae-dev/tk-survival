import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const index=read('data/chapters/index.json');
const all=[];const facts=[];
// Lay out every branch independently so its checks remain selectable in the editor.
function layoutFlow(nodes,edges){
 const byId=new Map(nodes.map(n=>[n.id,n]));
 const incoming=new Map(nodes.map(n=>[n.id,0]));
 const outgoing=new Map(nodes.map(n=>[n.id,[]]));
 const depth=new Map(nodes.map(n=>[n.id,0]));
 for(const e of edges){incoming.set(e.target,incoming.get(e.target)+1);outgoing.get(e.source).push(e.target);}
 const ready=nodes.filter(n=>incoming.get(n.id)===0).map(n=>n.id);let visited=0;
 for(let i=0;i<ready.length;i++){
  const id=ready[i];visited++;
  for(const target of outgoing.get(id)){
   depth.set(target,Math.max(depth.get(target),depth.get(id)+1));
   incoming.set(target,incoming.get(target)-1);
   if(incoming.get(target)===0)ready.push(target);
  }
 }
 if(visited!==nodes.length)throw new Error('실행흐름에 순환 연결이 있습니다.');
 const layers=new Map();
 for(const n of nodes){const level=depth.get(n.id);if(!layers.has(level))layers.set(level,[]);layers.get(level).push(n.id);}
 for(const [level,ids]of layers)ids.forEach((id,i)=>{byId.get(id).position={x:(i-(ids.length-1)/2)*420,y:level*340};});
}
for(const chapter of index.chapters){
 const path=`data/chapters/${chapter.id}.json`;if(!existsSync(path))continue;
 const book=read(path);const source=readFileSync(chapter.source,'utf8');
 for(const [i,d] of book.events.entries()){
  const id=`r${String(chapter.order).padStart(3,'0')}-${String(i+1).padStart(2,'0')}`;
  const nodes=[],edges=[];
  const node=(id,type,data,x=0,y=nodes.length*190)=>{nodes.push({id,type,position:{x,y},data:{label:data.label??id,...data}});return id;};
  const edge=(source,target,sourceHandle='next')=>edges.push({id:`${source}-${sourceHandle}`,source,target,sourceHandle});
  node('start','start',{label:chapter.title});node('end','end',{label:'다음 사건'},1600,0);
  const result=(key,value,next='after')=>{node(key,'result',{label:key,text:value.text,effects:value.effects??[]});edge(key,next);};
  node('entry','result',{label:'현장 도착',text:d.entry,effects:[{type:'region',value:d.region}],silent:!d.entry});if(d.requiredAlive?.length){edge('start','alive-0');for(const [a,person]of d.requiredAlive.entries()){node(`alive-${a}`,'condition',{label:'필수 인물 생존',condition:{field:`world.people.${person}`,operator:'neq',value:'dead'}});edge(`alive-${a}`,a===d.requiredAlive.length-1?'entry':`alive-${a+1}`,'yes');edge(`alive-${a}`,'end','no');}}else edge('start','entry');
  node('background','result',{label:'사건 배경',text:d.background??d.fact,recordType:'background',effects:d.backgroundEffects??[]});edge('entry','background');
  const variants=[...(d.variants??[]),{key:'scene',text:d.scene}];
  for(const [j,v] of variants.entries()){
   const key=v.key??`variant-${j}`;
   if(v.condition){node(`when-${j}`,'condition',{label:'앞선 선택 반영',condition:v.condition},-500,j*300);edge(j?`when-${j-1}`:'background',`when-${j}`,j?'no':'next');edge(`when-${j}`,key,'yes');}
   else edge(j?`when-${j-1}`:'background',key,j?'no':'next');
   const choices=v.choices??d.choices;
   node(key,'choice',{label:d.title,text:v.text,artwork:v.artwork??d.artwork??null,options:choices.map(c=>({id:c.id,title:`[${c.title}]`,description:c.description,...(c.conditions?{conditions:c.conditions}:{}),...(!c.check?{outcome:c.success.hint??c.success.text}:{}),artwork:c.artwork??null}))},j*620,850);
   for(const c of choices){
    const prefix=`${key}-${c.id}`;
    if(c.check){
     node(`${prefix}-check`,'check',{label:`${c.title} 판정`,check:{...c.check,success:c.success.hint??c.success.text,failure:c.failure.hint??c.failure.text,successNarrative:c.success.text,failureNarrative:c.failure.text}},j*620,1200);edge(key,`${prefix}-check`,c.id);
     result(`${prefix}-ok`,c.success);result(`${prefix}-fail`,c.failure);edge(`${prefix}-check`,`${prefix}-ok`,'yes');edge(`${prefix}-check`,`${prefix}-fail`,'no');
    }else {result(prefix,c.success);edge(key,prefix,c.id);}
   }
  }
  const outcomes=d.outcomes??[];
  node('after','result',{label:'사건 종료 표식',silent:true,effects:[{type:'flag',key:`${id}-complete`,value:true}]});
  for(const [k,o]of outcomes.entries()){
   const out=`outcome-${k}`;node(out,'result',{label:'실제 결말',text:o.text,recordType:'outcome',effects:o.effects??[]});edge(out,'end');
   if(o.condition){node(`outcome-if-${k}`,'condition',{label:'변경된 역사 확인',condition:o.condition});edge(k?`outcome-if-${k-1}`:'after',`outcome-if-${k}`,k?'no':'next');edge(`outcome-if-${k}`,out,'yes');}
   else edge(k?`outcome-if-${k-1}`:'after',out,k?'no':'next');
  }
  if(!outcomes.length)edge('after','end');
  layoutFlow(nodes,edges);
  const prior=i?`r${String(chapter.order).padStart(3,'0')}-${String(i).padStart(2,'0')}`:all.at(-1)?.id;
  const event={id,chapterId:chapter.id,sequence:i+1,prerequisiteEventIds:prior?[prior]:[],connections:[],year:d.year??184,month:null,precision:d.precision??'year',calendar:'lunar',title:`[${d.title}]`,summary:d.fact,regionIds:[d.region],factionIds:d.factions??['han','yellow-turban'],relatedPeople:d.people??[],relatedOfficerIds:d.officers??[],category:'novel',source:{title:`삼국지연의 제${chapter.order}회 사건 문서`,record:d.fact},dateNote:d.dateNote??'챕터 문서의 전개 순서. 월 미상. 선택·판정·대체 결과는 게임 창작.',flow:{nodes,edges,passiveEffects:[]}};
  if(all.length)all.at(-1).connections=[{targetId:id,label:all.at(-1).chapterId===chapter.id?'다음 장면':'다음 챕터'}];
  all.push(event);
  facts.push({id:event.id,chapterId:chapter.id,order:i+1,sourceFile:chapter.source,sourceSha256:createHash('sha256').update(source).digest('hex'),sourceStage:i+1,title:d.title,fact:d.fact,category:'novel',people:d.people??[],officers:d.officers??[]});
 }
}
writeFileSync('data/history/events.json',JSON.stringify(all,null,2)+'\n');
writeFileSync('data/history/catalog-metadata.json',JSON.stringify({edition:index.edition,eventCount:all.length,chapterCount:new Set(all.map(e=>e.chapterId)).size,orderPolicy:'chapter-file-order',sourceType:'삼국지연의 챕터 사건 문서',generatedBy:'scripts/build-story.mjs'},null,2)+'\n');
writeFileSync('data/chapters/facts.json',JSON.stringify(facts,null,2)+'\n');
console.log(`챕터 ${new Set(all.map(e=>e.chapterId)).size}개 · 사건 ${all.length}개 생성`);

// The retired Namu chronology is replaced by the chapter document facts.
writeFileSync('data/reference/chronology.json',JSON.stringify(all.map(e=>({id:e.id,year:e.year,month:e.month,precision:e.precision,calendar:e.calendar,leapMonth:null,title:e.title,content:e.summary,regionIds:e.regionIds,factionIds:e.factionIds,relatedPeople:e.relatedPeople,relatedOfficerIds:e.relatedOfficerIds,officerLinkInferences:[],officerLinkIssues:[],category:e.category,parentId:null,source:{title:e.source.title,record:null},verification:'secondary',section:e.chapterId,dateNote:e.dateNote})),null,2)+'\n');

const refMetadata=read('data/reference/metadata.json');
writeFileSync('data/reference/metadata.json',JSON.stringify({...refMetadata,timelineCount:all.length,playableTimelineCount:all.length,collectedTimelineCount:all.length,yearRange:[Math.min(...all.map(e=>e.year)),Math.max(...all.map(e=>e.year))],headings:[...new Set(all.map(e=>e.chapterId))]},null,2)+'\n');
