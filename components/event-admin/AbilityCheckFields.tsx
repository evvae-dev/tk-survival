import { useId } from 'react';
import type { FlowCheck } from '@/lib/event-flow-types';
import type { Stats } from '@/lib/game';
import { statLabels } from '@/lib/game';
import { checkKinds, checkWeights } from '@/lib/ability-check';
import officers from '@/data/reference/officer-abilities.json';
import { Select } from './fields';

export default function AbilityCheckFields({ value, onChange }: { value: FlowCheck; onChange: (check: FlowCheck) => void }) {
  const listId = useId();
  const weights = value.weights ?? (value.kind === 'custom' ? {} : checkWeights[value.kind]);
  return <>
    <label>판정 종류<Select value={value.kind} items={checkKinds} onChange={kind => {
      const { weights: _weights, ...rest } = value;
      onChange({ ...rest, kind: kind as FlowCheck['kind'], weights: kind === 'custom' ? {strength:1} : checkWeights[kind as keyof typeof checkWeights] });
    }}/></label>
    <p>보정치: {(Object.entries(weights) as [keyof Stats, number][]).filter(([, weight]) => weight > 0).map(([key, weight]) => `${statLabels[key]} × ${weight}`).join(' + ') || '능력 비중을 설정하세요'}</p>
    {(Object.keys(statLabels) as (keyof Stats)[]).map(key => <label key={key}>{statLabels[key]} 비중<input type="number" min="0" step="0.05" value={weights[key] ?? 0} onChange={event => onChange({ ...value, weights: { ...weights, [key]: Number(event.target.value) } })}/></label>)}
    <label>상황 난도<input type="number" min="0" max="100" value={value.difficulty ?? 50} onChange={event => onChange({...value,difficulty:Number(event.target.value)})}/></label>
    <p>난도 50은 중립, 65는 성공률 −15%p, 35는 +15%p입니다. 스탯 비중과 함께 이 선택의 난도를 정합니다.</p>
    <label>성공 명성 보상<input type="number" min="0.5" step="0.5" value={value.fameReward ?? 4} onChange={event => onChange({...value,fameReward:Number(event.target.value)})}/></label>
    <p>성공 +{value.fameReward ?? 4} / 실패 −{(value.fameReward ?? 4)/2}. 실패 시 0 아래로도 감소하며 소수점은 버리지 않습니다.</p>
    <label>명성 보상 근거<textarea aria-label="명성 보상 근거" value={value.fameReason ?? ''} onChange={event => onChange({...value,fameReason:event.target.value})}/></label>
    <label>상대 장수 ID (비우면 상대 없는 판정)<input list={listId} placeholder="rtk14-0746" value={value.opponentId ?? ''} onChange={event => {
      const { opponentId: _opponent, ...rest } = value;
      onChange({ ...rest, ...(event.target.value.trim() ? { opponentId: event.target.value.trim() } : {}) });
    }}/></label>
    <datalist id={listId}>{officers.map(officer => <option key={officer.id} value={officer.id}>{officer.name} · {officer.id}</option>)}</datalist>
    <p>상대 있음: 50 + (내 보정치 − 상대 보정치) × {process.env.NEXT_PUBLIC_ABILITY_CHECK_WEIGHT ?? '1.5'}. 상대 없음: 선택별 가중 평균. 두 경우 모두 상황 난도 보정(50 − 난도)을 적용하고 0~100%로 제한합니다.</p>
    <label>성공 결과 안내<textarea rows={2} value={value.success} onChange={event => onChange({ ...value, success: event.target.value })}/></label>
    <label>실패 결과 안내<textarea rows={2} value={value.failure} onChange={event => onChange({ ...value, failure: event.target.value })}/></label>
  </>;
}
