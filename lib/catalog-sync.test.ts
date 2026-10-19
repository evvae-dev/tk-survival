import { describe, expect, it, vi } from 'vitest';
import { synchronizeCatalog } from './catalog-sync';
import { historicalEvents } from './history';

function setup() {
  return {
    fingerprint: vi.fn(async () => 'unchanged'),
    marker: () => ({ revision: 'old', hash: 'unchanged' }),
    hasEdits: () => false,
    fetch: vi.fn(async () => ({ revision: 'new', events: historicalEvents })),
    active: () => true,
    apply: vi.fn(),
    remember: vi.fn(async (_revision: string | null) => {}),
  };
}

describe('공유 사건 자동 반영', () => {
  it('편집하지 않은 구버전 공유 목록을 최신 목록으로 교체한다', async () => {
    const deps = setup();
    expect(await synchronizeCatalog(deps)).toMatchObject({ kind: 'applied', count: historicalEvents.length });
    expect(deps.apply).toHaveBeenCalledWith(historicalEvents);
    expect(deps.remember).toHaveBeenCalledWith('new');
  });
  it('미게시 로컬 편집본은 보존하고 최신본 적용을 안내한다', async () => {
    const deps = setup();
    deps.fingerprint.mockResolvedValue('local-edit');
    expect(await synchronizeCatalog(deps)).toEqual({ kind: 'local', updated: true });
    expect(deps.apply).not.toHaveBeenCalled();
    expect(deps.remember).not.toHaveBeenCalled();
  });
  it('공유본을 읽는 동안 새로 생긴 편집도 덮어쓰지 않는다', async () => {
    const deps = setup();
    deps.fingerprint.mockResolvedValueOnce('unchanged').mockResolvedValueOnce('edit-during-fetch');
    expect(await synchronizeCatalog(deps)).toEqual({ kind: 'local', updated: true });
    expect(deps.apply).not.toHaveBeenCalled();
  });
  it('더 최신 요청이 시작되면 늦게 도착한 이전 응답을 무시한다', async () => {
    const deps = setup();
    deps.active = () => false;
    expect(await synchronizeCatalog(deps)).toEqual({ kind: 'stale', updated: false });
    expect(deps.apply).not.toHaveBeenCalled();
  });
  it('이미 같은 공유본을 바탕으로 편집 중이면 새 게시 안내를 띄우지 않는다', async () => {
    const deps = setup();
    deps.fingerprint.mockResolvedValue('local-edit');
    deps.fetch.mockResolvedValue({ revision: 'old', events: historicalEvents });
    expect(await synchronizeCatalog(deps)).toEqual({ kind: 'local', updated: false });
  });
});
