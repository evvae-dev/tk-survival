import {describe,it,expect,beforeEach} from 'vitest';
import {historicalEvents,sortEvents} from './history';
import {getCurrentEvent,resolveChoice,choiceKey,continuationEvent} from './event-engine';
import {newGame,useGameStore} from '@/stores/game-store';
import {useEventCatalogStore} from '@/stores/event-catalog-store';
import {playbackKey} from './record-playback';
import {unifiedRecords} from './history-records';
beforeEach(()=>useEventCatalogStore.getState().restoreDefaults());
describe('참여 판본의 시간·선택·기록 회귀',()=>{
 it('챕터 순서로 처리하면서 나이는 역행하지 않는다',()=>{
  const a=structuredClone(historicalEvents[0]),b=structuredClone(historicalEvents[0]);a.year=189;b.id='test-later';b.year=184;b.sequence=2;b.prerequisiteEventIds=[a.id];
  expect(sortEvents([b,a])[0].id).toBe(a.id);const g=newGame('시간',184,'zhuo','farmer',[a,b]);const e=getCurrentEvent(g,[a,b])!;const c=e.choices.find(c=>c.id.endsWith(':quiet'))!;const after=resolveChoice(g,choiceKey(e,c.id),[a,b]);const next=getCurrentEvent(after,[a,b])!;expect(next.id).toBe(b.id);expect(next.state.age).toBe(25);
 });
 it('숨긴 선택은 위조 키로 실행되지 않으며 남은 유효 행동은 계속 보인다',()=>{
  const event=structuredClone(historicalEvents[0]);const n=event.flow!.nodes.find(n=>n.type==='choice')!;n.data.options![0].conditions=[{field:'world.flags.proof',operator:'eq',value:true}];
  const g=newGame('조건',184,'zhuo','farmer',[event]),e=getCurrentEvent(g,[event])!;expect(e.choices).toHaveLength(n.data.options!.length-1);expect(resolveChoice(g,choiceKey(e,n.id+':'+n.data.options![0].id),[event])).toBe(g);
 });
 it('자동 기록을 읽기 전 선택을 소비하지 않고 같은 기록 요청은 중복하지 않는다',()=>{
  const g=newGame('기록',184,'zhuo','farmer',historicalEvents);useGameStore.setState({game:g});const e=getCurrentEvent(g)!;useGameStore.getState().nextTurn(choiceKey(e,e.choices[0].id));expect(useGameStore.getState().game).toBe(g);const key=playbackKey(g);useGameStore.getState().advanceRecord(key);const after=useGameStore.getState().game!;expect(after).not.toBe(g);useGameStore.getState().advanceRecord(key);expect(useGameStore.getState().game).toBe(after);const records=unifiedRecords(after.world);expect(new Set(records.map(r=>r.recordId)).size).toBe(records.length);
 });
 it('결과 기록은 실제 결과 그림과 문장을 저장하며 열람으로 효과를 반복하지 않는다',()=>{
  const event=historicalEvents[0],g=newGame('결과',184,'zhuo','farmer',[event]);const e=getCurrentEvent(g,[event])!,c=e.choices.find(c=>c.id.endsWith(':quiet'))!;const after=resolveChoice(g,choiceKey(e,c.id),[event]);expect(after.decisions.at(-1)?.artwork?.src).toContain('/art/');expect(after.decisions.at(-1)?.detail).toContain('창고');const restored=JSON.parse(JSON.stringify(after));getCurrentEvent(restored,[event]);expect(resolveChoice(restored,choiceKey(e,c.id),[event])).toBe(restored);
 });
 it('판정 안내와 실제 결과가 같은 문장이면 본문을 한 번만 기록한다',()=>{
  const event=historicalEvents[0],g=newGame('중복 결과',184,'zhuo','farmer',[event]);g.stats.intelligence=65;g.stats.politics=65;
  const e=getCurrentEvent(g,[event])!,c=e.choices[0];
  for(const roll of [0,.99999]){const after=resolveChoice(g,choiceKey(e,c.id),[event],()=>roll);const succeeded=after.decisions.at(-1)!.check!.success;const text=(succeeded?c.check!.successNarrative:c.check!.failureNarrative)!;expect(after.decisions.at(-1)!.detail).toBe(`${succeeded?'성공':'실패'} · ${text}`);}
 });
 it('종료된 게임은 새 화를 수동으로 이어갈 때만 열고 전사는 이어가지 않는다',()=>{
  const g=newGame('이어가기',184,'zhuo','farmer',historicalEvents);g.completed=true;g.world.appliedEventIds=historicalEvents.filter(e=>e.chapterId==='chapter-001').map(e=>e.id);const next=continuationEvent(g);if(next){expect(next.chapterId).not.toBe('chapter-001');expect(g.completed).toBe(true);}g.world.flags.playerDead=true;expect(continuationEvent(g)).toBeUndefined();
 });
});
