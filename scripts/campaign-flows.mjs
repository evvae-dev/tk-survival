import { readFileSync } from 'node:fs';
const read = file => JSON.parse(readFileSync(new URL(file, import.meta.url), 'utf8'));
const collection = read('../data/collection/5-2-to-5-5.json');
const prose = read('../data/history/campaign-narrative.json');
const eq = (field, value, operator = 'eq') => ({ field, operator, value });
const flag = (key, value = true) => ({ type: 'flag', key, value });
const chapterId = n => n === 1 ? 'chapter-5-1-yellow-turban' : `chapter-5-${n}`;

// Every rule is emitted into the common editable catalog; there are no hidden choices.
function graph(title) {
  const flow = { nodes: [], edges: [], passiveEffects: [] };
  const node = (id, type, data) => { flow.nodes.push({ id, type, position: { x: 0, y: 0 }, data }); return id; };
  const edge = (source, target, sourceHandle = 'next') => flow.edges.push({ id: `${source}:${sourceHandle}`, source, target, sourceHandle });
  const result = (id, text, effects = [], next = 'end') => { node(id, 'result', { label: text, text, effects }); edge(id, next); };
  const condition = (id, condition, yes, no) => { node(id, 'condition', { label: `${condition.field} ${condition.operator} ${JSON.stringify(condition.value)}`, condition }); edge(id, yes, 'yes'); edge(id, no, 'no'); };
  const choice = (id, text, options) => { node(id, 'choice', { label: text, text, options: options.map(({ target, ...option }) => option) }); options.forEach(o => edge(id, o.target, o.id)); };
  const check = (id, kind, yes, no, success, failure) => { node(id, 'check', { label: kind === 'relationship' ? '매력 확률 판정' : '능력 확률 판정', check: { kind, success, failure } }); edge(id, yes, 'yes'); edge(id, no, 'no'); };
  node('start', 'start', { label: title }); node('end', 'end', { label: '다음 사건으로' });
  const finish = first => {
    edge('start', first);
    const depths = new Map([['start', 0]]);
    for (let i = 0; i < flow.nodes.length; i++) for (const e of flow.edges) if (depths.has(e.source)) depths.set(e.target, Math.max(depths.get(e.target) ?? 0, depths.get(e.source) + 1));
    const rows = new Map();
    for (const n of flow.nodes) { const depth = depths.get(n.id) ?? 0; const row = rows.get(depth) ?? []; row.push(n); rows.set(depth, row); }
    for (const [depth, row] of rows) row.forEach((n, i) => { n.position = { x: i * 420, y: depth * 300 }; });
    return flow;
  };
  return { flow, node, edge, result, condition, choice, check, finish };
};
const lords = [
  { id: 'liu-bei', name: '유비', officer: 'rtk14-0952', regions: ['zhuo', 'qingzhou', 'jizhou', 'xuzhou'], from: 184, next: { 185: 'zhuo', 186: 'zhuo', 187: 'jizhou', 188: 'jizhou' } },
  { id: 'cao-cao', name: '조조', officer: 'rtk14-0521', regions: ['jizhou', 'qingzhou', 'luoyang', 'chenliu'], from: 184, next: { 185: 'jizhou', 186: 'chenliu', 187: 'chenliu', 188: 'luoyang' } },
  { id: 'dong-zhuo', name: '동탁', officer: 'rtk14-0736', regions: ['liangzhou', 'changan'], from: 185, next: { 186: 'liangzhou', 187: 'liangzhou', 188: 'liangzhou' } },
  { id: 'gongsun-zan', name: '공손찬', officer: 'rtk14-0266', regions: ['zhuo'], from: 185, next: { 186: 'zhuo', 187: 'zhuo', 188: 'zhuo' } },
  { id: 'sun', name: '손견', officer: 'rtk14-0551', regions: ['liangzhou', 'jingzhou'], from: 185, next: { 186: 'liangzhou', 187: 'jingzhou', 188: 'jingzhou' } },
];
const destinations = {
  185: [['liangzhou', '서방의 양주', '장안 서쪽에서 군대가 모인다고 한다. 다음 일거리를 그곳에서 찾아보자.'], ['jizhou', '기주', '관청과 연락책이 모이는 곳에서 소식을 찾아보자.'], ['zhuo', '탁군', '북쪽의 사람들과 인연을 더 쌓아 보자.']],
  186: [['liangzhou', '서방 전선', '서방 토벌군의 길을 따라가 보자.'], ['yangzhou', '회계 방면', '동남쪽 마을의 일거리를 찾아보자.'], ['zhuo', '탁군', '북쪽으로 돌아가 다음 소식을 기다리자.']],
  187: [['zhuo', '유주·탁군', '북방의 소란을 피해 갈지 가까이서 볼지 정해야 한다.'], ['jizhou', '기주', '북쪽 군현의 사람들을 만나 보자.'], ['jingzhou', '장사 방면', '남쪽 토벌군 근처에서 일을 구해 보자.'], ['xuzhou', '서주', '서주의 마을로 가 보자.']],
  188: [['yizhou', '익주', '서쪽 깊숙한 곳에서 새 삶을 찾아보자.'], ['luoyang', '낙양', '수도에서 사람과 일을 찾아보자.'], ['zhuo', '유주·탁군', '북쪽에 남아 다음 소식을 지켜보자.'], ['jizhou', '기주', '익숙한 북쪽 길목으로 가 보자.']],
};

