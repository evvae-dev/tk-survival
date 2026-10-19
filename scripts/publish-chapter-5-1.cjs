const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const root = path.resolve(__dirname, '..');
const cliDir = process.argv[process.argv.indexOf('--firebase-tools-dir') + 1];
if (!process.argv.includes('--firebase-tools-dir') || !cliDir) throw new Error('--firebase-tools-dir를 지정하세요.');
const base = 'projects/tk-survival/databases/(default)';
const documents = `${base}/documents`;
function encode(value) {
  if (value === null) return { nullValue: null };
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encode) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([key, item]) => [key, encode(item)])) } };
}
function decode(value) {
  if ('nullValue' in value) return null;
  if ('stringValue' in value) return value.stringValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return value.doubleValue;
  if ('arrayValue' in value) return (value.arrayValue.values ?? []).map(decode);
  if ('mapValue' in value) return Object.fromEntries(Object.entries(value.mapValue.fields ?? {}).map(([key, item]) => [key, decode(item)]));
  throw new Error('지원하지 않는 사건 필드 형식입니다. 공유 원본을 확인하세요.');
}
(async () => {
  const auth = require(path.join(cliDir, 'auth'));
  const account = auth.getProjectDefaultAccount(root);
  if (!account) throw new Error('Firebase CLI 로그인이 필요합니다.');
  const options = { project: 'tk-survival', nonInteractive: true };
  auth.setActiveAccount(options, account);
  await require(path.join(cliDir, 'requireAuth')).requireAuth(options);
  const api = new (require(path.join(cliDir, 'apiv2')).Client)({ urlPrefix: 'https://firestore.googleapis.com', auth: true });
  const database = (await api.get(`/v1/${base}`)).body;
  if (database.databaseEdition !== 'STANDARD') throw new Error('기존 Standard 데이터베이스와 일치하지 않습니다.');
  let events = JSON.parse(fs.readFileSync(path.join(root, 'data/history/events.json'), 'utf8'));
  if (events.length !== 8 || events.some(event => event.chapterId !== 'chapter-5-1-yellow-turban' || event.year !== 184 || !event.flow)) throw new Error('황건 천하통일 원정을 포함한 5.1 실행 사건 8개가 필요합니다.');
  const pointerPath = `${documents}/eventCatalog/current`;
  const pointer = (await api.get(`/v1/${pointerPath}`)).body;
  const previousRevision = pointer.fields.revision.stringValue;
  if (process.argv.includes('--expected-revision') && previousRevision !== process.argv[process.argv.indexOf('--expected-revision') + 1]) throw new Error('공유 리비전이 변경되었습니다. 현재 편집본을 확인한 뒤 다시 게시하세요.');
  async function list(revision) {
    const rows = []; let pageToken = '';
    do {
      const response = await api.get(`/v1/${documents}/eventCatalogRevisions/${revision}/events`, { queryParams: { pageSize: 1000, ...(pageToken ? { pageToken } : {}) } });
      rows.push(...(response.body.documents ?? [])); pageToken = response.body.nextPageToken ?? '';
    } while (pageToken);
    return rows;
  }
  const before = await list(previousRevision);
  if (before.length !== Number(pointer.fields.count.integerValue)) throw new Error('교체 전 공유 목록 수량 불일치');
  if (process.argv.includes('--narrative-only')) {
    const { applyChapterNarrative } = await import('./apply-chapter-narrative.mjs');
    const shared = before.map(doc => decode({ mapValue: { fields: doc.fields } }));
    if (shared.length !== events.length || shared.some(event => !events.some(local => local.id === event.id))) throw new Error('공유 사건 ID가 로컬 5.1 목록과 다릅니다. 자동 교체하지 않습니다.');
    events = applyChapterNarrative(shared);
  }
  if (process.argv.includes('--dry-run')) {
    console.log(JSON.stringify({ previousRevision, count: events.length, titles: events.map(event => event.title), narrativeOnly: process.argv.includes('--narrative-only'), writes: 0 }));
    return;
  }
  const backup = path.join('C:/dev/.codex/tmp/tk-survival-before-5-1', 'eventCatalog.json');
  fs.mkdirSync(path.dirname(backup), { recursive: true });
  if (!fs.existsSync(backup)) fs.writeFileSync(backup, JSON.stringify({ pointer, events: before }, null, 2));
  const revision = randomUUID();
  const writes = events.map((event, index) => ({ update: { name: `${documents}/eventCatalogRevisions/${revision}/events/${index}`, fields: encode(event).mapValue.fields }, currentDocument: { exists: false } }));
  await api.post(`/v1/${documents}:commit`, { writes });
  const saved = await list(revision);
  if (saved.length !== events.length || saved.some(doc => !events.some(e => e.id === doc.fields.id.stringValue))) throw new Error('저장 후 공유 사건 검증 실패');
  const { isDeepStrictEqual } = require('node:util');
  if (saved.some(doc => !isDeepStrictEqual(decode({ mapValue: { fields: doc.fields } }), events.find(event => event.id === doc.fields.id.stringValue)))) throw new Error('저장 후 사건 내용이 일치하지 않습니다. 현재 게시 포인터를 유지합니다.');
  const manifest = { revision: { stringValue: revision }, count: { integerValue: String(events.length) }, updatedAt: { timestampValue: new Date().toISOString() }, updatedBy: { stringValue: 'firebase-cli' } };
  await api.post(`/v1/${documents}:commit`, { writes: [{ update: { name: pointerPath, fields: manifest }, currentDocument: { updateTime: pointer.updateTime } }] });
  console.log(JSON.stringify({ previousRevision, revision, before: before.length, after: events.length, backup }));
})().catch(error => { console.error(`5.1 공유 목록 교체 실패: ${error.message}`); process.exitCode = 1; });
