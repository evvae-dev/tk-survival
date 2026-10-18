import type { Choice } from '@/lib/event-engine';
import { statLabels, type Stats } from '@/lib/game';
import { checkKinds } from '@/lib/ability-check';
import AbilityIcon from './AbilityIcon';
import s from './game.module.css';

export default function ChoiceButton({ choice, index, onChoose }: { choice: Choice; index: number; onChoose: () => void }) {
  const check = choice.check;
  return <button disabled={!!choice.disabledReason} onClick={onChoose}>
    <span>{String(index + 1).padStart(2, '0')}</span><div>
      <strong>{choice.title}</strong><p>{choice.description}</p>
      {check && <><div className={s.checkMeta}>
        {(Object.entries(check.weights) as [keyof Stats, number][]).filter(([, weight]) => weight > 0).map(([key, weight]) => <span key={key}><AbilityIcon ability={key}/>[{statLabels[key]}]{weight !== 1 && ` ×${weight}`}</span>)}
        <small>{checkKinds[check.kind]}{check.opponentName ? ` · 상대: ${check.opponentName}` : ' · 상대 없음'}</small>
      </div><div className={s.outcomeRows}>
        <div className={s.successOutcome}><span>성공: {check.success}</span><b data-testid="success-probability">{check.successRate}%</b></div>
        <div className={s.failureOutcome}><span>실패: {check.failure}</span><b data-testid="failure-probability">{check.failureRate}%</b></div>
      </div></>}
      {!check && choice.outcome && <p className={s.fixedOutcome}>결과: {choice.outcome}</p>}
      {choice.disabledReason && <small>{choice.disabledReason}</small>}
    </div>
  </button>;
}
