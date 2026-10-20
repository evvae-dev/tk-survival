import { describe, expect, it } from 'vitest';
import { newGame, migrateGame } from '@/stores/game-store';
import { historicalEvents } from './history';
import { choiceKey, getCurrentEvent, resolveChoice } from './event-engine';
import { unifiedRecords } from './history-records';
import { upgradeLegacyEvent } from './catalog-upgrade';
import { validateEvent } from './event-flow';
import { chronicleLines } from './chronicle';
import legacy from '@/data/history/legacy-campaign-v1.json';
import type { Game, HistoricalEvent } from './game';

const stats = { leadership: 100, strength: 100, intelligence: 100, politics: 100, charisma: 100 };
function start() { const game = newGame('여정 검수', 184, 'unknown', 'farmer'); game.stats = {...stats}; return game; }
function ready(input: Game, catalog = historicalEvents): Game {
 let game = input;
 for (let i = 0; i < 120; i++) {
  const next = getCurrentEvent(game, catalog, true)!;
  if (!next.automatic) return next.state;
  expect(next.state.world.log.length).toBeGreaterThan(game.world.log.length);
  game = JSON.parse(JSON.stringify(next.state));
 }
 throw new Error('자동 진행이 선택에 도착하지 않음');
}
function choose(input: Game, id: string, roll = 0, catalog = historicalEvents): Game {
 const game = ready(input, catalog), event = getCurrentEvent(game, catalog, true)!;
 const selected = event.choices.find(choice => choice.id === id || choice.id.endsWith(`:${id}`));
 expect(selected, `${game.year}/${event.id}/${event.state.flowProgress?.nodeId}: ${id}`).toBeDefined();
 const key = choiceKey(event, selected!.id);
 const result = resolveChoice(game, key, catalog, () => roll);
 expect(resolveChoice(JSON.parse(JSON.stringify(result)), key, catalog, () => { throw new Error('중복 재추첨'); })).toEqual(result);
 return result;
}
function until(input: Game, target: string, chooseOption?: (game: Game, ids: string[]) => string) {
 let game = input;
 for (let i = 0; i < 140; i++) {
  game = ready(game);
  const event = getCurrentEvent(game, undefined, true)!;
  if (event.id === target) return game;
  const ids = event.choices.map(c => c.id.split(':').at(-1)!);
  const option = chooseOption?.(game, ids) ?? (ids.find(id => ['follow','done','wait'].includes(id)) ?? ids[0]);
  game = choose(game, option);
 }
 throw new Error(`목표 사건 미도착: ${target}`);
}
function finish(input: Game, chooseOption: (game: Game, ids: string[]) => string) {
 let game = input;
 for (let i = 0; i < 200 && !game.completed; i++) {
  game = ready(game);
  const event = getCurrentEvent(game, undefined, true)!;
  const ids = event.choices.map(c => c.id.split(':').at(-1)!);
  if (event.id === 'chapter-end') { game = resolveChoice(game, choiceKey(event,'finish')); break; }
  game = choose(game, chooseOption(game, ids));
 }
 expect(game.completed).toBe(true);
 expect(game.year).toBe(188); expect(game.age).toBe(24);
 expect(unifiedRecords(game.world)).toEqual(game.world.log);
 expect(new Set(game.world.log.flatMap(entry=>entry.recordId?[entry.recordId]:[])).size).toBe(game.world.log.filter(entry=>entry.recordId).length);
 return game;
}

