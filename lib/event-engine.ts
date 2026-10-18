import type { Game, HistoricalEvent, Stats, AbilityRoll } from './game';
import { getChoiceCheck, rollAbility, type ChoiceCheck } from './ability-check';
import { historicalEvents, sortEvents } from './history';
import { advanceFlow, applyFlowEffects } from './event-flow';
import { applyChoiceGrowth } from './choice-growth';
import { normalizeMembership } from './world';

export type Choice = { id: string; title: string; description: string; outcome?: string; check?: ChoiceCheck; effects: Partial<Stats>; note: string; disabledReason?: string };
export type GameEvent = { id: string; year: number; month: number | null; title: string; scene: string; choices: Choice[]; historical?: HistoricalEvent; automatic?: boolean; annual: boolean; state: Game };
function finishEvent(state: Game, event: HistoricalEvent): Game {
  const next = applyFlowEffects(state, event.flow!.passiveEffects);
  return normalizeMembership({ ...next, flowProgress: undefined, resolvedEventIds: [...new Set([...next.resolvedEventIds, event.id])], world: { ...next.world, appliedEventIds: [...new Set([...next.world.appliedEventIds, event.id])] } });
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
      state = { ...state, world: { ...state.world, log: [...state.world.log, { year: state.year, month: event.month, title: event.title, detail: progress.results.join(' '), kind: 'fiction' as const }].slice(-120) } };
      if (stopAfterRecord) return {
        id: event.id, year: event.year, month: event.month, title: event.title,
        scene: progress.results.join(' '), choices: [], historical: event,
        automatic: true, annual: false, state: progress.node ? state : finishEvent(state, event),
      };
    }
    if (progress.node) return {
      id: event.id, year: event.year, month: event.month, title: event.title,
      scene: progress.node.data.text ?? progress.node.data.label, annual: false, historical: event, state,
      choices: (progress.node.data.options ?? []).map(option => ({ ...option, check: getChoiceCheck(state, event, progress.node!, option.id), id: `${progress.node!.id}:${option.id}`, effects: {}, note: '판정·대체 결과는 게임 창작입니다.' })),
    };
    state = finishEvent(state, event);
  }
  if (pending.some(e => e.year === state.year && e.flow && !state.world.appliedEventIds.includes(e.id))) return { id: 'blocked-dependencies', year: state.year, month: null, title: '사건의 선행 조건을 확인하세요', scene: '사건 사이의 순환 의존 때문에 진행할 수 없습니다. 사건 관리에서 선행 사건 ID를 수정하세요.', annual: false, state, choices: [] };
  return { id: 'chapter-end', year: state.year, month: null, title: '5.1 테스트 완료', scene: '현재 사건 목록의 진행을 마쳤습니다.', annual: false, state, choices: [{ id: 'finish', title: '기록을 마친다', description: '184년과 나이를 유지하고 결과를 확인한다.', effects: {}, note: '' }] };
}
export function choiceKey(event: GameEvent, choiceId: string): string { return `${event.year}:${event.id}:${choiceId}`; }
export function resolveChoice(game: Game, key: string, catalog: HistoricalEvent[] = historicalEvents, random: () => number = Math.random): Game {
  const event = getCurrentEvent(game, catalog);
  const selected = event?.choices.find(item => choiceKey(event, item.id) === key);
  if (!event || !selected) return game;
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
  const entry = { year: game.year, month: historical.month, title: `${historical.title} · ${selected.title}`, detail: [outcome, progress.results.join(' ') || selected.description].filter(Boolean).join('\n'), kind: 'fiction' as const, ...(reward.growth ? { growth: reward.growth } : {}), ...(check ? { check } : {}) };
  let next: Game = { ...progress.state, turn: game.turn + 1, decisions: [...progress.state.decisions, entry].slice(-120), world: { ...progress.state.world, log: [...progress.state.world.log, entry].slice(-120) } };
  if (!progress.node) next = finishEvent(next, historical);
  return { ...next, completed: !progress.node && next.world.flags.chapterFinished === true && catalog.filter(e => e.year === next.year && e.flow).every(e => next.world.appliedEventIds.includes(e.id)) };
}
