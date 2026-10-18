import type { HistoricalEvent } from './game';
import { historicalEvents } from './history';

// 구 공유본을 저장한 브라우저도 새 게시본을 받을 때까지 실행할 수 있게 한다.
export function upgradeLegacyEvent(event: HistoricalEvent): HistoricalEvent {
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
