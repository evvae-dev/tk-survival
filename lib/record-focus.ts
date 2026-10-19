import type { RecordEntry } from './game';
export type RecordPanel = 'personal' | 'history';
export type RecordFocusItem = { panel: RecordPanel; text: string; key: string };
export const recordStreamKey = (entries: RecordEntry[]) => JSON.stringify([entries.length, entries.at(-1)?.eventId, entries.at(-1)?.title, entries.at(-1)?.detail]);
export function recordUpdates(previous: { personal: number; history: number; personalKey?: string; historyKey?: string }, personal: RecordEntry[], history: RecordEntry[]): RecordFocusItem[] {
  return [
    ...(personal.length && (personal.length > previous.personal || previous.personalKey !== undefined && previous.personalKey !== recordStreamKey(personal)) ? [{ panel: 'personal' as const, text: personal.at(-1)!.detail, key: recordStreamKey(personal) }] : []),
    ...(history.length && (history.length > previous.history || previous.historyKey !== undefined && previous.historyKey !== recordStreamKey(history)) ? [{ panel: 'history' as const, text: history.at(-1)!.detail, key: recordStreamKey(history) }] : []),
  ];
}
export const recordReadDuration = (text: string, speed: number) => Math.max(1800, text.length * 22 * speed + 900);
