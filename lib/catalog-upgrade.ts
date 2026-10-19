import type { HistoricalEvent } from './game';
import { historicalEvents, sortEvents } from './history';
import legacyProse from '@/data/history/legacy-narrative-5-1.json';

// Refresh only exact former defaults. Each field keeps independent administrator edits.
function upgradeKnownProse(event: HistoricalEvent): HistoricalEvent {
  const canonical = historicalEvents.find(item => item.id === event.id);
  if (!event.flow || !canonical?.flow) return event;
  let next: HistoricalEvent | undefined;
  for (const rule of legacyProse.filter(rule => rule.eventId === event.id)) {
    const node = event.flow.nodes.find(node => node.id === rule.nodeId);
    const current = canonical.flow.nodes.find(node => node.id === rule.nodeId);
    if (!node || !current) continue;
    if (rule.optionId && ['title', 'description', 'outcome'].includes(rule.field)) {
      const field = rule.field as 'title' | 'description' | 'outcome';
      const option = node.data.options?.find(option => option.id === rule.optionId);
      const value = current.data.options?.find(option => option.id === rule.optionId)?.[field];
      if (!option || option[field] !== rule.before || typeof value !== 'string' || value === rule.before) continue;
      next ??= structuredClone(event);
      next.flow!.nodes.find(node => node.id === rule.nodeId)!.data.options!.find(option => option.id === rule.optionId)![field] = value;
    } else if (!rule.optionId && (rule.field === 'label' || rule.field === 'text')) {
      const value = current.data[rule.field];
      if (node.data[rule.field] !== rule.before || typeof value !== 'string' || value === rule.before) continue;
      next ??= structuredClone(event);
      next.flow!.nodes.find(node => node.id === rule.nodeId)!.data[rule.field] = value;
    }
  }
  return next ?? event;
}

// 기존의 공유 기본 목록에도 원정을 추가한다. 관리자 편집본은 보존한다.
export function upgradeLegacyCatalog(events: HistoricalEvent[]): HistoricalEvent[] {
  const conquest = historicalEvents.find(event => event.id === 'chapter-5-1-yellow-conquest')!;
  if (events.some(event => event.id === conquest.id)) return events;
  const opening = events.find(event => event.id === 'chapter-5-1-opening');
  const canonical = historicalEvents.find(event => event.id === 'chapter-5-1-opening')!;
  if (!opening?.flow || opening.flow.nodes.some(node => ['yellow-route', 'begin-conquest'].includes(node.id))) return events;
  if (!historicalEvents.filter(event => event.id !== conquest.id).every(event => events.some(item => item.id === event.id))) return events;
  const added = new Set(['yellow-route', 'begin-conquest']);
  const join = opening.flow.edges.filter(edge => edge.source === 'join-yellow');
  const end = opening.flow.nodes.find(node => node.type === 'end');
  if (join.length !== 1 || join[0].sourceHandle !== 'next' || !end || !opening.flow.nodes.some(node => node.id === join[0].target)) return events;
  const newEdges = structuredClone(canonical.flow!.edges.filter(edge => added.has(edge.source)));
  if (newEdges.some(edge => opening.flow!.edges.some(previous => previous.id === edge.id))) return events;
  // 기존 문구·선택·효과·배치를 보존하고 황건 합류 직후에 새 갈림길만 끼운다.
  const upgraded = structuredClone(opening);
  upgraded.flow!.edges.find(edge => edge.id === join[0].id)!.target = 'yellow-route';
  const bottom = Math.max(...opening.flow.nodes.map(node => node.position.y));
  const newNodes = structuredClone(canonical.flow!.nodes.filter(node => added.has(node.id)));
  newNodes.forEach((node, index) => { node.position = { x: 0, y: bottom + (index + 1) * 340 }; });
  for (const edge of newEdges) {
    if (edge.source === 'yellow-route' && edge.sourceHandle === 'defend') edge.target = join[0].target;
    if (edge.source === 'begin-conquest') edge.target = end.id;
  }
  upgraded.flow!.nodes.push(...newNodes);
  upgraded.flow!.edges.push(...newEdges);
  upgraded.connections = [...(upgraded.connections ?? []), ...canonical.connections!.filter(connection => connection.targetId === conquest.id)];
  return sortEvents([...events.map(event => event === opening ? upgraded : event), structuredClone(conquest)]);
}

// 구 공유본을 저장한 브라우저도 새 게시본을 받을 때까지 실행할 수 있게 한다.
export function upgradeLegacyEvent(event: HistoricalEvent): HistoricalEvent {
  event = upgradeKnownProse(event);
  const canonical = historicalEvents.find(item => item.id === event.id);
  const legacy = event.flow?.nodes.some(node => node.type === 'condition' && canonical?.flow?.nodes.find(item => item.id === node.id)?.type === 'check')
    || JSON.stringify(event.flow).includes('"key":"health"') || JSON.stringify(event.flow).includes('"key":"money"');
  if (!event.flow) return event;
  const oldSurrender = '한충이 칼을 내려놨길래 이제 끝난 줄 알았다. 그런데 진힐 쪽 병사가 포승줄 묶인 사람 앞에서 칼을 뽑는다. 아니 항복하면 살려주는 거 아니었어?!';
  const proseUpdate = event.flow.nodes.some(node => {
    const current = canonical?.flow?.nodes.find(item => item.id === node.id);
    return (event.id === 'battle-184-wan' && node.id === 'surrender' && node.data.text === oldSurrender)
      || (node.type === 'check' && current?.type === 'check' &&
        node.data.check?.success === current.data.check?.success && node.data.check?.failure === current.data.check?.failure &&
        ((!node.data.check?.successNarrative && current.data.check?.successNarrative) || (!node.data.check?.failureNarrative && current.data.check?.failureNarrative)));
  });
  if (!legacy && !proseUpdate) return event;
  const next = structuredClone(event);
  const supported = (effects: NonNullable<HistoricalEvent['flow']>['passiveEffects']) => effects.filter(effect => effect.type !== 'stat' || !['health','money'].includes(effect.key));
  next.flow!.passiveEffects = supported(next.flow!.passiveEffects);
  for (const node of next.flow!.nodes) {
    if (node.data.effects) node.data.effects = supported(node.data.effects);
    const current = canonical?.flow?.nodes.find(item => item.id === node.id);
    if (event.id === 'battle-184-wan' && node.id === 'surrender' && node.data.text === oldSurrender && current) node.data.text = current.data.text;
    if (node.type === 'check' && current?.type === 'check' && node.data.check && current.data.check &&
      node.data.check.success === current.data.check.success && node.data.check.failure === current.data.check.failure) {
      node.data.check.successNarrative ??= current.data.check.successNarrative;
      node.data.check.failureNarrative ??= current.data.check.failureNarrative;
    }
    if (node.type === 'condition' && current?.type === 'check') {
      node.type = 'check';
      node.data = { label: current.data.label, check: structuredClone(current.data.check) };
    }
  }
  return next;
}