describe('실제 5.1~5.5 여정과 상태 계약', () => {
 it.each([['cao','cao-cao'],['liu','liu-bei']])('%s 동행부터 정식 지원·소속 유지·188년까지 연결한다', (company,lord) => {
  let game = choose(choose(start(),'han'),company);
  game = until(game,'chapter-5-1-service');
  const offered=getCurrentEvent(game)!.choices.map(c=>c.id);
  expect(offered.filter(id=>id.includes('join-'))).toEqual([`offers:join-${lord}`]);
  game=choose(game,`join-${lord}`);
  expect(game).toMatchObject({factionId:lord,role:'soldier'});
  const completed=finish(game, (_,ids)=>ids.find(id=>['stay','roster','help','continue','recover','wait','done'].includes(id))??ids[0]);
  expect(completed.factionId).toBe(lord);
  const localBackgrounds=completed.world.log.filter(entry=>entry.recordType==='background').map(entry=>entry.eventId);
  if(lord==='cao-cao') expect(localBackgrounds).toEqual(expect.arrayContaining(['event-185-wang-fen','event-188-xiyuan']));
  else expect(localBackgrounds).toContain('event-187-liu-bei-service');
  expect(localBackgrounds).not.toContain('event-186-meiyang');
  expect(completed.world.log.some(entry=>entry.title.includes('[흩어진 연락책의 수신처를 대조한다]') || entry.title.includes('[동료들의 이름과 군장을 맞춘다]'))).toBe(true);
 });
 it('실제 조조 동행 뒤 거절·목적지·재야의 네 해 현장 행동으로 완주한다',()=>{
  let game=until(choose(choose(start(),'han'),'cao'),'chapter-5-1-service');
  game.stats.charisma=0;
  game=choose(game,'join-cao-cao',.99);
  expect(game.region).toBe('jizhou');expect(game.factionId).toBeNull();
  expect(getCurrentEvent(game)!.choices.map(c=>c.id)).toEqual(['travel:liangzhou','travel:jizhou','travel:zhuo']);
  const declined=migrateGame({game:JSON.parse(JSON.stringify(game))},7).game!;
  expect(declined.flowProgress?.nodeId).toBe('travel');
  game=choose(declined,'liangzhou');
  const completed=finish(game,(state,ids)=>{
   if(ids.includes('travel'))return 'travel';
   const destination=({185:'yangzhou',186:'jingzhou',187:'yizhou'} as Record<number,string>)[state.year];
   if(destination&&ids.includes(destination))return destination;
   return ids.find(id=>['alternate','continue','recover','done','wait'].includes(id))??ids[0];
  });
  expect(completed.factionId).toBeNull();
  const local=completed.world.log.filter(entry=>entry.recordType==='background').map(entry=>entry.eventId);
  expect(local).toEqual(expect.arrayContaining(['event-185-liang-outbreak','event-185-zhang-xiu','event-186-he-qi','event-187-ou-xing','event-188-ma-xiang','event-188-liu-yan']));
  expect(local.indexOf('event-188-ma-xiang')).toBeLessThan(local.indexOf('event-188-liu-yan'));
  expect(completed.region).toBe('yizhou');
 });
 it('동행한 적 없는 일반 관군의 첫 지원에서는 군주를 만들지 않는다',()=>{
  const game=until(choose(choose(choose(start(),'han'),'regular'),'north'),'chapter-5-1-service');
  expect(getCurrentEvent(game)!.choices.map(c=>c.id)).toEqual(['offers:travel']);
 });
 it('대흥산 사료 결말은 실제 사망이 적용되는 기본 승리에서만 표시한다',()=>{
  const factual='유언군(유비 의용병)의 승리';
  let normal=choose(choose(start(),'han'),'liu');
  normal=choose(normal,'follow');
  expect(normal.world.log.some(entry=>entry.recordType==='outcome'&&entry.detail.includes(factual))).toBe(true);
  expect(normal.world.people['person-rtk14-0690']).toBe('dead');
  expect(normal.world.log.at(-2)?.recordType).toBe('personal');
  expect(normal.world.log.at(-2)?.detail).not.toMatch(/전사|유비군이 승리/);
  expect(normal.world.log.at(-1)?.detail).toContain('황건적 대군 와해 및 대규모 투항');
  let capture=choose(choose(start(),'han'),'liu');capture=choose(capture,'duel');
  expect(capture.world.people['person-rtk14-0690']).toBe('alive');
  expect(capture.world.log.filter(entry=>entry.eventId==='battle-184-daxingshan').some(entry=>entry.detail.includes(factual))).toBe(false);
  let yellow=choose(choose(choose(start(),'yellow'),'defend'),'north');yellow=choose(yellow,'ambush');yellow=ready(yellow);
  expect(yellow.world.flags.qingzhouRescueBlocked).toBe(true);
  expect(yellow.world.log.filter(entry=>entry.eventId==='battle-184-daxingshan').some(entry=>/정원지 및 부장 등무 전사/.test(entry.detail))).toBe(false);
  expect(yellow.world.log.filter(entry=>entry.eventId==='battle-184-qingzhou-city').some(entry=>entry.recordType==='background')).toBe(false);
 });
 it('광종 지휘 유지·생포 뒤 하곡양 항복은 사료 전사로 바뀌지 않는다',()=>{
  let game=choose(choose(start(),'han'),'cao');game=choose(game,'expose');game=choose(game,'lead');game=choose(game,'offer');
  expect(game.world.flags.luZhiRetained).toBe(true);
  expect(game.world.people['person-rtk14-0664']).toBe('alive');expect(game.world.people['person-rtk14-0659']).toBe('alive');
  expect(game.world.log.filter(entry=>['battle-184-guangzong','battle-184-xiaquyang'].includes(entry.eventId??'')).some(entry=>/장량.*전사|장보 참수/.test(entry.detail))).toBe(false);
 });
 it.each(['dead','defeated'])('이후 전역의 주요 인물/세력이 %s이면 승리를 강행하지 않는다',reason=>{
  const event=historicalEvents.find(e=>e.id==='event-186-meiyang')!;
  const game=newGame('바뀐 세계',186,'zhuo','farmer');game.factionId='dong-zhuo';
  if(reason==='dead') game.world.people['person-rtk14-0736']='dead';else game.world.factions['dong-zhuo']='defeated';
  const next=getCurrentEvent(game,[event],true)!;
  expect(next.state.region).toBe('zhuo');expect(next.state.world.appliedEventIds).toContain(event.id);
  expect(next.state.world.log.at(-1)?.recordType).toBe('news');
  expect(next.state.world.log.at(-1)?.detail).not.toContain('장안 방면 진출은 저지');
 });
 it('완료 연대기는 커스텀 생존 결과를 기존 고정 사망 문장으로 바꾸지 않는다',()=>{
  const catalog=structuredClone(historicalEvents);
  const event=catalog.find(e=>e.id==='battle-184-daxingshan')!;
  const node=event.flow!.nodes.find(n=>n.id==='historical')!;
  node.data.text='정원지와 등무는 무기를 버리고 달아났고 유비군은 길목을 확보했다.';
  const entry={eventId:event.id,year:184,month:null,title:event.title,detail:node.data.text,kind:'history' as const};
  expect(chronicleLines(entry,catalog).join(' ')).not.toMatch(/쓰러뜨리고|전사/);
 });
 it('수정된 구 공유본의 이미지·효과·배치·조건을 보존하며 새 기록 유형을 보완한다',()=>{
  const before=legacy.find(e=>e.id==='event-185-wang-fen')! as HistoricalEvent;
  const edited=structuredClone(before);
  const scene=edited.flow!.nodes.find(n=>n.id==='scene')!;
  scene.data.text='내가 직접 작성한 상황';scene.position={x:91,y:73};scene.data.artwork=null;
  scene.data.options![0].conditions=[{field:'age',operator:'gte',value:30}];
  edited.flow!.nodes.find(n=>n.id==='helped')!.data.effects=[{type:'stat',key:'politics',value:7}];
  const upgraded=upgradeLegacyEvent(edited),next=upgraded.flow!.nodes.find(n=>n.id==='scene')!;
  expect(next.data.text).toBe(scene.data.text);expect(next.position).toEqual(scene.position);expect(next.data.artwork).toBeNull();
  expect(next.data.options![0].conditions).toEqual(scene.data.options![0].conditions);
  expect(upgraded.flow!.nodes.find(n=>n.id==='helped')!.data.effects).toEqual([{type:'stat',key:'politics',value:7}]);
  expect(upgraded.flow!.nodes.find(n=>n.id==='background')?.data.recordType).toBe('background');
  expect(validateEvent(upgraded)).toEqual([]);
 });
});

