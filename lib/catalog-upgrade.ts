import type { HistoricalEvent } from './game';
import { supportedChapter } from './chapter';
// A new edition never revives retired story definitions. Current edits stay intact.
export function upgradeLegacyEvent(event: HistoricalEvent): HistoricalEvent { return event; }
export function upgradeLegacyCatalog(events: HistoricalEvent[], deletedIds: string[] = []): HistoricalEvent[] {
 return events.filter(event => supportedChapter(event.chapterId) && !deletedIds.includes(event.id));
}
