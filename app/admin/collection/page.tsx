'use client';

import Link from '@/components/HostedLink';
import { useEffect, useMemo, useState } from 'react';
import { ReactFlow, ReactFlowProvider, Background, Controls, Handle, Position, MarkerType, useReactFlow, type Node, type Edge, type NodeProps } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { collectedChapter as chapter, collectionPeople, collectionPlaces, collectionSources, type CollectedEvent } from '@/lib/collected-chapter';
import s from './page.module.css';
import ChapterFlow from '@/components/event-admin/ChapterFlow';
import CampaignSources from '@/components/event-admin/CampaignSources';

type CardData = { title: string; caption: string; detail: string; kind: 'history' | 'novel' | 'stage' | 'outcome' | 'intervention'; input?: Position; output?: Position };
type CardNode = Node<CardData, 'card'>;
type Diagram = { nodes: CardNode[]; edges: Edge[] };
const sideLabels: Record<string, string> = { han: '관군', 'yellow-turban': '황건군', civilian: '현지 주민' };
const categoryLabel = (event: CollectedEvent) => event.category === 'novel' ? '연의' : '역사 계열';
const short = (text: string) => text.length > 62 ? `${text.slice(0, 62)}…` : text;

function Card({ data, selected }: NodeProps<CardNode>) {
  return <div className={`${s.node} ${s[data.kind]} ${selected ? s.selected : ''}`}>
    {data.input && <Handle type="target" position={data.input}/>}
    <small>{data.caption}</small><strong>{data.title}</strong><span>{data.detail}</span>
    {data.output && <Handle type="source" position={data.output}/>}
  </div>;
}
const nodeTypes = { card: Card };
const arrow = { type: MarkerType.ArrowClosed, color: '#6b7280' };
const position = (index: number, compact = false) => {
  if (compact) return { x: 0, y: index * 225 };
  const row = Math.floor(index / 3), column = index % 3;
  return { x: (row % 2 ? 2 - column : column) * 340, y: row * 225 };
};
const direction = (from: { x: number; y: number }, to: { x: number; y: number }) => from.y !== to.y ? Position.Bottom : from.x < to.x ? Position.Right : Position.Left;
const opposite = { [Position.Top]: Position.Bottom, [Position.Bottom]: Position.Top, [Position.Left]: Position.Right, [Position.Right]: Position.Left };

function overviewGraph(selected: string | undefined, compact: boolean): Diagram {
  const positions = [{ x: 0, y: 0 }, { x: 0, y: 250 }, { x: 750, y: 0 }, { x: 375, y: 0 }, { x: 375, y: 250 }];
  return {
    nodes: chapter.events.map((event, index) => ({ id: event.id, type: 'card', position: compact ? position(index, true) : positions[index], selected: event.id === selected, data: {
      title: event.title, caption: `${categoryLabel(event)} · ${event.stages.length}단계`, detail: short(event.overview), kind: event.category === 'novel' ? 'novel' : 'history',
      input: chapter.links.some(link => link.to === event.id) ? Position.Top : undefined,
      output: chapter.links.some(link => link.from === event.id) ? Position.Bottom : undefined,
    } })),
    edges: chapter.links.map(link => ({ id: link.id, source: link.from, target: link.to, type: 'smoothstep', label: link.kind === 'narrativePrecedes' ? '서사 순서 · 후보' : '후속 전개 · 후보', markerEnd: arrow, style: { stroke: '#6b7280', strokeDasharray: '6 4' }, labelBgPadding: [7, 5] })),
  };
}

