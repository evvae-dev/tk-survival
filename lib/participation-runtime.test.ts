import { describe, it, expect, beforeEach } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { historicalEvents } from './history';
import { getCurrentEvent, resolveChoice, choiceKey } from './event-engine';
import { validateEvent, validateDependencies } from './event-flow';
import { newGame } from '@/stores/game-store';
import { getEffectiveCatalog, useEventCatalogStore } from '@/stores/event-catalog-store';
import { CATALOG_EDITION } from './chapter';
import { upgradeLegacyCatalog } from './catalog-upgrade';
import type { Game, HistoricalEvent } from './game';
const cat = historicalEvents;
const start = (catalog=cat) => {const g=newGame('참여검증',184,'zhuo','farmer',catalog); g.stats={leadership:65,strength:96,intelligence:65,politics:65,charisma:65};return g;};
const current = (g:Game,catalog=cat) => getCurrentEvent(g,catalog)!;
function choose(g:Game, id:string,roll=0,catalog=cat){const e=current(g,catalog);const c=e.choices.find(c=>c.id.endsWith(':'+id));expect(c,`${e.id}/${e.state.flowProgress?.nodeId} choice ${id}`).toBeDefined();return resolveChoice(g,choiceKey(e,c!.id),catalog,()=>roll);}
const steps = (ids:string[],roll=0,catalog=cat)=>ids.reduce((g,id)=>choose(g,id,roll,catalog),start(catalog));
beforeEach(()=>useEventCatalogStore.getState().restoreDefaults());
describe('참여 판본의 공통 실행 계약',()=>{
 it('새 판본만 등록되고 모든 그래프·의존성·노드가 유효하다',()=>{
  expect(cat.length).toBeGreaterThan(0);expect(validateDependencies(cat)).toEqual([]);
  for(const e of cat){expect(e.edition).toBe(CATALOG_EDITION);expect(validateEvent(e),e.id).toEqual([]);}
 });
 it('이전 41건은 가져오기·업그레이드로 부활하지 않고 새 편집/삭제는 보존된다',()=>{
  const old={...structuredClone(cat[0]),edition:'romance-chapters-v1'};
  expect(upgradeLegacyCatalog([old])).toEqual([]);expect(()=>useEventCatalogStore.getState().importCatalog([old])).toThrow('이전 판본');
  const edit={...structuredClone(cat[0]),title:'편집 보존'};useEventCatalogStore.getState().saveEvent(edit);expect(getEffectiveCatalog()[0].title).toBe(edit.title);useEventCatalogStore.getState().deleteEvent(edit.id);expect(getEffectiveCatalog().some(e=>e.id===edit.id)).toBe(false);
 });
 it('미리보기는 상태를 바꾸지 않고 확정·저장 복원·재전송은 판정/보상을 반복하지 않는다',()=>{
  const g=start(),before=JSON.stringify(g),e=current(g);current(g);expect(JSON.stringify(g)).toBe(before);
  let calls=0;const key=choiceKey(e,e.choices[0].id),after=resolveChoice(g,key,cat,()=>{calls++;return .99999;});expect(calls).toBe(1);expect(after.fame).toBe(-6);
  const restored=JSON.parse(JSON.stringify(after));expect(resolveChoice(restored,key,cat,()=>{calls++;return 0;})).toBe(restored);expect(calls).toBe(1);
 });
});
describe('1화의 선택→다음 사건 참여',()=>{
 const chapter=cat.filter(e=>e.chapterId==='chapter-001');
 it('접근 성공·동행 성공만 도원결의 현장을 연다',()=>{
  const g=steps(['lead','seek','ask'],0,chapter),e=current(g,chapter);mkdirSync('/tmp/tk-participation-fixtures',{recursive:true});writeFileSync('/tmp/tk-participation-fixtures/oath-accepted.json',JSON.stringify(g));expect(e.id).toBe('r001-04');expect(e.state.flowProgress?.nodeId).toBe('oath');expect(e.state.world.flags.liuInvitation).toBe(true);
 });
 it('접촉 성공 뒤 동행 거절은 소식만 남기고 개인 선택·이동·보상을 만들지 않는다',()=>{
  let g=steps(['lead','seek'],0,chapter);g=choose(g,'ask',.99999,chapter);const before={turn:g.turn,fame:g.fame,region:g.region,decisions:g.decisions.length};
  mkdirSync('/tmp/tk-participation-fixtures',{recursive:true});writeFileSync('/tmp/tk-participation-fixtures/oath-rejected.json',JSON.stringify(g));
  const automatic=getCurrentEvent(g,chapter,true)!;expect(automatic.id).toBe('r001-04');expect(automatic.automatic).toBe(true);expect(automatic.choices).toEqual([]);expect(automatic.state.world.flags.metLiuBei).toBe(true);expect(automatic.state.world.flags.liuInvitation).toBe(false);
  expect({turn:automatic.state.turn,fame:automatic.state.fame,region:automatic.state.region,decisions:automatic.state.decisions.length}).toEqual(before);
  const records=automatic.state.world.log.filter(r=>r.eventId==='r001-04');expect(records).toHaveLength(1);expect(records[0].recordType).toBe('news');expect(records[0].detail).toContain('참석하지 않았다');
  expect(resolveChoice(g,'184:r001-04:oath:join',chapter)).toBe(g);
  const restored=JSON.parse(JSON.stringify(automatic.state));const next=current(restored,chapter);expect(next.id).toBe('r001-06');expect(next.state.world.log.filter(r=>r.eventId==='r001-04')).toHaveLength(1);
 });
 it('유비 접근 실패는 주막·결의에 다시 초대하지 않고 재야의 직접 활동으로 잇는다',()=>{
  let g=choose(start(chapter),'lead',0,chapter);g=choose(g,'seek',.99999,chapter);const e=current(g,chapter);expect(e.id).toBe('r001-06');expect(e.state.flowProgress?.nodeId).toBe('civil');expect(e.state.region).toBe('zhuo');expect(e.state.world.log.filter(r=>['r001-03','r001-04','r001-05'].includes(r.eventId??'')).every(r=>r.recordType==='news')).toBe(true);
 });
 it('황건 합류는 명시적 선택이며 등무 생존을 고정 결말이 덮어쓰지 않는다',()=>{
  let g=steps(['cult','join'],0,chapter);let e=current(g,chapter);expect(e.id).toBe('r001-05');expect(e.state.flowProgress?.nodeId).toBe('yellow');expect(e.state.factionId).toBe('yellow-turban');
  g=choose(g,'save',0,chapter);expect(g.world.people['rtk14-0746']).not.toBe('dead');expect(g.world.people['rtk14-0690']).toBe('dead');expect(g.world.flags.dengMaoSaved).toBe(true);e=current(JSON.parse(JSON.stringify(g)),chapter);expect(e.state.factionId).toBe('yellow-turban');expect(e.state.world.people['rtk14-0746']).not.toBe('dead');
 });
 it('황건 합류 실패를 자동 가입이나 유비군 배치로 바꾸지 않는다',()=>{
  let g=choose(start(chapter),'cult',0,chapter);g=choose(g,'join',.99999,chapter);const e=current(g,chapter);expect(e.id).toBe('r001-06');expect(e.state.flowProgress?.nodeId).toBe('civil');expect(e.state.factionId).toBeNull();
 });
 it('필수 인물 사망이면 결의와 원래 전투 결말을 만들지 않는다',()=>{
  const g=steps(['lead','seek','ask'],0,chapter);g.world.people['rtk14-0147']='dead';const e=current(g,chapter);expect(e.state.world.flags.peachOath).not.toBe(true);expect(e.state.world.flags.firstVictory).not.toBe(true);expect(e.state.world.log.some(r=>r.eventId==='r001-04')).toBe(false);
 });
 it('군공 증거가 실제 노식 압송 보류로 전파된다',()=>{
  let g=steps(['lead','seek','ask','join','support','signal','evidence'],0,chapter);expect(current(g,chapter).state.flowProgress?.nodeId).toBe('evidence');g=choose(g,'submit',0,chapter);expect(g.world.flags.luRetained).toBe(true);expect(g.world.flags.luArrested).toBe(false);
 });
});

