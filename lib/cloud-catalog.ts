import { supportedChapter } from './chapter';
import { collection, doc, getDoc, getDocs, getDocFromServer, getDocsFromServer, onSnapshot, runTransaction, serverTimestamp, writeBatch } from 'firebase/firestore';
import type { HistoricalEvent } from './game';
import { validateEvent, validateDependencies } from './event-flow';
import { firebaseClient } from './firebase-client';

export type PublishedCatalog = { revision: string | null; events: HistoricalEvent[] | null };
const catalogPath = 'eventCatalog/current';
export function watchCatalogRevision(onChange: (revision: string | null) => void, onError: (error: Error) => void) {
  return onSnapshot(doc(firebaseClient().db, catalogPath), snapshot => {
    onChange(snapshot.exists() ? snapshot.data().revision ?? null : null);
  }, onError);
}
function withDeadline<T>(task: Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('공유 서버 응답이 늦어 로컬 목록을 사용합니다. 연결 상태를 확인한 뒤 다시 불러오세요.')), 8000);
    task.then(value => { clearTimeout(timer); resolve(value); }, error => { clearTimeout(timer); reject(error); });
  });
}
export function validateCatalog(events: HistoricalEvent[]) {
  if (!Array.isArray(events) || events.length > 2000) throw new Error('사건 배열은 최대 2,000개까지 저장할 수 있습니다.');
  if (new Set(events.map(event => event?.id)).size !== events.length) throw new Error('사건 ID가 중복됩니다.');
  for (const event of events) {
    const errors = validateEvent(event);
    if (!supportedChapter(event?.chapterId)) errors.push('현재 목록은 5.1~5.5 사건을 지원합니다.');
    if (event && !event.flow) errors.push('새 사건은 실행할 플로가 필요합니다.');
    if (errors.length) throw new Error(`${event?.title ?? '사건'}: ${errors.join('\n')}`);
  }
  const errors = validateDependencies(events);
  if (errors.length) throw new Error(errors.join('\n'));
}
export async function fetchPublishedCatalog(): Promise<PublishedCatalog> {
  const { db } = firebaseClient();
  const readDoc = process.env.NEXT_PUBLIC_CACHE_ENABLED === 'true' ? getDoc : getDocFromServer;
  const readDocs = process.env.NEXT_PUBLIC_CACHE_ENABLED === 'true' ? getDocs : getDocsFromServer;
  const pointer = await withDeadline(readDoc(doc(db, catalogPath)));
  if (!pointer.exists()) return { revision: null, events: null };
  const { revision, count } = pointer.data();
  if (typeof revision !== 'string' || !Number.isInteger(count)) throw new Error('공유 목록 정보가 올바르지 않습니다.');
  const snapshot = await withDeadline(readDocs(collection(db, 'eventCatalogRevisions', revision, 'events')));
  const events = snapshot.docs.map(item => item.data() as HistoricalEvent);
  if (events.length !== count) throw new Error('공유 목록이 완전하지 않아 불러오지 않았습니다.');
  validateCatalog(events);
  return { revision, events };
}
export async function publishCatalog(events: HistoricalEvent[], expectedRevision: string | null) {
  validateCatalog(events);
  const { db, auth } = firebaseClient();
  if (!auth.currentUser) throw new Error('관리자 로그인이 필요합니다.');
  const revision = crypto.randomUUID();
  // 사건 문서를 먼저 쓰고 마지막에 포인터를 교체해 불완전한 목록 노출을 막는다.
  for (let offset = 0; offset < events.length; offset += 400) {
    const batch = writeBatch(db);
    events.slice(offset, offset + 400).forEach((event, index) => {
      batch.set(doc(db, 'eventCatalogRevisions', revision, 'events', String(offset + index)), JSON.parse(JSON.stringify(event)));
    });
    await batch.commit();
  }
  await runTransaction(db, async transaction => {
    const pointerRef = doc(db, catalogPath);
    const current = await transaction.get(pointerRef);
    if ((current.data()?.revision ?? null) !== expectedRevision) throw new Error('다른 관리자가 먼저 게시했습니다. JSON을 백업한 뒤 공유본을 불러와 변경을 합쳐주세요.');
    transaction.set(pointerRef, { revision, count: events.length, updatedAt: serverTimestamp(), updatedBy: auth.currentUser!.uid });
  });
  return revision;
}
