'use client';
import { useEffect, useRef } from 'react';
import type { RecordEntry } from '@/lib/game';
import { dateLabel } from '@/lib/game';
import { narrativeText } from '@/lib/record-presentation';
import RecordText from './RecordText';
import { OfficerText } from './OfficerName';
import s from './game.module.css';

export default function HistoryFlow({ entries, speed, reading = false }: { entries: RecordEntry[]; speed: number; reading?: boolean }) {
  const log = useRef<HTMLOListElement>(null);
  const panel = useRef<HTMLElement>(null);
  const count = useRef(entries.length);
  useEffect(() => {
    const added = entries.length > count.current;
    count.current = entries.length;
    if (!added) return;
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth';
    log.current?.scrollTo({ top: 0, behavior });
    if (reading && window.matchMedia('(max-width:768px)').matches) panel.current?.scrollIntoView({ block: 'start', behavior });
  }, [entries.length, reading]);
  return <section ref={panel} className={`${s.panel} ${s.historyFlow}`} aria-labelledby="history-flow-heading">
    <h2 className={s.panelTitle} id="history-flow-heading">기록 <span>{entries.length}개의 발자취</span></h2>
    <ol ref={log} className={s.historyLog} data-testid="history-log" aria-live="polite" aria-relevant="additions">
      {entries.length ? entries.map((entry, index) => ({ entry, index })).reverse().map(({ entry, index }) => <li key={entry.recordId ?? `${index}-${entry.title}`} data-testid="history-record" data-record-type={entry.recordType ?? 'personal'} className={entry.check?.success === true ? s.successLog : entry.check?.success === false ? s.failureLog : undefined}>
        <span>{dateLabel(entry.year, entry.month)} {entry.recordType && entry.recordType !== 'personal' ? ({background:'배경',outcome:'결말',news:'소식'}[entry.recordType]) : ''}</span>
        <h3><OfficerText text={entry.title} /></h3>
        <p><RecordText key={`${entry.eventId}-${entry.detail}`} text={narrativeText(entry.detail)} animate={index === entries.length - 1} speed={speed}/></p>
      </li>) : <li><h3>난세의 소식을 기다리며</h3><p>행동과 들려오는 소식이 이곳에 차례로 쌓입니다.</p></li>}
    </ol>
  </section>;
}
