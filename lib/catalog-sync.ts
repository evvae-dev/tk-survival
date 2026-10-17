import type { HistoricalEvent } from './game';
import type { PublishedCatalog } from './cloud-catalog';

export type CatalogMarker = { revision: string | null; hash: string };
type SyncDependencies = {
  fingerprint: () => Promise<string>;
  marker: () => CatalogMarker | null;
  hasEdits: () => boolean;
  fetch: () => Promise<PublishedCatalog>;
  active: () => boolean;
  apply: (events: HistoricalEvent[]) => void;
  remember: (revision: string | null) => Promise<void>;
};

export async function synchronizeCatalog(deps: SyncDependencies) {
  const previous = deps.marker();
  const before = await deps.fingerprint();
  const dirty = previous ? previous.hash !== before : deps.hasEdits();
  const shared = await deps.fetch();
  if (!deps.active()) return { kind: 'stale' as const, updated: false };
  const current = await deps.fingerprint();
  if (!deps.active()) return { kind: 'stale' as const, updated: false };
  if (dirty || current !== before) {
    return { kind: 'local' as const, updated: !!shared.events && shared.revision !== previous?.revision };
  }
  if (shared.events) deps.apply(shared.events);
  await deps.remember(shared.revision);
  return { kind: shared.events ? 'applied' as const : 'empty' as const, updated: false, count: shared.events?.length ?? 0 };
}
