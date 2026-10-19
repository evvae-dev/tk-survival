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

function AbilityValues({ game, animate = false }: { game: Game; animate?: boolean }) {
  return <div className={s.abilityValues}>
    {abilityKeys.map(key => <div key={key} data-ability={key}><span>{abilityLabels[key]}</span><strong>{animate ? <AnimatedValue value={game.stats[key]} /> : game.stats[key]}</strong></div>)}
    <div data-ability="fame"><span>명성</span><strong>{animate ? <AnimatedValue value={game.fame ?? 0} /> : game.fame ?? 0}</strong></div>
  </div>;
}

export function CharacterDetails({ game, animate = false }: { game: Game; animate?: boolean }) {
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
            {game.factionId === 'yellow-turban' && game.world.flags.yellowEmpireFounded ? '황건국' : game.factionId ? factionLabel(game.factionId, game.year) : "없음"}
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
      <AbilityValues game={game} animate={animate} />
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
        <CharacterDetails game={game} animate />
      </div>
      <div className={s.mobileStatus} data-testid="mobile-character-row">
        <strong title={game.name}>{game.name}</strong>
        <span>{game.age}세</span>
        <span>{regionLabels[game.region] ?? game.region}</span>
        <span className={s.inlineAbilities} data-testid="mobile-ability-summary">
          {abilityKeys.map(key => <span key={key} data-ability={key} title={abilityLabels[key]} aria-label={`${abilityLabels[key]} ${game.stats[key]}`}><span aria-hidden="true">{abilityLabels[key][0]}</span><AnimatedValue value={game.stats[key]} showDelta={false} /></span>)}
          <span data-ability="fame" title="명성" aria-label={`명성 ${game.fame ?? 0}`}><span aria-hidden="true">명</span><AnimatedValue value={game.fame ?? 0} showDelta={false} /></span>
        </span>
        <button className={s.characterInfoIcon} onClick={onStats} aria-label="캐릭터 정보 보기" title="캐릭터 정보" aria-haspopup="dialog"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="12" cy="8" r="3"/><path d="M5 20v-2a7 7 0 0 1 14 0v2"/></svg></button>
      </div>
    </section>
  );
}
