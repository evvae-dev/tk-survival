'use client';
import { useEffect, useState } from 'react';
import { abilityKeys, abilityLabels, type AbilityKey } from '@/lib/game-presentation';
import type { Officer } from '@/lib/reference-data';
import type { World } from '@/lib/game';
import s from './game.module.css';
import OfficerName from './OfficerName';

export default function OfficerRanking({ year, world }: { year: number; world: World }) {
  const [stat, setStat] = useState<AbilityKey>('leadership');
  const [rows, setRows] = useState<Officer[]>([]);
  const [message, setMessage] = useState('불러오는 중…');
  const excluded = Object.entries(world.people).filter(([, state]) => state === 'dead').map(([id]) => id.replace(/^person-/, '')).filter(id => id.startsWith('rtk14-')).sort().join(',');
  useEffect(() => {
    const controller = new AbortController();
    setMessage('불러오는 중…');
    const params = new URLSearchParams({ year: String(year), sort: stat, ranked: 'true', exclude: excluded, limit: '10' });
    fetch(`/api/officers?${params}`, { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error('장수 순위를 불러오지 못했습니다.');
      return response.json();
    }).then(data => { setRows(data.items); setMessage(''); }).catch(error => { if (!controller.signal.aborted) setMessage(error.message); });
    return () => controller.abort();
  }, [year, stat, excluded]);
  return <section className={`${s.panel} ${s.rankingPanel}`} aria-labelledby="ranking-heading"><h2 id="ranking-heading" className={s.panelTitle}>천하 장수 순위 <span>TOP 10</span></h2><p className={s.smallNote}>삼국지14 · {year}년 등장·생존 장수 기준</p>
    <div className={s.tabs} role="group" aria-label="장수 순위 능력">{abilityKeys.map(key => <button key={key} aria-pressed={stat === key} onClick={() => setStat(key)}>{abilityLabels[key]}</button>)}</div>
    {message ? <p role="status" className={s.smallNote}>{message}</p> : <ol className={s.rankingList}>{rows.map((officer, index) => <li key={officer.id}><span>{index + 1}</span><strong><OfficerName name={officer.name} officerId={officer.id} officer={officer} /><small>{officer.id}</small></strong><b>{officer.stats[stat]}</b></li>)}</ol>}
    <p className={s.smallNote}>게임 속 사망자는 제외합니다.<br/>능력·등장 연도는 역사적 사실과 구분되는 게임 자료입니다.</p>
  </section>;
}