describe('도달 가능한 새 경로의 인수 자료',()=>{
 it('직전 선택부터의 실제 플레이로 현장/자동 기록 fixture를 생성한다',()=>{
  const queue=[start()],seen=new Set<string>(),states:Game[]=[],automatic:Game[]=[];
  for(let i=0;i<queue.length;i++){
   expect(i).toBeLessThan(18000);
   const g=queue[i];if(g.completed)continue;const e=current(g);if(!e.historical)continue;
   const remaining=cat.filter(event=>!e.state.world.appliedEventIds.includes(event.id));
   const fields=[...new Set(remaining.flatMap(event=>event.flow!.nodes.flatMap(n=>[...(n.data.condition?[n.data.condition.field]:[]),...(n.data.options??[]).flatMap(o=>(o.conditions??[]).map(c=>c.field))])))].sort();
   const values=fields.map(field=>field.split('.').reduce<unknown>((o,k)=>o&&typeof o==='object'?(o as Record<string,unknown>)[k]:undefined,e.state));
   const signature=JSON.stringify([e.id,e.state.flowProgress?.nodeId,e.state.factionId,e.state.region,values]);if(seen.has(signature))continue;seen.add(signature);
   if(!states.some(state=>state.flowProgress?.eventId===e.id&&state.flowProgress?.nodeId===e.state.flowProgress?.nodeId))states.push(structuredClone(e.state));
   const auto=getCurrentEvent(g,cat,true);if(auto?.automatic&&!automatic.some(s=>s.world.log.at(-1)?.recordId===auto.state.world.log.at(-1)?.recordId))automatic.push(structuredClone(g));
   expect(e.choices.length).toBeGreaterThan(0);
   for(const c of e.choices)for(const roll of c.check?[0,.99999]:[0]){
    const next=resolveChoice(g,choiceKey(e,c.id),cat,()=>roll);expect(next.turn).toBe(g.turn+1);expect(next.decisions.at(-1)?.detail).toBeTruthy();queue.push(next);
   }
  }
  const reachable=new Set(states.map(s=>`${s.flowProgress!.eventId}/${s.flowProgress!.nodeId}`));
  for(const e of cat)for(const n of e.flow!.nodes.filter(n=>n.type==='choice'))expect(reachable.has(`${e.id}/${n.id}`),`실제 선행 선택으로 도달하지 못함: ${e.id}/${n.id}`).toBe(true);
  mkdirSync('/tmp/tk-participation-fixtures',{recursive:true});writeFileSync('/tmp/tk-participation-fixtures/reachable.json',JSON.stringify({edition:CATALOG_EDITION,states,automatic,explored:seen.size},null,2));
  console.log(`실제 플레이 상태 ${seen.size}개 / 선택 장면 ${states.length}개 / 자동 경계 ${automatic.length}개`);
 },60000);
});

