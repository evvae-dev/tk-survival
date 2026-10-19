import { factionLabels, regionLabels, type World } from '@/lib/game';
import s from './game.module.css';

const sites = [
  { id: 'place-daxingshan', x: 23, y: 22 }, { id: 'place-guangzong', x: 49, y: 34 },
  { id: 'place-xiaquyang', x: 52, y: 10 }, { id: 'place-qingzhou-city-novel', x: 80, y: 47 },
  { id: 'luoyang', x: 34, y: 63 }, { id: 'place-wan', x: 43, y: 85 },
];
export default function SituationMap({ world, region }: { world: World; region: string }) {
  return <div><div className={s.map} role="img" aria-label="184년 주요 전장 지배 현황. 실제 지형 비율과 다른 전선 배치도입니다.">
    <svg viewBox="0 0 320 210" preserveAspectRatio="none" aria-hidden="true"><path d="M73 46 157 71 166 21 M157 71 256 99 M157 71 109 132 138 179"/><path className={s.mapRiver} d="M0 105 Q70 140 145 110 T320 125"/></svg>
    {sites.map(site => { const owner = world.control[site.id]; return <span key={site.id} className={`${s.mapPin} ${owner === 'han' ? s.hanPin : owner === 'yellow-turban' ? s.yellowPin : ''}`} style={{ left: `${site.x}%`, top: `${site.y}%` }}>{regionLabels[site.id]}<small>{owner === 'yellow-turban' && world.flags.yellowEmpireFounded ? '황건국' : owner ? factionLabels[owner] ?? owner : '미확인'}</small></span>; })}
  </div><p className={s.smallNote}>현재 {regionLabels[region] ?? region} · 전선 배치도<br/>실제 지형·거리 비율과 다릅니다.</p></div>;
}
