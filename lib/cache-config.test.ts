import { describe, expect, it } from 'vitest';
import { readCacheConfig } from './cache-config.mjs';

describe('캐시 환경 설정', () => {
  it('설정이 없거나 꺼져 있으면 캐시를 사용하지 않는다', () => {
    expect(readCacheConfig({})).toEqual({ enabled: false, seconds: 0 });
    expect(readCacheConfig({ CACHE_ENABLED: 'false', CACHE_TTL_SECONDS: '600' })).toEqual({ enabled: false, seconds: 0 });
  });
  it('켜면 초 단위 시간을 적용한다', () => {
    expect(readCacheConfig({ CACHE_ENABLED: 'true', CACHE_TTL_SECONDS: '600' })).toEqual({ enabled: true, seconds: 600 });
    expect(readCacheConfig({ CACHE_ENABLED: 'true' }).seconds).toBe(3600);
  });
  it('잘못된 사용 여부와 시간을 거부한다', () => {
    expect(() => readCacheConfig({ CACHE_ENABLED: 'yes' })).toThrow();
    for (const value of ['-1', '0.5', 'abc', '2147483648']) {
      expect(() => readCacheConfig({ CACHE_TTL_SECONDS: value })).toThrow();
    }
  });
});
