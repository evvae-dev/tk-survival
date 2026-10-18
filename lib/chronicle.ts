import type { HistoricalEvent, RecordEntry } from './game';
import { historicalEvents } from './history';
import { narrativeText } from './record-presentation';

const shared: Record<string, string> = {
  'relief-ok': '피란길을 정리하고 주민과 아이들을 안전한 곳으로 인솔',
  'relief-fail': '피란민 전체를 인솔하지 못하고 곁에 있던 일부 주민과 탈출',
  'supplies-ok': '버려진 수레에서 곡식과 천을 찾아 피란민에게 분배',
  'supplies-fail': '쓸 만한 구호 물자를 찾지 못하고 남은 물을 분배',
};
const outcomes: Record<string, Record<string, string>> = {
  'chapter-5-1-opening': {
    'join-han': '관군에 신병으로 합류', 'join-yellow': '황건군에 병사로 합류',
    'join-civilian': '군대를 피해 골목으로 빠져나와 주민들과 동행',
    'travel-north': '탁군으로 이동하여 대흥산의 황건군 집결 소식을 접함',
    'travel-south': '완성으로 이동하여 성 안팎의 대치 상황을 확인',
    'travel-central': '광종으로 이동하여 군대의 집결을 확인',
  },
  'battle-184-daxingshan': {
    historical: '관우가 정원지를, 장비가 등무를 쓰러뜨리고 유비군이 대흥산을 넘었다는 소식을 접함',
    capture: '대흥산에서 정원지와 등무를 생포하고 관군 장교가 됨',
    wounded: '공격 계획이 실패하여 후퇴하고 관우·장비의 진격을 지켜봄',
    'yellow-win': '황건군의 협공으로 유비군을 물리치고 대흥산을 지킴',
    'yellow-escape': '대흥산을 내주고 정원지·등무와 함께 탈출',
  },
  'battle-184-qingzhou-city': {
    historical: '유비군의 유인·매복과 공경의 출격으로 청주성이 구원되었다는 소식을 접함',
    blocked: '대흥산에서 물러난 유비군의 청주 구원이 막혔다는 소식을 접함',
    march: '탁군에서 부대를 따라 청주성으로 이동',
    'han-win': '출격과 매복으로 청주성 포위군을 물리치고 입성',
    'yellow-win': '유비군의 구원 작전이 저지되고 황건군의 청주성 포위가 유지됨',
  },
  'battle-184-wan': {
    'wan-background': '저공과 장만성이 죽고 조홍이 완성을 지킨다는 소식을 접함',
    historical: '조홍의 패배와 한충·손하의 죽음, 완성 함락 소식을 접함',
    'capture-city': '병사들을 이끌고 완성 성벽을 장악하여 조홍·한충·손하를 생포',
    'assault-fail': '완성 공격에 실패하여 병사들과 후퇴',
    peace: '한충의 항복을 받아들이고 손하 병력의 무장 해제를 이끌어냄',
    'yellow-win': '수비와 물자를 재편하여 조홍·한충의 완성 방어를 지원',
    evacuated: '조홍이 쓰러진 뒤 한충·손하 및 주민들과 완성에서 탈출',
  },
  'battle-184-guangzong': {
    'normal-history': '노식의 교체와 동탁의 패배 뒤 황보숭의 광종 야습 성공 및 장량 전사 소식을 접함',
    'retained-history': '지휘권을 지켜낸 노식의 광종 함락과 장량 전사 소식을 접함',
    'lu-rescued': '장부와 보고로 노식을 변호하여 지휘관 교체를 막음',
    'han-win': '야습대를 이끌고 광종의 목책을 넘어 장량을 생포',
    'escape-ok': '광종을 내주고 장량 및 잔여 병사들과 탈출',
    'yellow-win': '관군의 야습을 물리치고 광종을 지켜 하곡양 진격을 저지',
  },
  'battle-184-xiaquyang': {
    historical: '황보숭·곽전의 하곡양 함락과 장보 전사 소식을 접함',
    'already-dead': '장보가 이미 죽어 하곡양의 후속 작전이 취소됨',
    blocked: '광종의 항전으로 관군의 하곡양 진격이 막혔다는 소식을 접함',
    capture: '하곡양의 포위망을 좁혀 장보를 생포',
    peace: '조건을 제시하여 장보의 항복과 병사들의 무장 해제를 이끌어냄',
    'yellow-win': '관군의 포위선을 밀어내고 장보의 하곡양 수비를 지원',
    'escape-ok': '하곡양을 내주고 장보와 주민들을 수레 행렬에 섞어 탈출',
  },
  'chapter-5-1-closing': {
    preserved: '황건군의 일부 거점이 존속한다는 소식을 확인',
    defeated: '관군의 주요 길목 장악과 황건 주력군의 패망을 확인',
    done: '동행한 사람들과 지난 선택을 돌아보며 황건적의 난 여정을 마침',
  },
};

// Match the recorded outcome, never the chosen intention: a failed attack is not a victory.
// Text matching also supports saves made before the chronicle feature existed.
export function chronicleLines(entry: RecordEntry, catalog: HistoricalEvent[] = historicalEvents): string[] {
  const lines: { at: number; text: string }[] = [];
  for (const event of catalog) for (const node of event.flow?.nodes ?? []) {
    if (node.type !== 'result') continue;
    const source = node.data.text || node.data.label;
    const summary = outcomes[event.id]?.[node.id] ?? shared[node.id];
    if (!source || !summary) continue;
    const at = entry.detail.indexOf(source);
    if (at !== -1) lines.push({ at, text: summary });
  }
  if (lines.length) return [...new Set(lines.sort((a, b) => a.at - b.at).map(line => line.text))];
  // Unknown/custom events retain their actual prose instead of inventing a result.
  const recorded = narrativeText(entry.detail);
  return recorded ? [recorded] : [entry.title];
}

export function buildChronicle(entries: RecordEntry[]) {
  return entries.map((entry, index) => ({ entry, index }))
    .sort((a, b) => a.entry.year - b.entry.year || (a.entry.month ?? 0) - (b.entry.month ?? 0) || a.index - b.index)
    .flatMap(({ entry, index }) => chronicleLines(entry).map((text, part) => ({ year: entry.year, text, id: `${index}-${part}` })));
}
