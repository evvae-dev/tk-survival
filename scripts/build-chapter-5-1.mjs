// 수집 사실은 collection에 보존하고, 이 파일의 판정·대체 결과는 게임 창작으로 관리한다.
import { readFileSync, writeFileSync } from 'node:fs';
import { applyChapterNarrative } from './apply-chapter-narrative.mjs';
import { extendCampaign } from './campaign-flows.mjs';
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const chapter = read('data/collection/5-1-yellow-turban.json');
const entities = read('data/history/entities.json');
writeFileSync('data/reference/officer-abilities.json', JSON.stringify(read('data/reference/officers.json').map(({id,name,stats}) => ({id,name,stats}))) + '\n');
const people = new Map(chapter.people.map(p => [p.id, p]));
const sources = new Map(chapter.sourceRecords.map(p => [p.id, p]));
const places = new Map(chapter.places.map(p => [p.id, p]));
const flag = (key, value = true) => ({ type: 'flag', key, value });
const stat = (key, value) => ({ type: 'stat', key, value });
const person = (id, value) => ({ type: 'person', personId: `person-${id}`, value });
const control = (regionId, value) => ({ type: 'control', regionId, value });
const reputation = factionId => ({ type: 'reputation', factionId, value: 2 });
const field = (field, value, operator = 'eq') => ({ field, value, operator });
const win = key => field(`world.flags.${key}`, true);
const alive = id => field(`world.people.person-${id}`, 'alive');
function graph(title) {
  const flow = { nodes: [], edges: [], passiveEffects: [] };
  const add = (id, type, label, data = {}) => { flow.nodes.push({ id, type, position: { x: 0, y: 0 }, data: { label, ...data } }); return id; };
  const edge = (source, target, sourceHandle = 'next') => flow.edges.push({ id: `${source}-${sourceHandle}`, source, target, sourceHandle });
  const result = (id, text, effects = [], next = 'end') => { add(id, 'result', text, { text, effects }); edge(id, next); return id; };
  const condition = (id, label, condition, yes, no) => { add(id, 'condition', label, { condition }); edge(id, yes, 'yes'); edge(id, no, 'no'); return id; };
  const check = (id, ability, yes, no) => { add(id, 'check', '능력 판정', { check: { ability, success: '성공', failure: '실패' } }); edge(id, yes, 'yes'); edge(id, no, 'no'); return id; };
  const choice = (id, text, options) => {
    add(id, 'choice', text, { text, options: options.map(([id, title, description]) => ({ id, title, description })) });
    options.forEach(([option, , , target]) => edge(id, target, option)); return id;
  };
  add('start', 'start', title); add('end', 'end', '사건 종료');
  // 같은 깊이의 노드는 나란히 놓는다. 분기와 합류를 편집기에서 바로 볼 수 있다.
  const finish = first => {
    edge('start', first);
    const depth = new Map([['start', 0]]);
    for (let i = 0; i < flow.nodes.length; i++) for (const e of flow.edges) if (depth.has(e.source)) depth.set(e.target, Math.max(depth.get(e.target) ?? 0, depth.get(e.source) + 1));
    const rows = new Map();
    for (const n of flow.nodes) { const d = depth.get(n.id) ?? 0; const row = rows.get(d) ?? []; row.push(n); rows.set(d, row); }
    for (const [d, row] of rows) row.forEach((n, i) => { n.position = { x: (i - (row.length - 1) / 2) * 390, y: d * 340 }; });
    return flow;
  };
  return { flow, edge, result, condition, check, choice, finish };
}
const openingId = 'chapter-5-1-opening';
const closingId = 'chapter-5-1-closing';
const opening = graph('184년, 황건의 봉기');
for (const [id, faction, role] of [['han', 'han', 'civilian'], ['yellow', 'yellow-turban', 'soldier'], ['civilian', null, 'civilian']]) {
  opening.result(`join-${id}`, faction ? `${faction === 'han' ? '관군' : '황건군'}의 연락망에 들어갔다.` : '가족과 이웃을 지키는 주민의 길을 택했다.', [{ type: 'faction', value: faction }, { type: 'role', value: role }], id === 'han' ? 'han-company' : 'front');
}
opening.choice('side', '봉기가 퍼지고 있다. 당신은 어느 편에서 이 난세를 겪겠는가?', [
  ['han', '관군에 합류한다', '조정군의 토벌에 참여한다. 출신 가정의 능력과 자금이 판정에 쓰인다.', 'join-han'],
  ['yellow', '황건군에 합류한다', '봉기군의 생존과 거점 방어를 돕는다.', 'join-yellow'],
  ['civilian', '주민으로 남는다', '피란·군량·중재로 주민과 포로의 운명을 바꾼다.', 'join-civilian']]);
