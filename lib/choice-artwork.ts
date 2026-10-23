import type { GameEvent } from './event-engine';
import { choiceArt } from './choice-art';
// Every option keeps its illustration, including a shared scene when appropriate.
export function popupArtwork(event: GameEvent) {
  return event.choices.map(choiceArt);
}
