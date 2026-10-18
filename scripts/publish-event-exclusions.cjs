const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const root = path.resolve(__dirname, '..');
const cliDir = process.argv[process.argv.indexOf('--firebase-tools-dir') + 1];
if (!process.argv.includes('--firebase-tools-dir') || !cliDir) throw new Error('--firebase-tools-dir를 지정하세요.');
const project = 'tk-survival';
const base = `projects/${project}/databases/(default)`;
const documents = `${base}/documents`;
(async () => {
  const auth = require(path.join(cliDir, 'auth'));
  const account = auth.getProjectDefaultAccount(root);
  if (!account) throw new Error('Firebase CLI 로그인이 필요합니다.');
  const options = { project, nonInteractive: true };
  auth.setActiveAccount(options, account);
  await require(path.join(cliDir, 'requireAuth')).requireAuth(options);
  const Client = require(path.join(cliDir, 'apiv2')).Client;
  const api = new Client({ urlPrefix: 'https://firestore.googleapis.com', auth: true });
  const database = (await api.get(`/v1/${base}`)).body;
  if (database.databaseEdition !== 'STANDARD') throw new Error('Standard 데이터베이스와 일치하지 않습니다.');
  const exclusions = JSON.parse(fs.readFileSync(path.join(root, 'data/reference/event-exclusions.json'), 'utf8'));
  const removedIds = new Set([...Object.keys(exclusions.chronology), ...Object.keys(exclusions.gameEvents)]);
  const pointerPath = `${documents}/eventCatalog/current`;
  const pointer = (await api.get(`/v1/${pointerPath}`)).body;
  const previousRevision = pointer.fields.revision.stringValue;
  const existing = [];
  let pageToken = '';
  do {
    const response = await api.get(`/v1/${documents}/eventCatalogRevisions/${previousRevision}/events`, { queryParams: { pageSize: 1000, ...(pageToken ? { pageToken } : {}) } });
    existing.push(...(response.body.documents ?? []));
    pageToken = response.body.nextPageToken ?? '';
  } while (pageToken);
  if (existing.length !== Number(pointer.fields.count.integerValue)) throw new Error('공유 사건 수량 불일치');
  const removed = existing.filter(item => removedIds.has(item.fields.id.stringValue));
  if (!removed.length) { console.log('제외할 공유 사건이 없습니다.'); return; }
  const retained = existing.filter(item => !removedIds.has(item.fields.id.stringValue));
  const revision = randomUUID();
  for (let offset = 0; offset < retained.length; offset += 400) {
    const writes = retained.slice(offset, offset + 400).map((item, index) => ({ update: { name: `${documents}/eventCatalogRevisions/${revision}/events/${offset + index}`, fields: item.fields }, currentDocument: { exists: false } }));
    await api.post(`/v1/${documents}:commit`, { writes });
  }
  let count = 0;
  pageToken = '';
  do {
    const response = await api.get(`/v1/${documents}/eventCatalogRevisions/${revision}/events`, { queryParams: { pageSize: 1000, ...(pageToken ? { pageToken } : {}) } });
    count += (response.body.documents ?? []).length;
    pageToken = response.body.nextPageToken ?? '';
  } while (pageToken);
  if (count !== retained.length) throw new Error('제외 후 공유 사건 수량 불일치');
  const manifest = { revision: { stringValue: revision }, count: { integerValue: String(retained.length) }, updatedAt: { timestampValue: new Date().toISOString() }, updatedBy: { stringValue: 'firebase-cli' } };
  await api.post(`/v1/${documents}:commit`, { writes: [{ update: { name: pointerPath, fields: manifest }, currentDocument: { updateTime: pointer.updateTime } }] });
  console.log(JSON.stringify({ previousRevision, revision, before: existing.length, after: retained.length, removedIds: removed.map(item => item.fields.id.stringValue) }));
})().catch(error => { console.error(`공유 사건 제외 실패: ${error.message}`); process.exitCode = 1; });
