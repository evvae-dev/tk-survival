import { readFileSync } from 'node:fs';
const read = file => JSON.parse(readFileSync(new URL(file, import.meta.url), 'utf8'));
const collection = read('../data/collection/5-2-to-5-5.json');
const prose = read('../data/history/campaign-narrative.json');
const eq = (field, value, operator = 'eq') => ({ field, operator, value });
const flag = (key, value = true) => ({ type: 'flag', key, value });
const toward = text => { const code=text.charCodeAt(text.length-1)-0xac00; const batchim=code>=0&&code<=11171?code%28:0; return `${text}${batchim&&batchim!==8?'으로':'로'}`; };
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
  g.condition('has-lord', eq('factionId', rulerIds, 'in'), 'legacy-service', 'offers');
  g.condition('legacy-service',eq('world.flags.legacyAnnualServicePending',true),'stay-or-leave','persistent-service');
  g.result('persistent-service','기존 소속을 유지한다.',[flag('chapterFinished',false),flag('legacyAnnualServicePending',false)]);
  g.flow.nodes.find(node=>node.id==='persistent-service').data.silent=true;
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
    { id: 'travel', title: '[재야로 길을 나선다]', description: '아직 누구 밑으로 들어갈지 정하지 말자.', outcome:'나는 당장 지원할 군주를 정하지 않고 다음에 머물 지역부터 고르기로 했다.', target: 'travel' },
  ]);
  for (const lord of candidates) {
    g.check(`check-${lord.id}`, 'relationship', `accepted-${lord.id}`, `rejected-${lord.id}`, `${lord.name} 측이 지원을 받아들인다.`, `${lord.name} 측이 지원을 거절한다.`);
    const destination = lord.next[year + 1];
    g.result(`accepted-${lord.id}`, `${lord.name} 측 연락책이 내 말을 듣고 부대에 들어와도 좋다고 했다. 나는 말단 병사로 합류해 일행의 다음 길에 함께하기로 했다.`, [{ type: 'faction', value: lord.id }, { type: 'role', value: 'soldier' }, { type: 'factionStatus', factionId: lord.id, value: 'active' }, ...(destination ? [{ type: 'region', value: destination }] : []), flag('chapterFinished', false)]);
    g.result(`rejected-${lord.id}`, `${lord.name} 측 연락책은 지금 나를 받아들일 수 없다고 했다. 나는 합류하지 못한 채 짐을 챙겨 다른 길을 찾았다.`, [{ type: 'faction', value: null }, { type: 'role', value: 'civilian' }], 'travel');
  }
  g.choice('travel', '앞으로 갈 길은 내가 정해야 한다. 길에서 들은 소식을 떠올리며 지도를 대신할 표식을 땅에 그렸다. 다음에는 어느 고장으로 가 볼까.', destinations[year + 1].map(([region, label, description]) => ({ id: region, title: `[${toward(label)} 향한다]`, description, target: `choose-travel-${region}` })));
  for (const [region, label] of destinations[year + 1]) {
    g.condition(`choose-travel-${region}`,eq('region',region),`remain-${region}`,`travel-${region}`);
    const effects=[{ type: 'region', value: region }, { type: 'faction', value: null }, { type: 'role', value: 'civilian' }, flag('chapterFinished', false)];
    g.result(`travel-${region}`,`나는 ${toward(label)} 향하는 길에 올랐다. 도착하면 현지의 사람들을 만나 다음에 할 일을 찾아보기로 했다.`,effects);
    g.result(`remain-${region}`,`나는 지금 머무는 ${label}에서 다음 일을 찾아보기로 했다. 다른 고장으로 떠나는 대신 현지 사람들과 연락을 이어 갔다.`,effects);
  }
  for (const node of g.flow.nodes) if (node.type === 'result' && g.flow.edges.some(edge => edge.source === node.id && edge.target === 'end')) node.data.effects.push(flag('legacyAnnualServicePending',false));
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
    g.condition(`principal-${i}`, eq(`world.people.person-${person.officerId}`, 'dead', 'neq'), i + 1 < principal.length ? `principal-${i+1}` : 'allegiance', `missing-person-${i}`);
    g.result(`missing-person-${i}`,`${person.name}이 이미 세상을 떠나 ${source.regionId === 'liangzhou' ? '서방' : '이곳'}에서 예정됐던 활동을 이어갈 수 없다는 연락을 받았다. 나는 해당 임무를 맡지 않고 현재 거점에 남았다.`,[],'end','news');
  }
  if (principal.length) first = 'principal-0';
  const factions = [...new Set(['han', ...contactLords.map(lord => lord.id)])];
  for (const [i, faction] of factions.entries()) g.condition(`faction-${i}`, eq(`world.factions.${faction}`, 'defeated', 'neq'), i + 1 < factions.length ? `faction-${i+1}` : first, 'changed-news');
  first = 'faction-0';
  const prerequisites = first;
  const formal = [...lords.map(lord=>lord.id),'yellow-turban','liu-yan','tao-qian'];
  g.condition('relevant-faction',eq('factionId',story.factions,'in'),prerequisites,'relevant-local');
  g.condition('relevant-local',eq('region',source.regionId),'relevant-independent','remote-news');
  g.condition('relevant-independent',eq('factionId',formal,'in'),'remote-news',prerequisites);
  first='relevant-faction';
  g.result('changed-news', '길에서 들은 소식은 예상과 달랐다. 현장의 인물들이 이미 자리를 잃거나 세상을 떠나 예정됐던 일은 그대로 이어지지 않았다고 한다.', [], 'end', 'news');
  g.condition('allegiance', eq('factionId', story.factions, 'in'), 'duty-location', 'local');
  g.condition('duty-location', eq('region', source.regionId), 'entry-context', 'duty-march');
  g.result('duty-march', story.continuityEntry, [{type:'region',value:source.regionId}], 'entry-context');
  g.flow.nodes.find(node=>node.id==='duty-march').data.silent=true;
  if(story.continuityFrom) {
    g.condition('entry-context',eq(`world.flags.${story.continuityFlag ?? `${story.continuityFrom}-reported`}`,true),'arrival-known','arrival');
    g.result('arrival-known',story.continuityKnown,[],'background');
  } else g.condition('entry-context',eq('region',source.regionId),'arrival','arrival');
  g.result('arrival',story.continuityEntry,[],'background');
  g.condition('local', eq('region', source.regionId), 'independent', 'remote-news');
  g.condition('independent', eq('factionId', [...lords.map(l => l.id), 'yellow-turban', 'liu-yan', 'tao-qian'], 'in'), 'remote-news', 'entry-context');
  g.result('background', story.historicalBackground, contactLords.map(lord => flag(`contact-${lord.id}-${source.chapterYear}`)), 'scene', 'background');
  g.result('remote-news', story.historicalOutcome, [], 'end', 'news');
  g.flow.nodes.find(node=>node.id==='remote-news').data.silent=true;
  g.choice('scene', story.scene,  [
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
  g.result('report', story.historicalOutcome, [flag(`${source.id}-reported`)], 'end', 'outcome');
  if (['event-187-han-sui-claim','event-187-liu-bei-service'].includes(source.id)) {
    g.flow.edges.find(edge=>edge.source==='report').target='departure-context';
    g.condition('departure-context',eq('factionId',story.factions,'in'),'stay-at-conflict','end');
    g.choice('stay-at-conflict',source.id==='event-187-han-sui-claim' ? '한수의 투항 소식만으로 서방의 길이 모두 열린 것은 아니다. 일행은 이 거점에 남아 연락을 계속 맡겠다고 한다. 이 불확실한 길에 같이 남을지, 맡은 일을 마치고 재야로 남을지 정해야겠다.' : '관직을 떠나는 유비 일행이 짐을 나눠 들고 나를 부른다. 안희에서 하던 일은 끝났고 앞으로도 같은 사람들과 길을 갈지는 내 선택이다. 남은 짐을 내려놓고 재야로 남을 수도 있다.',[
      {id:'stay',title:'[일행과 계속 간다]',description:'지금까지 함께한 사람들과 남은 일을 마주하자.',target:'conflict-stayed'},
      {id:'leave',title:'[맡은 일을 마치고 재야로 남는다]',description:'다음 길은 내 발로 정하자.',target:'conflict-left'},
    ]);
    g.result('conflict-stayed','나는 연락책에게 일행과 계속 가겠다고 알렸다. 그는 다음 연락을 받을 곳을 알려 주었고, 나는 같은 일행의 일을 계속 맡았다.',[flag(`${source.id}-stayed`)]);
    g.result('conflict-left','나는 맡았던 일을 인계하고 일행에서 나왔다. 현재 머무는 곳에 재야로 남아 다음 목적지를 직접 고르기로 했다.',[{type:'faction',value:null},{type:'role',value:'civilian'},flag(`${source.id}-left`)]);
  }
  const records = source.sourceIds.map(id => collection.sources.find(s => s.id === id));
  return { id: source.id, chapterId: chapterId(source.chapter), year: source.chapterYear, month: null, precision: source.precision, calendar: 'lunar', sequence: (index + 1) * 10, category: 'history', title: story.title, summary: `${story.historicalBackground} ${story.historicalOutcome}`, dateNote: source.dateNote, regionIds: [source.regionId], factionIds: story.factions, relatedPeople: source.participants.map(p => p.name), relatedOfficerIds: source.participants.flatMap(p => p.officerId ? [p.officerId] : []), source: { title: source.originalRecord ? '삼국지 권31 촉서 유이목전' : records.map(s => s.title).join(' · '), record: source.originalRecord ?? [source.background, ...source.stages.map(s => s.action), source.reportedOutcome].join(' ') }, prerequisiteEventIds: [], connections: [], flow: g.finish(first) };
}

function campaignClosing(priorIds) {
 const g=graph('[남은 사람들과 다음 길 앞에서]');
 const states=[
  ['dong-zhuo','동탁군','event-187-han-sui-claim','한수의 투항 소식은 들었지만 병력이 해산했는지는 확인되지 않았다. 주민들에게 아직 확인하지 못한 길까지 안전하다고 약속할 수는 없었다.'],
  ['cao-cao','조조군','event-188-xiyuan','조조는 전군교위가 됐고 서원군의 총지휘는 건석이 맡았다. 나는 새로 편성된 군대의 지휘 계통을 확인하며 다음 명령을 기다렸다.'],
  ['liu-bei','유비군','event-187-liu-bei-service','안희의 관청을 떠나는 유비 일행과 함께하기로 했다. 머물 곳은 바뀌었어도 함께 길을 나선 사람들은 내 곁에 남았다.'],
  ['gongsun-zan','공손찬군','event-188-youzhou-settlement','유우의 회유로 반란군 연합이 약해졌다는 소식은 들었다. 피란했던 주민들이 돌아가려면 각 길목의 초소가 통행을 확인해 주어야 했다.'],
  ['sun','손견군','event-187-ou-xing','손견의 장사와 인근 군 토벌은 끝났지만, 주민들이 돌아갈 길은 각지의 연락을 받아 확인해야 했다.'],
  ['yellow-turban','황건군',null,'지나온 전투에서 지키거나 잃은 거점은 달라졌어도 살아남은 일행과의 인연은 남았다.'],
  ['liu-yan','유언군','event-188-liu-yan','유언이 면죽에 자리 잡은 뒤에도 주민들은 돌아갈 집과 연락할 사람을 찾고 있었다. 나는 새 거점에 정착한 일행과 함께 남았다.'],
  ['tao-qian','도겸군','event-187-tao-qian','도겸의 토벌로 서주의 통제력은 강화됐다. 주민들의 귀환을 돕기 위해서는 마을 사이의 통행로도 확인해야 했다.'],
 ];
 const finishEffects=[flag('chapterFinished'),flag('campaignScopeComplete')];
 for(const [i,[faction,name,activity,context]] of states.entries()) {
  g.condition(`faction-${i}`,eq('factionId',faction),activity?`${faction}-evidence`:`${faction}-status`,i+1<states.length?`faction-${i+1}`:'civilian-status');
  const status=`나는 ${name} 소속으로 {region}에 남아 있다.`;
  if(activity) {
   g.condition(`${faction}-evidence`,eq(`world.flags.${activity}-reported`,true),`${faction}-known`,`${faction}-status`);
   g.result(`${faction}-known`,`${context} ${status}`,finishEffects,'end','news');
  }
  g.result(`${faction}-status`,`${status} 나는 함께 남은 사람들과 지금까지 겪은 일을 돌아보며 앞으로도 이 일행과 길을 이어 가기로 했다.`,finishEffects,'end','news');
 }
 g.result('civilian-status','나는 어느 군주의 명령도 받지 않는 재야로 {region}에 남아 있다. 지나온 일에서 알게 된 사람들과 연락을 이어 가며 다음에 걸을 길을 내 손으로 정할 생각이다.',finishEffects,'end','news');
 return {id:'chapter-5-5-closing',chapterId:'chapter-5-5',year:188,month:null,precision:'approximate',calendar:'lunar',sequence:999,category:'history',title:'[남은 사람들과 다음 길 앞에서]',summary:'현재 소속과 지역을 유지한 채 실제로 겪은 활동과 남아 있는 상황을 돌아본다.',dateNote:'5.5 범위의 게임상 마무리이며 새 역사 사건을 뜻하지 않는다.',regionIds:[],factionIds:states.map(([id])=>id),relatedPeople:[],relatedOfficerIds:[],source:{title:'플레이어의 여정 · 게임 창작',record:'현재 게임에 저장된 소속·위치·선택을 돌아보는 장면이다.'},prerequisiteEventIds:priorIds,connections:[],flow:g.finish('faction-0')};
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

    });
    events.push(...current);
    prior = current.at(-1);
    if (year < 188) {
      const service = route(year, current.map(e => e.id));
      prior.connections.push({ targetId: service.id, label: '이번 장을 돌아보고 소속 유지·군주 합류·재야 이동' });
      events.push(service); prior = service;
    }
  }
  const finale = campaignClosing(events.filter(event=>event.year===188).map(event=>event.id));
  events.push(finale);
  const links = [
    ['event-185-liang-outbreak','event-186-meiyang','서방 토벌군의 재편 뒤 미양 전선'],
    ['event-186-meiyang','event-187-han-sui-claim','서방 반란이 남은 길목에서 투항 소식과 통행 위험을 확인'],
    ['event-187-han-sui-claim',finale.id,'서방의 실제 임무 결과와 남은 소속으로 여정 정리'],
    ['event-185-gongsun-command','event-187-zhang-rebellion','북방 종군 선발 이후 유주의 새 봉기'],
    ['event-187-zhang-rebellion','event-188-youzhou-settlement','봉기 때 피란한 주민의 귀환과 유우의 회유'],
    ['event-188-ma-xiang','event-188-liu-yan','가룡의 진압 뒤 유언 부임과 면죽의 주민 업무'],
    ['event-185-wang-fen','event-188-xiyuan','조조 연락망에서 낙양 서원군 편성으로 활동 전환'],
    ['event-187-liu-bei-service',finale.id,'관직 이탈 뒤 실제 소속과 남은 일행을 돌아봄'],
    ['event-187-ou-xing',finale.id,'장사 방면 토벌 뒤 현재 남은 사람과 거점'],
  ];
  for (const [from,to,label] of links) events.find(event=>event.id===from).connections.push({targetId:to,label});
  return events;
}
