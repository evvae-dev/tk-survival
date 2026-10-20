import { describe, expect, it } from 'vitest';
import { newGame, migrateGame } from '@/stores/game-store';
import { historicalEvents } from './history';
import { choiceKey, getCurrentEvent, resolveChoice } from './event-engine';
import { unifiedRecords } from './history-records';
import { validateFlow } from './event-flow';
import { upgradeLegacyEvent } from './catalog-upgrade';
import legacy from '@/data/history/legacy-campaign-v1.json';
import type { Game, HistoricalEvent } from './game';
function pick(game:Game, option:string, catalog=historicalEvents, roll=0) {
 const event=getCurrentEvent(game,catalog)!;
 const choice=event.choices.find(choice=>choice.id.endsWith(`:${option}`))!;
 expect(choice,`${event.id}: ${option}`).toBeDefined();
 return resolveChoice(game,choiceKey(event,choice.id),catalog,()=>roll);
}
const service=historicalEvents.find(event=>event.id==='chapter-5-1-service')!;
function serviceGame() {
 const game=newGame('동행',184,'jizhou','farmer');
 game.world.appliedEventIds=historicalEvents.filter(event=>event.year===184&&event.id!==service.id).map(event=>event.id);
 return game;
}
describe('동행 증거와 단일 기록',()=>{
 it.each([['cao','chapter51AccompaniedCaoCao','cao-cao'],['liu','chapter51AccompaniedLiuBei','liu-bei']])('실제 %s 연락 선택을 저장하고 해당 군주만 지원한다',(option,flag,lord)=>{
  let game=pick(newGame('실제 동행',184,'unknown','farmer'),'han');
  game=pick(game,option);
  expect(game.world.flags[flag]).toBe(true);
  const at=serviceGame();at.world.flags={...game.world.flags};
  expect(getCurrentEvent(at)!.choices.map(choice=>choice.id)).toEqual([`offers:join-${lord}`,'offers:travel']);
  at.stats.charisma=100;
  const joined=pick(at,`join-${lord}`);
  expect(joined).toMatchObject({factionId:lord,role:'soldier'});
 });
 it('같은 기주만으로 지원하지 않으며 거절 후 세 목적지를 고른다',()=>{
  const game=serviceGame();
  expect(getCurrentEvent(game)!.choices.map(choice=>choice.id)).toEqual(['offers:travel']);
  game.world.flags.chapter51AccompaniedCaoCao=true;game.stats.charisma=0;
  const declined=pick(game,'join-cao-cao',historicalEvents,.99);
  expect(declined.region).toBe('jizhou');expect(declined.factionId).toBeNull();
  expect(getCurrentEvent(declined)!.choices.map(choice=>choice.id)).toEqual(['travel:liangzhou','travel:jizhou','travel:zhuo']);
  const travelled=pick(JSON.parse(JSON.stringify(declined)),'liangzhou');
  expect(getCurrentEvent(travelled,undefined,true)!.state).toMatchObject({region:'liangzhou',year:185,age:21});
 });
 it('기록은 발생 순서이고 archive와 중복되지 않으며 새로고침 뒤 배경을 반복하지 않는다',()=>{
  const event=historicalEvents.find(event=>event.id==='event-185-wang-fen')!;
  const game=newGame('기록',185,'jizhou','farmer');
  const current=getCurrentEvent(game,[event])!;
  expect(current.state.world.log.map(entry=>entry.recordType)).toEqual(['personal','background']);
  const next=pick(current.state,'help',[event]);
  expect(next.world.log.map(entry=>entry.recordType)).toEqual(['personal','background','personal']);
  const done=pick(next,'continue',[event]);
  expect(done.world.log.at(-1)?.recordType).toBe('outcome');
  const records=unifiedRecords(JSON.parse(JSON.stringify(done.world)));
  expect(records).toEqual(done.world.log);
  expect(new Set(records.map(entry=>entry.recordId)).size).toBe(records.length);
  expect(getCurrentEvent(JSON.parse(JSON.stringify(current.state)),[event])!.state.world.log).toEqual(current.state.world.log);
 });
 it('위치만 저장한 v7 게임은 동행을 발명하지 않는다',()=>{
  const game=migrateGame({game:serviceGame()},7).game!;
  expect(game.world.flags.chapter51AccompaniedCaoCao).not.toBe(true);
 });
});
describe('후속 사건과 관리자 기본값',()=>{
 const events=historicalEvents.filter(event=>event.id.startsWith('event-'));
 it.each(events.map(event=>[event.id,event] as const))('%s의 현지 성패가 후속 행동을 바꾼다',(_,event)=>{
  for(const roll of [0,.9999]) {
   const game=newGame('현지',event.year,event.regionIds[0],'farmer');
   game.stats={leadership:50,strength:50,intelligence:50,politics:50,charisma:50};
   const first=getCurrentEvent(game,[event])!;
   expect(first.choices).toHaveLength(3);
   const next=pick(first.state,'help',[event],roll);
   expect(next.flowProgress?.nodeId).toBe('next-scene');
   expect(getCurrentEvent(next,[event])!.choices.map(choice=>choice.id)).toContain(roll===0?'next-scene:continue':'next-scene:recover');
   const done=pick(next,roll===0?'continue':'recover',[event]);
   expect(done.world.appliedEventIds).toContain(event.id);
   expect(done.world.log.at(-1)?.recordType).toBe('outcome');
   expect(done.region).toBe(event.regionIds[0]);
  }
 });
 it('기본 그래프를 갱신하고 사용자 문구·위치·연결·삭제를 보존한다',()=>{
  const source=legacy.find(event=>event.id==='chapter-5-1-opening')! as HistoricalEvent;
  const edited=structuredClone(source);edited.title='[내 제목]';
  const node=edited.flow!.nodes.find(node=>node.id==='join-han')!;node.position={x:222,y:333};
  const next=upgradeLegacyEvent(edited);
  expect(next.title).toBe(edited.title);expect(next.flow!.nodes.find(node=>node.id==='join-han')!.position).toEqual(node.position);
  expect(next.flow!.nodes.some(node=>node.id==='han-company')).toBe(true);
  expect(validateFlow(next.flow!)).toEqual([]);
  edited.flow!.edges.find(edge=>edge.source==='join-han')!.target='end';
  const custom=upgradeLegacyEvent(edited);
  expect(custom.flow!.edges.find(edge=>edge.source==='join-han')!.target).toBe('end');
  expect(custom.flow!.nodes.some(node=>node.id==='han-company')).toBe(false);
 });
});
