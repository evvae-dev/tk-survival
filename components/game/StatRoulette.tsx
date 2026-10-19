'use client';
import { useEffect, useState } from 'react';
import type { Stats } from '@/lib/game';
import { abilityKeys, abilityLabels } from '@/lib/game-presentation';
import { rollStartingStats } from '@/lib/starting-stats';
import GameDialog from './GameDialog';
import s from './game.module.css';

export default function StatRoulette({ onComplete }: { onComplete: (stats: Stats) => void }) {
  const [result, setResult] = useState(() => rollStartingStats());
  const [values, setValues] = useState(() => rollStartingStats());
  const [locked, setLocked] = useState(0);
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const firstStop = reduced ? 200 : 800;
    const interval = reduced ? 100 : 300;
    const started = performance.now();
    const tick = () => {
      const count = Math.max(0, Math.min(5, Math.floor((performance.now() - started - firstStop) / interval) + 1));
      const spinning = reduced ? result : rollStartingStats();
      setValues(Object.fromEntries(abilityKeys.map((key, index) => [key, index < count ? result[key] : spinning[key]])) as Stats);
      setLocked(count);
    };
    const timer = setInterval(tick, 80);
    const finish = setTimeout(() => {
      clearInterval(timer);
      setValues(result);
      setLocked(5);
    }, firstStop + interval * 4);
    return () => { clearInterval(timer); clearTimeout(finish); };
  }, [result]);
  const complete = locked === 5;
  const reroll = () => {
    if (!complete) return;
    setLocked(0);
    setValues(rollStartingStats());
    setResult(rollStartingStats());
  };
  return <GameDialog open title="나의 능력치" onClose={() => {}} dismissible={false}>
    <div data-testid="stat-roulette" data-phase={locked === 5 ? 'complete' : 'rolling'}>
      <p className={s.rouletteIntro}>낯선 시대의 나는 어떤 사람일까?<br />능력치는 30~80 사이로 추첨됩니다. 마음에 들 때까지 다시 만들 수 있습니다.</p>
      <div className={s.rouletteSlots}>{abilityKeys.map((key, index) => <div key={key} className={index < locked ? s.rouletteLocked : s.rouletteRolling} data-testid={`roulette-${key}`} data-locked={index < locked}>
        <span>{abilityLabels[key]}</span><strong>{values[key]}</strong><small>{index < locked ? '추첨 완료' : '돌아가는 중'}</small>
      </div>)}</div>
      <p role="status" className={s.rouletteStatus}>{complete ? '마음에 드는 능력치인가요? 시작을 누르면 이 능력치로 저장하고 진행합니다.' : '주사위는 던져졌다… 잠시만 기다려 주세요.'}</p>
      <div className={s.rouletteActions}>
        <button type="button" disabled={!complete} onClick={reroll}>다시 만들기</button>
        <button type="button" className={s.primaryButton} disabled={!complete} onClick={() => { if (complete) onComplete(result); }}>시작</button>
      </div>
    </div>
  </GameDialog>;
}