function route(year, priorIds) {
  const id = `chapter-5-${year - 183}-service`;
  const title = '[이제 누구 밑에서 일하지?!]';
  const g = graph(title);
  const candidates = lords.filter(lord => lord.from <= year);
  const rulerIds = [...lords.map(l => l.id), 'yellow-turban', 'liu-yan', 'tao-qian'];
  g.condition('has-lord', eq('factionId', rulerIds, 'in'), 'stay-or-leave', 'offers');
  g.choice('stay-or-leave', '함께 지낸 사람들은 다음 길도 같이 가자고 한다. 나를 받아 준 곳을 떠나는 것도 쉬운 일은 아니다. 계속 따라갈지 다른 삶을 찾아볼지 정해야겠다.', [
    { id: 'stay', title: '[지금 소속을 따른다]', description: '이미 맺은 인연을 이어 가자.', target: 'follow-0' },
    { id: 'leave', title: '[소속을 떠난다]', description: '이번에는 내 발로 갈 곳을 정하자.', target: 'resigned' },
  ]);
  g.result('resigned', '나는 일행에게 떠나겠다고 말하고 짐을 챙겼다. 이제 어느 부대의 명령도 받지 않는 재야 신분이다.', [{ type: 'faction', value: null }, { type: 'role', value: 'civilian' }], 'offers');
  for (const [index, lord] of [...lords, { id: 'yellow-turban', name: '황건군', next: {} }, { id: 'liu-yan', name: '유언', next: { 188: 'yizhou' } }, { id: 'tao-qian', name: '도겸', next: { 188: 'xuzhou' } }].entries()) {
    const all = [...lords, { id: 'yellow-turban' }, { id: 'liu-yan' }, { id: 'tao-qian' }];
    g.condition(`follow-${index}`, eq('factionId', lord.id), `stay-${lord.id}`, index < all.length - 1 ? `follow-${index + 1}` : 'travel');
    const destination = lord.next[year + 1];
    g.result(`stay-${lord.id}`, `나는 ${lord.name}의 일행과 계속 함께하기로 했다. ${destination ? '다음 활동지로 가는 길도 일행과 같이 나섰다.' : '당장은 일행 곁에 남아 다음 소식을 기다렸다.'}`, [...(destination ? [{ type: 'region', value: destination }] : []), flag('chapterFinished', false)]);
  }
  g.choice('offers', '연락책에게 앞으로 누구와 일할 수 있을지 물었다. 가까운 곳에서 나를 받아 줄 사람이 있다면 말을 걸어 볼 만하다. 아무도 없다면 내가 갈 길을 정하면 된다.', [
    ...candidates.map(lord => ({ id: `join-${lord.id}`, title: `[${lord.name} 휘하에 지원한다]`, description: '내 사정을 설명하고 함께 일하겠다고 해 보자.', conditions: [eq('age', 16, 'gte'), eq('region', lord.regions, 'in'), eq(`world.factions.${lord.id}`, 'defeated', 'neq'), eq(`world.people.person-${lord.officer}`, 'dead', 'neq'), eq('world.flags.playerCaptured', true, 'neq')], target: `check-${lord.id}` })),
    { id: 'travel', title: '[재야로 길을 나선다]', description: '아직 누구 밑으로 들어갈지 정하지 말자.', target: 'travel' },
  ]);
  for (const lord of candidates) {
    g.check(`check-${lord.id}`, 'relationship', `accepted-${lord.id}`, `rejected-${lord.id}`, `${lord.name} 측이 지원을 받아들인다.`, `${lord.name} 측이 지원을 거절한다.`);
    const destination = lord.next[year + 1];
    g.result(`accepted-${lord.id}`, `${lord.name} 측 연락책이 내 말을 듣고 부대에 들어와도 좋다고 했다. 나는 말단 병사로 합류해 일행의 다음 길에 함께하기로 했다.`, [{ type: 'faction', value: lord.id }, { type: 'role', value: 'soldier' }, { type: 'factionStatus', factionId: lord.id, value: 'active' }, ...(destination ? [{ type: 'region', value: destination }] : []), flag('chapterFinished', false)]);
    g.result(`rejected-${lord.id}`, `${lord.name} 측 연락책은 지금 나를 받아들일 수 없다고 했다. 나는 합류하지 못한 채 짐을 챙겨 다른 길을 찾았다.`, [{ type: 'faction', value: null }, { type: 'role', value: 'civilian' }], 'travel');
  }
  g.choice('travel', '내 이름이 적힌 군적은 이제 없다. 길에서 들은 소식을 떠올리며 지도를 대신할 표식을 땅에 그렸다. 다음에는 어느 고장으로 가 볼까.', destinations[year + 1].map(([region, label, description]) => ({ id: region, title: `[${label}로 향한다]`, description, target: `travel-${region}` })));
  for (const [region, label] of destinations[year + 1]) g.result(`travel-${region}`, `나는 ${label}로 향하는 길에 올랐다. 새 고장에서는 어느 군주의 명령도 받지 않고 사람들과 소식을 찾아보기로 했다.`, [{ type: 'region', value: region }, { type: 'faction', value: null }, { type: 'role', value: 'civilian' }, flag('chapterFinished', false)]);
  return { id, chapterId: chapterId(year - 183), year, month: null, precision: 'approximate', calendar: 'lunar', sequence: 900, category: 'history', title, summary: '현재 위치·군주의 생존·세력 존속·소속을 확인하고 매력으로 합류를 판정한다. 합류하면 소속의 다음 활동지로, 재야는 선택한 사건 지역으로 이동한다.', dateNote: '장 사이의 합류·이동은 게임 창작이다. 정확한 역사 이동일을 의미하지 않는다.', regionIds: [], factionIds: candidates.map(l => l.id), relatedPeople: candidates.map(l => l.name), relatedOfficerIds: candidates.map(l => l.officer), source: { title: '사용자 요청 · 합류와 재야 이동 게임 창작', record: '플레이어의 지원·거절·합류·이동은 게임 창작이며 역사 인물의 실제 등용 기록이 아니다.' }, prerequisiteEventIds: priorIds, connections: [], flow: g.finish('has-lord') };
}

