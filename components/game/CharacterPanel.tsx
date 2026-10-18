import {
  familyLabels,
  factionLabel,
  regionLabels,
  roleLabels,
  type Game,
} from "@/lib/game";
import AnimatedValue from "./AnimatedValue";
import { abilityKeys, abilityLabels } from "@/lib/game-presentation";
import StatsRadar from "./StatsRadar";
import s from "./game.module.css";

export function CharacterDetails({ game }: { game: Game }) {
  return (
    <div className={s.characterDetails}>
      <div className={s.characterName}>
        <strong>{game.name}</strong>
        <span>
          {familyLabels[game.family]} 가정 · {roleLabels[game.role]}
        </span>
      </div>
      <div className={s.statusGrid}>
        <div>
          <span>나이</span>
          <strong>{game.age}세</strong>
        </div>
        <div>
          <span>소속</span>
          <strong>
            {game.factionId ? factionLabel(game.factionId, game.year) : "없음"}
          </strong>
        </div>
        <div>
          <span>위치</span>
          <strong>{regionLabels[game.region] ?? game.region}</strong>
        </div>
        <div>
          <span>평판</span>
          <strong>
            {game.factionId ? (game.reputation[game.factionId] ?? 0) : "—"}
          </strong>
        </div>
      </div>
      <StatsRadar stats={game.stats} />
      <div className={s.abilityValues}>{abilityKeys.map(key => <div key={key}><span>{abilityLabels[key]}</span><strong><AnimatedValue value={game.stats[key]} /></strong></div>)}<div><span>명성</span><strong><AnimatedValue value={game.fame ?? 0} /></strong></div></div>
      <p className={s.smallNote}>
        {game.birthYear}년 {regionLabels[game.birthRegion] ?? game.birthRegion}{" "}
        출생
      </p>
    </div>
  );
}
export default function CharacterPanel({
  game,
  onStats,
}: {
  game: Game;
  onStats: () => void;
}) {
  return (
    <section
      className={`${s.panel} ${s.characterPanel}`}
      aria-label="인물 정보"
    >
      <h2 className={`${s.panelTitle} ${s.desktopOnly}`}>인물 정보</h2>
      <div className={s.desktopOnly}>
        <CharacterDetails game={game} />
      </div>
      <div className={s.mobileStatus} data-testid="mobile-character-row">
        <strong title={game.name}>{game.name}</strong>
        <span>{game.age}세</span>
        <span>{regionLabels[game.region] ?? game.region}</span>
        <button onClick={onStats} aria-label="캐릭터 정보 보기" aria-haspopup="dialog">능력치 ↗</button>
      </div>
    </section>
  );
}