function eventGraph(event: CollectedEvent, showInterventions: boolean, selected: string | undefined, compact: boolean): Diagram {
  const cards: CardData[] = [
    { title: event.title, caption: `${categoryLabel(event)} · 전투 개요`, detail: short(event.overview), kind: event.category === 'novel' ? 'novel' : 'history' },
    ...event.stages.map(stage => ({ title: stage.title, caption: `전개 ${stage.order}`, detail: short(stage.action), kind: 'stage' as const })),
    { title: '원페이지의 전투 결과', caption: '수집 결과', detail: short(event.reportedOutcomes.join(' · ')), kind: 'outcome' },
  ];
  const ids = [`${event.id}:start`, ...event.stages.map(stage => stage.id), `${event.id}:outcome`];
  const nodes: CardNode[] = cards.map((data, index) => ({ id: ids[index], type: 'card', position: position(index, compact), selected: ids[index] === selected, data: {
    ...data, input: index ? opposite[direction(position(index - 1, compact), position(index, compact))] : undefined,
    output: index < cards.length - 1 ? direction(position(index, compact), position(index + 1, compact)) : showInterventions ? Position.Right : undefined,
  } }));
  const edges: Edge[] = ids.slice(1).map((id, index) => ({ id: `step-${id}`, source: ids[index], target: id, type: 'smoothstep', markerEnd: arrow, style: { stroke: '#64748b', strokeWidth: 1.6 } }));
  if (showInterventions) event.gameplayDraft.interventions.forEach((item, index) => {
    const id = `${event.id}:intervention:${index}`;
    nodes.push({ id, type: 'card', position: { x: compact ? 420 : 1120, y: index * 225 }, selected: id === selected, data: { title: item.action, caption: `개입 후보 · ${sideLabels[item.side] ?? item.side}`, detail: item.role, kind: 'intervention', input: Position.Left } });
    edges.push({ id: `draft-${id}`, source: ids[0], target: id, type: 'smoothstep', label: '게임 창작 · 검토 후보', markerEnd: { type: MarkerType.ArrowClosed, color: '#a16207' }, style: { stroke: '#a16207', strokeDasharray: '5 5' }, labelStyle: { fill: '#854d0e', fontSize: 11 } });
  });
  return { nodes, edges };
}

export default function Page() {
  const [source, setSource] = useState<'runtime' | '5.1' | 'campaign'>('runtime');
  return <><div style={{padding:'12px 24px',display:'flex',gap:12,flexWrap:'wrap'}}><button aria-pressed={source === 'runtime'} onClick={()=>setSource('runtime')}>게임 실행 플로우</button><button aria-pressed={source === '5.1'} onClick={()=>setSource('5.1')}>5.1 수집 원자료</button><button aria-pressed={source === 'campaign'} onClick={()=>setSource('campaign')}>5.2~5.5 수집 원자료</button></div><ReactFlowProvider key={source}>{source === '5.1'?<CollectionViewer/>:source === 'campaign'?<CampaignSources/>:<ChapterFlow/>}</ReactFlowProvider></>;
}