describe('2화의 소속·증거·다음 진입',()=>{
 const liu=['lead','seek','ask','join','support','signal','evidence','submit'];
 const yellow=['cult','join','save','warn','fire','withdraw'];
 it('군적과 동행을 유지하며 증거 성공만 안희 관직을 지킨다',()=>{
  let g=steps([...liu,'transfer','order','passage','service','proof']);expect(current(g).state.flowProgress?.nodeId).toBe('proof');
  const saved=choose(g,'submit');expect(saved.world.flags.anxiRetained).toBe(true);expect(saved.world.flags.anxiLeft).toBe(false);expect(saved.factionId).toBe('liu-bei');
  const failed=choose(g,'submit',.99999);expect(failed.world.flags.anxiRetained).not.toBe(true);expect(failed.world.flags.anxiLeft).toBe(true);expect(current(failed).state.flowProgress?.nodeId).toBe('liu');
 });
 it('장보 구출 성공과 황건 잔존 소속이 지도부 고정 사망으로 덮이지 않는다',()=>{
  let g=steps([...yellow,'roster','watch','save']);expect(g.world.flags.zhangBaoSaved).toBe(true);expect(g.world.people['rtk14-0659']).not.toBe('dead');expect(g.world.factions['yellow-turban']).toBe('preserved');expect(g.factionId).toBe('yellow-turban');
  g=choose(g,'keep');const e=current(g);expect(e.id).toBe('r002-07');expect(e.state.flowProgress?.nodeId).toBe('yellow');expect(e.state.region).toBe('jizhou');
 });
 it('황건 연락망 보존 실패는 재야로 전환하고 유비 소속을 자동 부여하지 않는다',()=>{
  let g=steps([...yellow,'guard','rear']);g=choose(g,'network',.99999);expect(g.world.factions['yellow-turban']).toBe('defeated');expect(g.factionId).toBeNull();expect(g.role).toBe('refugee');expect(current(g).state.flowProgress?.nodeId).toBe('civil');
 });
 it('수도행을 고르지 않은 유비 동행자는 궁문에 순간 이동하지 않는다',()=>{
  let g=steps([...liu,'transfer','order','passage','service','proof','submit','remain']);const e=current(g,cat.filter(e=>['chapter-001','chapter-002'].includes(e.chapterId!)));expect(e.state.region).toBe('anxi');expect(e.state.world.flags.palaceAccess).not.toBe(true);expect(e.id).toBe('chapter-end');
 });
 it('명시적으로 동행을 정리하고 수도로 간 뒤 실제 접촉해야 궁문 접근이 열린다',()=>{
  let g=steps([...liu,'transfer','order','passage','service','proof','submit','capital']);expect(current(g).id).toBe('r002-08');expect(current(g).state.region).toBe('luoyang');expect(g.factionId).toBeNull();g=choose(g,'warning');expect(g.world.flags.palaceAccess).toBe(true);expect(g.world.flags.liuTravel).toBe(false);
 });
});

