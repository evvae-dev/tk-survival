import type { GameEvent } from './event-engine';
import { choiceArt } from './choice-art';
import { sceneArt } from './scene-art';

// A popup with repeated artwork is text-only. Do not repeat the current scene
// or the same illustration beside multiple alternatives.
export function popupArtwork(event: GameEvent) {
  const images = event.choices.map(choiceArt);
  const paths = images.flatMap(image => image ? [image.src] : []);
  const current = sceneArt(event)?.src;
  const repeated = new Set(paths).size !== paths.length || paths.some(path => path === current);
  return repeated ? images.map(() => null) : images;
}
