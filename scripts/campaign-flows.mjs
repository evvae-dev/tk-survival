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
  const result = (id, text, effects = [], next = 'end', recordType) => { node(id, 'result', { label: text, text, effects, ...(recordType ? {recordType} : {}) }); edge(id, next); };
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
  185: [['liangzhou', '서방의 양주', '금성의 봉기와 서방 토벌군 소식을 따라 피란 길목에서 일을 찾아보자.'], ['jizhou', '기주', '왕분의 폐위 모의와 조조의 답신이 오가는 기주에서 연락 일을 찾아보자.'], ['zhuo', '탁군', '공손찬의 종군 선발을 준비하는 탁군에서 연락 일을 찾아보자.']],
  186: [['liangzhou', '서방 전선', '서방 토벌군의 길을 따라가 보자.'], ['yangzhou', '회계 방면', '동남쪽 마을의 일거리를 찾아보자.']],
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
    g.result(`stay-${lord.id}`, `나는 ${lord.name}의 일행과 계속 함께하기로 했다. ${destination ? '다음 활동지로 가는 길도 일행과 같이 나섰다.' : '당장은 일행 곁에 남아 다음 소식을 기다렸다.'}`, [...(destination ? [{ type: 'region', value: destination }] : []), flag('chapterFinished', false)], `duty-${lord.id}`);
    const duties = {
      'cao-cao': ['흩어진 연락책의 수신처를 대조한다','현지 주민에게 연락 지점을 묻는다','새 임무가 올 때까지 연락망을 정리해야 한다. 서신을 들고도 받을 사람을 못 찾으면 나만 길에서 밤새울 판이다. 지금 확인할 수 있는 것부터 챙겨 보자.'],
      'liu-bei': ['동료들의 이름과 군장을 맞춘다','머물 집의 주민에게 사정을 설명한다','함께 지낼 동료들의 이름과 짐을 다시 세고 있다. 관직이나 전공 얘기보다 당장 잘 곳을 찾는 일이 급하다. 말단인 내가 할 수 있는 일을 골라 보자.'],
      'dong-zhuo': ['서방 수송대의 인원을 확인한다','길목 주민에게 우회로를 묻는다','서방의 긴 길에서 수송 연락을 잇는 일도 만만하지 않다. 수레 하나가 빠져도 뒤따르는 사람이 멈춘다. 일행이 다시 움직이기 전에 내 주변부터 확인하자.'],
      'gongsun-zan': ['북쪽 초소의 연락 순서를 맞춘다','피란민에게 머물 곳을 안내한다','북쪽 길목에는 초소를 찾는 사람과 피란처를 찾는 사람이 뒤섞여 있다. 누구를 어디로 보낼지부터 알아야겠다. 큰 전쟁은 몰라도 내가 맡은 연락은 놓치지 말자.'],
      'sun': ['수송 연락병에게 수신처를 확인한다','길목 주민에게 피란 순서를 설명한다','함께 움직일 사람들이 길목에서 짐을 정리하고 있다. 앞으로 갈 길의 소식이 제각각이라 연락책도 바쁘다. 나는 잘못 전할 말을 줄이는 쪽으로 도와야겠다.'],
    };
    const duty = duties[lord.id] ?? ['일행의 명부를 확인한다','현지 주민과 연락을 잇는다','일행과 함께 머물며 다음 연락을 기다린다. 짐과 사람을 다시 확인할 일이 남아 있다. 내가 손댈 수 있는 작은 일부터 정리하자.'];
    g.choice(`duty-${lord.id}`, duty[2], [
      {id:'roster',title:`[${duty[0]}]`,description:'내 몫의 연락부터 틀리지 않게 하자.',target:`duty-check-${lord.id}`},
      {id:'people',title:`[${duty[1]}]`,description:'사람들과 말을 맞추면 길도 덜 막히겠지.',target:`people-check-${lord.id}`},
      {id:'wait',title:'[맡은 거점에서 대기한다]',description:'내 위치를 알리고 다음 연락을 기다리자.',target:`duty-wait-${lord.id}`},
    ]);
    g.check(`duty-check-${lord.id}`,'politics',`duty-ok-${lord.id}`,`duty-fail-${lord.id}`,'명부와 연락 내용을 맞춘다.','확인할 내용을 남긴다.');
    g.check(`people-check-${lord.id}`,'relationship',`people-ok-${lord.id}`,`people-fail-${lord.id}`,'주민의 협조를 얻는다.','협조를 얻지 못한다.');
    g.result(`duty-ok-${lord.id}`,'나는 명부와 연락 내용을 대조해 빠진 항목을 담당자에게 알렸다. 담당자는 수정한 내용을 받고 다음 연락에 내 이름을 남겼다.');
    g.result(`duty-fail-${lord.id}`,'나는 명부와 연락 내용을 모두 맞추지 못했다. 담당자는 빈 항목을 남겨 두고 원래 연락책에게 다시 확인하겠다고 했다.');
    g.result(`people-ok-${lord.id}`,'나는 주민에게 일행의 사정을 설명하고 연락할 곳을 물었다. 주민이 내 말을 듣고 머물 곳과 연락 지점을 알려 주었다.');
    g.result(`people-fail-${lord.id}`,'나는 주민에게 도움을 청했지만 협조를 얻지 못했다. 일행에게 사정을 알리고 이미 확보한 거점으로 돌아왔다.');
    g.result(`duty-wait-${lord.id}`,'나는 연락책에게 내가 남을 곳을 알리고 거점에서 기다렸다. 연락책은 다음 임무가 오면 그곳으로 부르겠다고 했다.');
  }
  g.choice('offers', '연락책에게 앞으로 누구와 일할 수 있을지 물었다. 가까운 곳에서 나를 받아 줄 사람이 있다면 말을 걸어 볼 만하다. 아무도 없다면 내가 갈 길을 정하면 된다.', [
    ...candidates.map(lord => ({ id: `join-${lord.id}`, title: `[${lord.name} 휘하에 지원한다]`, description: '내 사정을 설명하고 함께 일하겠다고 해 보자.', conditions: [eq(`world.flags.${year === 184 ? (lord.id === 'cao-cao' ? 'chapter51AccompaniedCaoCao' : 'chapter51AccompaniedLiuBei') : `contact-${lord.id}-${year}`}`, true), eq('age', 16, 'gte'), eq('region', lord.regions, 'in'), eq(`world.factions.${lord.id}`, 'defeated', 'neq'), eq(`world.people.person-${lord.officer}`, 'dead', 'neq'), eq('world.flags.playerCaptured', true, 'neq')], target: `check-${lord.id}` })),
    { id: 'travel', title: '[재야로 길을 나선다]', description: '아직 누구 밑으로 들어갈지 정하지 말자.', target: 'travel' },
  ]);
  for (const lord of candidates) {
    g.check(`check-${lord.id}`, 'relationship', `accepted-${lord.id}`, `rejected-${lord.id}`, `${lord.name} 측이 지원을 받아들인다.`, `${lord.name} 측이 지원을 거절한다.`);
    const destination = lord.next[year + 1];
    g.result(`accepted-${lord.id}`, `${lord.name} 측 연락책이 내 말을 듣고 부대에 들어와도 좋다고 했다. 나는 말단 병사로 합류해 일행의 다음 길에 함께하기로 했다.`, [{ type: 'faction', value: lord.id }, { type: 'role', value: 'soldier' }, { type: 'factionStatus', factionId: lord.id, value: 'active' }, ...(destination ? [{ type: 'region', value: destination }] : []), flag('chapterFinished', false)]);
    g.result(`rejected-${lord.id}`, `${lord.name} 측 연락책은 지금 나를 받아들일 수 없다고 했다. 나는 합류하지 못한 채 짐을 챙겨 다른 길을 찾았다.`, [{ type: 'faction', value: null }, { type: 'role', value: 'civilian' }], 'travel');
  }
  g.choice('travel', '앞으로 갈 길은 내가 정해야 한다. 길에서 들은 소식을 떠올리며 지도를 대신할 표식을 땅에 그렸다. 다음에는 어느 고장으로 가 볼까.', destinations[year + 1].map(([region, label, description]) => ({ id: region, title: `[${label}로 향한다]`, description, target: `travel-${region}` })));
  for (const [region, label] of destinations[year + 1]) g.result(`travel-${region}`, `나는 ${label}로 향하는 길에 올랐다. 새 고장에서는 어느 군주의 명령도 받지 않고 사람들과 소식을 찾아보기로 했다.`, [{ type: 'region', value: region }, { type: 'faction', value: null }, { type: 'role', value: 'civilian' }, flag('chapterFinished', false)]);
  return { id, chapterId: chapterId(year - 183), year, month: null, precision: 'approximate', calendar: 'lunar', sequence: 900, category: 'history', title, summary: '현재 위치·군주의 생존·세력 존속·소속을 확인하고 매력으로 합류를 판정한다. 합류하면 소속의 다음 활동지로, 재야는 선택한 사건 지역으로 이동한다.', dateNote: '장 사이의 합류·이동은 게임 창작이다. 정확한 역사 이동일을 의미하지 않는다.', regionIds: [], factionIds: candidates.map(l => l.id), relatedPeople: candidates.map(l => l.name), relatedOfficerIds: candidates.map(l => l.officer), source: { title: '사용자 요청 · 합류와 재야 이동 게임 창작', record: '플레이어의 지원·거절·합류·이동은 게임 창작이며 역사 인물의 실제 등용 기록이 아니다.' }, prerequisiteEventIds: priorIds, connections: [], flow: g.finish('has-lord') };
}

