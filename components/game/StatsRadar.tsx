import type { Stats } from '@/lib/game';
import { abilityKeys, abilityLabels, radarPoint, radarPolygon } from '@/lib/game-presentation';
import s from './game.module.css';

export default function StatsRadar({ stats }: { stats: Stats }) {
  return <div className={s.radar}><svg viewBox="0 0 280 250" role="img" aria-label={abilityKeys.map(key => `${abilityLabels[key]} ${stats[key]}`).join(', ')}>
    {[25, 50, 75, 100].map(step => <polygon key={step} points={radarPolygon(abilityKeys.map(() => step))} className={s.radarGrid}/>)}
    {abilityKeys.map((key, index) => { const point = radarPoint(index, 100); return <line key={key} x1="140" y1="121" x2={point.x} y2={point.y} className={s.radarGrid}/>; })}
    <polygon points={radarPolygon(abilityKeys.map(key => stats[key]))} className={s.radarValue}/>
    {abilityKeys.map((key, index) => { const point = radarPoint(index, 100, 105); return <text key={key} x={point.x} y={point.y} textAnchor="middle" dominantBaseline="middle">{abilityLabels[key]} {stats[key]}</text>; })}
  </svg></div>;
}
