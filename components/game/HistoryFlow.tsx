'use client';
import { useEffect, useRef } from 'react';
import type { RecordEntry } from '@/lib/game';
import { dateLabel } from '@/lib/game';
import { narrativeText } from '@/lib/record-presentation';
import RecordText from './RecordText';
import { OfficerText } from './OfficerName';
import s from './game.module.css';

export default function HistoryFlow({ entries, speed }: { entries: RecordEntry[]; speed: number }) {
  const log = useRef<HTMLOListElement>(null);
  useEffect(() => { log.current?.scrollTo({ top: 0, behavior: 'smooth' }); }, [entries.length]);
  return <section className={`${s.panel} ${s.historyFlow}`} aria-labelledby="history-flow-heading">
    <h2 className={s.panelTitle} id="history-flow-heading">역사 흐름 <span>{entries.length}개의 발자취</span></h2>
    <ol ref={log} className={s.historyLog} data-testid="history-flow-log" aria-live="polite" aria-relevant="additions">
      {entries.length ? entries.map((entry, index) => ({ entry, index })).reverse().map(({ entry, index }) => <li key={entry.eventId ?? `${index}-${entry.title}`} data-testid="world-history-record">
        <span>{dateLabel(entry.year, entry.month)}</span>
        <h3><OfficerText text={entry.title} /></h3>
        <p><RecordText key={`${entry.eventId}-${entry.detail}`} text={narrativeText(entry.detail)} animate={index === entries.length - 1} speed={speed}/></p>
      </li>) : <li><h3>난세의 소식을 기다리며</h3><p>사건이 마무리되면 이곳에 이번 여정의 역사 흐름이 쌓입니다.</p></li>}
    </ol>
  </section>;
}