opening.choice('han-company', '관군의 연락책이 내가 어느 일행과 움직일지 묻는다. 유비 일행은 북쪽으로 가고 조조 부대는 후방 연락을 맡길 사람을 찾는다. 어느 쪽도 아직 내 정식 소속은 아니다.', [
 ['liu','[유비 일행과 동행한다]','북쪽으로 가는 일행의 연락을 맡아 보자.','company-liu'],
 ['cao','[조조 부대의 연락을 맡는다]','후방 연락부터 맡아 얼굴을 익히자.','company-cao'],
 ['regular','[일반 관군과 움직인다]','특정 군주보다 가까운 관군에 붙자.','company-regular'],
]);
opening.result('company-liu','나는 유비 일행의 연락을 나르며 북쪽 길을 함께 걸었다. 아직 군적에 오른 병사는 아니지만 일행은 내 얼굴을 익혔다.',[flag('chapter51AccompaniedLiuBei'),flag('chapter51AccompaniedCaoCao',false)],'travel-north');
opening.result('company-cao','나는 조조 부대의 후방 연락을 맡아 서신을 옮겼다. 연락책에게 임무를 마쳤다는 확인을 받고 관군의 중앙 전선 거점으로 향했다.',[flag('chapter51AccompaniedCaoCao'),flag('chapter51AccompaniedLiuBei',false)],'travel-central');
opening.result('company-regular','나는 가까운 관군의 연락책을 따라 움직였다. 특정 군주의 일행에 들지는 않은 채 전선을 골랐다.',[flag('chapter51AccompaniedCaoCao',false),flag('chapter51AccompaniedLiuBei',false)],'front');
const fronts = [['north', 'zhuo', '탁군·청주 전선', '연의의 대흥산·청주 전투'], ['south', 'jingzhou', '남양·완성 전선', '완성의 공방과 항복 협상'], ['central', 'jizhou', '광종·하곡양 전선', '노식의 교체와 황건 본진 토벌']];
opening.choice('front', '연락책이 세 전선의 소식을 전한다. 어느 지역에서 행동할까? 날짜가 확인되지 않은 전선 사이의 이동은 이번 테스트에서 생략한다.', fronts.map(([id, region, title, description]) => [id, title, `${description}. 이동 경로에 따라 다음 전투가 달라진다.`, `travel-${id}`]));
for (const [id, region] of fronts) opening.result(`travel-${id}`, '전선의 거점에 자리를 잡았다.', [{ type: 'region', value: region }, flag('campaignStarted')]);
opening.flow.edges.find(edge => edge.source === 'join-yellow').target = 'yellow-route';
opening.choice('yellow-route', '황건군의 다음 행보를 정한다.', [
  ['conquest', '천하통일에 나선다', '동탁군, 유비군, 조조군을 차례로 상대한다. 패배하면 처형된다.', 'begin-conquest'],
  ['defend', '거점부터 지킨다', '황건적의 난 전선으로 향한다.', 'front'],
]);
opening.result('begin-conquest', '황건군의 원정에 합류했다.', [flag('yellowConquestStarted'), flag('campaignStarted'), { type: 'region', value: 'luoyang' },
  ...['dong-zhuo', 'liu-bei', 'cao-cao'].map(factionId => ({ type: 'factionStatus', factionId, value: 'active' })),
]);
const base = { chapterId: chapter.id, year: 184, month: null, precision: 'year', calendar: 'lunar', regionIds: [], factionIds: ['han', 'yellow-turban'], category: 'history', relatedPeople: [], relatedOfficerIds: [] };
const events = [{ ...base, id: openingId, sequence: 0, title: '황건적의 난 · 진영과 전선', summary: '184년의 봉기를 배경으로 자신의 진영과 활동 전선을 정한다. 성인 테스트 인물·배치·선택은 게임 창작이다.', source: { title: '황건적의 난 · 게임 창작', record: '수집한 황건적의 난을 바탕으로 만든 참가 도입부. 원사서 기록으로 취급하지 않는다.' }, flow: opening.finish('side'), connections: chapter.events.filter(e => !['battle-184-qingzhou-city', 'battle-184-xiaquyang'].includes(e.id)).map(e => ({ targetId: e.id, label: '선택한 전선에 배치 · 다른 전선은 기본 경과' })) }];

