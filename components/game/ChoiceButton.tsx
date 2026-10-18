import type { Choice } from '@/lib/event-engine';
import { statLabels, type Stats } from '@/lib/game';
import { checkKinds } from '@/lib/ability-check';
import { choiceArt } from '@/lib/choice-art';
import AbilityIcon from './AbilityIcon';
import s from './game.module.css';
import { OfficerText } from './OfficerName';

export default function ChoiceButton({ choice, index, onChoose }: { choice: Choice; index: number; onChoose: () => void }) {
  const check = choice.check;
  const art = choiceArt(choice);
  return <button disabled={!!choice.disabledReason} onClick={onChoose}>
    <span>{String(index + 1).padStart(2, '0')}</span><div>
      {art && <img className={s.choiceArt} src={art.src} alt={art.alt} loading="lazy" width={362} height={350} />}
      <strong><OfficerText text={choice.title} /></strong><p><OfficerText text={choice.description} /></p>
      {check && <><div className={s.checkMeta}>
        {(Object.entries(check.weights) as [keyof Stats, number][]).filter(([, weight]) => weight > 0).map(([key, weight]) => <span key={key}><AbilityIcon ability={key}/>[{statLabels[key]}]{weight !== 1 && ` ×${weight}`}</span>)}
        <small>{checkKinds[check.kind]}<OfficerText text={check.opponentName ? ` · 상대: ${check.opponentName}` : ' · 상대 없음'} /></small>
      </div><div className={s.outcomeRows}>
        <div className={s.successOutcome}><span>성공: <OfficerText text={check.success} /></span><b data-testid="success-probability">{check.successRate}%</b></div>
        <div className={s.failureOutcome}><span>실패: <OfficerText text={check.failure} /></span><b data-testid="failure-probability">{check.failureRate}%</b></div>
      </div></>}
      {!check && choice.outcome && <p className={s.fixedOutcome}>결과: <OfficerText text={choice.outcome} /></p>}
      {choice.disabledReason && <small>{choice.disabledReason}</small>}
    </div>
  </button>;
}
