import { applyStats, type ChoiceGrowth, type Game, type Stats } from './game';
import { abilityKeys } from './game-presentation';
import campaignNarrative from '@/data/history/campaign-narrative.json';

const campaignAbilities = new Map<string, keyof Stats>(Object.values(campaignNarrative).map(story => [story.action,
  ({ relationship: 'charisma', politics: 'politics', strategy: 'intelligence', battle: 'leadership' } as Record<string, keyof Stats>)[story.checkKind],
]));

for (const story of Object.values(campaignNarrative)) {
 campaignAbilities.set(story.alternate.action, ({relationship:'charisma',politics:'politics',strategy:'intelligence',battle:'leadership'} as Record<string,keyof Stats>)[story.alternate.checkKind]);
 for (const action of [story.nextSuccessAction,story.nextFailureAction,story.nextWaitAction]) campaignAbilities.set(action,'intelligence');
}
const groups: Record<keyof Stats, string[]> = {
  strength: ['냅다 도망친다','등무와 맞붙는다','성문까지 길을 뚫는다','돌격대를 이끈다','성벽에서 버틴다','포위선을 돌파한다','성벽에서 맞선다','죽부터 먹는다'],
  leadership: ['동탁군 앞에서 부대를 지휘한다','유비군에 맞서 진형을 지휘한다','조조군의 방어선을 돌파한다','퇴로를 막는다','유비군을 따라간다','퇴로를 확보한다','진형을 지킨다','성문을 막는다','끝까지 추격한다','토벌군 명령을 따른다','새 명령을 따른다','야습대를 이끈다','장량의 퇴로를 만든다','포위망을 지휘한다','황보숭을 따라 진격한다'],
  intelligence: ['동탁군의 보급로를 끊는다','유비군의 진격로에 매복한다','조조군의 보급 수레를 유인한다','황건적 코스프레','탁군으로 간다','광종으로 간다','좁은 길로 유인한다','매복 신호를 보낸다','유비를 따라 물러난다','추격을 멈춘다','남은 물자를 찾는다','창고에 숨는다','야습 준비를 돕는다','뒤에서 작전을 돕는다','초병을 깨운다','맡은 초소를 지킨다'],
  politics: ['황궁으로 가는 부대를 따라간다','천하통일에 나선다','거점부터 지킨다','황제를 생포하고 건국한다','완성으로 간다','한충과 협상한다','진힐에게 맡긴다','방어와 보급을 정리한다','노식의 공적을 알린다','장보에게 항복을 권한다'],
  charisma: ['유비 일행과 동행한다','조조 부대의 연락을 맡는다','일반 관군과 움직인다','관군에 붙는다','피란민을 이끈다','처형을 막는다','작은 문으로 대피시킨다','장보와 주민을 대피시킨다'],
};
export function choiceAbility(title: string): keyof Stats | undefined {
  const action = title.replace(/^\[|\]$/g, '');
  if (campaignAbilities.has(action)) return campaignAbilities.get(action);
  if (/명부|수신처|연락 순서|인원을 확인|군장을 맞춘다/.test(action)) return 'politics';
  if (/주민에게|피란민에게|주민과 연락/.test(action)) return 'charisma';
  if (action === '맡은 거점에서 대기한다' || action === '현지에서 연락을 기다린다') return 'intelligence';
  if (action.endsWith(' 휘하에 지원한다') || ['지금 소속을 따른다', '소속을 떠난다'].includes(action)) return 'charisma';
  if (action.endsWith('로 향한다') || ['재야로 길을 나선다', '무리하지 않고 지켜본다'].includes(action)) return 'intelligence';
  return abilityKeys.find(key => groups[key].includes(action));
}
export function applyChoiceGrowth(before: Game, after: Game, title: string, success?: boolean): { state: Game; growth?: ChoiceGrowth } {
  if (after.world.flags.playerExecuted) return { state: after };
  const ability = choiceAbility(title);
  if (!ability) return { state: after };
  const amount = success === true ? 2 : 1;
  // Result-node grants already applied are retained, with no duplicate grant.
  const stats = after.stats[ability] === before.stats[ability] ? applyStats(after.stats, { [ability]: amount }) : after.stats;
  const reputation = { ...after.reputation };
  if (after.factionId && (after.reputation[after.factionId] ?? 0) === (before.reputation[after.factionId] ?? 0)) reputation[after.factionId] = (reputation[after.factionId] ?? 0) + amount;
  const state = { ...after, stats, reputation, fame: (before.fame ?? 0) + amount };
  const growth: ChoiceGrowth = { stats: Object.fromEntries(abilityKeys.flatMap(key => stats[key] === before.stats[key] ? [] : [[key, stats[key] - before.stats[key]]])), fame: amount };
  return { state, growth };
}
