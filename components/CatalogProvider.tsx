'use client';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { firebaseConfigured } from '@/lib/firebase-client';
import { fetchPublishedCatalog, publishCatalog, watchCatalogRevision } from '@/lib/cloud-catalog';
import { getEffectiveCatalog, getCatalogForSync, useEventCatalogStore } from '@/stores/event-catalog-store';
import { synchronizeCatalog } from '@/lib/catalog-sync';
import s from './CatalogProvider.module.css';

type CloudState = { message: string; busy: boolean; pull: () => Promise<void>; publish: () => Promise<void> };
const CloudContext = createContext<CloudState | null>(null);
const markerKey = 'tk-survival-catalog-sync-participation-v2';
async function fingerprint() {
  const bytes = new TextEncoder().encode(JSON.stringify(getCatalogForSync()));
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), byte => byte.toString(16).padStart(2, '0')).join('');
}
function marker(): { revision: string | null; hash: string } | null {
  try { return JSON.parse(localStorage.getItem(markerKey) ?? 'null'); } catch { return null; }
}
async function remember(revision: string | null, active = () => true) {
  const hash = await fingerprint();
  if (active()) localStorage.setItem(markerKey, JSON.stringify({ revision, hash }));
}
export function useCatalogCloud() { const state = useContext(CloudContext); if (!state) throw new Error('사건 저장소가 준비되지 않았습니다.'); return state; }
export default function CatalogProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [updateBlocked, setUpdateBlocked] = useState(false);
  const syncVersion = useRef(0);
  const [message, setMessage] = useState(firebaseConfigured ? '공유 사건을 확인하고 있습니다.' : 'Firebase 미설정 · 브라우저에 저장합니다.');
  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;
    const storage = async (event: StorageEvent) => {
      if (event.storageArea !== localStorage || event.key !== useEventCatalogStore.persist.getOptions().name) return;
      // Cancel an older cloud fetch before loading the latest saved edits from another tab.
      ++syncVersion.current;
      await useEventCatalogStore.persist.rehydrate();
      if (active) setMessage('다른 탭에서 저장한 사건을 반영했습니다. 게임 진행은 유지됩니다.');
    };
    window.addEventListener('storage', storage);
    async function sync() {
      const version = ++syncVersion.current;
      const current = () => active && version === syncVersion.current;
      try {
        const result = await synchronizeCatalog({
          fingerprint, marker, active: current, fetch: fetchPublishedCatalog,
          hasEdits: () => {
            const local = useEventCatalogStore.getState();
            return Object.keys(local.overrides).length > 0 || local.deletedIds.length > 0;
          },
          apply: events => useEventCatalogStore.getState().importCatalog(events),
          remember: revision => remember(revision, current),
        });
        if (!current() || result.kind === 'stale') return;
        setUpdateBlocked(result.updated);
        setMessage(result.kind === 'local' ? '브라우저에 미게시 편집본이 있어 유지했습니다. 공유본을 불러오거나 게시하세요.' : result.kind === 'applied' ? `공유 사건 ${result.count}개를 최신 상태로 반영했습니다.` : '아직 게시된 공유 사건이 없습니다.');
      } catch (error) {
        if (current()) setMessage(`공유 불러오기 실패 · 로컬 목록 사용: ${error instanceof Error ? error.message : String(error)}`);
      } finally { if (current()) setReady(true); }
    }
    async function bootstrap() {
      try {
        await useEventCatalogStore.persist.rehydrate();
        if (!active) return;
        if (!firebaseConfigured) { setReady(true); return; }
        await sync();
        if (!active) return;
        unsubscribe = watchCatalogRevision(revision => {
          if (revision !== marker()?.revision) void sync();
        }, error => { if (active) setMessage(`공유 상태 확인 실패: ${error.message}`); });
      } catch (error) { if (active) setMessage(`공유 불러오기 실패 · 로컬 목록 사용: ${error instanceof Error ? error.message : String(error)}`); }
      finally { if (active) setReady(true); }
    }
    void bootstrap();
    return () => { active = false; unsubscribe?.(); window.removeEventListener('storage', storage); };
  }, []);
  async function action(task: () => Promise<void>) {
    setBusy(true);
    try { await task(); } catch (error) { setMessage(error instanceof Error ? error.message : String(error)); }
    finally { setBusy(false); }
  }
  const pull = () => action(async () => {
    ++syncVersion.current;
    const shared = await fetchPublishedCatalog();
    if (!shared.events) { setMessage('아직 게시된 공유 사건이 없습니다.'); return; }
    useEventCatalogStore.getState().importCatalog(shared.events);
    await remember(shared.revision);
    setUpdateBlocked(false);
    setMessage(`공유 사건 ${shared.events.length}개를 불러왔습니다. 열린 사건을 목록에서 다시 선택하세요.`);
  });
  const publish = () => action(async () => {
    const events = getEffectiveCatalog();
    const revision = await publishCatalog(events, marker()?.revision ?? null);
    await remember(revision);
    ++syncVersion.current;
    setUpdateBlocked(false);
    setMessage(`사건 ${events.length}개를 공유 게시했습니다. 다른 브라우저는 새로 접속하면 반영됩니다.`);
  });
  if (!ready) return <p role="status" style={{ padding: 32 }}>사건 기록을 준비하고 있습니다…</p>;
  return <CloudContext.Provider value={{ message, busy, pull, publish }}>{children}{updateBlocked && <aside className={s.notice} role="status"><strong>새로운 사건 문구가 있습니다.</strong><p>이 브라우저의 사건 편집본을 유지하고 있습니다. 최신 공유본을 적용해도 게임 진행은 유지됩니다.</p><button disabled={busy} onClick={() => { if (window.confirm('이 브라우저의 사건 편집본을 최신 공유본으로 교체할까요? 게임 진행은 유지됩니다.')) void pull(); }}>최신 사건 적용</button></aside>}</CloudContext.Provider>;
}