// 사용자가 지정한 완전한 가상역사. 기존 전선을 처리하기 전에 승리/처형으로 끝난다.
const conquestId = 'chapter-5-1-yellow-conquest';
const conquest = graph('황건 천하통일 · 가상 시나리오');
conquest.condition('route', '황건 천하통일 원정에 합류했는가?', win('yellowConquestStarted'), 'dong-plan', 'end');
const opponents = [
  ['dong', '동탁', 'dong-zhuo', 'rtk14-0736', 'liu-plan', 'zhuo', ['luoyang', 'changan']],
  ['liu', '유비', 'liu-bei', 'rtk14-0952', 'cao-plan', 'chenliu', ['zhuo', 'qingzhou']],
  ['cao', '조조', 'cao-cao', 'rtk14-0521', 'emperor', 'luoyang', ['chenliu', 'yanzhou']],
];
for (const [id, name, factionId, officerId, next, region, territories] of opponents) {
  conquest.choice(`${id}-plan`, `${name}군과의 결전을 앞두고 작전을 정한다.`, [
    ['strategy', '보급로를 끊는다', '지략으로 적을 무너뜨린다.', `${id}-strategy`],
    ['battle', '부대를 지휘한다', '통솔과 무력으로 적을 무너뜨린다.', `${id}-battle`],
  ]);
  for (const ability of ['strategy', 'battle']) conquest.check(`${id}-${ability}`, ability, `${id}-victory`, `${id}-execution`);
  conquest.result(`${id}-victory`, `${name}군을 격파했다.`, [flag(`${id}ArmyDefeated`),
    { type: 'factionStatus', factionId, value: 'defeated' },
    ...territories.map(territory => control(territory, 'yellow-turban')),
    { type: 'region', value: region }, { type: 'role', value: 'officer' }, reputation('yellow-turban'),
  ], next);
  conquest.result(`${id}-execution`, `${name}군에 패배해 포로로 잡힌 뒤 처형당했다.`, [flag('playerCaptured'), flag('playerExecuted'), flag(`${id}ArmyDefeated`, false), flag('chapterFinished')]);
}
conquest.choice('emperor', '황제를 사로잡고 황건의 나라를 세운다.', [
  ['found', '황제를 생포하고 건국한다', '황건의 천하통일을 완성한다.', 'founded'],
]);
const territories = [...new Set([...entities.regions.map(region => region.id), ...chapter.places.map(place => place.id)])];
conquest.result('founded', '황제를 생포하고 황건의 나라를 세워 천하를 통일했다.', [
  flag('emperorCaptured'), flag('yellowEmpireFounded'), flag('yellowUnification'), flag('chapterFinished'),
  { type: 'factionStatus', factionId: 'han', value: 'defeated' },
  { type: 'factionStatus', factionId: 'yellow-turban', value: 'preserved' },
  ...territories.map(territory => control(territory, 'yellow-turban')),
]);
events.push({ ...base, id: conquestId, sequence: 0, title: '황건 천하통일 · 가상 시나리오',
  summary: '사용자 지정 가상역사: 황건군으로 동탁군 → 유비군 → 조조군을 차례로 격파한다. 세 전투 승리 후 황제를 생포하고 황건의 나라를 세워 천하를 통일한다. 어느 전투든 패배하면 생포·처형으로 즉시 종료한다.',
  dateNote: '184년·20세 테스트 안에서 진행하는 가상 원정이다. 실제 역사 연대나 후속 장의 수집 사실을 뜻하지 않는다.',
  regionIds: ['luoyang', 'zhuo', 'chenliu'], factionIds: ['yellow-turban', 'dong-zhuo', 'liu-bei', 'cao-cao', 'han'],
  relatedPeople: ['동탁', '유비', '조조'], relatedOfficerIds: opponents.map(opponent => opponent[3]),
  source: { title: '사용자 지정 · 가상역사 게임 창작', record: '동탁군·유비군·조조군의 순차 격파와 황제 생포·황건 건국은 사용자 요청으로 구성한 게임 창작이다. 사서 기록이나 새로 수집한 역사 사건으로 취급하지 않는다.' },
  prerequisiteEventIds: [openingId], connections: [], flow: conquest.finish('route'),
});
events[0].connections.push({ targetId: conquestId, label: '황건군 합류 → 천하통일 원정 / 전투 패배 시 처형' });

function battle(source, index, build) {
  const g = graph(source.title);
  const region = places.get(source.placeIds[0]).parentRegionId;
  const currentPeople = source.participants.map(p => people.get(p.personId));
  const sourceRecord = sources.get(source.sourceRecordIds[0]);
  const result = build(g, source, region);
  // 비참가자도 선택한 전선에서 주민 경로를 이용한다. 다른 전선은 NPC 기본 경과를 기록한다.
  g.condition('location', '해당 전선에 있는가?', field('region', region), 'side-han', result.baseline);
  g.condition('side-han', '관군 소속인가?', field('factionId', 'han'), result.han, 'side-yellow');
  g.condition('side-yellow', '황건군 소속인가?', field('factionId', 'yellow-turban'), result.yellow, 'civilian');
  g.choice('civilian', '군대가 마을을 지나간다. 민간인의 선택도 보급과 생존에 영향을 준다.', [
    ['relief', '피란민의 길을 연다', '매력 60 이상이면 더 많은 주민을 대피시킨다.', 'relief-check'],
    ['supplies', '식량을 모아 나눈다', '지력을 바탕으로 버려진 수레에서 물자를 구한다.', 'supplies-check'],
    ['hide', '가족과 몸을 숨긴다', '전투는 기본 경과로 진행하고 가족의 안전을 지킨다.', result.baseline]]);
  const refuge = `${source.id}-refugees`;
  g.check('relief-check', 'charisma', 'relief-ok', 'relief-fail');
  g.result('relief-ok', '이웃의 신뢰를 얻어 피란로를 열었다. 전장 승패는 바꾸지 않았다.', [flag(refuge), stat('charisma', 2)], result.baseline);
  g.result('relief-fail', '사람들을 모으지 못해 가족과 소규모로 대피했다.', [], result.baseline);
  g.check('supplies-check', 'intelligence', 'supplies-ok', 'supplies-fail');
  g.result('supplies-ok', '구호 식량을 마련해 주민의 피해를 줄였다.', [flag(refuge), stat('charisma', 2)], result.baseline);
  g.result('supplies-fail', '식량을 확보하지 못했다. 부채를 지지 않고 가족을 지켰다.', [], result.baseline);
  const first = result.first ?? 'location';
  events.push({ ...base, id: source.id, sequence: index + 1, title: source.title, summary: source.overview, category: source.category, precision: source.historicalDate.precision, dateNote: source.historicalDate.dateNote, regionIds: [region], relatedPeople: [...new Set(currentPeople.map(p => p.name))], relatedOfficerIds: [...new Set(currentPeople.flatMap(p => p.officerId ? [p.officerId] : []))], source: { title: sourceRecord.work, record: sourceRecord.secondarySummary }, prerequisiteEventIds: [openingId, ...(source.id === 'battle-184-qingzhou-city' ? ['battle-184-daxingshan'] : source.id === 'battle-184-xiaquyang' ? ['battle-184-guangzong'] : [])], connections: [], flow: g.finish(first) });
}

