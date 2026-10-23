import {describe,it,expect} from 'vitest';
import {mkdirSync,writeFileSync} from 'node:fs';
import {historicalEvents} from './history';
import {getCurrentEvent,resolveChoice,choiceKey,continuationEvent} from './event-engine';
import {newGame} from '@/stores/game-store';
import type {Game} from './game';
const cat=historicalEvents;
const start=()=>{const g=newGame('5화 인과',184,'zhuo','farmer',cat);g.stats={leadership:65,strength:96,intelligence:65,politics:65,charisma:65};return g;};
const current=(g:Game,catalog=cat)=>getCurrentEvent(g,catalog)!;
function play(g:Game,id:string,roll=0,catalog=cat){const e=current(g,catalog),c=e.choices.find(c=>c.id.endsWith(':'+id));expect(c,`${e.id}/${e.state.flowProgress?.nodeId}/${id}`).toBeDefined();return resolveChoice(g,choiceKey(e,c!.id),catalog,()=>roll);}
const steps=(ids:string[],catalog=cat)=>ids.reduce((g,id)=>play(g,id,0,catalog),start());
const capital=['lead','seek','ask','join','support','signal','evidence','submit','transfer','order','passage','service','proof','submit','capital','warning'];
const cao=[...capital,'verify','record','civil','petition','contact','signal','explain','inspect','join'];
const dong=[...capital,'verify','record','dong','join','retreat','receipt','receipt','record','ledger','watch','record','remain'];
describe('5화의 보급·포로·진영 인과',()=>{
 it('인수증 준비는 실제 보급 성공률을 높이고 보급 도착·조기 철수·패전을 구분한다',()=>{
  const initial=steps([...cao,'orders']);const receipt=play(initial,'receipt'),warning=play(initial,'warn');
  expect(current(receipt).choices[0].check!.successRate-current(warning).choices[0].check!.successRate).toBe(14);
  const supplied=play(receipt,'supply');expect(supplied.world.flags.sunSupplied).toBe(true);expect(supplied.world.people['rtk14-0538']).not.toBe('dead');
  const retreat=play(receipt,'retreat');expect(retreat.world.flags.sunRetreatEarly).toBe(true);expect(retreat.world.flags.sunSupplied).not.toBe(true);expect(retreat.world.people['rtk14-0538']).not.toBe('dead');
  const absent=play(receipt,'rear');expect(absent.world.flags.sunDefeated).toBe(true);expect(absent.world.people['rtk14-0538']).toBe('dead');
 });
 it('화웅 생포 뒤에는 관우의 참수와 사망이 다시 실행되지 않는다',()=>{
  let g=steps([...cao,'orders','receipt','supply']);mkdirSync('/tmp/tk-participation-fixtures',{recursive:true});writeFileSync('/tmp/tk-participation-fixtures/hua-capture-ready.json',JSON.stringify(current(g).state));g=play(g,'duel');expect(g.world.flags.huaCaptured).toBe(true);expect(g.decisions.at(-1)?.artwork?.src).toBe('/art/scenes/v2-hua-captured.png');expect(g.world.people['rtk14-0144']).not.toBe('dead');const next=current(g);expect(next.id).toBe('r005-06');expect(next.state.world.flags.huaBeheaded).not.toBe(true);expect(next.state.world.log.some(r=>r.eventId==='r005-05')).toBe(false);
 });
 it('실제 접촉을 통한 관우 조기 출전은 유섭·반봉의 죽음을 막고 기본 경로는 이를 적용한다',()=>{
  const g=steps([...cao,'orders','receipt','supply']);const early=play(g,'recommend');expect(early.world.people['rtk14-0853']).not.toBe('dead');expect(early.world.people['rtk14-0785']).not.toBe('dead');const normal=play(g,'rear');expect(normal.world.people['rtk14-0853']).toBe('dead');expect(normal.world.people['rtk14-0785']).toBe('dead');
 });
 it('민간 운송 접근은 군적이나 일기토 허가가 아니며 위조 선택도 차단한다',()=>{
  let g=steps(['quiet','stay','travel','guide','jizhou','wan','relief','anxi','witness','submit','capital','quiet','rescue','message','civil','civil','travel','contract','receipt','rear']);const e=current(g);expect(e.id).toBe('r005-04');expect(g.factionId).toBeNull();expect(g.role).toBe('civilian');expect(e.choices.some(c=>c.id.endsWith(':duel'))).toBe(false);expect(resolveChoice(g,choiceKey(e,'front:duel'))).toBe(g);
 });
 it('공손찬 조기 구출은 삼영전여포를 취소하고 여포 생포는 탈출로 덮이지 않는다',()=>{
  const battle=steps([...cao,'orders','receipt','supply','duel','bridge']);const early=play(battle,'rescue');expect(early.world.flags.gongsunSavedEarly).toBe(true);expect(current(early).id).toBe('r005-09');expect(current(early).state.world.log.some(r=>r.eventId==='r005-08')).toBe(false);
  let g=play(battle,'rear');expect(current(g).id).toBe('r005-08');mkdirSync('/tmp/tk-participation-fixtures',{recursive:true});writeFileSync('/tmp/tk-participation-fixtures/lu-capture-ready.json',JSON.stringify(current(g).state));expect(current(g).choices.find(c=>c.id.endsWith(':capture'))!.check!.successRate).toBeGreaterThan(0);g=play(g,'capture');expect(g.decisions.at(-1)?.artwork?.src).toBe('/art/scenes/v2-lu-captured.png');expect(g.world.flags.hulaoCaptured).toBe(true);expect(g.world.flags.luBuCaptured).toBe(true);g=play(g,'consolidate');expect(g.world.flags.luBuEscaped).toBe(false);expect(g.world.flags.chapter5Done).toBe(true);expect(g.world.people['rtk14-0987']).not.toBe('dead');
 });
 for(const roll of [0,.99999])it(`동탁군 실제 합류 후 5화 성패 ${roll}: 반대편으로 바뀌지 않고 끝까지 진행`,()=>{
  let g=steps(dong);const decisions:Record<string,string>={'r005-01':'map','r005-02':'report','r005-03':'caution','r005-05':'recall','r005-06':'orders','r005-07':'recall','r005-08':'route','r005-09':'hold'};
  for(let i=0;i<15&&!g.completed;i++){
   const e=current(g);if(!e.historical){g=resolveChoice(g,choiceKey(e,'finish'));break;}
   expect(e.id.startsWith('r005')).toBe(true);expect(e.state.factionId).toBe('dong-zhuo');expect(e.state.flowProgress?.nodeId).toMatch(/^dong/);
   const id=e.id==='r005-04'?(e.state.flowProgress!.nodeId==='dong-cautious'?'orders':'withdraw'):decisions[e.id];g=play(g,id,roll);
  }
  expect(g.completed).toBe(true);expect(g.factionId).toBe('dong-zhuo');expect(g.world.flags.chapter5Done).toBe(true);expect(g.world.appliedEventIds).toHaveLength(41);
 });
 it('3화에 생포된 여포는 5화 일기토·협공·탈출에 다시 나타나지 않는다',()=>{
  let g=steps([...capital,'verify','record','dong','join','duel','record','ledger','watch','record','remain','map','report','caution','orders','orders','report']);const e=current(g);expect(e.id).toBe('chapter-end');expect(e.state.world.flags.luBuCaptured).toBe(true);expect(e.state.world.flags.luBuEscaped).not.toBe(true);expect(e.state.world.log.some(r=>['r005-07','r005-08'].includes(r.eventId??''))).toBe(false);
 });
 it('동탁군의 보급로 확인과 연락 허가는 실제 후속 경고의 난도를 낮춘다',()=>{
  const g=steps(dong);const prepared=steps([...dong,'map','report']);const unprepared=steps([...dong,'guard','report']);expect(current(prepared).state.flowProgress?.nodeId).toBe('dong-prepared');expect(current(unprepared).state.flowProgress?.nodeId).toBe('dong');expect(current(prepared).choices[0].check!.successRate-current(unprepared).choices[0].check!.successRate).toBe(10);expect(g.factionId).toBe('dong-zhuo');
 });
 it('원씨 일부 피신 준비는 남은 일족의 실제 구출과 구분한다',()=>{
  const prefix=capital.slice(0,-1);const recruit=[...prefix,'contact','rescue','message','civil','route','contact','signal','explain','inspect','join'];
  const g=steps([...recruit,'orders','receipt','supply','duel']);expect(current(g).id).toBe('r005-06');expect(g.world.flags.yuanFamilyPrepared).toBe(true);expect(current(g).choices.some(c=>c.id.endsWith(':family'))).toBe(true);
  const saved=play(g,'family');expect(saved.world.flags.yuanRemainingSaved).toBe(true);expect(saved.world.flags.yuanRemainingKilled).not.toBe(true);
  const partial=play(g,'remain');expect(partial.world.flags.yuanRemainingSaved).not.toBe(true);expect(partial.world.flags.yuanRemainingKilled).toBe(true);expect(partial.world.flags.yuanFamilyKilled).not.toBe(true);expect(partial.world.flags.yuanFamilyPrepared).toBe(true);
 });
 it('4화 완료 저장은 재판정 없이 5화부터 수동으로 이어진다',()=>{
  const old=cat.filter(e=>e.chapterId!=='chapter-005');let g=steps(cao,old);const e=current(g,old);expect(e.id).toBe('chapter-end');g=resolveChoice(g,choiceKey(e,'finish'),old);const before=JSON.stringify(g.decisions);expect(g.completed).toBe(true);expect(continuationEvent(g)?.id).toBe('r005-01');const resumed={...g,completed:false};expect(current(resumed).id).toBe('r005-01');expect(JSON.stringify(resumed.decisions)).toBe(before);
 });
});
