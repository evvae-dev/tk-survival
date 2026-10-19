'use client';
import { useState } from 'react';
import data from '@/data/collection/5-2-to-5-5.json';
import Link from '@/components/HostedLink';

export default function CampaignSources() {
  const [chapter, setChapter] = useState(2);
  return <main style={{ padding: '20px 24px', maxWidth: 1100, margin: '0 auto' }}>
    <h1>5.2~5.5 수집 자료</h1>
    <p>Codex 직접 조회 · 나무위키 공개 미러를 기본으로 사건별 상세 문서를 연결했습니다. 원사이트 직접 조회는 실패했으며, 출처 차이와 세부 시기는 아래 메모에 보존합니다.</p>
    <nav aria-label="수집 챕터" style={{ display: 'flex', gap: 12, margin: '20px 0' }}>{[2, 3, 4, 5].map(n => <button key={n} aria-pressed={n === chapter} onClick={() => setChapter(n)}>5.{n} · {183 + n}년</button>)}</nav>
    {data.events.filter(e => e.chapter === chapter).map(event => <details key={event.id} style={{ border: '1px solid #475569', borderRadius: 8, padding: 18, margin: '14px 0' }}>
      <summary>{event.title} · {event.stages.length}단계</summary>
      <p>{event.background}</p>
      <ol>{event.stages.map(stage => <li key={stage.id}>{stage.action}</li>)}</ol>
      <p><strong>결과:</strong> {event.reportedOutcome}</p>
      <p><strong>시기·이견:</strong> {event.dateNote}</p>
      <p><strong>행위자:</strong> {event.participants.map(p => `${p.name} (${p.role}${p.officerId ? ` · ${p.officerId}` : ' · 장수 ID 미연결'})`).join(' / ')}</p>
      <p>검토 상태: {event.reviewStatus} · {event.originalRecord ? '원전의 사건 순서 대조' : '원사서 직접 대조 안 함'}</p>
      <ul>{event.sourceIds.map(id => {
        const source = data.sources.find(s => s.id === id)!;
        return <li key={id}><a href={source.url} target="_blank" rel="noreferrer">{source.title}</a> · {source.locator} · {source.access}<br/>{source.note}<br/>{source.license}</li>;
      })}</ul>
      <Link href={`/admin/events?event=${event.id}`}>이 사건의 실행 플로우 편집 →</Link>
    </details>)}
  </main>;
}