battle(chapter.events[0], 0, g => {
  const baseline = g.result('historical', '연의 기본 경과: 장비가 등무를, 관우가 정원지를 쓰러뜨리고 유비군이 승리했다.', [flag('daxingshanHanVictory'), person('rtk14-0746', 'dead'), person('rtk14-0690', 'dead'), control('place-daxingshan', 'han')]);
  g.choice('han-plan', '정원지·등무의 군대와 대흥산에서 맞섰다. 관우와 장비의 출진 전에 당신의 임무를 정한다.', [
    ['duel', '등무를 직접 상대한다', '무력 65 이상: 적 지휘부를 포로로 잡아 기본 사망 경과를 바꾼다.', 'duel-check'],
    ['command', '측면 부대를 지휘한다', '통솔 60 이상: 적의 퇴로를 장악하고 승리한다.', 'command-check'],
    ['follow', '유비군의 작전을 따른다', '원페이지의 전투 경과로 진행한다.', baseline]]);
  g.check('duel-check', 'strength', 'capture', 'wounded');
  g.check('command-check', 'leadership', 'capture', 'wounded');
  g.result('capture', '당신의 활약으로 정원지와 등무를 포로로 잡았다. 청주 구원에 나설 여력이 생겼다. (가상역사)', [flag('daxingshanHanVictory'), flag('daxingshanCapturedLeaders'), control('place-daxingshan', 'han'), reputation('han'), { type: 'role', value: 'officer' }]);
  g.result('wounded', '돌파에 실패해 부상을 입었다. 관우와 장비가 전열을 수습했다.', [], baseline);
  g.choice('yellow-plan', '유비군이 다가온다. 등무와 정원지에게 어떤 방책을 제시할까?', [
    ['ambush', '유비군을 좁은 길로 유인한다', '지력 60 이상: 유비군을 물리쳐 청주 구원 경로를 끊는다.', 'ambush-check'],
    ['withdraw', '수령들의 퇴로를 확보한다', '통솔 60 이상: 전투에서는 패해도 두 수령의 생존을 지킨다.', 'withdraw-check'],
    ['fight', '기존 진형을 유지한다', '관우·장비와의 대결은 원페이지 경과를 따른다.', baseline]]);
  g.check('ambush-check', 'intelligence', 'yellow-win', 'wounded');
  g.result('yellow-win', '매복이 성공했다. 유비군은 물러나고 연의의 청주 구원전은 이 경로에서 성립하지 않는다. (가상역사)', [flag('daxingshanYellowVictory'), flag('yellowStronghold'), control('place-daxingshan', 'yellow-turban'), reputation('yellow-turban')]);
  g.check('withdraw-check', 'leadership', 'yellow-escape', 'wounded');
  g.result('yellow-escape', '수령들을 구출했으나 전장은 유비군에 내주었다. 청주로 향하는 유비군의 진로는 열렸다. (가상역사)', [flag('daxingshanHanVictory'), flag('daxingshanLeadersEscaped'), control('place-daxingshan', 'han'), reputation('yellow-turban')]);
  return { baseline, han: 'han-plan', yellow: 'yellow-plan' };
});

