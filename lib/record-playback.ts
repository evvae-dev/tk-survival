import type { Game } from './game';

export const playbackSpeeds = [0.5, 1, 1.5, 2] as const;
export type PlaybackSpeed = typeof playbackSpeeds[number];
export const RESULT_DURATION_MS = 5000;
export const playbackDelay = (speed: PlaybackSpeed) => 5000 * speed;
export function playbackKey(game: Game): string {
  return JSON.stringify([game.turn, game.world.log.length, game.world.appliedEventIds.length, game.flowProgress?.eventId, game.flowProgress?.nodeId, game.completed]);
}