describe('기록과 마이그레이션의 혼합 경로',()=>{
 it('개인 결과 뒤 역사와 추가 개인 결과가 섞여도 실행 순서를 유지한다',()=>{
  const template=structuredClone(historicalEvents.find(e=>e.id==='event-185-wang-fen')!);
  template.flow={passiveEffects:[],nodes:[
   {id:'start',type:'start',position:{x:0,y:0},data:{label:'시작'}},
   {id:'choose',type:'choice',position:{x:0,y:1},data:{label:'선택',options:[{id:'go',title:'[전달한다]',description:'문서를 옮겨 보자.'}]}},
   ...[{id:'first',text:'나는 확인한 문서를 넘겼다.'},{id:'middle',text:'왕분의 모의가 무산됐다.',recordType:'outcome' as const},{id:'last',text:'담당자는 내게 돌아가도 된다고 말했다.'}].map(data=>({id:data.id,type:'result' as const,position:{x:0,y:2},data:{label:data.text,text:data.text,...('recordType' in data?{recordType:data.recordType}:{})}})),
   {id:'end',type:'end',position:{x:0,y:3},data:{label:'종료'}},
  ],edges:[['start','choose','next'],['choose','first','go'],['first','middle','next'],['middle','last','next'],['last','end','next']].map(([source,target,sourceHandle])=>({id:source,source,target,sourceHandle}))};
  const game=newGame('혼합',185,'jizhou','farmer');const next=choose(game,'go',0,[template]);
  expect(next.world.log.map(entry=>entry.detail)).toEqual(['나는 확인한 문서를 넘겼다.','왕분의 모의가 무산됐다.','담당자는 내게 돌아가도 된다고 말했다.']);
  expect(next.world.log.map(entry=>entry.recordType)).toEqual(['personal','outcome','personal']);
 });
 it('eventId 이전의 실제 기록과 복원 archive를 두 번 표시하지 않는다',()=>{
  const game=start();game.world.log=[{year:184,month:null,title:'옛 사건 · 실제 선택',detail:'패배해 물러났다.',kind:'fiction'}];
  game.world.historyLog=[{year:184,month:null,title:'옛 사건',eventId:'old-event',detail:'패배해 물러났다.',kind:'history'}];
  expect(unifiedRecords(game.world)).toEqual(game.world.log);
 });
 it('일반 관군 선택이 명시되어 있으면 유비군 신호 행동을 해도 동행을 추정하지 않는다',()=>{
  const game=start();game.decisions=[{year:184,month:null,title:'도입 · [일반 관군과 움직인다]',detail:'일반 관군을 택했다.',kind:'fiction'},{eventId:'battle-184-qingzhou-city',year:184,month:null,title:'청주 · [매복 신호를 보낸다]',detail:'관군을 도왔다.',kind:'fiction'}];
  expect(migrateGame({game},7).game!.world.flags.chapter51AccompaniedLiuBei).toBe(false);
 });
});