battle(chapter.events[1], 1, g => {
  const baseline = g.result('historical', '연의 기본 경과: 유비의 유인·관우와 장비의 매복·공경의 성내 호응으로 청주 포위가 풀렸다.', [flag('qingzhouRelieved'), control('place-qingzhou-city-novel', 'han')]);
  g.condition('previous-victory', '대흥산에서 유비군이 진격로를 열었는가?', win('daxingshanHanVictory'), 'move-check', 'blocked');
  g.result('blocked', '대흥산에서 유비군이 물러나 청주 구원전의 전제가 사라졌다. 청주는 황건군의 압박 아래 남았다. (가상역사)', [flag('qingzhouRescueBlocked'), flag('yellowStronghold'), control('place-qingzhou-city-novel', 'yellow-turban')]);
  g.condition('move-check', '탁군 전선에 있는가?', field('region', 'zhuo'), 'march', 'location');
  g.result('march', '탁군 전선의 부대를 따라 청주로 이동했다.', [{ type: 'region', value: 'qingzhou' }], 'location');
  g.choice('han-plan', '공경이 지키는 성이 포위됐다. 유비의 유인 작전과 성내 호응을 어떻게 맞출까?', [
    ['trap', '매복 신호를 조율한다', '지력 60 이상: 세 방향의 공격을 맞춘다. 실패하면 구원군이 고립된다.', 'trap-check'],
    ['charge', '성문으로 돌격로를 연다', '통솔 65 이상: 성 안의 군대와 합류한다.', 'charge-check'],
    ['follow', '유비의 지휘를 따른다', '연의의 기본 작전으로 진행한다.', baseline]]);
  g.check('trap-check', 'intelligence', 'han-win', 'yellow-win');
  g.check('charge-check', 'leadership', 'han-win', 'yellow-win');
  g.result('han-win', '성 안팎의 신호를 맞춰 포위를 풀었다. (가상역사)', [flag('qingzhouRelieved'), control('place-qingzhou-city-novel', 'han'), reputation('han')]);
  g.choice('yellow-plan', '유비군이 퇴각하는 듯하다. 성내 병력의 움직임도 포착됐다.', [
    ['detect', '추격을 멈추고 매복을 찾는다', '지력 60 이상: 유인책을 간파해 포위를 유지한다.', 'detect-check'],
    ['hold', '성문을 봉쇄하고 진형을 재편한다', '통솔 65 이상: 성내 호응을 막는다.', 'hold-check'],
    ['pursue', '퇴각하는 군대를 추격한다', '연의의 매복 작전이 진행된다.', baseline]]);
  g.check('detect-check', 'intelligence', 'yellow-win', baseline);
  g.check('hold-check', 'leadership', 'yellow-win', baseline);
  g.result('yellow-win', '구원군의 작전이 무너졌다. 황건군이 청주 일대의 전세를 유지한다. (가상역사)', [flag('qingzhouYellowVictory'), flag('yellowStronghold'), control('place-qingzhou-city-novel', 'yellow-turban'), { ...reputation('yellow-turban'), when: field('factionId', 'yellow-turban') }]);
  return { baseline, han: 'han-plan', yellow: 'yellow-plan', first: 'previous-victory' };
});

battle(chapter.events[2], 2, g => {
  g.result('wan-background', '수집본의 완성 전개: 봉기 중 저공이 전사하고, 진힐이 장만성을 격파했다. 조홍이 점거한 완성의 공방이 시작된다.', [{ type: 'person', personId: 'person-fb5936f94991', value: 'dead' }, person('rtk14-0660', 'dead')], 'location');
  const deaths = ['rtk14-0660', 'rtk14-0620', 'rtk14-0173'].map(id => person(id, 'dead'));
  const baseline = g.result('historical', '수집본 기본 경과: 장만성·조홍의 패망 뒤 한충이 항복했으나 진힐에게 죽고, 손하의 저항도 진압됐다. 손하는 장수 자료의 동명이인과 연결하지 않는다.', [...deaths, { type: 'person', personId: 'person-b8fbc382199a', value: 'dead' }, flag('wanHanVictory'), control('place-wan', 'han')]);
  g.choice('han-plan', '장만성의 봉기와 조홍의 완성 점거 뒤, 주준의 토벌군이 성을 압박한다. 공격과 항복 협상 중 무엇을 맡을까?', [
    ['assault', '포위망의 돌파 작전을 맡는다', '통솔 65 이상: 성을 장악하고 수령들을 포로로 잡는다.', 'assault-check'],
    ['negotiate', '한충과 항복 조건을 협상한다', '지력 60 이상: 항복 협상과 포로 보호 단계로 이어진다.', 'negotiate-check'],
    ['follow', '토벌군의 명령을 따른다', '수집본의 기본 전개로 진행한다.', baseline]]);
  g.check('assault-check', 'leadership', 'capture-city', 'assault-fail');
  g.result('capture-city', '완성의 방어선을 무너뜨리고 조홍·한충·손하를 포로로 확보했다. 장만성의 앞선 패망은 되돌리지 않았다. (가상역사)', [person('rtk14-0660', 'dead'), flag('wanHanVictory'), flag('wanCapturedLeaders'), control('place-wan', 'han'), reputation('han')]);
  g.result('assault-fail', '성벽을 넘지 못하고 부상을 입었다. 장기 포위는 계속됐다.', [], baseline);
  g.check('negotiate-check', 'intelligence', 'surrender', baseline);
  g.choice('surrender', '한충이 항복을 청했다. 진힐이 포로를 처형하려 한다. 이제 누구의 명령을 따를까?', [
    ['protect', '항복 조건을 지키도록 설득한다', '매력 60 이상: 한충과 잔여 병력의 안전을 보장한다.', 'protect-check'],
    ['handover', '진힐에게 처분을 맡긴다', '한충과 잔여 병력의 운명은 기본 경과를 따른다.', baseline]]);
  g.check('protect-check', 'charisma', 'peace', baseline);
  g.result('peace', '한충의 항복을 보장하고 손하의 잔여 병력도 무장 해제했다. 추가 학살을 막고 완성을 회복했다. (가상역사)', [person('rtk14-0660', 'dead'), person('rtk14-0620', 'dead'), flag('wanNegotiated'), flag('wanHanVictory'), control('place-wan', 'han'), reputation('han')]);
  g.choice('yellow-plan', '완성의 수령들이 교체되고 포위망이 좁혀진다. 남은 병력과 주민을 어떻게 지킬까?', [
    ['defend', '성의 보급과 방어를 재편한다', '통솔 65 이상: 완성을 지켜 황건군 거점을 남긴다.', 'defend-check'],
    ['evacuate', '한충과 주민의 퇴로를 마련한다', '지력 60 이상: 성은 내주되 한충·손하와 주민을 구한다.', 'evacuate-check'],
    ['resist', '기존 방어를 유지한다', '수집본 기본 경과로 진행한다.', baseline]]);
  g.check('defend-check', 'leadership', 'yellow-win', baseline);
  g.result('yellow-win', '장만성의 패망 이후 성의 방어를 재편해 조홍·한충의 지휘망을 지켰다. (가상역사)', [person('rtk14-0660', 'dead'), flag('wanYellowVictory'), flag('yellowStronghold'), control('place-wan', 'yellow-turban'), reputation('yellow-turban')]);
  g.check('evacuate-check', 'intelligence', 'evacuated', baseline);
  g.result('evacuated', '조홍의 패망 뒤 한충·손하와 주민을 대피시켰다. 완성은 관군의 손에 넘어갔다. (가상역사)', [person('rtk14-0660', 'dead'), person('rtk14-0620', 'dead'), flag('wanLeadersEscaped'), flag('wanHanVictory'), control('place-wan', 'han'), reputation('yellow-turban')]);
  return { baseline, han: 'han-plan', yellow: 'yellow-plan', first: 'wan-background' };
});

