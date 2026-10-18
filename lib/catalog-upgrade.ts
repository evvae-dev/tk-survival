import type { HistoricalEvent } from './game';
import { historicalEvents } from './history';

// 구 공유본을 저장한 브라우저도 새 게시본을 받을 때까지 실행할 수 있게 한다.
export function upgradeLegacyEvent(event: HistoricalEvent): HistoricalEvent {
  const canonical = historicalEvents.find(item => item.id === event.id);
  const legacy = event.flow?.nodes.some(node => node.type === 'condition' && canonical?.flow?.nodes.find(item => item.id === node.id)?.type === 'check')
    || JSON.stringify(event.flow).includes('"key":"health"') || JSON.stringify(event.flow).includes('"key":"money"');
  if (!legacy || !event.flow) return event;
  const next = structuredClone(event);
  const supported = (effects: NonNullable<HistoricalEvent['flow']>['passiveEffects']) => effects.filter(effect => effect.type !== 'stat' || !['health','money'].includes(effect.key));
  next.flow!.passiveEffects = supported(next.flow!.passiveEffects);
  for (const node of next.flow!.nodes) {
    if (node.data.effects) node.data.effects = supported(node.data.effects);
    const current = canonical?.flow?.nodes.find(item => item.id === node.id);
    if (node.type === 'condition' && current?.type === 'check') {
      node.type = 'check';
      node.data = { label: current.data.label, check: structuredClone(current.data.check) };
    }
  }
  return next;
}
