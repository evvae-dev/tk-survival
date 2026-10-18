import { applyStats, type ChoiceGrowth, type Game, type Stats } from './game';
import { abilityKeys } from './game-presentation';

const groups: Record<keyof Stats, string[]> = {
  strength: ['냅다 도망친다','등무와 맞붙는다','성문까지 길을 뚫는다','돌격대를 이끈다','성벽에서 버틴다','포위선을 돌파한다','성벽에서 맞선다','죽부터 먹는다'],
  leadership: ['퇴로를 막는다','유비군을 따라간다','퇴로를 확보한다','진형을 지킨다','성문을 막는다','끝까지 추격한다','토벌군 명령을 따른다','새 명령을 따른다','야습대를 이끈다','장량의 퇴로를 만든다','포위망을 지휘한다','황보숭을 따라 진격한다'],
  intelligence: ['황건적 코스프레','탁군으로 간다','광종으로 간다','좁은 길로 유인한다','매복 신호를 보낸다','유비를 따라 물러난다','추격을 멈춘다','남은 물자를 찾는다','창고에 숨는다','야습 준비를 돕는다','뒤에서 작전을 돕는다','초병을 깨운다','맡은 초소를 지킨다'],
  politics: ['완성으로 간다','한충과 협상한다','진힐에게 맡긴다','방어와 보급을 정리한다','노식의 공적을 알린다','장보에게 항복을 권한다'],
  charisma: ['관군에 붙는다','피란민을 이끈다','처형을 막는다','작은 문으로 대피시킨다','장보와 주민을 대피시킨다'],
};
export function choiceAbility(title: string): keyof Stats | undefined {
  const action = title.replace(/^\[|\]$/g, '');
  return abilityKeys.find(key => groups[key].includes(action));
}
export function applyChoiceGrowth(before: Game, after: Game, title: string, success?: boolean): { state: Game; growth?: ChoiceGrowth } {
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