battle(chapter.events[3], 3, g => {
  const baseline = g.result('historical', '수집본 기본 경과: 좌풍의 참소로 노식이 교체되고 동탁이 패했다. 황보숭의 야습으로 광종이 무너지고 장량이 전사했다. 장보 결말의 중복 서술은 수집본에 보존하고 실제 생존 판정은 하곡양에서 처리한다.', [person('rtk14-0664', 'dead'), flag('guangzongHanVictory'), control('place-guangzong', 'han')]);
  const normal = g.flow.nodes.find(n => n.id === baseline);
  const original = { ...normal.data };
  normal.type = 'condition'; normal.data = { label: '노식의 지휘가 유지됐는가?', condition: win('luZhiRetained') };
  g.flow.edges = g.flow.edges.filter(e => e.source !== baseline);
  g.edge(baseline, 'retained-history', 'yes'); g.edge(baseline, 'normal-history', 'no');
  g.result('normal-history', original.text, original.effects);
  g.result('retained-history', '노식의 지휘가 유지된 세계에서 관군의 야습이 성공했다. 장량이 전사하고 광종이 함락됐다. 동탁의 지휘관 교체·패배 경로는 적용하지 않았다. (가상역사)', original.effects);
  g.choice('han-plan', '노식의 포위가 이어지던 중 좌풍의 참소가 조정에 전해진다. 장수 교체와 토벌 계획에 어떻게 대응할까?', [
    ['expose', '노식의 공적을 입증한다', '지력 60 이상: 교체를 막고 야습 지휘에 통솔 보너스 10을 얻는다.', 'expose-check'],
    ['prepare', '황보숭의 야습 준비를 돕는다', '노식 교체와 동탁 패배 뒤 후속 야습을 준비한다.', 'night'],
    ['follow', '조정의 명령을 따른다', '수집본의 기본 경과로 진행한다.', baseline]]);
  g.check('expose-check', 'intelligence', 'lu-rescued', 'night');
  g.result('lu-rescued', '좌풍의 참소를 반박해 노식의 지휘를 유지했다. 동탁으로의 지휘관 교체 경로는 성립하지 않는다. (가상역사)', [flag('luZhiRetained'), stat('leadership', 2), reputation('han')], 'night');
  g.choice('night', '광종의 밤, 적의 경계가 느슨해졌다. 누가 포위망과 돌입대를 맡을까?', [
    ['lead', '야습 부대를 직접 지휘한다', '통솔 65 이상: 광종을 점령하고 장량을 포로로 잡는다. 실패하면 황건군이 방어한다.', 'night-check'],
    ['support', '주장의 작전을 지원한다', '장량의 결말은 기본 전투 경과를 따른다.', baseline]]);
  g.check('night-check', 'leadership', 'han-win', 'yellow-win');
  g.result('han-win', '야습이 성공해 장량을 포로로 잡았다. 하곡양으로 향하는 관군의 길이 열렸다. (가상역사)', [flag('guangzongHanVictory'), flag('zhangLiangCaptured'), control('place-guangzong', 'han'), reputation('han')]);
  g.choice('yellow-plan', '지휘관 교체로 관군의 공세가 흔들렸지만 야습의 징후가 보인다.', [
    ['guard', '밤의 경계와 교대 근무를 강화한다', '통솔 65 이상: 광종을 지켜 하곡양 후속 공세를 차단한다.', 'guard-check'],
    ['escape', '장량과 잔여 병력의 퇴로를 확보한다', '지력 60 이상: 광종은 내주되 장량을 구한다.', 'escape-check'],
    ['wait', '기존 방어를 유지한다', '수집본 기본 경과로 진행한다.', baseline]]);
  g.check('guard-check', 'leadership', 'yellow-win', baseline);
  g.check('escape-check', 'intelligence', 'escape-ok', baseline);
  g.result('escape-ok', '장량을 구했으나 광종은 관군에 넘어갔다. 하곡양은 다음 공격을 대비해야 한다. (가상역사)', [flag('guangzongHanVictory'), flag('zhangLiangEscaped'), control('place-guangzong', 'han'), reputation('yellow-turban')]);
  g.result('yellow-win', '광종의 야습이 실패하고 황건 지휘망이 유지됐다. 황보숭의 역사상 하곡양 북상 경로는 이 세계에서 차단된다. (가상역사)', [flag('guangzongYellowVictory'), flag('yellowStronghold'), control('place-guangzong', 'yellow-turban'), { ...reputation('yellow-turban'), when: field('factionId', 'yellow-turban') }]);
  return { baseline, han: 'han-plan', yellow: 'yellow-plan' };
});