function collectedEvent(source, index) {
  const story = prose[source.id];
  const g = graph(story.title);
  // Admission, background and each consequence are explicit editable graph nodes.
  const contactLords = lords.filter(lord => story.factions.includes(lord.id));
  let first = 'allegiance';
  const principal = source.participants.filter(person => person.officerId);
  for (const [i,person] of principal.entries()) {
    g.condition(`principal-${i}`, eq(`world.people.person-${person.officerId}`, 'dead', 'neq'), i + 1 < principal.length ? `principal-${i+1}` : 'allegiance', 'changed-news');
  }
  if (principal.length) first = 'principal-0';
  const factions = [...new Set(['han', ...contactLords.map(lord => lord.id)])];
  for (const [i, faction] of factions.entries()) g.condition(`faction-${i}`, eq(`world.factions.${faction}`, 'defeated', 'neq'), i + 1 < factions.length ? `faction-${i+1}` : first, 'changed-news');
  first = 'faction-0';
  g.result('changed-news', '길에서 들은 소식은 예상과 달랐다. 현장의 인물들이 이미 자리를 잃거나 세상을 떠나 예정됐던 일은 그대로 이어지지 않았다고 한다.', [], 'end', 'news');
  g.condition('allegiance', eq('factionId', story.factions, 'in'), 'duty-location', 'local');
  g.condition('duty-location', eq('region', source.regionId), 'background', 'duty-march');
  g.result('duty-march', `나는 소속 일행과 ${source.regionId === 'liangzhou' ? '서방 전선의 연락 거점' : '이번 활동의 현지 거점'}으로 이동했다. 연락책은 현장에서 나눌 일을 설명해 주었다.`, [{type:'region',value:source.regionId}], 'background');
  g.condition('local', eq('region', source.regionId), 'independent', 'remote-news');
  g.condition('independent', eq('factionId', [...lords.map(l => l.id), 'yellow-turban', 'liu-yan', 'tao-qian'], 'in'), 'remote-news', 'background');
  g.result('background', source.background, contactLords.map(lord => flag(`contact-${lord.id}-${source.chapterYear}`)), 'scene', 'background');
  g.result('remote-news', source.reportedOutcome, [], 'end', 'news');
  g.choice('scene', story.scene, [
    {id:'help',title:`[${story.action}]`,description:story.thought,target:'help-check'},
    {id:'alternate',title:`[${story.alternate.action}]`,description:story.alternate.thought,target:'alternate-check'},
    {id:'observe',title:'[현지에서 연락을 기다린다]',description:'내가 감당할 수 없는 일은 맡지 말자.',target:'observed'},
  ]);
  g.check('help-check', story.checkKind, 'helped', 'failed', '맡은 일을 해낸다.', '맡은 일을 마치지 못한다.');
  g.check('alternate-check', story.alternate.checkKind, 'alternate-helped', 'alternate-failed', '상대의 확인을 받는다.', '상대의 확인을 받지 못한다.');
  g.result('helped', story.success, [flag(`${source.id}-helped`)], 'next-scene');
  g.result('failed', story.failure, [flag(`${source.id}-failed`)], 'next-scene');
  g.result('alternate-helped', story.alternate.success, [flag(`${source.id}-helped`)], 'next-scene');
  g.result('alternate-failed', story.alternate.failure, [flag(`${source.id}-failed`)], 'next-scene');
  g.result('observed', story.observe, [], 'next-scene');
  g.choice('next-scene', story.nextScene, [
    {id:'continue',title:`[${story.nextSuccessAction}]`,description:'앞서 확인한 내용을 바탕으로 마저 처리하자.',conditions:[eq(`world.flags.${source.id}-helped`,true)],target:'followed'},
    {id:'recover',title:`[${story.nextFailureAction}]`,description:'확실한 범위부터 다시 챙겨야겠다.',conditions:[eq(`world.flags.${source.id}-helped`,true,'neq')],target:'recovered'},
    {id:'wait',title:`[${story.nextWaitAction}]`,description:'여기서 할 수 있는 일을 정리하고 연락을 기다리자.',target:'waited'},
  ]);
  g.result('followed',story.nextSuccess,[],'report');
  g.result('recovered',story.nextFailure,[],'report');
  g.result('waited',story.nextWait,[],'report');
  g.result('report', source.reportedOutcome, [flag(`${source.id}-reported`)], 'end', 'outcome');
  const records = source.sourceIds.map(id => collection.sources.find(s => s.id === id));
  return { id: source.id, chapterId: chapterId(source.chapter), year: source.chapterYear, month: null, precision: source.precision, calendar: 'lunar', sequence: (index + 1) * 10, category: 'history', title: story.title, summary: [source.background, ...source.stages.map(s => s.action), source.reportedOutcome].join(' '), dateNote: source.dateNote, regionIds: [source.regionId], factionIds: story.factions, relatedPeople: source.participants.map(p => p.name), relatedOfficerIds: source.participants.flatMap(p => p.officerId ? [p.officerId] : []), source: { title: source.originalRecord ? '삼국지 권31 촉서 유이목전' : records.map(s => s.title).join(' · '), record: source.originalRecord ?? [source.background, ...source.stages.map(s => s.action), source.reportedOutcome].join(' ') }, prerequisiteEventIds: [], connections: [], flow: g.finish(first) };
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
