'use client';
import { useEffect, useRef, useState } from 'react';
import s from './game.module.css';
export default function AnimatedValue({ value, showDelta = true }: { value: number; showDelta?: boolean }) {
  const previous = useRef(value);
  const [change, setChange] = useState<{delta:number; key:number} | null>(null);
  useEffect(() => {
    const delta = value - previous.current;
    previous.current = value;
    if (!delta) return;
    setChange({delta,key:Date.now()});
    const timer = setTimeout(() => setChange(null), 2800);
    return () => clearTimeout(timer);
  }, [value]);
  return <span data-testid="animated-value" data-value={value} data-change={change?.delta ?? 0} key={change?.key ?? 'initial'} className={change ? change.delta > 0 ? s.statIncrease : s.statDecrease : undefined}>{value}{change && showDelta && <small className={s.valueDelta}>{change.delta > 0 ? '+' : ''}{change.delta}</small>}</span>;
}
