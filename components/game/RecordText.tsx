'use client';
import { useEffect, useState } from 'react';
import { OfficerText } from './OfficerName';
import s from './game.module.css';
import { playbackDelay, type PlaybackSpeed } from '@/lib/record-playback';
export default function RecordText({ text, animate = false, speed = 1 }: { text: string; animate?: boolean; speed?: number }) {
  const [length, setLength] = useState(animate ? 0 : text.length);
  const [finished, setFinished] = useState(false);
  useEffect(() => {
    if (!animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setLength(text.length); return; }
    const started = performance.now();
    const interval = Math.min(22 * speed, Math.max(1, (playbackDelay(speed as PlaybackSpeed) - 600) / Math.max(1, text.length)));
    const timer = window.setInterval(() => {
      const count = Math.min(text.length, Math.floor((performance.now() - started) / interval));
      setLength(count);
      if (count === text.length) window.clearInterval(timer);
    }, 22);
    return () => window.clearInterval(timer);
  }, [text, animate, speed]);
  return <span className={s.recordText}><OfficerText text={animate && !finished ? text.slice(0, length) : text} />{animate && !finished && length < text.length && <button className={s.typingCursor} aria-label="기록 전체 보기" onClick={() => setFinished(true)}>▍</button>}</span>;
}
