'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Game } from '@/lib/game';
import type { GameEvent } from '@/lib/event-engine';
import { playbackDelay, playbackKey, type PlaybackSpeed } from '@/lib/record-playback';

export function useRecordPlayback(game: Game, event: GameEvent | null, advance: (key: string) => void, paused: boolean) {
  const key = playbackKey(game);
  const [automatic, setAutomatic] = useState(true);
  const [speed, setSpeed] = useState<PlaybackSpeed>(1);
  const [revealedKey, setRevealedKey] = useState<string | null>(() => event?.automatic ? null : key);
  const waiting = !!event?.automatic || revealedKey !== key;
  const steppedKey = useRef<string | null>(null);

  const step = useCallback(() => {
    if (!waiting || paused || steppedKey.current === key) return;
    steppedKey.current = key;
    if (event?.automatic) advance(key);
    else setRevealedKey(key);
  }, [waiting, paused, key, event?.automatic, advance]);

  useEffect(() => {
    if (!automatic || !waiting || paused) return;
    const timer = setTimeout(step, Math.max(playbackDelay(speed), ((game.world.log.at(-1)?.detail.length ?? 0) * 22 + 900) * speed));
    return () => clearTimeout(timer);
  }, [automatic, waiting, paused, speed, step, game.world.log]);

  useEffect(() => {
    if (!waiting || paused) return;
    const interactive = 'button, a, input, select, textarea, summary, dialog, [role="button"], [role="tooltip"], [data-officer-name], [contenteditable="true"]';
    const click = (event: MouseEvent) => {
      if (event.button !== 0 || event.defaultPrevented || window.getSelection()?.toString()) return;
      if (event.target instanceof Element && event.target.closest(interactive)) return;
      step();
    };
    const keydown = (event: KeyboardEvent) => {
      if (event.repeat || event.defaultPrevented || ![' ', 'Enter'].includes(event.key)) return;
      if (event.target instanceof Element && event.target.closest(interactive)) return;
      event.preventDefault();
      step();
    };
    document.addEventListener('click', click);
    document.addEventListener('keydown', keydown);
    return () => {
      document.removeEventListener('click', click);
      document.removeEventListener('keydown', keydown);
    };
  }, [waiting, paused, step]);

  return { automatic, speed, waiting, panelVisible: !event?.automatic && !waiting, setSpeed, toggleAutomatic: () => setAutomatic(value => !value), step };
}
