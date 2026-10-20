import type { Game, HistoricalEvent, Stats, AbilityRoll } from './game';
import { getChoiceCheck, rollAbility, type ChoiceCheck } from './ability-check';
import { historicalEvents, sortEvents } from './history';
import { advanceFlow, applyFlowEffects, matches } from './event-flow';
import { applyChoiceGrowth } from './choice-growth';
import { normalizeMembership } from './world';
import type { FlowResult } from './event-flow';
import type { Artwork } from './artwork';
import { eventHistoryRecord } from './history-records';

export type Choice = { id: string; title: string; description: string; outcome?: string; artwork?: Artwork | null; check?: ChoiceCheck; effects: Partial<Stats>; note: string; disabledReason?: string };
export type GameEvent = { id: string; year: number; month: number | null; title: string; scene: string; choices: Choice[]; historical?: HistoricalEvent; automatic?: boolean; annual: boolean; state: Game };
function appendResults(state: Game, event: HistoricalEvent, records: FlowResult[]): Game {
 const entries = records.filter(record => !state.world.log.some(entry => entry.recordId === `${event.id}:${record.id}`)).map(record => ({eventId:event.id,recordId:`${event.id}:${record.id}`,recordType:record.recordType ?? 'personal' as const,year:state.year,month:event.month,title:event.title,detail:record.text,kind:'history' as const}));
 return {...state,world:{...state.world,log:[...state.world.log,...entries]}};
}
function finishEvent(state: Game, event: HistoricalEvent): Game {
  const next = applyFlowEffects(state, event.flow!.passiveEffects);
  const history = next.world.historyLog ?? [];
  const record = eventHistoryRecord(next, event);
  // Save the actual play outcome. A canonical victory must never overwrite an alternate outcome.
  const historyLog = !record || history.some(entry => entry.eventId === event.id) ? history : [...history, record];
  return normalizeMembership({ ...next, flowProgress: undefined, resolvedEventIds: [...new Set([...next.resolvedEventIds, event.id])], world: { ...next.world, historyLog, appliedEventIds: [...new Set([...next.world.appliedEventIds, event.id])] } });
}
export function getCurrentEvent(game: Game, catalog: HistoricalEvent[] = historicalEvents, stopAfterRecord = false): GameEvent | null {
  if (game.completed) return null;
  let state = normalizeMembership(game);
  const ordered = sortEvents(catalog);
  const cursorEvent = ordered.find(event => event.id === state.flowProgress?.eventId);
  const pending = cursorEvent ? [cursorEvent, ...ordered.filter(event => event !== cursorEvent)] : ordered;
  for (let pass = 0; pass < pending.length; pass++) for (const event of pending) {
    if (event.year !== state.year || !event.flow || state.world.appliedEventIds.includes(event.id)) continue;
    if ((event.prerequisiteEventIds ?? []).some(id => catalog.some(item => item.id === id) && !state.world.appliedEventIds.includes(id))) continue;
    const progress = advanceFlow(state, event, state.flowProgress?.eventId === event.id ? state.flowProgress.nodeId : undefined);
    state = progress.state;
    if (progress.results.length) {
      state = appendResults(state, event, progress.records);
      if (stopAfterRecord) return {
        id: event.id, year: event.year, month: event.month, title: event.title,
        scene: progress.results.join(' '), choices: [], historical: event,
        automatic: true, annual: false, state: progress.node ? state : finishEvent(state, event),
      };
    }
    if (progress.node) return {
      id: event.id, year: event.year, month: event.month, title: event.title,
      scene: progress.node.data.text ?? progress.node.data.label, annual: false, historical: event, state,
      choices: (progress.node.data.options ?? []).filter(option => (option.conditions ?? []).every(condition => matches(state, condition))).map(option => ({ ...option, check: getChoiceCheck(state, event, progress.node!, option.id), id: `${progress.node!.id}:${option.id}`, effects: {}, note: '판정·대체 결과는 게임 창작입니다.' })),
    };
    state = finishEvent(state, event);
  }
  if (pending.some(e => e.year === state.year && e.flow && !state.world.appliedEventIds.includes(e.id))) return { id: 'blocked-dependencies', year: state.year, month: null, title: '사건의 선행 조건을 확인하세요', scene: '사건 사이의 순환 의존 때문에 진행할 수 없습니다. 사건 관리에서 선행 사건 ID를 수정하세요.', annual: false, state, choices: [] };
  const upcoming = ordered.find(event => event.flow && event.year > state.year && !state.world.appliedEventIds.includes(event.id));
  if (upcoming) {
    const previousYear = state.year;
    const detail = '함께 지내기로 한 사람들과 길을 이어 갔다. 새해에도 내 선택과 인연은 그대로 남아 있다.';
    state = { ...state, year: upcoming.year, month: null, age: state.age + upcoming.year - previousYear, world: { ...state.world, log: [...state.world.log, { year: upcoming.year, month: null, title: `${upcoming.year}년, 이어지는 발걸음`, detail, kind: 'action' }] } };
    if (stopAfterRecord) return { id: 'chapter-transition', year: state.year, month: null, title: `${state.year}년`, scene: detail, choices: [], automatic: true, annual: false, state };
    return getCurrentEvent(state, catalog);
  }
  return { id: 'chapter-end', year: state.year, month: null, title: '지금까지의 여정', scene: '현재 사건 목록의 진행을 마쳤습니다.', annual: false, state, choices: [{ id: 'finish', title: '[지난 기록을 돌아본다]', description: '함께한 사람들과 지금까지의 일을 돌아보자.', effects: {}, note: '' }] };
}
export function choiceKey(event: GameEvent, choiceId: string): string { return `${event.year}:${event.id}:${choiceId}`; }
export function resolveChoice(game: Game, key: string, catalog: HistoricalEvent[] = historicalEvents, random: () => number = Math.random): Game {
  const event = getCurrentEvent(game, catalog);
  const selected = event?.choices.find(item => choiceKey(event, item.id) === key);
  if (!event || !selected || game.world.log.some(entry => entry.recordId === key)) return game;
  if (!event.historical) return { ...event.state, completed: true };
  const historical = event.historical;
  const cursor = event.state.flowProgress!;
  const option = selected.id.slice(cursor.nodeId.length + 1);
  const edge = historical.flow!.edges.find(item => item.source === cursor.nodeId && item.sourceHandle === option);
  if (!edge) return game;
  let target = edge.target;
  let check: AbilityRoll | undefined;
  const checkNode = historical.flow!.nodes.find(node => node.id === target && node.type === 'check');
  if (checkNode?.data.check) {
    check = rollAbility(event.state, checkNode.data.check, random);
    target = historical.flow!.edges.find(edge => edge.source === checkNode.id && edge.sourceHandle === (check!.success ? 'yes' : 'no'))!.target;
  }
  const progress = advanceFlow(event.state, historical, target);
  const reward = applyChoiceGrowth(event.state, progress.state, selected.title, check?.success);
  progress.state = reward.state;
  const outcome = check ? `${check.success ? '성공' : '실패'} · ${check.success ? selected.check?.success : selected.check?.failure}` : '';
  const bridge = check ? (check.success ? selected.check?.successNarrative : selected.check?.failureNarrative) : undefined;
  const firstHistorical = progress.records.findIndex(record => !!record.recordType);
  const personalPrefix = firstHistorical < 0 ? progress.records : progress.records.slice(0, firstHistorical);
  const remainingRecords = firstHistorical < 0 ? [] : progress.records.slice(firstHistorical);
  const resultText = personalPrefix.map(record => record.text).join(' ') || (check ? bridge || (check.success ? selected.check?.success : selected.check?.failure) || '' : selected.outcome || (progress.records.some(record => record.recordType) ? '나는 맡은 자리에서 일행의 움직임을 따랐다. 뒤이어 현장의 소식을 들었다.' : selected.description));
  const entry = { recordType: 'personal' as const, recordId: key, eventId: historical.id, year: event.year, month: historical.month, title: `${historical.title} · ${selected.title}`, detail: [outcome, resultText].filter(Boolean).join('\n'), kind: 'fiction' as const, ...(reward.growth ? { growth: reward.growth } : {}), ...(check ? { check } : {}) };
  let next: Game = { ...progress.state, introChoicePending: false, turn: game.turn + 1, decisions: [...progress.state.decisions, entry], world: { ...progress.state.world, log: [...progress.state.world.log, entry] } };
  next = appendResults(next, historical, remainingRecords);
  if (!progress.node) next = finishEvent(next, historical);
  const terminalEnding = next.world.flags.playerExecuted === true || next.world.flags.yellowEmpireFounded === true;
  return { ...next, completed: terminalEnding || (!progress.node && next.world.flags.chapterFinished === true && catalog.filter(e => e.year >= next.year && e.flow).every(e => next.world.appliedEventIds.includes(e.id))) };
}
