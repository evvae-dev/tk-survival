import type { Choice } from './event-engine';
import conquestArtwork from '@/data/history/conquest-artwork.json';
import type { Artwork } from './artwork';
export type ChoiceArt = Artwork;
// Deliberate title mapping: the same option ID (e.g. follow) may mean a different action.
const scenes: Record<string, [string, string]> = {
  '관군에 붙는다': ['han', '관군 병사들에게 다가가는 주인공'],
  '황건적 코스프레': ['yellow', '누런 두건으로 황건적 사이에 섞이는 주인공'],
  '냅다 도망친다': ['run', '골목으로 달아나는 주인공'],
  '피란민을 이끈다': ['relief', '피란민과 함께 길을 나서는 주인공'],
  '남은 물자를 찾는다': ['supplies', '수레의 곡식 자루를 살펴보는 주인공'],
  '창고에 숨는다': ['hide', '나무 창고에 몸을 숨긴 주인공'],
  '탁군으로 간다': ['travel-wagons', '주인공이 세 갈래 길에서 탁군으로 떠나는 수레를 고른다'],
  '완성으로 간다': ['travel-wagons', '주인공이 세 갈래 길에서 완성으로 떠나는 수레를 고른다'],
  '광종으로 간다': ['travel-wagons', '주인공이 세 갈래 길에서 광종으로 떠나는 수레를 고른다'],
};
export function choiceArt(choice: Pick<Choice, 'title' | 'artwork'>): ChoiceArt | null {
  if (choice.artwork !== undefined) return choice.artwork;
  const title = choice.title.replace(/^\[|\]$/g, '');
  const conquest = (conquestArtwork.choices as Record<string, Artwork>)[title];
  if (conquest) return conquest;
  const scene = scenes[title];
  return scene ? { src: `/art/choices/${scene[0]}.png`, alt: scene[1] } : null;
}
export const additionalScenes: Record<string, [string, string]> = {
  '등무와 맞붙는다': ['duel', '죽창을 들고 황건적과 맞서는 주인공'],
  '퇴로를 막는다': ['block', '좁은 길의 퇴로를 막는 주인공'],
  '유비군을 따라간다': ['follow', '유비와 군대를 따라가는 주인공'],
  '좁은 길로 유인한다': ['yellow-lure', '누런 두건의 주인공이 적인 관우·장비를 좁은 길로 유인한다'],
  '퇴로를 확보한다': ['yellow-retreat', '누런 두건의 주인공이 황건적 동료들의 퇴로를 열고 관군을 피한다'],
  '진형을 지킨다': ['yellow-formation', '누런 두건의 주인공이 황건적 진형에서 적인 관우·장비와 맞선다'],
  '매복 신호를 보낸다': ['han-ambush', '관군 편 주인공이 아군 관우·장비와 수풀에 숨어 황건적을 향한 매복 신호를 보낸다'],
  '성문까지 길을 뚫는다': ['han-assault', '주인공이 관군 병사들과 방패를 들고 황건적이 지키는 성벽 아래로 진격한다'],
  '유비를 따라 물러난다': ['han-retreat', '주인공이 아군 유비와 함께 물러나며 뒤쫓는 황건적을 유인한다'],
  '추격을 멈춘다': ['yellow-stop', '누런 두건의 주인공이 황건적 동료들의 추격을 멈추고 적 유비군과 수풀을 살핀다'],
  '성문을 막는다': ['yellow-gate', '누런 두건의 주인공이 관군의 진입을 막으려고 성문을 닫는다'],
  '끝까지 추격한다': ['yellow-pursue', '누런 두건의 주인공이 황건적 동료들과 함께 앞서 물러나는 관군을 추격한다'],
  '돌격대를 이끈다': ['han-assault', '주인공이 관군 돌격대와 방패를 맞추고 황건적 성벽 아래로 진격한다'],
  '한충과 협상한다': ['negotiate', '황건적 지휘관과 대화하는 주인공'],
  '토벌군 명령을 따른다': ['han-assault', '주인공이 관군의 명령에 따라 방패를 머리 위로 들고 성벽 아래에서 움직인다'],
  '처형을 막는다': ['han-prisoners-protest', '주인공이 묶인 황건적 포로와 칼을 든 관군 사이에서 처형을 막는다'],
  '진힐에게 맡긴다': ['han-prisoners-witness', '주인공이 끼어들지 못한 채 관군이 묶인 황건적 포로를 맡아가는 모습을 지켜본다'],
  '방어와 보급을 정리한다': ['yellow-supplies', '누런 두건의 주인공이 황건적 성벽 안에서 보급 자루와 방어 배치를 정리한다'],
  '작은 문으로 대피시킨다': ['yellow-evacuate', '누런 두건의 주인공이 황건적 동료들과 주민을 작은 문으로 대피시킨다'],
  '성벽에서 버틴다': ['yellow-wall', '누런 두건의 주인공이 성벽 위에서 올라오는 관군의 사다리를 밀어낸다'],
  '노식의 공적을 알린다': ['official', '관리에게 노식의 공적을 설명하는 주인공'],
  '야습 준비를 돕는다': ['han-night-prepare', '주인공이 관군 편에서 황건적 목책을 넘을 밧줄과 사다리를 준비한다'],
  '새 명령을 따른다': ['han', '관군 병사들에게 명령을 듣는 주인공'],
  '야습대를 이끈다': ['han-night-lead', '주인공이 관군 야습대의 맨 앞에서 황건적 군영을 향해 돌진한다'],
  '뒤에서 작전을 돕는다': ['han-night-support', '주인공이 관군 후방에서 밧줄을 당기며 황건적 목책을 넘는 아군을 돕는다'],
  '초병을 깨운다': ['yellow-sentry', '누런 두건의 주인공이 잠든 황건적 초병을 다급하게 깨운다'],
  '장량의 퇴로를 만든다': ['yellow-retreat', '누런 두건의 주인공이 황건적 동료들이 관군을 피해 빠져나갈 문을 확보한다'],
  '맡은 초소를 지킨다': ['yellow-guard', '누런 두건의 주인공이 잠들지 않고 황건적 목책의 초소를 지킨다'],
  '포위망을 지휘한다': ['strategy', '지도에서 포위망을 점검하는 주인공'],
  '장보에게 항복을 권한다': ['negotiate', '황건적 지휘관에게 대화를 청하는 주인공'],
  '황보숭을 따라 진격한다': ['formation', '관군과 함께 진격하는 주인공'],
  '포위선을 돌파한다': ['yellow-breakout', '누런 두건의 주인공이 황건적 동료들을 이끌고 관군의 얇은 포위선을 뚫는다'],
  '장보와 주민을 대피시킨다': ['yellow-evacuate', '누런 두건의 주인공이 황건적 지휘관과 주민들의 수레를 성 밖으로 대피시킨다'],
  '성벽에서 맞선다': ['yellow-wall', '누런 두건의 주인공이 황건적 성벽 위에서 아래의 관군과 맞선다'],
  '죽부터 먹는다': ['porridge', '모닥불 앞에서 죽을 먹는 주인공'],
};
Object.assign(scenes, additionalScenes);
