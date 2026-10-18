import { useId } from 'react';
import type { FlowCheck } from '@/lib/event-flow-types';
import type { Stats } from '@/lib/game';
import { statLabels } from '@/lib/game';
import { checkKinds, checkWeights } from '@/lib/ability-check';
import officers from '@/data/reference/officer-abilities.json';
import { Select } from './fields';

export default function AbilityCheckFields({ value, onChange }: { value: FlowCheck; onChange: (check: FlowCheck) => void }) {
  const listId = useId();
  const weights = value.kind === 'custom' ? value.weights ?? {} : checkWeights[value.kind];
  return <>
    <label>판정 종류<Select value={value.kind} items={checkKinds} onChange={kind => {
      const { weights: _weights, ...rest } = value;
      onChange({ ...rest, kind: kind as FlowCheck['kind'], ...(kind === 'custom' ? { weights: { strength: 1 } } : {}) });
    }}/></label>
    <p>보정치: {(Object.entries(weights) as [keyof Stats, number][]).filter(([, weight]) => weight > 0).map(([key, weight]) => `${statLabels[key]} × ${weight}`).join(' + ') || '능력 비중을 설정하세요'}</p>
    {value.kind === 'custom' && (Object.keys(statLabels) as (keyof Stats)[]).map(key => <label key={key}>{statLabels[key]} 비중<input type="number" min="0" step="0.1" value={value.weights?.[key] ?? 0} onChange={event => onChange({ ...value, weights: { ...value.weights, [key]: Number(event.target.value) } })}/></label>)}
    <label>상대 장수 ID (비우면 상대 없는 판정)<input list={listId} placeholder="rtk14-0746" value={value.opponentId ?? ''} onChange={event => {
      const { opponentId: _opponent, ...rest } = value;
      onChange({ ...rest, ...(event.target.value.trim() ? { opponentId: event.target.value.trim() } : {}) });
    }}/></label>
    <datalist id={listId}>{officers.map(officer => <option key={officer.id} value={officer.id}>{officer.name} · {officer.id}</option>)}</datalist>
    <p>상대 있음: 50 + (내 보정치 − 상대 보정치) × {process.env.NEXT_PUBLIC_ABILITY_CHECK_WEIGHT ?? '1.5'}. 상대 없음: 능력치%, 복합은 비중을 반영한 평균. 0~100%로 제한합니다.</p>
    <label>성공 결과 안내<textarea rows={2} value={value.success} onChange={event => onChange({ ...value, success: event.target.value })}/></label>
    <label>실패 결과 안내<textarea rows={2} value={value.failure} onChange={event => onChange({ ...value, failure: event.target.value })}/></label>
  </>;
}
