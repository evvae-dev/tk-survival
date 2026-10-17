'use client';
import { useEffect, useMemo, useState } from 'react';
import { useGameStore } from '@/stores/game-store';
import { getEffectiveCatalog, useEventCatalogStore } from '@/stores/event-catalog-store';
import { getCurrentEvent } from '@/lib/event-engine';

export function useGameSession() {
  const store = useGameStore();
  const catalogStore = useEventCatalogStore();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    Promise.resolve(useGameStore.persist.rehydrate()).then(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);
  const catalog = useMemo(() => getEffectiveCatalog(), [catalogStore.overrides, catalogStore.deletedIds]);
  const event = useMemo(() => store.game ? getCurrentEvent(store.game, catalog, true) : null, [store.game, catalog]);
  return { ...store, ready, event, view: event?.automatic ? store.game : event?.state ?? store.game };
}
