'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Game } from '@/lib/game';
import { buildChronicle } from '@/lib/chronicle';
import { OfficerText } from './OfficerName';
import s from './game.module.css';

export default function Chronicle({ game }: { game: Game }) {
  const lines = useMemo(() => buildChronicle(game.world.log.filter(entry => entry.recordType !== 'background')), [game.world.log]);
  const [shown, setShown] = useState(0);
  const [all, setAll] = useState(false);
  const section = useRef<HTMLElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const reduced = useRef(false);
  useEffect(() => {
    reduced.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    section.current?.scrollIntoView({ block: 'start', behavior: reduced.current ? 'instant' : 'smooth' });
    if (reduced.current) { setAll(true); setShown(lines.length); }
    else setShown(Math.min(1, lines.length));
  }, [lines.length]);
  useEffect(() => {
    if (all || shown >= lines.length) return;
    const timer = setTimeout(() => setShown(value => value + 1), 1500);
    return () => clearTimeout(timer);
  }, [shown, all, lines.length]);
  useEffect(() => {
    const element = scroller.current;
    if (element && !all) {
      const behavior = reduced.current ? 'instant' : 'smooth';
      element.scrollTo({ top: element.scrollHeight, behavior });
      Array.from(element.querySelectorAll('[data-testid="chronicle-entry"]')).at(-1)?.scrollIntoView({ block: 'nearest', behavior });
    }
  }, [shown, all]);
  const visible = all ? lines : lines.slice(0, shown);
  const years = [...new Set(visible.map(line => line.year))];
  return <section ref={section} className={`${s.panel} ${s.chronicle}`} aria-labelledby="chronicle-heading" data-testid="chronicle">
    <div className={s.chronicleHeading}>
      <div><p className={s.eyebrow}>지나온 발자취</p><h2 id="chronicle-heading">{game.name}의 연대기</h2></div>
      <div className={s.chronicleActions}>
        {!all && <button className={s.textButton} onClick={() => {
          setAll(true); setShown(lines.length);
          scroller.current?.scrollTo({ top: 0, behavior: 'instant' });
        }}>전체 보기</button>}
        {(all || shown >= lines.length) && <button className={s.textButton} onClick={() => {
          setAll(false); setShown(Math.min(1, lines.length));
          scroller.current?.scrollTo({ top: 0, behavior: 'instant' });
        }}>다시 재생</button>}
      </div>
    </div>
    <p className={s.smallNote} role="status">{!all && shown < lines.length ? '연대기를 따라 내려가는 중…' : '모든 발자취를 펼쳤습니다.'}</p>
    <div ref={scroller} className={`${s.chronicleScroll} ${all ? s.chronicleExpanded : ''}`} data-testid="chronicle-scroll" tabIndex={0} aria-label="연도별 발자취">
      {years.map(year => <section key={year} className={s.chronicleYear} data-testid="chronicle-year">
        <h3>{year}년</h3><ol>{visible.filter(line => line.year === year).map(line => <li key={line.id} data-testid="chronicle-entry"><OfficerText text={line.text} /></li>)}</ol>
      </section>)}
      {!lines.length && <p>남겨진 발자취가 없습니다.</p>}
    </div>
  </section>;
}