function CollectionViewer() {
  const [view, setView] = useState<'overview' | 'event'>('overview');
  const [eventId, setEventId] = useState(chapter.events[0].id);
  const [selected, setSelected] = useState<string>();
  const [showInterventions, setShowInterventions] = useState(false);
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const media = window.matchMedia('(max-width:760px)');
    const update = () => setCompact(media.matches);
    update(); media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  const rf = useReactFlow();
  const event = chapter.events.find(item => item.id === eventId)!;
  const selectedEvent = view === 'overview' ? chapter.events.find(item => item.id === selected) : event;
  const stage = view === 'event' ? event.stages.find(item => item.id === selected) : undefined;
  const intervention = view === 'event' && selected?.startsWith(`${event.id}:intervention:`) ? event.gameplayDraft.interventions[Number(selected.split(':').at(-1))] : undefined;
  const graph = useMemo(() => view === 'overview' ? overviewGraph(selected, compact) : eventGraph(event, showInterventions, selected, compact), [view, event, showInterventions, selected, compact]);
  const graphKey = `${view === 'overview' ? 'overview' : `${event.id}-${showInterventions}`}-${compact}`;

  function openEvent(id: string) { setEventId(id); setView('event'); setSelected(`${id}:start`); }
  function selectNode(id: string) {
    setSelected(id);
    const node = rf.getNode(id);
    if (node) void rf.fitView({ nodes: [node], padding: .7, maxZoom: 1, duration: 200 });
  }

  return <main className={s.page}>
    <header className={s.header}><div><p>관리 작업실 / 수집 플로우</p><h1>5.1 황건적의 난</h1><span>수집한 전개와 사건 사이의 연결을 살펴봅니다.</span></div><nav aria-label="관리 화면"><Link href="/admin/events">사건 관리</Link><Link href="/admin/data">연표·장수 자료</Link><Link href="/">게임으로 ↗</Link></nav></header>
    <div className={s.stats}>{[['수집 전투', chapter.events.length, '개'], ['전개 단계', chapter.events.reduce((sum, item) => sum + item.stages.length, 0), '단계'], ['관련 인물', chapter.people.length, '명']].map(([title, value, unit]) => <article key={title}><span>{title}</span><strong>{value}<small>{unit}</small></strong></article>)}</div>
    <p className={s.notice}><b>수집본 보기</b> 원페이지의 전개와 이견을 보존한 자료입니다. 이 화면의 개입 후보는 수집 시점의 초안입니다. 실제 실행 분기·판정·효과는 ‘게임 실행 플로우’에서 확인하세요.</p>
    <div className={s.toolbar}><div className={s.views} role="group" aria-label="플로우 보기"><button aria-pressed={view === 'overview'} onClick={() => { setView('overview'); setSelected(undefined); }}>사건 간 연결</button><button aria-pressed={view === 'event'} onClick={() => openEvent(eventId)}>전투 내부 전개</button></div><div className={s.tools}>{view === 'event' && <label><input type="checkbox" checked={showInterventions} onChange={e => { setShowInterventions(e.target.checked); setSelected(`${event.id}:start`); }}/>개입 후보 표시</label>}<button onClick={() => void rf.fitView({ padding: .15, minZoom: .15, maxZoom: 1, duration: 200 })}>전체 보기</button></div></div>
    <div className={s.layout}>
      <aside className={s.list}><h2>전투 목록 <small>{chapter.events.length}개</small></h2><nav aria-label="수집 전투">{chapter.events.map(item => <button key={item.id} className={view === 'event' && item.id === eventId ? s.active : ''} aria-pressed={view === 'event' && item.id === eventId} onClick={() => openEvent(item.id)}><small>{categoryLabel(item)} · {item.stages.length}단계</small><strong>{item.title}</strong></button>)}</nav>
        {view === 'event' && <><h2 className={s.stepHeading}>전개 바로가기</h2><nav aria-label="전개 단계">{event.stages.map(item => <button key={item.id} className={selected === item.id ? s.active : ''} aria-pressed={selected === item.id} onClick={() => selectNode(item.id)}><small>전개 {item.order}</small><span>{item.title}</span></button>)}</nav></>}
        {view === 'event' && showInterventions && <><h2 className={s.stepHeading}>개입 후보</h2><nav aria-label="개입 후보">{event.gameplayDraft.interventions.map((item, index) => <button key={index} className={selected === `${event.id}:intervention:${index}` ? s.active : ''} aria-pressed={selected === `${event.id}:intervention:${index}`} onClick={() => selectNode(`${event.id}:intervention:${index}`)}><small>게임 창작 · {sideLabels[item.side]}</small><span>{item.role}</span></button>)}</nav></>}
      </aside>
      <section className={s.graphPanel} aria-label={view === 'overview' ? '사건 간 연결 플로우차트' : `${event.title} 내부 플로우차트`}>
        <div className={s.graphHeading}><div><h2>{view === 'overview' ? '사건 간 연결' : event.title}</h2><p>{compact ? '드래그로 이동 · 목록에서 단계와 후보 바로가기' : view === 'overview' ? '노드 선택으로 상세 보기 · 두 번 누르면 내부 전개' : '노드를 선택하면 상세 기록을 확인할 수 있습니다.'}</p></div><span className={s.badge}>{view === 'overview' ? `연결 후보 ${chapter.links.length}개` : categoryLabel(event)}</span></div>
        <div className={s.canvas}><ReactFlow<CardNode> colorMode="dark" key={graphKey} nodes={graph.nodes} edges={graph.edges} nodeTypes={nodeTypes} nodesDraggable={false} nodesConnectable={false} edgesReconnectable={false} elementsSelectable deleteKeyCode={null} minZoom={.15} maxZoom={1.5} fitView fitViewOptions={{ padding: .15, minZoom: compact ? .6 : .15, maxZoom: 1, nodes: compact ? graph.nodes.slice(0, 2) : undefined }} onNodeClick={(_, node) => setSelected(node.id)} onNodeDoubleClick={(_, node) => { if (view === 'overview') openEvent(node.id); }} onPaneClick={() => setSelected(undefined)} aria-label="수집 자료 플로우차트"><Background gap={24} color="var(--grid-dot)"/><Controls showInteractive={false} fitViewOptions={{ padding: .15, minZoom: .15, maxZoom: 1 }}/></ReactFlow></div>
        <div className={s.legend}><span><i className={s.historyDot}/>역사 계열</span><span><i className={s.novelDot}/>연의</span><span><i className={s.interventionDot}/>게임 창작 후보</span><span>실선: 전개 순서 · 점선: 검토할 연결</span></div>
      </section>
      <aside className={s.inspector} aria-label="선택 항목 상세">
        {!selectedEvent ? <><p className={s.eyebrow}>5.1 수집 개요</p><h2>황건적의 난</h2><p>서사 순서와 후속 전개가 확인되는 사건만 연결했습니다. 완성은 별도 전장으로 표시합니다.</p><h3>상위 경과</h3><ol>{chapter.eventGroups[0].timelineObservations.map(item => <li key={item.referenceEntryId}><strong>{item.title}</strong><p>{item.summary}</p></li>)}</ol><h3>남겨 둔 확인 사항</h3>{chapter.openIssues.map(issue => <p className={s.issue} key={issue.id}>{issue.detail}</p>)}</> : <>
          <p className={s.eyebrow}>{categoryLabel(selectedEvent)} · 184년 · {selectedEvent.historicalDate.reportedTiming === '미확인' ? '월 미상' : selectedEvent.historicalDate.reportedTiming}</p><h2>{selectedEvent.title}</h2>
          {view === 'overview' && <button className={s.primary} onClick={() => openEvent(selectedEvent.id)}>이 전투의 내부 전개 보기 →</button>}
          {stage ? <section className={s.focus} aria-live="polite"><span>전개 {stage.order}</span><h3>{stage.title}</h3><p>{stage.action}</p><dl><dt>장소</dt><dd>{stage.reportedPlace}</dd><dt>선행 상황</dt><dd>{stage.reportedPrerequisite}</dd><dt>행위자</dt><dd>{[...stage.actorIds.map(id => collectionPeople.get(id)?.name ?? id), ...stage.unresolvedActorLabels].join(' · ')}</dd></dl></section> : intervention ? <section className={`${s.focus} ${s.draft}`} aria-live="polite"><span>게임 창작 · 개입 후보</span><h3>{intervention.action}</h3><p>{sideLabels[intervention.side]} · {intervention.role}</p><h4>판정에 고려할 요소</h4><p>{intervention.checks.join(' · ')}</p><h4>달라질 수 있는 결과</h4><ul>{intervention.possibleEffects.map(item => <li key={item}>{item}</li>)}</ul><p>능력 임계값·승률·실행 효과는 아직 정하지 않았습니다.</p></section> : <section className={s.focus}><h3>{selected?.endsWith(':outcome') ? '원페이지의 전투 결과' : '전투 개요'}</h3>{selected?.endsWith(':outcome') ? <ul>{selectedEvent.reportedOutcomes.map(item => <li key={item}>{item}</li>)}</ul> : <p>{selectedEvent.overview}</p>}</section>}
          <details open><summary>원페이지 결과</summary><ul>{selectedEvent.reportedOutcomes.map(item => <li key={item}>{item}</li>)}</ul></details>
          <details open><summary>참여 인물과 장수 ID</summary><ul className={s.people}>{selectedEvent.participants.map(actor => { const person = collectionPeople.get(actor.personId)!; return <li key={`${actor.personId}-${actor.role}`}><strong>{person.name}</strong><span>{actor.role}</span><small>{person.officerId ?? '장수 자료 미연결'}{person.linkStatus === 'user-confirmed' ? ' · 사용자 확정' : ''}</small></li>; })}</ul></details>
          <details><summary>장소·시기</summary>{selectedEvent.placeIds.map(id => <p key={id}>{collectionPlaces.get(id)?.reportedLocations.join(' · ')}</p>)}<p>{selectedEvent.historicalDate.dateNote}</p></details>
          <details open><summary>출처·사서 기록</summary>{selectedEvent.sourceRecordIds.map(id => { const source = collectionSources.get(id)!; return <section key={id}><h4>{source.work}</h4><small>2차 자료에서 수집 · 원전 직접 대조 전</small><p>{source.secondarySummary}</p><p className={s.muted}>사서 기록 미확인 · {source.note}</p></section>; })}</details>
          <details><summary>원페이지 이견·재확인 메모</summary>{selectedEvent.sourceObservations.map(item => <p key={item}>{item}</p>)}{Object.values(selectedEvent.extractionNotes ?? {}).filter((value): value is string => typeof value === 'string').map((item, index) => <p key={index}>{item}</p>)}{chapter.openIssues.filter(issue => issue.eventIds.includes(selectedEvent.id)).map(issue => <p className={s.issue} key={issue.id}>{issue.detail}</p>)}</details>
        </>}
      </aside>
    </div>
  </main>;
}
