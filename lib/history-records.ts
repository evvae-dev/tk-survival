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
