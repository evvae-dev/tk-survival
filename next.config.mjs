import { readCacheConfig } from './lib/cache-config.mjs';
import { readAbilityCheckWeight } from './lib/ability-check-config.mjs';

const cache = readCacheConfig(process.env);

export default {
  env: { NEXT_PUBLIC_CACHE_ENABLED: String(cache.enabled), NEXT_PUBLIC_ABILITY_CHECK_WEIGHT: String(readAbilityCheckWeight(process.env)) },
  generateEtags: cache.enabled,
  images: { unoptimized: !cache.enabled, minimumCacheTTL: cache.seconds },
  async headers() {
    const value = cache.enabled
      ? `private, max-age=${cache.seconds}, must-revalidate`
      : 'no-store, no-cache, max-age=0, must-revalidate';
    return [{ source: '/:path*', headers: [{ key: 'Cache-Control', value }] }];
  },
};
