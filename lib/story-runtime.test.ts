import {describe,it,expect,vi,beforeEach} from 'vitest';
import {mkdirSync,writeFileSync} from 'node:fs';
import {historicalEvents,sortEvents} from './history';
import {getCurrentEvent,resolveChoice,choiceKey} from './event-engine';
import {validateEvent,validateDependencies,advanceFlow} from './event-flow';
import {newGame,useGameStore} from '@/stores/game-store';
import {getEffectiveCatalog,useEventCatalogStore} from '@/stores/event-catalog-store';
import {upgradeLegacyCatalog} from './catalog-upgrade';
import {playbackKey,playbackDelay} from './record-playback';
import {unifiedRecords} from './history-records';
import {checkPreview} from './ability-check';
import type {Game,HistoricalEvent} from './game';
const start=(catalog=historicalEvents)=>{const g=newGame('챕터 검증',184,'zhuo','farmer',catalog);g.stats={leadership:60,strength:96,intelligence:60,politics:60,charisma:60};return g;};
const play=(game:Game,route:string,roll=0,catalog=historicalEvents)=>{const e=getCurrentEvent(game,catalog)!;const c=e.choices.find(c=>c.id.endsWith(':'+route))??e.choices[0];return resolveChoice(game,choiceKey(e,c.id),catalog,()=>roll);};
beforeEach(()=>useEventCatalogStore.getState().restoreDefaults());
describe('새 챕터 실행 계약',()=>{
 it('모든 등록 사건의 그래프·의존성·참조가 실제로 유효하다',()=>{
  expect(validateDependencies(historicalEvents)).toEqual([]);
  for(const event of historicalEvents){expect(validateEvent(event),event.id).toEqual([]);for(const link of event.connections??[])expect(historicalEvents.some(e=>e.id===link.targetId)).toBe(true);}
 });
 for(const event of historicalEvents) it(`${event.id}: A/B 성공·실패와 C가 실제 결과를 남기며 종료된다`,()=>{
  for(const [route,roll]of [['a',0],['a',.99999],['b',0],['b',.99999],['c',0]] as const){
   const g=start([event]);const e=getCurrentEvent(g,[event])!;
   expect(e.choices).toHaveLength(3);
   const c=e.choices.find(c=>c.id.endsWith(':'+route))!;
   const next=resolveChoice(g,choiceKey(e,c.id),[event],()=>roll);
   expect(next.turn).toBe(1);expect(next.world.appliedEventIds).toContain(event.id);
   expect(next.decisions.at(-1)?.detail).toBeTruthy();expect(next.decisions.at(-1)?.detail).not.toBe(c.description);
   if(c.check){const outcome=roll===0&&c.check.successRate>0;expect(next.decisions.at(-1)?.check?.success).toBe(outcome);}
   expect(resolveChoice(next,choiceKey(e,c.id),[event])).toEqual(next);
  }
 });
 for(const route of ['a','b','c'])for(const roll of [0,.99999])it(`${route}/${roll}: 챕터 전체 완주·저장 복원·기록 순서 보존`,()=>{
  let g=start();const states:Game[]=[];
  for(let i=0;i<150&&!g.completed;i++){
   const e=getCurrentEvent(g,undefined,true)!;
   if(e.automatic){g=e.state;continue;}
   expect(e.id).not.toBe('blocked-dependencies');
   states.push(structuredClone(e.state));
   const c=e.choices.find(c=>c.id.endsWith(':'+route))??e.choices[0];expect(c).toBeDefined();
   g=resolveChoice(g,choiceKey(e,c.id),undefined,()=>roll);g=JSON.parse(JSON.stringify(g));
  }
  expect(g.completed).toBe(true);if(g.world.flags.playerDead){expect(g.world.appliedEventIds.at(-1)).toBe('r003-06');expect(g.world.appliedEventIds).not.toContain('r003-07');expect(getCurrentEvent(g)).toBeNull();}else expect(new Set(g.world.appliedEventIds).size).toBe(historicalEvents.length);
  const records=unifiedRecords(g.world);expect(new Set(records.map(x=>x.recordId)).size).toBe(records.length);
  mkdirSync('/tmp/tk-story-fixtures',{recursive:true});writeFileSync(`/tmp/tk-story-fixtures/${route}-${roll===0?'success':'failure'}.json`,JSON.stringify({game:g,states},null,2));
 });
 it('앞선 고발·노식 증거가 다른 장면과 실제 결말로 이어진다',()=>{
  let g=start();g=play(g,'a');expect(getCurrentEvent(g)?.state.flowProgress?.nodeId).toBe('warned');
  while(getCurrentEvent(g)?.id!=='r001-07')g=play(g,'c');
  g=play(g,'a');expect(getCurrentEvent(g)?.state.flowProgress?.nodeId).toBe('evidence');
  g=play(g,'c');expect(g.world.flags.luRetained).toBe(true);expect(g.world.flags.luArrested).not.toBe(true);
 });
 it('유비와 접촉하지 않았으면 임관이 아닌 소개를 청한다',()=>{
  let g=start();for(let i=0;i<3;i++)g=play(g,'c');
  expect(getCurrentEvent(g)?.choices[1].title).toContain('소개');
  const noJoin=play(g,'b');expect(noJoin.factionId).toBeNull();expect(noJoin.world.flags.metLiuBei).toBe(true);
  g=start();g=play(g,'c');g=play(g,'b');g=play(g,'c');expect(getCurrentEvent(g)?.choices[1].title).toContain('지원');
  g=play(g,'b');expect(g.factionId).toBe('liu-bei');expect(g.role).toBe('soldier');
 });
 it('필수 인물이 죽어 있으면 장면과 원래 결말을 재생하지 않는다',()=>{const event=historicalEvents.find(e=>e.id==='r001-05')!;const g=start([event]);g.world.people['rtk14-0952']='dead';const e=getCurrentEvent(g,[event])!;expect(e.id).toBe('chapter-end');expect(e.state.world.log).toHaveLength(0);expect(e.state.world.appliedEventIds).toContain(event.id);});
 it('미리보기·재전송은 재추첨하거나 효과를 중복하지 않는다',()=>{
  const g=start();const snapshot=JSON.stringify(g);const random=vi.fn(()=>.1);
  const e=getCurrentEvent(g)!;getCurrentEvent(g);expect(JSON.stringify(g)).toBe(snapshot);
  const key=choiceKey(e,e.choices[0].id);const after=resolveChoice(g,key,undefined,random);expect(random).toHaveBeenCalledTimes(1);
  const restored=JSON.parse(JSON.stringify(after));expect(resolveChoice(restored,key,undefined,random)).toEqual(restored);expect(random).toHaveBeenCalledTimes(1);
 });
 it('기록 재생 중 미래 선택을 소비하지 않고 같은 기록 요청도 중복하지 않는다',()=>{
  const game=start();useGameStore.setState({game});const future=getCurrentEvent(game)!;
  useGameStore.getState().nextTurn(choiceKey(future,future.choices[0].id));expect(useGameStore.getState().game).toBe(game);
  const key=playbackKey(game);useGameStore.getState().advanceRecord(key);const after=useGameStore.getState().game;
  expect(after).not.toBe(game);useGameStore.getState().advanceRecord(key);expect(useGameStore.getState().game).toBe(after);
  expect([.5,1,1.5,2].map(n=>playbackDelay(n as .5|1|1.5|2))).toEqual([2500,5000,7500,10000]);
 });
 it('연도가 아니라 챕터 파일 순서대로 실행하며 나이는 역행하지 않는다',()=>{
  const a=structuredClone(historicalEvents[0]);const b=structuredClone(historicalEvents[1]);a.year=189;b.year=184;b.chapterId='chapter-002';b.sequence=1;b.prerequisiteEventIds=[a.id];
  expect(sortEvents([b,a])[0].id).toBe(a.id);let g=start([a,b]);g=play(g,'c',0,[a,b]);const next=getCurrentEvent(g,[a,b])!;expect(next.id).toBe(b.id);expect(next.state.age).toBe(25);
 });
 it('조건 미달 선택은 숨겨지고 위조된 선택 키로 상태를 바꾸지 않는다',()=>{
  const event=structuredClone(historicalEvents[0]);const scene=event.flow!.nodes.find(n=>n.type==='choice')!;scene.data.options![0].conditions=[{field:'world.flags.hasProof',operator:'eq',value:true}];
  const g=start([event]);const e=getCurrentEvent(g,[event])!;expect(e.choices).toHaveLength(2);expect(resolveChoice(g,choiceKey(e,scene.id+':a'),[event])).toBe(g);
 });
 if(historicalEvents.some(e=>e.id==='r002-08')){
  it('독우 증거 공개 성공은 관직 유지, 실패는 매질·관직 이탈로 이어진다',()=>{
   const before=historicalEvents.filter(e=>e.id==='r002-05'||e.id==='r002-06');let g=start(before);g=play(g,'a',0,before);expect(getCurrentEvent(g,before)?.state.flowProgress?.nodeId).toBe('proof');
   const success=play(g,'a',0,before);expect(success.world.flags.anxiRetained).toBe(true);expect(success.world.flags.anxiLeft).not.toBe(true);
   const failed=play(g,'a',.99999,before);expect(failed.world.flags.anxiLeft).toBe(true);expect(failed.world.flags.anxiRetained).not.toBe(true);
  });
  it('황건 지도부의 사망 소식은 생존 상태에도 같은 시점에 반영된다',()=>{const e=historicalEvents.find(e=>e.id==='r002-03')!;const g=start([e]);const next=getCurrentEvent(g,[e])!;for(const id of ['rtk14-0607','rtk14-0664','rtk14-0659'])expect(next.state.world.people[id]).toBe('dead');});
  it('1화 소속과 장부 증거는 2화 진입과 저장 복원에서 보존된다',()=>{let g=start();g=play(g,'b');g=play(g,'b');g=play(g,'b');g=play(g,'b');while(getCurrentEvent(g)?.id!=='r002-01')g=play(g,'c');const saved=JSON.parse(JSON.stringify(g));expect(getCurrentEvent(saved)?.state.factionId).toBe('liu-bei');expect(saved.world.flags.liuService).toBe(true);});
 }
 if(historicalEvents.some(e=>e.id==='r003-08')){
  it('하진 구출은 궁중 충돌과 동탁의 병력 흡수·군권 독점을 바꾼다',()=>{const cat=historicalEvents.filter(e=>e.chapterId==='chapter-003');let g=start(cat);g=play(g,'a',0,cat);expect(g.world.flags.heJinSaved).toBe(true);expect(getCurrentEvent(g,cat)?.state.flowProgress?.nodeId).toBe('hejin');while(getCurrentEvent(g,cat)?.id!=='chapter-end')g=play(g,'c',0,cat);expect(g.world.people['rtk14-0132']).toBe('alive');expect(g.world.control.luoyang).toBe('han');expect(g.world.flags.dongSupremacyBlocked).toBe(true);});
  it('회유 경고와 정원 구출 성공·실패는 실제 생존·세력·점유를 바꾼다',()=>{const cat=historicalEvents.filter(e=>e.id==='r003-07'||e.id==='r003-08');let g=start(cat);g=play(g,'a',0,cat);expect(getCurrentEvent(g,cat)?.state.flowProgress?.nodeId).toBe('guarded');const ok=play(g,'a',0,cat);expect(ok.world.people['rtk14-0694']).toBe('alive');expect(ok.world.flags.dongSupremacyBlocked).toBe(true);const no=play(g,'a',.99999,cat);expect(no.world.people['rtk14-0694']).toBe('dead');expect(no.world.control.luoyang).toBe('dong-zhuo');});
  it('여포에게 이긴 뒤 회유에 개입하지 않으면 부상 경로의 마지막 장면으로 이어진다',()=>{const cat=historicalEvents.filter(e=>['r003-06','r003-07','r003-08'].includes(e.id));let g=start(cat);g=play(g,'a',0,cat);g=play(g,'c',0,cat);const e=getCurrentEvent(g,cat)!;expect(e.state.flowProgress?.nodeId).toBe('wounded');mkdirSync('/tmp/tk-story-fixtures',{recursive:true});writeFileSync('/tmp/tk-story-fixtures/wounded.json',JSON.stringify({game:g,states:[e.state]},null,2));});
  it('접촉한 재야만 동탁에게 임관하고 유비 소속은 몰래 교체되지 않는다',()=>{const cat=historicalEvents.filter(e=>e.id==='r003-05');const g=start(cat);g.world.flags.metDongZhuo=true;let e=getCurrentEvent(g,cat)!;expect(e.choices[1].title).toContain('지원');expect(play(g,'b',0,cat).factionId).toBe('dong-zhuo');g.factionId='liu-bei';e=getCurrentEvent(g,cat)!;expect(e.choices[1].title).toContain('유비');expect(play(g,'b',0,cat).factionId).toBe('liu-bei');});
  it('여포 일기토는 실제 무력 100과 비교하고 패배는 전사 후 재진행하지 않는다',()=>{const cat=historicalEvents.filter(e=>e.id==='r003-06');const g=start(cat);const e=getCurrentEvent(g,cat)!;expect(e.choices[0].check?.opponentStats?.strength).toBe(100);const dead=play(g,'a',.99999,cat);expect(dead.completed).toBe(true);expect(dead.world.flags.playerDead).toBe(true);expect(getCurrentEvent(JSON.parse(JSON.stringify(dead)),cat)).toBeNull();expect(resolveChoice(dead,choiceKey(e,e.choices[0].id),cat)).toBe(dead);});
  it('사실 배경은 선택 뒤의 기본 승리·사망을 먼저 확정하지 않는다',()=>{const cat=historicalEvents.filter(e=>e.id==='r001-05');const g=start(cat);const e=getCurrentEvent(g,cat)!;expect(e.state.world.log.filter(r=>r.recordType==='background').some(r=>/베어|전사|쓰러지자|승리/.test(r.detail))).toBe(false);});
 }
 it('옛 연도별 사건은 복구되지 않고 새 편집본·명시 삭제는 보존된다',()=>{
  const old={...historicalEvents[0],id:'chapter-5-1-opening',chapterId:'chapter-5-1-yellow-turban'};
  expect(upgradeLegacyCatalog([old])).toEqual([]);
  const edit=structuredClone(historicalEvents[0]);edit.title='사용자 편집';useEventCatalogStore.getState().saveEvent(edit);expect(getEffectiveCatalog().find(e=>e.id===edit.id)?.title).toBe(edit.title);
  useEventCatalogStore.getState().deleteEvent(edit.id);expect(getEffectiveCatalog().some(e=>e.id===edit.id)).toBe(false);
  expect(()=>useEventCatalogStore.getState().importCatalog([old])).toThrow('챕터');
 });
});
