import type { GameEvent } from './event-engine';
const scene = (name: string, alt: string) => ({ src: `/art/scenes/${name}.png`, alt });
const action = (name: string, alt: string) => ({ src: `/art/choices/${name}.png`, alt });
export function sceneArt(event: Pick<GameEvent, 'id' | 'state'>) {
  const node = event.state.flowProgress?.nodeId;
  if (event.id === 'chapter-5-1-opening') return node === 'front'
    ? action('strategy', '당황한 주인공이 지도를 살피며 탁군·완성·광종으로 향할 길을 고민한다')
    : scene('opening', '죽창을 쥔 주인공이 황건적과 관군 사이에서 눈을 크게 뜨고 당황한다');
  if (event.id === 'chapter-5-1-closing') return action('porridge', '싸움이 잦아든 뒤 모닥불 앞에서 안도하며 죽을 먹는 주인공');
  if (node === 'civilian') return action('relief', '겁먹은 피란민과 짐수레 사이에서 주인공이 대피할 길을 찾는다');
  if (event.id === 'battle-184-daxingshan') return node === 'yellow-plan'
    ? action('duel', '긴장한 주인공이 대흥산 전장에서 무기를 들고 상대와 마주한다')
    : scene('heroes', '유비·관우·장비를 실제로 만난 주인공이 놀라 입을 벌린다');
  if (event.id === 'battle-184-qingzhou-city') return action('ambush', '수풀에 숨은 주인공이 긴장하며 청주성 앞의 매복을 살핀다');
  if (event.id === 'battle-184-wan') return node === 'surrender'
    ? action('negotiate', '주인공이 항복한 사람들의 처우를 두고 다급하게 대화를 청한다')
    : scene('siege', '완성 성벽 아래의 사다리와 피란민을 보며 주인공이 다급하게 외친다');
  if (event.id === 'battle-184-guangzong') return node === 'han-plan'
    ? action('official', '주인공이 관군 관리에게 억울한 상황을 알리려 항의한다')
    : scene('night-raid', '광종 군영의 밤, 주인공이 땀을 흘리며 수풀과 야습 병사들을 살핀다');
  if (event.id === 'battle-184-xiaquyang') return scene('siege', '하곡양의 성벽과 피란민 사이에서 주인공이 마지막 포위전에 긴장한다');
  return null;
}
