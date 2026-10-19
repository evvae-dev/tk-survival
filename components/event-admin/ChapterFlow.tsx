'use client';
import Link from '@/components/HostedLink';
import { useEffect, useMemo, useState } from 'react';
import { ReactFlow, Background, Controls, Handle, Position, MarkerType, useReactFlow, type Node, type NodeProps, type Edge } from '@xyflow/react';
import { getEffectiveCatalog, useEventCatalogStore } from '@/stores/event-catalog-store';
import { statLabels, regionLabels, factionLabels } from '@/lib/game';
import type { FlowEffect } from '@/lib/event-flow-types';
import s from '@/app/admin/collection/page.module.css';

type CardNode = Node<{ title: string; text: string; kind: string }, 'card'>;
const nodeNames = { start: '시작', condition: '조건 판정', check: '능력 확률 판정', choice: '플레이어 선택', result: '결과 적용', end: '종료' };
function Card({ data, selected }: NodeProps<CardNode>) {
  return <div className={`${s.node} ${s.executionCard} ${selected ? s.selected : ''}`}><Handle type="target" position={Position.Top}/><small>{data.kind}</small><strong>{data.title}</strong><span>{data.text}</span><Handle type="source" position={Position.Bottom}/></div>;
}
const nodeTypes = { card: Card };
const effectText = (effect: FlowEffect) => {
  switch (effect.type) {
    case 'stat': return `${statLabels[effect.key]} ${effect.value > 0 ? '+' : ''}${effect.value}`;
    case 'person': return `${effect.personId}: ${effect.value === 'dead' ? '사망' : '생존 (부활 불가)'}`;
    case 'flag': return `표식 ${effect.key} = ${effect.value}`;
    case 'control': return `${regionLabels[effect.regionId] ?? effect.regionId}: ${effect.value ? factionLabels[effect.value] ?? effect.value : '지배 없음'}`;
    default: return `${effect.type}: ${effect.value ?? '없음'}`;
  }
};
export default function ChapterFlow() {
  const catalogState = useEventCatalogStore();
  const [ready, setReady] = useState(false);
  const [eventId, setEventId] = useState<string>();
  const [selected, setSelected] = useState<string>();
  useEffect(() => { Promise.resolve(useEventCatalogStore.persist.rehydrate()).then(() => setReady(true)); }, []);
  const rf = useReactFlow();
  const catalog = useMemo(() => getEffectiveCatalog(), [catalogState.overrides, catalogState.deletedIds]);
  const event = catalog.find(e => e.id === eventId);
  const selectedEvent = event ?? catalog.find(e => e.id === selected);
  const node = event?.flow?.nodes.find(n => n.id === selected);
  const positions: Record<string, { x: number; y: number }> = {
    'chapter-5-1-opening': { x: 420, y: 0 }, 'battle-184-daxingshan': { x: 0, y: 240 },
    'battle-184-qingzhou-city': { x: 0, y: 490 }, 'battle-184-wan': { x: 420, y: 365 },
    'battle-184-guangzong': { x: 840, y: 240 }, 'battle-184-xiaquyang': { x: 840, y: 490 },
    'chapter-5-1-closing': { x: 420, y: 770 },
    'chapter-5-1-yellow-conquest': { x: 1260, y: 240 },
  };
  const nodes = useMemo<CardNode[]>(() => event ? (event.flow?.nodes ?? []).map(n => ({ id: n.id, type: 'card', position: n.position, data: { title: n.data.label, kind: nodeNames[n.type], text: n.type === 'check' ? `${n.data.check?.kind} · ${n.data.check?.opponentId ?? '상대 없음'}\n성공: ${n.data.check?.success}\n실패: ${n.data.check?.failure}` : n.type === 'condition' ? `${n.data.condition?.field} ${n.data.condition?.operator} ${JSON.stringify(n.data.condition?.value)}` : n.data.options?.map(o => o.title).join(' / ') ?? n.data.effects?.map(effectText).join(' · ') ?? '' } })) : catalog.map((e, i) => ({ id: e.id, type: 'card', position: positions[e.id] ?? { x: 1260, y: i * 300 }, data: { title: e.title, kind: e.category === 'novel' ? '연의 기반 · 실행 사건' : '역사 계열 · 실행 사건', text: e.id.startsWith('battle-') ? `${e.flow?.nodes.filter(n => n.type === 'choice').length ?? 0}개 선택 지점 · ${e.regionIds.map(id => regionLabels[id] ?? id).join(' · ')}` : e.summary } })), [event, catalog]);
  const edges = useMemo<Edge[]>(() => event ? (event.flow?.edges ?? []).map(e => {
    const source = event.flow!.nodes.find(n => n.id === e.source)!;
    return { id: e.id, source: e.source, target: e.target, type: 'smoothstep', label: source.type === 'condition' ? e.sourceHandle === 'yes' ? '예' : '아니오' : source.data.options?.find(o => o.id === e.sourceHandle)?.title, markerEnd: { type: MarkerType.ArrowClosed } };
  }) : catalog.flatMap(e => (e.connections ?? []).filter(c => catalog.some(item => item.id === c.targetId)).map(c => ({ id: `${e.id}-${c.targetId}`, source: e.id, target: c.targetId, type: 'smoothstep', label: c.label, markerEnd: { type: MarkerType.ArrowClosed }, labelStyle: { fontSize: 10 }, style: { stroke: '#b45309', strokeWidth: 2 } }))), [event, catalog]);
  useEffect(() => {
    if (!selected || !event) return;
    const frame = requestAnimationFrame(() => { void rf.fitView({ nodes: [{ id: selected }], padding: .25, maxZoom: 1, duration: 150 }); });
    return () => cancelAnimationFrame(frame);
  }, [selected, event, rf]);
  const open = (id?: string) => { setEventId(id); setSelected(undefined); };
  if (!ready) return <p>실행 사건을 불러오고 있습니다…</p>;
  return <main className={s.page}>
    <header className={s.header}><div><p>관리 작업실 / 실행 플로우</p><h1>5.1 황건적의 난</h1><span>게임과 같은 사건 목록·조건·효과를 표시합니다.</span></div><nav><Link href="/admin/events">사건 관리</Link><Link href="/">게임 테스트 ↗</Link></nav></header>
    <p className={s.notice}>184년·20세 고정 테스트. 수집된 5개 전투와 황건 천하통일 가상 원정을 진행합니다. 원정은 동탁군 → 유비군 → 조조군 격파 후 황제 생포·건국, 전투 패배 시 생포·처형으로 끝납니다.</p>
    <div className={s.toolbar}><button onClick={() => open()}>사건 간 연결 ({catalog.length}개)</button><button onClick={() => void rf.fitView({ padding: .15, minZoom: .08, maxZoom: 1 })}>전체 보기</button>{event && <Link href={`/admin/events?event=${encodeURIComponent(event.id)}`}>이 사건의 노드·조건·선택·결과 편집 →</Link>}</div>
    <div className={s.layout}>
      <aside className={s.list}><h2>실행 사건</h2><nav aria-label="실행 사건">{catalog.map(e => <button key={e.id} onClick={() => open(e.id)} className={eventId === e.id ? s.active : ''}><strong>{e.title}</strong></button>)}</nav>{event && <details className={s.nodeNavigation} open><summary>노드 바로가기 ({event.flow?.nodes.length})</summary><nav aria-label="실행 노드">{event.flow?.nodes.map(n => <button key={n.id} data-node-id={n.id} onClick={() => setSelected(n.id)}><small>{nodeNames[n.type]} · {n.id}</small><span>{n.data.label}</span></button>)}</nav></details>}</aside>
      <section className={s.graphPanel} aria-label={event ? `${event.title} 실행 분기` : '실행 사건 간 연결'}><div className={s.graphHeading}><h2>{event?.title ?? '사건 간 연결'}</h2><span className={s.badge}>{event ? `${nodes.length}개 노드` : '노드 두 번 클릭 → 내부 분기'}</span></div><div className={s.canvas}><ReactFlow<CardNode> colorMode="dark" key={eventId ?? 'overview'} nodes={nodes} edges={edges} nodeTypes={nodeTypes} nodesDraggable={false} nodesConnectable={false} deleteKeyCode={null} minZoom={.08} maxZoom={1.5} fitView fitViewOptions={{ minZoom: .08, padding: .15, nodes: event ? nodes.filter(n => n.position.y <= 680) : undefined }} onNodeClick={(_, n) => setSelected(n.id)} onNodeDoubleClick={(_, n) => { if (!event) open(n.id); }}><Background gap={24}/><Controls showInteractive={false}/></ReactFlow></div></section>
      <aside className={s.inspector} aria-label="실행 분기 상세"><h2>{node?.data.label ?? selectedEvent?.title ?? '노드를 선택하세요'}</h2>{node ? <><p>{nodeNames[node.type]}</p>{node.data.condition && <p>조건: {node.data.condition.field} {node.data.condition.operator} {JSON.stringify(node.data.condition.value)}</p>}{node.data.options?.map(o => <p key={o.id}><strong>{o.title}</strong><br/>{o.description}</p>)}{node.data.effects?.map((e, i) => <p key={i}>{effectText(e)}{e.when && <small> · 적용 조건: {JSON.stringify(e.when)}</small>}</p>)}</> : selectedEvent ? <><p>{selectedEvent.summary}</p><p>필요 사건: {(selectedEvent.prerequisiteEventIds ?? []).join(' · ') || '없음'}</p>{selectedEvent.connections?.map(c => <p key={c.targetId}>{c.label} → {c.targetId}</p>)}<button onClick={() => open(selectedEvent.id)}>내부 실행 분기 보기</button></> : <p>완성은 독립 전선입니다. 대흥산·광종의 승패와 장보의 생존은 후속 사건의 성립을 바꿉니다.</p>}{selectedEvent && <p><Link href={`/admin/events?event=${encodeURIComponent(selectedEvent.id)}`}>사건 관리에서 편집 →</Link></p>}</aside>
    </div>
  </main>;
}