describe('3화의 궁문·소속·생존 전파',()=>{
 const capital=['lead','seek','ask','join','support','signal','evidence','submit','transfer','order','passage','service','proof','submit','capital','warning'];
 it('실제 궁문 접근과 문서 경고 성공은 하진 피살·학살·왕실 탈출을 취소한다',()=>{
  let g=steps(capital);expect(current(g).id).toBe('r003-01');g=choose(g,'verify');expect(g.world.flags.heJinSaved).toBe(true);expect(g.world.people['rtk14-0132']).not.toBe('dead');g=choose(g,'record');const e=current(g);expect(e.id).toBe('r003-04');expect(e.state.world.flags.palaceMassacre).toBe(false);expect(e.state.world.flags.royalWandering).not.toBe(true);expect(e.state.world.flags.dongSupremacyBlocked).toBe(true);
 });
 it('경고 실패 뒤 실제 피난 연락 근거가 있어야 왕실 수색을 맡고 영접 명분을 바꾼다',()=>{
  let g=steps(capital);g=choose(g,'verify',.99999);g=choose(g,'rescue');expect(current(g).state.flowProgress?.nodeId).toBe('night-road');g=choose(g,'escort');expect(g.world.flags.imperialEscorted).toBe(true);expect(g.world.flags.dongRoyalClaim).toBe(false);
 });
 it('정원군의 경계 인수와 회유 경고가 구출·독립 군영 보존으로 이어진다',()=>{
  let g=steps([...capital,'verify','record','ding','join','rear','warn']);expect(g.factionId).toBe('ding-yuan');expect(current(g).state.flowProgress?.nodeId).toBe('guarded');g=choose(g,'save');expect(g.world.flags.dingSaved).toBe(true);expect(g.world.people['rtk14-0694']).not.toBe('dead');expect(g.factionId).toBe('ding-yuan');expect(g.world.flags.dongSupremacyBlocked).toBe(true);
 });
 it('동탁군의 여포 생포는 적토마 회유와 정원 암살을 다시 실행하지 않는다',()=>{
  let g=steps([...capital,'verify','record','dong','join']);expect(g.factionId).toBe('dong-zhuo');g=choose(g,'duel');expect(g.world.flags.luBuCaptured).toBe(true);const e=current(g);expect(e.state.world.flags.luBuBribed).toBe(false);expect(e.state.world.flags.dingKilled).not.toBe(true);expect(e.state.world.people['rtk14-0694']).not.toBe('dead');
 });
 it('동탁군에서 여포 일기토에 패하면 전사하고 이후 사건·재판정을 차단한다',()=>{
  const g=steps([...capital,'verify','record','dong','join']);const e=current(g),c=e.choices.find(c=>c.id.endsWith(':duel'))!,key=choiceKey(e,c.id);const dead=resolveChoice(g,key,cat,()=>.99999);expect(dead.completed).toBe(true);expect(dead.world.flags.playerDead).toBe(true);expect(getCurrentEvent(JSON.parse(JSON.stringify(dead)))).toBeNull();expect(resolveChoice(dead,key)).toBe(dead);
 });
});