battle(chapter.events[4], 4, g => {
  const baseline = g.result('historical', '수집본 기본 경과: 광종 이후 황보숭과 곽전이 하곡양을 공격해 장보의 군대를 무너뜨렸다. 장보는 이 실행 경로에서 한 번만 사망 처리한다.', [person('rtk14-0659', 'dead'), flag('xiaquyangHanVictory'), control('place-xiaquyang', 'han')]);
  g.condition('zhang-bao-alive', '장보가 살아 있는가?', alive('rtk14-0659'), 'previous-front', 'already-dead');
  g.result('already-dead', '장보가 앞선 편집·분기에서 이미 사망했다. 장보가 지휘하는 하곡양 전투는 열리지 않는다.', [flag('xiaquyangCancelled')]);
  g.condition('previous-front', '광종을 관군이 점령했는가?', win('guangzongHanVictory'), 'location', 'blocked');
  g.result('blocked', '광종 방어선이 유지되어 관군의 하곡양 후속 공격이 성립하지 않았다. 장보의 세력이 남았다. (가상역사)', [flag('xiaquyangAttackBlocked'), flag('yellowStronghold')]);
  g.choice('han-plan', '황보숭이 곽전과 합류해 하곡양을 압박한다. 마지막 공격과 협상 중 무엇을 맡을까?', [
    ['assault', '포위망을 지휘한다', '통솔 65 이상: 장보를 포로로 잡는다. 실패하면 황건군이 포위망을 뚫는다.', 'assault-check'],
    ['offer', '장보에게 항복을 권한다', '매력 65 이상: 장보의 생존을 보장하고 성을 넘겨받는다.', 'offer-check'],
    ['follow', '황보숭의 공격에 합류한다', '수집본의 기본 결말로 진행한다.', baseline]]);
  g.check('assault-check', 'leadership', 'capture', 'yellow-win');
  g.check('offer-check', 'charisma', 'peace', baseline);
  g.result('capture', '장보를 생포해 황건군 지휘부를 무장 해제했다. (가상역사)', [flag('xiaquyangHanVictory'), flag('zhangBaoCaptured'), control('place-xiaquyang', 'han'), reputation('han')]);
  g.result('peace', '장보가 항복 조건을 받아들였다. 관군이 성을 접수하고 포로의 생존을 보장했다. (가상역사)', [flag('xiaquyangHanVictory'), flag('zhangBaoSurrendered'), control('place-xiaquyang', 'han'), reputation('han')]);
  g.choice('yellow-plan', '광종이 무너진 뒤 관군이 하곡양으로 향한다. 장보와 남은 병력이 마지막 결정을 기다린다.', [
    ['breakout', '포위망을 돌파해 거점을 지킨다', '통솔 65 이상: 장보의 군대를 보존하고 기주 거점을 유지한다.', 'breakout-check'],
    ['evacuate', '주민과 지휘부를 대피시킨다', '지력 60 이상: 거점은 내주되 장보와 주민을 구한다.', 'evacuate-check'],
    ['resist', '정면에서 저항한다', '수집본 기본 전개로 진행한다.', baseline]]);
  g.check('breakout-check', 'leadership', 'yellow-win', baseline);
  g.result('yellow-win', '포위망을 뚫고 장보의 군대를 재편했다. 황건 거점이 남았다. (가상역사)', [flag('xiaquyangYellowVictory'), flag('yellowStronghold'), control('place-xiaquyang', 'yellow-turban'), { ...reputation('yellow-turban'), when: field('factionId', 'yellow-turban') }]);
  g.check('evacuate-check', 'intelligence', 'escape-ok', baseline);
  g.result('escape-ok', '장보와 주민은 살아서 피신했다. 관군이 하곡양을 접수했다. (가상역사)', [flag('xiaquyangHanVictory'), flag('zhangBaoEscaped'), control('place-xiaquyang', 'han'), reputation('yellow-turban')]);
  return { baseline, han: 'han-plan', yellow: 'yellow-plan', first: 'zhang-bao-alive' };
});

