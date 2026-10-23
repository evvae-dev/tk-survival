import {describe,it,expect} from 'vitest';
import {historicalEvents} from './history';
import {getCurrentEvent,resolveChoice,choiceKey,continuationEvent} from './event-engine';
import {newGame} from '@/stores/game-store';
import type {Game} from './game';
const cat=historicalEvents.filter(e=>['chapter-001','chapter-002','chapter-003','chapter-004'].includes(e.chapterId!));
const start=()=>{const g=newGame('4화 인과',184,'zhuo','farmer',cat);g.stats={leadership:65,strength:96,intelligence:65,politics:65,charisma:65};return g;};
const current=(g:Game)=>getCurrentEvent(g,cat)!;
const play=(g:Game,id:string,roll=0)=>{const e=current(g),c=e.choices.find(c=>c.id.endsWith(':'+id));expect(c,`${e.id}/${e.state.flowProgress?.nodeId}/${id}`).toBeDefined();return resolveChoice(g,choiceKey(e,c!.id),cat,()=>roll);};
const steps=(ids:string[])=>ids.reduce((g,id)=>play(g,id),start());
const capital=['lead','seek','ask','join','support','signal','evidence','submit','transfer','order','passage','service','proof','submit','capital','warning'];
const royal=()=>{let g=steps(capital);g=play(g,'verify',.99999);return ['rescue','escort','civil'].reduce((g,id)=>play(g,id),g);};
describe('4화 새 판본의 정치·동행·생존 인과',()=>{
 it('하진 생존의 군권과 실제 궁문 접근이 있어야 공동 청원으로 폐립을 보류한다',()=>{
  let g=steps([...capital,'verify','record','civil']);expect(current(g).id).toBe('r004-02');expect(current(g).state.flowProgress?.nodeId).toBe('counterweight');g=play(g,'petition');expect(g.world.flags.depositionBlocked).toBe(true);expect(g.world.flags.emperorBian).toBe(true);expect(g.world.flags.emperorXian).toBe(false);const next=current(g);expect(next.id).toBe('r004-04');expect(next.state.world.flags.royalFamilyKilled).not.toBe(true);
 });
 it('앞서 확인한 왕실 호위만 폐제 일가 구출을 열며 성패가 실제 결과를 나눈다',()=>{
  const g=royal();expect(current(g).id).toBe('r004-03');expect(current(g).state.flowProgress?.nodeId).toBe('royal');const saved=play(g,'save');expect(saved.world.flags.royalFamilySaved).toBe(true);expect(saved.world.flags.royalFamilyKilled).toBe(false);const failed=play(g,'save',.99999);expect(failed.world.flags.royalFamilySaved).not.toBe(true);expect(failed.world.flags.royalFamilyKilled).toBe(true);
 });
 it('접촉 실패자는 암살 준비·중모 도피 현장에 자동으로 따라가지 않는다',()=>{
  let g=steps([...capital,'verify','record','civil','petition']);g=play(g,'contact',.99999);const e=current(g);expect(e.id).toBe('r004-08');expect(e.state.flowProgress?.nodeId).toBe('regional');expect(e.state.region).toBe('luoyang');expect(e.state.world.flags.followCao).not.toBe(true);
 });
 it('조조 접촉 성공 뒤 탈출 연락 실패도 중모·여백사 동행을 부여하지 않는다',()=>{
  let g=steps([...capital,'verify','record','civil','petition','contact']);g=play(g,'signal',.99999);const e=current(g);expect(e.id).toBe('r004-08');expect(e.state.region).toBe('luoyang');expect(e.state.world.flags.followCao).toBe(false);expect(e.state.world.flags.caoTravel).not.toBe(true);
 });
 it('실제 동행 뒤 오인을 풀면 여백사 일가와 진궁 잔류가 모집까지 보존된다',()=>{
  let g=steps([...capital,'verify','record','civil','petition','contact','signal','explain','inspect']);expect(g.world.flags.luBosheSaved).toBe(true);expect(g.world.flags.chenWithCao).toBe(true);expect(current(g).state.flowProgress?.nodeId).toBe('companion');g=play(g,'join');expect(g.factionId).toBe('cao-cao');expect(g.world.flags.luBosheKilled).toBe(false);expect(g.world.flags.chenWithCao).toBe(true);
 });
 it('여백사 확인 실패는 진궁 결별을 남기고 과거 구출로 덮이지 않는다',()=>{
  let g=steps([...capital,'verify','record','civil','petition','contact','signal','explain']);g=play(g,'inspect',.99999);expect(g.world.flags.luBosheSaved).not.toBe(true);expect(g.world.flags.luBosheKilled).toBe(true);expect(g.world.flags.chenWithCao).toBe(false);g=play(g,'civil');expect(g.world.flags.chenWithCao).toBe(false);expect(g.factionId).toBeNull();
 });
 it('동탁 소속자는 도피 동행자로 바뀌지 않고 유지/명시 이탈을 고른다',()=>{
  let g=steps(capital);g=play(g,'verify',.99999);for(const id of ['rescue','message','dong','join','retreat','receipt','receipt','protect','ledger','watch','record'])g=play(g,id);expect(current(g).id).toBe('r004-08');expect(current(g).state.flowProgress?.nodeId).toBe('dong');expect(g.factionId).toBe('dong-zhuo');g=play(g,'remain');expect(g.factionId).toBe('dong-zhuo');const e=current(g);expect(e.state.region).toBe('luoyang');expect(e.state.world.flags.caoTravel).not.toBe(true);
 });
});
