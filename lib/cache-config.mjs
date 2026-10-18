export function readCacheConfig(env) {
  const enabled = env.CACHE_ENABLED === 'true';
  const seconds = Number(env.CACHE_TTL_SECONDS ?? 3600);
  if (env.CACHE_ENABLED && !['true', 'false'].includes(env.CACHE_ENABLED)) {
    throw new Error('CACHE_ENABLED는 true 또는 false여야 합니다.');
  }
  if (!Number.isSafeInteger(seconds) || seconds < 0 || seconds > 2147483647) {
    throw new Error('CACHE_TTL_SECONDS는 0~2147483647 사이의 정수여야 합니다.');
  }
  return { enabled, seconds: enabled ? seconds : 0 };
}