events.find(e => e.id === 'battle-184-daxingshan').connections.push({ targetId: 'battle-184-qingzhou-city', label: '유비군 진격 성공 → 구원전 / 패배 → 구원전 취소' });
events.find(e => e.id === 'battle-184-guangzong').connections.push({ targetId: 'battle-184-xiaquyang', label: '광종 함락·장보 생존 → 공격 / 광종 방어 → 공격 차단' });
const ending = graph('황건적의 난 · 달라진 결말');
ending.condition('survival', '황건군이 지킨 거점이 있는가?', win('yellowStronghold'), 'preserved', 'defeated');
ending.result('preserved', '주요 전선 가운데 황건군이 보존한 거점이 남았다. 황건 주력의 일괄 궤멸은 적용하지 않는다. (가상역사)', [{ type: 'factionStatus', factionId: 'yellow-turban', value: 'preserved' }], 'record');
ending.result('defeated', '토벌군이 주요 전선을 장악했다. 살아남은 포로와 피란민의 운명은 개별 분기 결과대로 남긴다.', [{ type: 'factionStatus', factionId: 'yellow-turban', value: 'defeated' }], 'record');
ending.choice('record', '전장의 결과와 인물들의 생존이 정해졌다. 당신의 선택을 기록한다.', [['done', '5.1의 결과를 확인한다', '다음 장은 아직 수집하지 않았다. 184년 테스트를 마친다.', 'done']]);
ending.result('done', '5.1의 선택과 달라진 세계를 기록했다.', [flag('chapterFinished')]);
events.push({ ...base, id: closingId, sequence: 6, title: '황건적의 난 · 달라진 결말', summary: '각 전선의 결과를 모아 황건 주력군의 패망 또는 거점 존속을 판정한다. 개별 인물의 생존은 앞선 선택을 유지한다.', source: { title: '황건적의 난 · 게임 창작', record: '수집한 기본 결말과 플레이어의 분기를 종합하는 게임 창작 판정.' }, prerequisiteEventIds: chapter.events.map(e => e.id), connections: [], flow: ending.finish('survival') });
for (const e of events.filter(e => ['battle-184-qingzhou-city', 'battle-184-wan', 'battle-184-xiaquyang'].includes(e.id))) e.connections.push({ targetId: closingId, label: '전선 승패·피란·포로 생존을 최종 결말에 반영' });
const authored = applyChapterNarrative(events);
const playerNarrative = read('data/history/narrative-5-1.json');
for (const event of authored) if (playerNarrative.events[event.id]?.historicalSummary) event.source.record = playerNarrative.events[event.id].historicalSummary;
const backgrounds = {
 'battle-184-daxingshan':'정원지가 황건군 5만 명을 이끌고 탁군을 침략했다. 유주자사 유언은 유비에게 병력 500명을 주어 맞서도록 했다.',
 'battle-184-qingzhou-city':'청주성이 황건군의 포위에 놓였다. 공경은 성 안에서 버티고 있고 유비 일행은 구원할 길을 찾고 있다.',
 'battle-184-guangzong':'노식의 관군이 광종의 황건군을 포위하고 있다. 조정의 감찰과 지휘관 교체 문제가 군영의 새 갈등으로 떠올랐다.',
 'battle-184-xiaquyang':'광종을 지나 북상하는 관군이 하곡양의 황건군과 맞서려 한다. 장보의 병력이 이곳에 남아 있다.',
};
for (const event of authored) {
 if (!event.id.startsWith('battle-')) continue;
 const flow = event.flow;
 for (const node of flow.nodes) {
  if (['historical','normal-history','retained-history'].includes(node.id) && node.type === 'result') node.data.recordType = 'outcome';
  if (node.id === 'wan-background') node.data.recordType = 'background';
  if (['blocked','already-dead'].includes(node.id)) node.data.recordType = 'news';
 }
 if (backgrounds[event.id]) {
  // Entry after cancellation checks: a cancelled battle never introduces a local scene.
  const arrival = flow.edges.find(edge => edge.source === 'location' && edge.sourceHandle === 'yes');
  const target = arrival.target; arrival.target = 'battle-background';
  flow.nodes.push({id:'battle-background',type:'result',position:{x:-420,y:600},data:{label:'전선의 사정',text:backgrounds[event.id],effects:[],recordType:'background'}});
  flow.edges.push({id:'battle-background:next',source:'battle-background',target,sourceHandle:'next'});
 }
}
const campaign = extendCampaign(authored);
writeFileSync('data/history/events.json', JSON.stringify(campaign, null, 2) + '\n');
console.log(`5.1 실행 사건 ${events.length}개 생성`);
writeFileSync('data/history/catalog-metadata.json', JSON.stringify({ edition: '5.1-5.5-records-v2', eventCount: campaign.length, yearRange: [184, 188], sourceBattleCount: 5, fictionalCampaignCount: 1, collectionFile: 'data/collection/5-2-to-5-5.json', note: '5.1 기존 전선·원정 유지, 군주 합류·재야 이동 4개, 5.2~5.5 수집 사건 16개. 연표의 장 배치와 실제 연대 이견은 dateNote와 수집본에 보존.' }, null, 2) + '\n');
console.log(`5.5까지 실행 사건 ${campaign.length}개 생성`);