function collectedEvent(source, index) {
  const story = prose[source.id];
  const g = graph(story.title);
  // A ruler's follower goes with the operation; independent characters must be local.
  g.condition('allegiance', eq('factionId', story.factions, 'in'), 'duty-march', 'local');
  g.result('duty-march', '나는 소속 부대의 연락을 받고 함께 이동했다. 맡은 일은 현장에 도착한 뒤에야 들을 수 있었다.', [{ type: 'region', value: source.regionId }], 'scene');
  g.condition('local', eq('region', source.regionId), 'independent', 'report');
  g.condition('independent', eq('factionId', [...lords.map(l => l.id), 'yellow-turban', 'liu-yan', 'tao-qian'], 'in'), 'report', 'scene');
  g.choice('scene', story.scene, [
    { id: 'help', title: `[${story.action}]`, description: story.thought, target: 'help-check' },
    { id: 'observe', title: '[무리하지 않고 지켜본다]', description: '맡을 수 없는 일까지 나서지는 말자.', target: 'observed' },
  ]);
  g.check('help-check', story.checkKind, 'helped', 'failed', '맡은 일을 해낸다.', '맡은 일을 마치지 못한다.');
  g.result('helped', story.success, [flag(`${source.id}-helped`)], 'report');
  g.result('failed', story.failure, [flag(`${source.id}-failed`)], 'report');
  g.result('observed', story.observe, [], 'report');
  // Baseline news is a separate history record, never replaced by a player's intent.
  g.result('report', source.reportedOutcome, [flag(`${source.id}-reported`)]);
  const records = source.sourceIds.map(id => collection.sources.find(s => s.id === id));
  return { id: source.id, chapterId: chapterId(source.chapter), year: source.chapterYear, month: null, precision: source.precision, calendar: 'lunar', sequence: (index + 1) * 10, category: 'history', title: story.title, summary: [source.background, ...source.stages.map(s => s.action), source.reportedOutcome].join(' '), dateNote: source.dateNote, regionIds: [source.regionId], factionIds: story.factions, relatedPeople: source.participants.map(p => p.name), relatedOfficerIds: source.participants.flatMap(p => p.officerId ? [p.officerId] : []), source: { title: source.originalRecord ? '정사 삼국지 권31 촉서 유이목전 · 나무위키 생애와 대조' : `${records.map(s => s.title).join(' · ')} (2차 자료 요약·원사서 미대조)`, record: source.originalRecord ?? [source.background, ...source.stages.map(s => s.action), source.reportedOutcome].join(' ') }, prerequisiteEventIds: [], connections: [], flow: g.finish('allegiance') };
}

