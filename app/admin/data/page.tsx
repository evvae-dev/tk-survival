'use client';
import { CHAPTER_ID } from '@/lib/chapter';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Officer, TimelineEntry } from '@/lib/reference-data';
import { createDefaultFlow } from '@/lib/event-flow';
import { getEffectiveCatalog, useEventCatalogStore } from '@/stores/event-catalog-store';
import type { HistoricalEvent } from '@/lib/game';
import { factionLabels, regionLabels } from '@/lib/game';
import styles from './page.module.css';

type Result = { items: (TimelineEntry | Officer)[]; total: number };
export default function ReferenceDataPage() {
  const router = useRouter();
  const [kind, setKind] = useState<'timeline' | 'officers'>('timeline');
  const [q, setQ] = useState('');
  const [year, setYear] = useState('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<Result>({ items: [], total: 0 });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => { void useEventCatalogStore.persist.rehydrate(); }, []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    const timer = setTimeout(() => {
      const params = new URLSearchParams({ q, page: String(page), limit: '30' });
      if (year) params.set('year', year);
      void fetch(`/api/${kind}?${params}`, { signal: controller.signal }).then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        if (!controller.signal.aborted) setResult(data);
      }).catch(reason => { if (!controller.signal.aborted) setError(String(reason)); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 200);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [kind, q, year, page]);
  function importEvent(entry: TimelineEntry) {
    try {
      if (!getEffectiveCatalog().some(item => item.id === entry.id)) {
        const event: HistoricalEvent = { id: entry.id, chapterId: CHAPTER_ID, sequence: 5, prerequisiteEventIds: ['chapter-5-1-opening'], year: entry.year, month: entry.month, precision: entry.precision, calendar: 'lunar', leapMonth: entry.leapMonth, dateNote: entry.dateNote, title: entry.title, summary: entry.content, regionIds: entry.regionIds, factionIds: entry.factionIds, relatedPeople: entry.relatedPeople, relatedOfficerIds: entry.relatedOfficerIds, officerLinkInferences: entry.officerLinkInferences, category: entry.category, source: { title: entry.source.title, record: entry.source.record ?? '사서기록 미확인. 이 초안은 편년 2차 자료에서 수집했으며 원사서와 대조하지 않았다.' } };
        useEventCatalogStore.getState().saveEvent({ ...event, flow: createDefaultFlow(event) });
      }
      router.push(`/admin/events?event=${encodeURIComponent(entry.id)}`);
    } catch (reason) { setError(String(reason)); }
  }
  return <main className={styles.page}>
    <header><div><p>관리 작업실 / 수집 자료</p><h1>연표와 장수 데이터</h1></div><nav><Link href="/admin/collection">5.1 수집 플로우 →</Link><Link href="/admin/events">사건 편집기로 이동 →</Link></nav></header>
    <p className={styles.note}>연표는 2차 자료입니다. 문헌·월·지역이 확인되지 않은 값은 미확인으로 표시합니다. 장수의 연도·능력치·관계는 삼국지14 게임 데이터입니다.</p>
    <div className={styles.filters}><label>자료<select value={kind} onChange={event => { setKind(event.target.value as typeof kind); setPage(1); }}><option value="timeline">연표 항목</option><option value="officers">삼국지14 장수</option></select></label><label>검색<input value={q} onChange={event => { setQ(event.target.value); setPage(1); }} placeholder="인물, 사건, 지역"/></label><label>{kind === 'timeline' ? '사건 연도' : '생존 연도 (게임 기준)'}<input type="number" value={year} onChange={event => { setYear(event.target.value); setPage(1); }} placeholder="전체"/></label></div>
    {error && <p role="alert">{error}</p>}
    <p role="status">{loading ? '불러오는 중…' : `검색 결과 ${result.total.toLocaleString()}개`}</p>
    <div className={styles.table}><table><thead>{kind === 'timeline' ? <tr><th>연월</th><th>내용 / 관련 정보</th><th>출처 / 사서기록</th><th>게임 사건</th></tr> : <tr><th>장수</th><th>생년 / 등장 / 사망</th><th>소재 / 능력치</th><th>개성 / 상세</th></tr>}</thead><tbody>{!loading && result.items.map(item => 'content' in item ? <tr key={item.id}><td>{item.year}년<br/>{item.month === null ? '월 미상' : `${item.leapMonth ? '윤' : ''}${item.month}월`}{item.precision === 'approximate' && <small>근사 시기</small>}</td><td><strong>{item.title}</strong><p>{item.content}</p><small>{item.relatedPeople.join(', ') || '관련 인물 미확인'}</small><small>연결 장수 ID: {item.relatedOfficerIds.join(', ') || '없음'}</small>{item.officerLinkInferences.map(inference=><small key={inference.name}>{inference.name} · 추정 연결 {inference.officerId} ({inference.method==='lifespan'?'생몰년':'생몰년·문맥'})<br/>{inference.reason}</small>)}{item.officerLinkIssues.map(issue=><small key={issue.name}>{issue.name} · {issue.reason==='ambiguous'?'동명이인 확인 대기':issue.reason==='excluded'?'사용자 지정 미연결':'대응 장수 없음'}{issue.reason==='ambiguous'&&` (${issue.candidateOfficerIds.join(', ')})`}</small>)}<small>지역: {item.regionIds.map(id => regionLabels[id] ?? id).join(', ') || '미확인'} · 세력: {item.factionIds.map(id => factionLabels[id] ?? id).join(', ') || '미확인'}</small><small>{item.parentId ? '상위 사건의 세부 경과' : '주요 항목'} · {item.category === 'novel' ? '연의' : '역사 계열'}</small></td><td>{item.source.title}<small>{item.source.record ?? '사서기록 미확인'}</small></td><td><button disabled={item.year < 170 || item.year > 280} onClick={() => importEvent(item)}>이벤트 초안 열기</button><small>{item.year < 170 || item.year > 280 ? '게임 연도 범위 밖' : '브라우저에 저장 후 플로 편집'}</small></td></tr> : <tr key={item.id}><td><strong>{item.name}</strong><small>{item.id} · {item.gender}</small></td><td>{item.birthYear ?? '미상'} / {item.debutYear ?? '미상'} / {item.deathYear ?? '미상'}</td><td>{item.location}<small>통솔 {item.stats.leadership} · 무력 {item.stats.strength} · 지력 {item.stats.intelligence} · 정치 {item.stats.politics} · 매력 {item.stats.charisma}</small></td><td>{item.traits.join(', ')}<details><summary>반에디터 상세</summary><p>주의: {item.gameData.doctrine} · 정책: {item.gameData.policy}</p><p>부: {item.gameData.father ?? '미상'} · 모: {item.gameData.mother ?? '미상'} · 배우자: {item.gameData.spouse ?? '미상'}</p><p>시트 세력: {item.gameData.faction ?? '미지정'} · 신분: {item.gameData.status}</p></details></td></tr>)}</tbody></table></div>
    <nav className={styles.pagination} aria-label="자료 페이지"><button disabled={page <= 1 || loading} onClick={() => setPage(page - 1)}>이전</button><span>{page} / {Math.max(1, Math.ceil(result.total / 30))}</span><button disabled={page * 30 >= result.total || loading} onClick={() => setPage(page + 1)}>다음</button></nav>
  </main>;
}
