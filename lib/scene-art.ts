import type { GameEvent } from './event-engine';
import conquestArtwork from '@/data/history/conquest-artwork.json';
import type { Artwork } from './artwork';
const scene = (name: string, alt: string) => ({ src: `/art/scenes/${name}.png`, alt });
const action = (name: string, alt: string) => ({ src: `/art/choices/${name}.png`, alt });
export function sceneArt(event: Pick<GameEvent, 'id' | 'state' | 'historical'>): Artwork | null {
  const node = event.state.flowProgress?.nodeId;
  const configured = event.historical?.flow?.nodes.find(item => item.id === node)?.data.artwork;
  return sceneArtwork(event.id, node, configured);
}

export function sceneArtwork(id: string, node?: string, artwork?: Artwork | null): Artwork | null {
  if (artwork !== undefined) return artwork;
  if (id === 'chapter-5-1-yellow-conquest') return (conquestArtwork.scenes as Record<string, Artwork>)[node ?? ''] ?? null;
  const event = { id };
  if (event.id === 'chapter-5-1-opening' && node === 'yellow-route') return action('yellow', '누런 두건을 쓴 황건군 주인공이 앞으로의 행보를 고민한다');
  if (event.id === 'chapter-5-1-opening') return node === 'front'
    ? action('travel-wagons', '주인공이 세 갈래로 출발하는 짐수레를 보며 탁군·완성·광종 중 어디로 갈지 고민한다')
    : scene('opening', '죽창을 쥔 주인공이 황건적과 관군 사이에서 눈을 크게 뜨고 당황한다');
  if (event.id === 'chapter-5-1-closing') return action('porridge', '싸움이 잦아든 뒤 모닥불 앞에서 안도하며 죽을 먹는 주인공');
  if (node === 'civilian') return action('relief', '겁먹은 피란민과 짐수레 사이에서 주인공이 대피할 길을 찾는다');
  if (event.id === 'battle-184-daxingshan') return node === 'yellow-plan'
    ? action('yellow-face-generals', '누런 두건을 쓴 황건적 주인공이 적인 관우·장비와 마주하고 겁에 질린다')
    : action('han-daxing', '관군 편 주인공이 아군 관우·장비 옆에서 적 황건적 등무와 대치한다');
  if (event.id === 'battle-184-qingzhou-city') return node === 'yellow-plan'
    ? action('yellow-stop', '황건적 주인공이 물러나는 적 유비군과 수상한 수풀을 살피며 추격을 의심한다')
    : action('han-ambush', '관군 편 주인공과 아군 관우·장비가 수풀에 숨고 유비가 적 황건적을 유인한다');
  if (event.id === 'battle-184-wan') return node === 'surrender'
    ? action('han-prisoners-protest', '주인공이 묶인 황건적 포로를 향해 칼을 든 관군을 보고 항의한다')
    : node === 'yellow-plan'
      ? action('yellow-supplies', '황건적 주인공이 성벽 안의 부족한 보급과 방어 배치를 고민한다')
      : action('han-assault', '관군 편 주인공이 황건적 성벽 아래에서 방패로 날아오는 돌을 막는다');
  if (event.id === 'battle-184-guangzong') return node === 'han-plan'
    ? action('official', '주인공이 관군 관리에게 억울한 상황을 알리려 항의한다')
    : node === 'yellow-plan'
      ? action('yellow-night-watch', '황건적 주인공이 잠든 동료 옆에서 수풀로 접근하는 적 관군의 기척을 알아챈다')
      : action('han-night-wait', '관군 편 주인공이 아군 야습대와 함께 황건적 목책 앞에서 신호를 기다린다');
  if (event.id === 'battle-184-xiaquyang') return node === 'yellow-plan'
    ? action('yellow-city', '성벽 안의 황건적 주인공이 동료들에게 물을 건네며 주민들의 피란을 고민한다')
    : scene('siege', '관군 편 주인공이 황건적이 지키는 하곡양 성벽 밖에서 마지막 포위전에 긴장한다');
  return null;
}