export function extendCampaign(catalog) {
  const events = structuredClone(catalog);
  // The old close node now leads to another chapter rather than ending the whole game.
  const closing = events.find(e => e.id === 'chapter-5-1-closing');
  const done = closing.flow.nodes.find(n => n.id === 'record').data.options.find(o => o.id === 'done');
  done.description = '함께한 사람들을 떠올리고 다음 길을 정하자.';
  const firstRoute = route(184, [closing.id]);
  closing.connections.push({ targetId: firstRoute.id, label: '전장 결과 → 조조·유비 합류 / 재야 이동' });
  events.push(firstRoute);
  let prior = firstRoute;
  for (const year of [185, 186, 187, 188]) {
    const sources = collection.events.filter(e => e.runtimeEnabled && e.chapterYear === year);
    const current = sources.map(collectedEvent);
    // This edge is chapter progression, not an invented historical cause.
    current.forEach((event, index) => {
      event.prerequisiteEventIds = [index ? current[index - 1].id : prior.id];
      (index ? current[index - 1] : prior).connections.push({ targetId: event.id, label: index ? '같은 장의 소식·활동 순서 (역사적 인과와 별개)' : '합류·선택 지역을 유지한 채 다음 장' });
    });
    events.push(...current);
    prior = current.at(-1);
    if (year < 188) {
      const service = route(year, current.map(e => e.id));
      prior.connections.push({ targetId: service.id, label: '이번 장을 돌아보고 소속 유지·군주 합류·재야 이동' });
      events.push(service); prior = service;
    }
  }
  return events;
}
