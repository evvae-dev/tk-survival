import { describe, expect, it } from 'vitest';
import { newGame, migrateGame } from '@/stores/game-store';
import { getCurrentEvent, resolveChoice, choiceKey } from './event-engine';
import { historicalEvents } from './history';
import { unifiedRecords, projectRecord } from './history-records';
import { personSegments } from './record-presentation';
import { upgradeLegacyCatalog, upgradeLegacyEvent } from './catalog-upgrade';
import { validateEvent } from './event-flow';
import legacy from '@/data/history/legacy-campaign-v2.json';
import type { Game, HistoricalEvent, RecordEntry } from './game';
function pick(game:Game, suffix:string, catalog=historicalEvents) {
 const event=getCurrentEvent(game,catalog)!;
 const selected=event.choices.find(choice=>choice.id.endsWith(`:${suffix}`))!;
 expect(selected,`${event.id}/${suffix}`).toBeDefined();
 return resolveChoice(game,choiceKey(event,selected.id),catalog,()=>0);
}
function runFaction(faction:string, region:string) {
 let game=newGame('연속성',185,region,'farmer');game.factionId=faction;game.role='soldier';game.world.appliedEventIds=historicalEvents.filter(event=>event.year<185).map(event=>event.id);
 game.stats={leadership:90,strength:90,intelligence:90,politics:90,charisma:90};
 const shown:string[]=[];
 for(let step=0;step<70&&!game.completed;step++) {
  const event=getCurrentEvent(game,historicalEvents,true)!;
  if(event.automatic){game=event.state;continue;}
  shown.push(`${event.id}/${event.state.flowProgress?.nodeId}`);
  const selected=event.choices.find(choice=>choice.id.endsWith(':help')) ?? event.choices.find(choice=>choice.id.endsWith(':continue')) ?? event.choices.find(choice=>choice.id.endsWith(':stay')) ?? event.choices[0];
  expect(selected,`${event.id}/${event.state.flowProgress?.nodeId}: ${event.scene}`).toBeDefined();
  game=resolveChoice(game,choiceKey(event,selected.id),historicalEvents,()=>0);
 }
 return {game,shown};
}
describe('관련 사건의 지속된 여정',()=>{
 it('동탁군은 미양과 한수의 길목을 거쳐 현재 서방 상태로 끝난다',()=>{
  const {game,shown}=runFaction('dong-zhuo','liangzhou');
  expect(game.completed).toBe(true);expect(game).toMatchObject({factionId:'dong-zhuo',region:'liangzhou',year:188,age:23});
  expect(shown.filter(value=>value.startsWith('event-'))).toEqual(['event-186-meiyang/scene','event-186-meiyang/next-scene','event-187-han-sui-claim/scene','event-187-han-sui-claim/next-scene','event-187-han-sui-claim/stay-at-conflict']);
  expect(shown.some(value=>/stay-or-leave|duty-/.test(value))).toBe(false);
  expect(game.world.appliedEventIds).toContain('event-188-ma-xiang');
  expect(game.world.log.some(entry=>entry.eventId==='event-188-ma-xiang')).toBe(false);
  expect(game.world.log.some(entry=>entry.title.includes('이어지는 발걸음'))).toBe(false);
  expect(game.world.log.map(entry=>entry.detail).join(' ')).toContain('병력이 해산했는지는 확인되지 않았다');
  expect(game.world.log.map(entry=>entry.detail).join(' ')).toContain('확인된 구간까지만');
 });
 it.each([['cao-cao','jizhou','event-185-wang-fen','event-188-xiyuan'],['liu-bei','zhuo','event-187-liu-bei-service','event-187-liu-bei-service'],['gongsun-zan','zhuo','event-185-gongsun-command','event-188-youzhou-settlement'],['sun','liangzhou','event-186-meiyang','event-187-ou-xing']])('%s는 빈 해에 업무를 만들지 않고 관련 활동으로 이어진다',(faction,region,first,last)=>{
  const {game,shown}=runFaction(faction,region);
  expect(game.completed).toBe(true);expect(game.factionId).toBe(faction);
  expect(shown.some(value=>value.startsWith(first))).toBe(true);expect(shown.some(value=>value.startsWith(last))).toBe(true);
  expect(shown.some(value=>/stay-or-leave|duty-/.test(value))).toBe(false);
 });
 it('조용한 외지 사건도 관리자 효과를 한 번 적용하고 다음 선택으로 진행한다',()=>{
  const remote=structuredClone(historicalEvents.find(event=>event.id==='event-188-ma-xiang')!);
  remote.flow!.nodes.find(node=>node.id==='remote-news')!.data.effects=[{type:'flag',key:'silent-effect',value:true}];
  const closing=historicalEvents.find(event=>event.id==='chapter-5-5-closing')!;
  const game=newGame('외지',188,'liangzhou','farmer');game.factionId='dong-zhuo';
  const next=getCurrentEvent(game,[remote,closing],true)!;
  expect(next.state.world.flags['silent-effect']).toBe(true);
  expect(next.state.world.log.some(entry=>entry.eventId===remote.id)).toBe(false);
 });
 it('한수 임무를 마친 뒤 이탈해도 위치와 임무 결과는 보존된다',()=>{
  const event=historicalEvents.find(event=>event.id==='event-187-han-sui-claim')!;
  let game=newGame('이탈',187,'liangzhou','farmer');game.factionId='dong-zhuo';game.role='soldier';
  game=pick(game,'help',[event]);game=pick(game,'continue',[event]);
  game=pick(game,'leave',[event]);
  expect(game).toMatchObject({factionId:null,role:'civilian',region:'liangzhou'});
  expect(game.world.flags[`${event.id}-reported`]).toBe(true);
 });
});
describe('기록과 이전 저장의 사실 보존',()=>{
 it('모든 그래프와 29번째 범위 종결이 관리자 형식을 지킨다',()=>{
  expect(historicalEvents).toHaveLength(29);
  for(const event of historicalEvents) expect(validateEvent(event),event.id).toEqual([]);
 });
 it('이전 기본 filler만 표시에서 제외하고 커스텀 문장과 저장 상태를 보존한다',()=>{
  const source=legacy.find(event=>event.id==='chapter-5-4-service')!;
  const text=source.flow.nodes.find(node=>node.id==='duty-wait-dong-zhuo')!.data.text!;
  const old:RecordEntry={eventId:source.id,recordId:`187:${source.id}:duty-dong-zhuo:wait`,year:187,month:null,title:'옛 업무',detail:text,kind:'fiction',recordType:'personal'};
  expect(projectRecord(old)).toBeUndefined();
  expect(projectRecord({...old,detail:'관리자가 직접 남긴 '+text})).toBeDefined();
  const world=newGame('이전',188,'liangzhou','farmer').world;world.log=[old];
  const snapshot=JSON.stringify(world);expect(unifiedRecords(world)).toEqual([]);expect(JSON.stringify(world)).toBe(snapshot);
 });
 it('구 사실 기본값만 완결형 문장으로 보완한다',()=>{
  const event=legacy.find(event=>event.id==='event-185-wang-fen')!;
  const text=event.flow.nodes.find(node=>node.id==='report')!.data.text!;
  const old:RecordEntry={eventId:event.id,recordId:`${event.id}:report`,year:185,month:null,title:event.title,detail:text,kind:'history',recordType:'outcome'};
  expect(projectRecord(old)!.detail).toContain('영제의 순행이 취소');
  expect(projectRecord({...old,detail:'다른 실제 결과'})).toMatchObject({detail:'다른 실제 결과'});
 });
 it('v8의 기존 연례 업무 커서는 한 번 마치고 다시 열지 않는다',()=>{
  const old=newGame('이전 업무',186,'liangzhou','farmer');old.factionId='dong-zhuo';old.role='soldier';
  old.flowProgress={eventId:'chapter-5-3-service',nodeId:'duty-dong-zhuo'};
  const migrated=migrateGame({game:old},8).game!;
  expect(migrated.world.flags.legacyAnnualServicePending).toBe(true);
  const next=pick(migrated,'wait',[historicalEvents.find(event=>event.id===old.flowProgress!.eventId)!]);
  expect(next.world.flags.legacyAnnualServicePending).toBe(false);
  expect(next.world.appliedEventIds).toContain(old.flowProgress.eventId);
 });
 it('v2 공유본에 종결을 보완하며 명시 삭제·문구·위치를 보존한다',()=>{
  const input=structuredClone(legacy) as HistoricalEvent[];input[0].title='[내 제목]';
  const next=upgradeLegacyCatalog(input);
  expect(next).toHaveLength(29);expect(next[0].title).toBe('[내 제목]');
  expect(upgradeLegacyCatalog(input,['chapter-5-5-closing']).some(event=>event.id==='chapter-5-5-closing')).toBe(false);
  const custom=structuredClone(input.find(event=>event.id==='event-188-ma-xiang')!);
  custom.flow!.nodes.find(node=>node.id==='remote-news')!.data.text='내가 편집한 소식';
  const migrated=upgradeLegacyEvent(custom);
  expect(migrated.flow!.nodes.find(node=>node.id==='remote-news')!.data.silent).not.toBe(true);
 });
 it('평범한 단어와 지명을 장수로 연결하지 않고 실제 인물은 연결한다',()=>{
  const result=personSegments('유주자사 유언이 조정에 사정을 설명했다. 유주 일대에 봉기가 일어났다는 소식이 전해졌다. 조조와 동탁은 남았다.',['유주','유언','사정','봉기','조정','전해','조조','동탁']);
  expect(result.filter(part=>part.person).map(part=>part.person)).toEqual(['유언','조조','동탁']);
 });
});

