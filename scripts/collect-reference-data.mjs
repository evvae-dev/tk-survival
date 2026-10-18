import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { parse } from 'node-html-parser';
import { fileURLToPath } from 'node:url';
import { linkOfficers } from './officer-links.mjs';
import { applyEventExclusions } from './event-exclusions.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
const sheetId = '1Iq89ZA4E1-lqo4I9pGZdfqI3PUk-L75WEf3FaKmA0ww';
const sheetUrl = `https://docs.google.com/spreadsheets/u/0/d/${sheetId}/htmlview`;
const timelineUrl = 'https://namu.wiki/w/삼국지/연표';
const hash = text => createHash('sha256').update(text).digest('hex').slice(0, 20);
const clean = text => text.replace(/\[편집\]|\[\d+\]/g, '').replace(/\s+/g, ' ').trim();
async function fetchPage(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`수집 실패: HTTP ${response.status}`);
  return response.text();
}
const activeCatalog = JSON.parse(await readFile(`${root}data/history/catalog-metadata.json`, 'utf8'));
if (activeCatalog.edition === '5.1-playable-v1') throw new Error('현재는 5.1 재수집 범위입니다. 이전 전체 연표 수집기로 활성 데이터를 덮어쓸 수 없습니다. docs/CHAPTER_5_1_RUNTIME.md를 확인하세요.');
const index = await fetchPage(sheetUrl);
const tabs = [...index.matchAll(/items\.push\(\{name: "([^"]+)", pageUrl: "([^"]+)", gid: "(\d+)"/g)].map(match => ({ name: JSON.parse(`"${match[1]}"`), gid: match[3] }));
if (tabs.length !== 2) throw new Error('시트 탭 구조가 변경되었습니다. 확인 후 수집기를 수정하세요.');
for (const tab of tabs) {
  const page = parse(await fetchPage(`${sheetUrl}/sheet?headers=true&gid=${tab.gid}`));
  tab.rows = page.querySelectorAll('table.waffle tr').map(row => row.querySelectorAll('td').map(cell => clean(cell.textContent)));
}
const abilityTab = tabs.find(tab => tab.gid === '0');
const editorTab = tabs.find(tab => tab.gid === '22965975');
if (!abilityTab.rows.some(row => row[0] === '무장번호' && row[7] === '통솔') || !editorTab.rows.some(row => row[0] === '武將编号' && row[17] === '统率')) throw new Error('시트 컬럼 순서가 변경되었습니다.');
const dataRows = tab => tab.rows.filter(row => /^\d+$/.test(row[0] ?? ''));
const editorRows = dataRows(editorTab);
const editor = new Map(editorRows.map(row => [row[0], row]));
const number = value => /^-?\d+$/.test(value ?? '') ? Number(value) : null;
const officers = dataRows(abilityTab).map(row => {
  const detail = editor.get(row[0]);
  if (!detail || detail[1] !== row[1]) throw new Error(`시트 간 무장 불일치: ${row[0]}`);
  if ([row[3], row[4], row[5], ...row.slice(7, 12)].join('|') !== [detail[3], detail[4], detail[6], ...detail.slice(17, 22)].join('|')) throw new Error(`시트 간 능력치 불일치: ${row[0]}`);
  return {
    id: `rtk14-${row[0].padStart(4, '0')}`, gameId: Number(row[0]), name: row[1], gender: row[2],
    birthYear: number(row[3]), debutYear: number(row[4]), deathYear: number(row[5]), location: row[6],
    stats: Object.fromEntries(['leadership', 'strength', 'intelligence', 'politics', 'charisma'].map((key, i) => [key, number(row[i + 7])])),
    traits: row.slice(13, 18).filter(Boolean),
    gameData: { serviceYear: number(detail[5]), deathCauseCode: number(detail[7]), compatibility: number(detail[8]), faction: detail[9] || null, corps: detail[10] || null, affiliation: detail[11] || null, location: detail[12] || null, status: detail[13] || null, rank: detail[14] || null, loyalty: number(detail[15]), health: detail[22] || null, doctrine: detail[23] || null, policy: detail[24] || null, policyLevel: number(detail[25]), voice: detail[26] || null, tone: detail[27] || null, spouse: detail[29] || null, swornSibling: detail[30] || null, lineage: detail[31] || null, father: detail[32] || null, mother: detail[33] || null, generation: number(detail[34]) },
    source: { title: '삼국지14 전체무장 공유 시트', kind: 'game' }
  };
});
if (!officers.length || officers.length !== editorRows.length || new Set(officers.map(item => item.id)).size !== officers.length) throw new Error('무장 수량 또는 ID가 올바르지 않습니다.');
const entities = JSON.parse(await readFile(`${root}data/history/entities.json`, 'utf8'));
const people = new Set(officers.map(item => item.name));
const page = parse(await fetchPage(timelineUrl));
const headings = [];
const chronology = [];
const byNode = new Map();
let year = null, heading = '', active = false;
const yearMarker = text => text.match(/^(\d{3})년(?:\s|$)/);
for (const node of page.querySelectorAll('h2,h3,h4,li > .wiki-paragraph')) {
  const text = clean(node.textContent);
  if (/^H/.test(node.tagName)) {
    heading = text;
    headings.push(text);
    if (text.startsWith('4.') || text.startsWith('5.') || text.startsWith('6.')) active = true;
    if (text.startsWith('7.')) active = false;
    const match = text.match(/^5\.\d+\.\s*(\d{3})년/);
    year = match ? Number(match[1]) : null;
    continue;
  }
  if (!active) continue;
  const marker = yearMarker(text);
  if (marker) { year = Number(marker[1]); continue; }
  if (year === null || !text) continue;
  let parent = node.parentNode?.parentNode;
  let parentRecord = null;
  while (parent) {
    if (parent.tagName === 'LI' && byNode.has(parent)) { parentRecord = byNode.get(parent); break; }
    parent = parent.parentNode;
  }
  const monthMatch = text.match(/^\(?\s*(윤)?\s*(1[0-2]|[1-9])월/);
  const month = monthMatch ? Number(monthMatch[2]) : parentRecord?.month ?? null;
  const approximate = /비슷한 시기|이 즈음|이즈음|이 무렵|경으로|추정/.test(text);
  const relatedPeople = [...new Set(node.querySelectorAll('a[title]').map(link => clean(link.textContent)).filter(name => people.has(name)))];
  const regions = entities.regions.filter(entity => (entity.aliases ?? [entity.label]).some(alias => text.includes(alias))).map(entity => entity.id);
  // 세력은 본문에서 국가·군집 명칭을 명시한 경우에만 태그한다. 인명으로 소속을 추정하지 않는다.
  const factionNames = { han: ['후한', '한 조정'], wei: ['조위', '위나라'], shu: ['촉한', '촉나라'], wu: ['손오', '오나라'], jin: ['서진', '진나라'], 'yellow-turban': ['황건적'], coalition: ['반동탁 연합'], 'dong-zhuo': ['동탁군'], 'cao-cao': ['조조군'], 'liu-bei': ['유비군'] };
  const factionIds = Object.entries(factionNames).filter(([, names]) => names.some(name => text.includes(name))).map(([id]) => id);
  const novel = /연의/.test(text) || parentRecord?.category === 'novel';
  const record = { id: `timeline-${hash(`${year}|${parentRecord?.id ?? ''}|${text}`)}`, year, month, precision: approximate ? 'approximate' : month ? 'month' : 'year', calendar: 'lunar', leapMonth: monthMatch ? Boolean(monthMatch[1]) : parentRecord?.leapMonth ?? null, title: text.split(/[.:：]/)[0].slice(0, 90) || text, content: text, regionIds: regions, factionIds, relatedPeople, category: novel ? 'novel' : 'history', parentId: parentRecord?.id ?? null, source: { title: novel ? '삼국지연의 (회차 미확인)' : '원사서 미확인', record: null }, verification: 'secondary', section: heading };
  if (approximate) record.dateNote = '편년 자료가 근사 시기를 사용한다. 정확한 연월은 미확인이다.';
  chronology.push(record);
  byNode.set(node.parentNode, record);
}
if (!chronology.length || !headings.some(text => /^5\.97\./.test(text))) throw new Error('연표 본문 또는 마지막 연도 목차가 누락되었습니다.');
if (new Set(chronology.map(item => item.id)).size !== chronology.length) throw new Error('연표 ID 중복');
await mkdir(`${root}data/reference`, { recursive: true });
const metadata = { collectedAt: new Date().toISOString(), sources: [{ title: '나무위키 삼국지/연표', url: timelineUrl }, { title: '삼국지14 전체무장 공유 시트', url: sheetUrl }], timelineCount: chronology.length, officerCount: officers.length, yearRange: [Math.min(...chronology.map(item => item.year)), Math.max(...chronology.map(item => item.year))], playableTimelineCount: chronology.filter(item => item.year >= 170 && item.year <= 280).length, headings, tabs: tabs.map(tab => ({ name: tab.name, gid: tab.gid, officerCount: dataRows(tab).length })), notes: ['연표의 사실 항목과 하위 설명을 parentId로 연결한다.', '월은 해당 항목이나 상위 항목에 명시한 경우만 기록한다. 앞선 형제 항목의 월을 전파하지 않는다.', '지역과 세력은 본문 명시 어휘만 보수적으로 태그한다. 빈 배열은 미확인이다.', '사서 원문을 대조하지 않았으므로 사서기록은 null이며 확인한 문헌명을 꾸며 넣지 않는다.', '장수의 생몰년, 능력치, 관계는 게임 데이터이며 정사 검증 자료가 아니다.', '반에디터의 이름을 알 수 없는 lp 필드는 사용하지 않는다.'] };
const { decisions } = JSON.parse(await readFile(`${root}data/reference/officer-link-decisions.json`, 'utf8'));
const { inferences } = JSON.parse(await readFile(`${root}data/reference/officer-link-inferences.json`, 'utf8'));
const exclusions = JSON.parse(await readFile(`${root}data/reference/event-exclusions.json`, 'utf8'));
const linkedChronology = linkOfficers(applyEventExclusions(chronology, exclusions.chronology), officers, decisions, inferences);
metadata.collectedTimelineCount = chronology.length;
metadata.excludedTimelineCount = chronology.length - linkedChronology.length;
metadata.timelineCount = linkedChronology.length;
metadata.playableTimelineCount = linkedChronology.filter(item => item.year >= 170 && item.year <= 280).length;
metadata.yearRange = [Math.min(...linkedChronology.map(item => item.year)), Math.max(...linkedChronology.map(item => item.year))];
for (const [name, value] of Object.entries({ chronology: linkedChronology, officers, metadata })) await writeFile(`${root}data/reference/${name}.json`, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ timeline: linkedChronology.length, officers: officers.length, yearRange: metadata.yearRange, playable: metadata.playableTimelineCount }));
