'use client';
import { useEffect, useState } from 'react';
import { OfficerText } from './OfficerName';
import s from './game.module.css';
export default function RecordText({ text, animate = false, speed = 1 }: { text: string; animate?: boolean; speed?: number }) {
  const [length, setLength] = useState(animate ? 0 : text.length);
  const [finished, setFinished] = useState(false);
  useEffect(() => {
    if (!animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setLength(text.length); return; }
    const started = performance.now();
    const timer = window.setInterval(() => {
      const count = Math.min(text.length, Math.floor((performance.now() - started) / (22 * speed)));
      setLength(count);
      if (count === text.length) window.clearInterval(timer);
    }, 22);
    return () => window.clearInterval(timer);
  }, [text, animate, speed]);
  return <span className={s.recordText}><OfficerText text={animate && !finished ? text.slice(0, length) : text} />{animate && !finished && length < text.length && <button className={s.typingCursor} aria-label="기록 전체 보기" onClick={() => setFinished(true)}>▍</button>}</span>;
}