describe('범위 종결과 실제 연결 문장의 경계',()=>{
 it('종결은 지역별 그래프 복제 없이 실제 지역을 번역한다',()=>{
  const closing=historicalEvents.find(event=>event.id==='chapter-5-5-closing')!;
  expect(closing.flow!.nodes.length).toBeLessThan(50);
  for(const [region,expected] of [['liangzhou','서방의 양주'],['jizhou','기주'],['unknown','현재 거점'],['arbitrary-secret','현재 거점']]) {
   const game=newGame('종결',188,region,'farmer');game.factionId='dong-zhuo';game.world.flags['event-187-han-sui-claim-reported']=true;
   const record=getCurrentEvent(game,[closing],true)!.state.world.log.at(-1)!;
   expect(record.detail).toContain(`${expected}에 남아`);
   expect(record.detail).toContain('병력이 해산했는지는 확인되지 않았다');
   expect(record.detail).not.toMatch(/\{region\}|arbitrary-secret|모두 해산한 것은 아니므로|임무를 확인받았/);
  }
 });
 it('관리자 결과의 지역 치환은 허용하고 임의 상태 경로는 거절한다',()=>{
  const closing=structuredClone(historicalEvents.find(event=>event.id==='chapter-5-5-closing')!);
  const result=closing.flow!.nodes.find(node=>node.type==='result')!;
  result.data.text='나는 {region}에 남았다.';expect(validateEvent(closing)).toEqual([]);
  result.data.text='나는 {world.private}에 남았다.';expect(validateEvent(closing).join(' ')).toContain('{region}만 지원');
 });
 it('현장 진입은 기록에 남고 겪지 않은 이전 활동을 내 일로 만들지 않는다',()=>{
  const event=historicalEvents.find(event=>event.id==='event-188-xiyuan')!;
  const game=newGame('새 현지인',188,'luoyang','farmer');
  let next=getCurrentEvent(game,[event],true)!;
  expect(next.state.world.log[0].recordType).toBe('personal');
  expect(next.state.world.log[0].detail).toContain('낙양');
  expect(next.state.world.log[0].detail).not.toContain('기주에서 왕분');
  game.world.flags['event-185-wang-fen-reported']=true;
  next=getCurrentEvent(game,[event],true)!;
  expect(next.state.world.log[0].detail).toContain('기주에서 왕분');
  expect(next.state.world.log.filter(entry=>entry.recordType==='personal')).toHaveLength(1);
 });
 it('같은 지역을 고르면 실제 이사 대신 현지에 머무는 결과를 남긴다',()=>{
  const service=historicalEvents.find(event=>event.id==='chapter-5-2-service')!;
  const game=newGame('서방 잔류',185,'liangzhou','farmer');
  const selected=pick(game,'travel',[service]);
  expect(selected.decisions.at(-1)!.detail).toContain('다음에 머물 지역부터 고르기로 했다');
  const stayed=pick(selected,'liangzhou',[service]);
  expect(stayed.decisions.at(-1)!.detail).toContain('지금 머무는 서방 전선');
  expect(stayed.decisions.at(-1)!.detail).not.toMatch(/향하는 길에 올랐다|전선로/);
 });
 it('실제 봉기 장군과 일반 봉기가 한 문장에 있어도 각각 판별한다',()=>{
  const parts=personSegments('봉기 장군이 봉기를 진압했다. 조조도 그 소식을 들었다.',['봉기','조조']);
  expect(parts.filter(part=>part.person).map(part=>part.person)).toEqual(['봉기','조조']);
 });
});
