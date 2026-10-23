export type Artwork = { src: string; alt: string };

export function validArtwork(value: unknown): value is Artwork {
  if (!value || typeof value !== 'object') return false;
  const artwork = value as Artwork;
  return typeof artwork.src === 'string'
    && /^\/art\/(?:choices|scenes)\/[a-zA-Z0-9_-]+\.(?:png|jpe?g|webp|avif)$/.test(artwork.src)
    && typeof artwork.alt === 'string' && artwork.alt.trim().length > 0;
}
