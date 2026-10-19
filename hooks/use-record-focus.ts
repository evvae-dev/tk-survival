'use client';
import { useEffect, useRef, useState } from 'react';
import type { RecordEntry } from '@/lib/game';
import { recordReadDuration, recordUpdates, recordStreamKey, type RecordFocusItem } from '@/lib/record-focus';

// Independent of auto-advance: manual playback must also return to the personal record.
export function useRecordFocus(personal: RecordEntry[], history: RecordEntry[], speed: number, paused: boolean) {
  const previous = useRef({ personal: personal.length, history: history.length, personalKey: recordStreamKey(personal), historyKey: recordStreamKey(history) });
  const [queue, setQueue] = useState<RecordFocusItem[]>([]);
  useEffect(() => {
    const updates = recordUpdates(previous.current, personal, history);
    previous.current = { personal: personal.length, history: history.length, personalKey: recordStreamKey(personal), historyKey: recordStreamKey(history) };
    if (updates.length) setQueue(current => [...current, ...updates]);
  }, [personal, history]);
  const active = queue[0];
  useEffect(() => {
    if (!active || paused) return;
    const timer = setTimeout(() => setQueue(current => current.slice(1)), recordReadDuration(active.text, speed));
    return () => clearTimeout(timer);
  }, [active, speed, paused]);
  return { panel: active?.panel ?? 'personal', reading: !!active };
}
