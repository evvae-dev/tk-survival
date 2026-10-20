import legacyV2 from '@/data/history/legacy-campaign-v2.json';
import { historicalEvents } from './history';
import type { Game, HistoricalEvent, RecordEntry, World } from './game';

export function visibleHistoryRecords(world: World): RecordEntry[] {
  const archived = world.historyLog ?? [];
  const ids = new Set(archived.map(entry => entry.eventId));
  const pending = new Map<string, RecordEntry>();
  world.log.forEach((entry, index) => {
    if (entry.kind !== 'history' || entry.eventId && ids.has(entry.eventId)) return;
    const key = entry.eventId ?? `legacy-${index}`;
    const earlier = pending.get(key);
    pending.set(key, earlier ? { ...earlier, detail: `${earlier.detail}\n${entry.detail}` } : entry);
  });
  return [...archived, ...pending.values()];
}

export function eventHistoryRecord(game: Game, event: HistoricalEvent): RecordEntry | undefined {
  const records = game.world.log.filter(entry => entry.eventId === event.id || !entry.eventId && (entry.title === event.title || entry.title.startsWith(`${event.title} · `)));
  if (!records.length) return;
  return { eventId: event.id, year: records[0].year, month: event.month, title: event.title, detail: records.map(entry => entry.detail).join('\n'), kind: 'history' };
}

export function restoreHistoryRecords(game: Game, catalog: HistoricalEvent[]): RecordEntry[] {
  if (game.world.historyLog) return game.world.historyLog;
  // Recover actual old logs, never invent a historical default for missing records.
  return game.world.appliedEventIds.flatMap(id => {
    const event = catalog.find(e => e.id === id);
    const record = event && eventHistoryRecord(game, event);
    return record ? [record] : [];
  });
}

// Presentation compatibility only. Saved choices, effects and cursors are untouched.
export function projectRecord(entry: RecordEntry): RecordEntry | undefined {
 if (!entry.eventId) {
  return entry.kind === 'action' && entry.title === `${entry.year}년, 이어지는 발걸음` && entry.detail === '함께 지내기로 한 사람들과 길을 이어 갔다. 새해에도 내 선택과 인연은 그대로 남아 있다.' ? undefined : entry;
 }
 const event = (legacyV2 as HistoricalEvent[]).find(event=>event.id===entry.eventId);
 if (!event?.flow) return entry;
 const remote = event.flow.nodes.find(node=>node.id==='remote-news');
 if (event.id.startsWith('event-') && entry.recordId === `${event.id}:remote-news` && entry.recordType === 'news' && entry.detail === remote?.data.text) return undefined;
 const knownHeaders = event.flow.nodes.flatMap(node=>node.data.check ? [`성공 · ${node.data.check.success}`,`실패 · ${node.data.check.failure}`] : []);
 const lines = entry.detail.split('\n');
 const body = knownHeaders.includes(lines[0]) ? lines.slice(1).join('\n') : entry.detail;
 if (event.id.endsWith('-service')) {
  const fillers = event.flow.nodes.filter(node=>node.type==='result' && /^(stay-|duty-|people-)/.test(node.id));
  if (fillers.some(node => body === node.data.text && (!entry.recordId || entry.recordId === `${event.id}:${node.id}` || entry.recordId.includes(':stay') || entry.recordId.includes(':roster') || entry.recordId.includes(':people') || entry.recordId.includes(':wait')))) return undefined;
 }
 for (const node of event.flow.nodes) {
  if (node.type !== 'result' || !node.data.recordType || entry.detail !== node.data.text) continue;
  if (entry.recordId && entry.recordId !== `${event.id}:${node.id}`) continue;
  const current = historicalEvents.find(current=>current.id===event.id)?.flow?.nodes.find(current=>current.id===node.id);
  if (current?.type === 'result' && current.data.recordType && !current.data.silent) return {...entry,detail:current.data.text ?? current.data.label,recordType:current.data.recordType};
 }
 return entry;
}
export function unifiedRecords(world: World): RecordEntry[] {
 const ids = new Set(world.log.flatMap(entry => entry.eventId ? [entry.eventId] : []));
 const seen = new Set<string>();
 const recovered = (world.historyLog ?? []).filter(entry => !(entry.eventId && ids.has(entry.eventId)) && !world.log.some(log => log.title === entry.title || log.title.startsWith(`${entry.title} · `)));
 return [...recovered, ...world.log].flatMap(entry => {
  if (entry.recordId && seen.has(entry.recordId)) return [];
  if (entry.recordId) seen.add(entry.recordId);
  const projected = projectRecord(entry);
  return projected ? [projected] : [];
 });
}
