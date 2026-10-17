const fs = require('node:fs');
const path = require('node:path');
const { randomUUID, createHash } = require('node:crypto');
const root = path.resolve(__dirname, '..');
const cliDir = process.argv[process.argv.indexOf('--firebase-tools-dir') + 1];
if (!process.argv.includes('--firebase-tools-dir') || !cliDir) throw new Error('--firebase-tools-dir에 인증된 Firebase CLI의 lib 경로를 지정하세요.');
const project = 'tk-survival';
const base = `projects/${project}/databases/(default)`;
const documents = `${base}/documents`;
function encode(value) {
  if (value === null) return { nullValue: null };
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encode) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([key, item]) => [key, encode(item)])) } };
}
(async () => {
  const auth = require(path.join(cliDir, 'auth'));
  const account = auth.getProjectDefaultAccount(root);
  if (!account) throw new Error('Firebase CLI 로그인이 필요합니다.');
  const options = { project, nonInteractive: true };
  auth.setActiveAccount(options, account);
  await require(path.join(cliDir, 'requireAuth')).requireAuth(options);
  const Client = require(path.join(cliDir, 'apiv2')).Client;
  const api = new Client({ urlPrefix: 'https://firestore.googleapis.com', auth: true });
  const database = await api.get(`/v1/${base}`);
  if (database.body.databaseEdition !== 'STANDARD') throw new Error('확인한 Standard 데이터베이스와 일치하지 않습니다.');
  const datasets = Object.fromEntries(['chronology', 'officers'].map(name => [name, JSON.parse(fs.readFileSync(path.join(root, `data/reference/${name}.json`), 'utf8'))]));
  const exclusions = JSON.parse(fs.readFileSync(path.join(root, 'data/reference/event-exclusions.json'), 'utf8'));
  if (datasets.chronology.some(entry => Object.hasOwn(exclusions.chronology, entry.id))) throw new Error('제외한 연표 이벤트가 남아 있습니다. 정리 후 게시하세요.');
  const { linkOfficers } = await import('./officer-links.mjs');
  const decisions = JSON.parse(fs.readFileSync(path.join(root, 'data/reference/officer-link-decisions.json'), 'utf8')).decisions;
  const inferences = JSON.parse(fs.readFileSync(path.join(root, 'data/reference/officer-link-inferences.json'), 'utf8')).inferences;
  const expected = linkOfficers(datasets.chronology, datasets.officers, decisions, inferences);
  for (const [index, entry] of datasets.chronology.entries()) {
    if (JSON.stringify(entry.relatedOfficerIds) !== JSON.stringify(expected[index].relatedOfficerIds) || JSON.stringify(entry.officerLinkIssues) !== JSON.stringify(expected[index].officerLinkIssues) || JSON.stringify(entry.officerLinkInferences) !== JSON.stringify(expected[index].officerLinkInferences)) throw new Error(`장수 연결을 검증한 뒤 게시하세요: ${entry.id}`);
  }
  const checksum = createHash('sha256').update(JSON.stringify(datasets)).digest('hex');
  const pointerPath = `${documents}/referenceCatalog/current`;
  let pointer = null;
  try { pointer = (await api.get(`/v1/${pointerPath}`)).body; }
  catch (error) { if (error.status !== 404 && error.context?.response?.statusCode !== 404) throw error; }
  if (pointer?.fields?.checksum?.stringValue === checksum) { console.log('동일한 자료가 이미 게시되어 있습니다.'); return; }
  const revision = randomUUID();
  for (const [dataset, rows] of Object.entries(datasets)) {
    if (new Set(rows.map(item => item.id)).size !== rows.length) throw new Error(`${dataset}: ID 중복`);
    for (let offset = 0; offset < rows.length; offset += 400) {
      const writes = rows.slice(offset, offset + 400).map(row => ({ update: { name: `${documents}/referenceCatalogRevisions/${revision}/${dataset}/${row.id}`, fields: encode(row).mapValue.fields }, currentDocument: { exists: false } }));
      await api.post(`/v1/${documents}:commit`, { writes });
    }
    let count = 0, pageToken = '';
    do {
      const response = await api.get(`/v1/${documents}/referenceCatalogRevisions/${revision}/${dataset}`, { queryParams: { pageSize: 1000, ...(pageToken ? { pageToken } : {}) } });
      count += (response.body.documents ?? []).length;
      pageToken = response.body.nextPageToken ?? '';
    } while (pageToken);
    if (count !== rows.length) throw new Error(`${dataset}: 저장 후 수량 불일치`);
  }
  const manifest = { revision, checksum, chronologyCount: datasets.chronology.length, officerCount: datasets.officers.length, updatedAt: new Date().toISOString() };
  await api.post(`/v1/${documents}:commit`, { writes: [{ update: { name: pointerPath, fields: encode(manifest).mapValue.fields }, currentDocument: pointer ? { updateTime: pointer.updateTime } : { exists: false } }] });
  console.log(JSON.stringify(manifest));
})().catch(error => { console.error(`자료 게시 실패: ${error.message}`); process.exitCode = 1; });
