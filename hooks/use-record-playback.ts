'use client';
import { useEffect, useState } from 'react';
import type { Game } from '@/lib/game';
import type { GameEvent } from '@/lib/event-engine';
import { playbackDelay, playbackKey, type PlaybackSpeed } from '@/lib/record-playback';

export function useRecordPlayback(game: Game, event: GameEvent | null, advance: (key: string) => void, paused: boolean) {
  const key = playbackKey(game);
  const [automatic, setAutomatic] = useState(true);
  const [speed, setSpeed] = useState<PlaybackSpeed>(1);
  const [revealedKey, setRevealedKey] = useState<string | null>(() => event?.automatic ? null : key);
  const waiting = !!event?.automatic || revealedKey !== key;

  useEffect(() => {
    if (!automatic || !waiting || paused) return;
    const timer = setTimeout(() => {
      if (event?.automatic) advance(key);
      else setRevealedKey(key);
    }, playbackDelay(speed));
    return () => clearTimeout(timer);
  }, [automatic, waiting, paused, speed, key, event?.automatic, advance]);

  function step() {
    setAutomatic(false);
    if (event?.automatic) advance(key);
    else setRevealedKey(key);
  }
  return { automatic, speed, waiting, panelVisible: !event?.automatic && !waiting, setSpeed, toggleAutomatic: () => setAutomatic(value => !value), step };
}
