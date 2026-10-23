'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Game } from '@/lib/game';
import type { GameEvent } from '@/lib/event-engine';
import { playbackDelay, playbackKey, type PlaybackSpeed } from '@/lib/record-playback';

export function useRecordPlayback(game: Game, event: GameEvent | null, advance: (key: string) => void, paused: boolean, finishResult: (recordId: string) => void) {
  const key = playbackKey(game);
  const [automatic, setAutomatic] = useState(true);
  const [speed, setSpeed] = useState<PlaybackSpeed>(1);
  const [revealedKey, setRevealedKey] = useState<string | null>(() => event?.automatic ? null : key);
  const waiting = !!event?.automatic || revealedKey !== key;
  const steppedKey = useRef<string | null>(null);
  const pending = game.pendingResult;
  const result = pending && pending.expiresAt > Date.now() ? game.decisions.find(entry => entry.recordId === pending.recordId) : undefined;
  useEffect(() => {
    if (!pending) return;
    const timer = setTimeout(() => finishResult(pending.recordId), Math.max(0, pending.expiresAt - Date.now()));
    return () => clearTimeout(timer);
  }, [pending?.recordId, pending?.expiresAt, finishResult]);

  const step = useCallback(() => {
    if (result || !waiting || steppedKey.current === key) return;
    steppedKey.current = key;
    if (event?.automatic) { setRevealedKey(playbackKey(event.state)); advance(key); }
    else setRevealedKey(key);
  }, [waiting, key, event?.automatic, event?.state, advance, result]);

  useEffect(() => {
    if (result || !automatic || !waiting || paused) return;
    const timer = setTimeout(step, playbackDelay(speed));
    return () => clearTimeout(timer);
  }, [automatic, waiting, paused, speed, step, result]);

  useEffect(() => {
    if (result || !waiting || paused) return;
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
  }, [waiting, paused, step, result]);

  return { automatic, speed, waiting, result, panelVisible: !result && !event?.automatic && !waiting, setSpeed, toggleAutomatic: () => setAutomatic(value => !value), step };
}
