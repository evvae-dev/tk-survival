'use client';

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Officer } from '@/lib/reference-data';
import { abilityKeys, abilityLabels } from '@/lib/game-presentation';
import storyFacts from '@/data/chapters/facts.json';
import officerAbilities from '@/data/reference/officer-abilities.json';
import s from './game.module.css';
import { personSegments } from '@/lib/record-presentation';

const cache = new Map<string, Officer>();
const activePeople = new Set(storyFacts.flatMap(event=>event.officers));
const people = new Map(officerAbilities.filter(person=>activePeople.has(person.id)).filter(person=>!['사정','봉기','조정','전해','유주','장수','전의','추정','서구'].includes(person.name)).map(person=>[person.name,{officerId:person.id}]));
export function OfficerText({ text }: { text: string }) {
  return <>{personSegments(text, [...people.keys()]).map((part, index) => {
    const person = part.person ? people.get(part.person) : undefined;
    return person?.officerId ? <OfficerName key={index} name={part.text} officerId={person.officerId} /> : part.text;
  })}</>;
}

export default function OfficerName({ name, officerId, officer }: { name: string; officerId?: string; officer?: Officer }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Officer | null>(officer ?? (officerId ? cache.get(officerId) : null) ?? null);
  const [failed, setFailed] = useState(false);
  const [position, setPosition] = useState({ left: 12, top: 12 });
  const anchor = useRef<HTMLSpanElement>(null);
  const tooltip = useRef<HTMLSpanElement>(null);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const id = useId();
  const stayOpen = () => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    setOpen(true);
  };
  const leave = () => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    leaveTimer.current = setTimeout(() => setOpen(false), 150);
  };
  useEffect(() => () => { if (leaveTimer.current) clearTimeout(leaveTimer.current); }, []);

  useEffect(() => {
    if (!open || !officerId || data) return;
    const controller = new AbortController();
    setFailed(false);
    fetch(`/api/officers?id=${encodeURIComponent(officerId)}&limit=1`, { signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error('장수 정보 조회 실패');
        const result = await response.json();
        const item = result.items[0] as Officer | undefined;
        if (!item) throw new Error('연결 자료 없음');
        cache.set(officerId, item);
        setData(item);
      })
      .catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, [open, officerId, data]);

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const box = anchor.current?.getBoundingClientRect();
      const card = tooltip.current;
      if (!box || !card) return;
      const top = box.bottom + 8 + card.offsetHeight <= window.innerHeight - 12
        ? box.bottom + 8 : Math.max(12, box.top - card.offsetHeight - 8);
      setPosition({ left: Math.max(12, Math.min(box.left, window.innerWidth - card.offsetWidth - 12)), top });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, data, failed]);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent) { if (event.key === 'Escape') setOpen(false); }
      else if (!anchor.current?.contains(event.target as Node) && !tooltip.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('click', close);
    document.addEventListener('keydown', close);
    return () => { document.removeEventListener('click', close); document.removeEventListener('keydown', close); };
  }, [open]);

  return <>
    <span ref={anchor} className={s.officerName} data-officer-name={name} tabIndex={0} aria-describedby={open ? id : undefined}
      onPointerEnter={event => { if (event.pointerType === 'mouse') stayOpen(); }} onPointerLeave={event => { if (event.pointerType === 'mouse') leave(); }}
      onFocus={() => setOpen(true)} onBlur={event => { if (!tooltip.current?.contains(event.relatedTarget as Node)) setOpen(false); }}
      onClick={event => { if (!anchor.current?.closest('button')) { event.stopPropagation(); stayOpen(); } }}>
      {name}
    </span>
    {open && anchor.current && createPortal(<span ref={tooltip} id={id} role="tooltip" className={s.officerTooltip} style={position}
      onMouseEnter={stayOpen} onMouseLeave={leave}>
      <strong>{name}</strong>
      {data ? <>
        <span className={s.officerMeta}>{data.birthYear ?? '?'}–{data.deathYear ?? '?'}년 · {data.location}</span>
        <span className={s.officerStats}>{abilityKeys.map(key => <span key={key}>{abilityLabels[key]} <b>{data.stats[key]}</b></span>)}</span>
        {data.traits.length > 0 && <span className={s.officerTraits}>{data.traits.join(' · ')}</span>}
        <small>삼국지14 장수 자료</small>
      </> : <span>{!officerId || failed ? '연결된 장수 능력 자료가 없습니다.' : '장수 정보를 불러오는 중…'}</span>}
    </span>, anchor.current.closest('dialog') ?? document.body)}
  </>;
}
