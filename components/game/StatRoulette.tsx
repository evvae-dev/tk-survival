'use client';
import { useEffect, useState } from 'react';
import type { Stats } from '@/lib/game';
import { abilityKeys, abilityLabels } from '@/lib/game-presentation';
import { rollStartingStats } from '@/lib/starting-stats';
import GameDialog from './GameDialog';
import s from './game.module.css';

export default function StatRoulette({ onComplete }: { onComplete: (stats: Stats) => void }) {
  const [result] = useState(() => rollStartingStats());
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
      onComplete(result);
    }, firstStop + interval * 4 + 900);
    return () => { clearInterval(timer); clearTimeout(finish); };
  }, [onComplete, result]);
  return <GameDialog open title="나의 능력치" onClose={() => {}} dismissible={false}>
    <div data-testid="stat-roulette" data-phase={locked === 5 ? 'complete' : 'rolling'}>
      <p className={s.rouletteIntro}>낯선 시대의 나는 어떤 사람일까?<br />능력치가 30~80 사이에서 자동으로 정해집니다.</p>
      <div className={s.rouletteSlots}>{abilityKeys.map((key, index) => <div key={key} className={index < locked ? s.rouletteLocked : s.rouletteRolling} data-testid={`roulette-${key}`} data-locked={index < locked}>
        <span>{abilityLabels[key]}</span><strong>{values[key]}</strong><small>{index < locked ? '확정' : '돌아가는 중'}</small>
      </div>)}</div>
      <p role="status" className={s.rouletteStatus}>{locked === 5 ? '능력치 확정! 첫 선택으로 이동합니다.' : '주사위는 던져졌다… 잠시만 기다려 주세요.'}</p>
    </div>
  </GameDialog>;
}
