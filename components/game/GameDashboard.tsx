"use client";
import Image from "next/image";
import titleScreen from "@/public/title-screen.png";
import Link from "@/components/HostedLink";
import { useEffect, useRef, useState } from "react";
import type { Game, Stats } from "@/lib/game";
import { dateLabel, factionLabel, regionLabels } from "@/lib/game";
import { choiceKey, type GameEvent } from "@/lib/event-engine";
import { testAbilityDelta } from "@/lib/game-presentation";
import { useRecordPlayback } from "@/hooks/use-record-playback";
import { playbackSpeeds } from "@/lib/record-playback";
import chapter from "@/data/collection/5-1-yellow-turban.json";
import CharacterPanel, { CharacterDetails } from "./CharacterPanel";
import SituationMap from "./SituationMap";
import OfficerRanking from "./OfficerRanking";
import GameDialog from "./GameDialog";
import s from "./game.module.css";
import ChoiceButton from "./ChoiceButton";

const people = new Map(chapter.people.map((person) => [person.id, person]));
type Modal = "event" | "stats" | "map" | "settings" | "people" | null;
type Props = {
  game: Game;
  view: Game;
  event: GameEvent | null;
  onChoose: (key: string) => void;
  onAdvanceRecord: (key: string) => void;
  onReset: () => void;
  onStats: (delta: Partial<Stats>) => void;
};
export default function GameDashboard({
  game,
  view,
  event,
  onChoose,
  onAdvanceRecord,
  onReset,
  onStats,
}: Props) {
  const [modal, setModal] = useState<Modal>(null);
  const playback = useRecordPlayback(game, event, onAdvanceRecord, modal !== null);
  const logRef = useRef<HTMLOListElement>(null);
  const previousLogCount = useRef(game.world.log.length);
  const addedRecord = game.world.log.length > previousLogCount.current;
  useEffect(() => {
    if (game.world.log.length > previousLogCount.current) {
      logRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    }
    previousLogCount.current = game.world.log.length;
  }, [game.world.log.length]);
  const close = () => setModal(null);
  const choice = (id: string) => {
    if (event) {
      onChoose(choiceKey(event, id));
      close();
    }
  };
  const lastDecision = game.decisions.at(-1);
  const preserved = view.world.factions["yellow-turban"] === "preserved";
  return (
    <div className={s.app} data-testid="game-screen">
      <header className={s.header}>
        <Link href="/" className={s.brand}>
          <span className={s.desktopBrand}>
            내가 삼국지에 떨어진다면<span className={s.logoPoint}>?!</span>
          </span>
          <span className={s.mobileBrand}>
            내삼떨<span className={s.logoPoint}>?!</span>
          </span>
        </Link>
        <div className={s.currentDate}>
          {game.year}년{" "}
          <span>{event?.month ? `음력 ${event.month}월` : "월 미상"}</span>
        </div>
        <div className={s.playbackControls} role="group" aria-label="기록 재생">
          <button aria-pressed={playback.automatic} onClick={playback.toggleAutomatic}>
            자동 {playback.automatic ? "▶" : "Ⅱ"}
          </button>
          {playbackSpeeds.map((speed) => (
            <button key={speed} aria-label={`기록 간격 x${speed}`} aria-pressed={playback.speed === speed} onClick={() => playback.setSpeed(speed)}>
              x{speed}
            </button>
          ))}
          <button aria-label="다음 기록" title="클릭할 때마다 다음 기록" disabled={!playback.waiting} onClick={playback.step}>Ⅱ▶</button>
        </div>
        <nav className={s.controls} aria-label="게임 메뉴">
          <button className={s.mobileMapButton} onClick={() => setModal("map")}>
            정세
          </button>
          <button
            className={s.primaryButton}
            disabled={!playback.panelVisible || game.completed || !event?.choices.length}
            onClick={() => setModal("event")}
          >
            진행
          </button>
          <button onClick={() => setModal("settings")}>설정</button>
        </nav>
      </header>
      <main className={s.main}>
        <aside className={s.leftSidebar}>
          <CharacterPanel game={view} onStats={() => setModal("stats")} />
          <section className={`${s.panel} ${s.mapPanel}`}>
            <h2 className={s.panelTitle}>
              정세{" "}
              <button onClick={() => setModal("map")} aria-label="정세 확대">
                ↗
              </button>
            </h2>
            <SituationMap world={view.world} region={view.region} />
            <button className={s.textButton} onClick={() => setModal("people")}>
              인물 생존과 포로 기록 보기 →
            </button>
          </section>
        </aside>
        <div className={`${s.centerContent} ${!playback.panelVisible ? s.recordReading : ""}`}>
          {playback.panelVisible && <section className={`${s.panel} ${s.eventPanel}`} aria-live="polite" data-testid="event-panel">
            {lastDecision?.check && (
              <div
                data-testid="last-check-result"
                className={`${s.lastCheck} ${lastDecision.check.success ? s.successOutcome : s.failureOutcome}`}
                role="status"
              >
                <strong>
                  {lastDecision.check.success ? "성공" : "실패"} · 확률{" "}
                  {lastDecision.check.chance}%
                </strong>
                <p>{lastDecision.detail.split("\n")[0]}</p>
              </div>
            )}
            {game.completed ? (
              <div className={s.ending} data-testid="completed-screen">
                <span className={s.endingSeal}>記</span>
                <p className={s.eyebrow}>CHAPTER 01 / 기록 완료</p>
                <h1>
                  {preserved
                    ? "황건의 거점이 남았습니다."
                    : "토벌군이 전선을 장악했습니다."}
                </h1>
                <p>
                  {game.name}의 {game.turn}번의 판단이
                  <br />
                  184년의 전장에 흔적을 남겼습니다.
                </p>
                <button className={s.primaryButton} onClick={onReset}>
                  새로운 인물로 시작 →
                </button>
              </div>
            ) : (
              event && (
                <>
                  <div className={s.eventHeading}>
                    <p className={s.eyebrow}>
                      CHAPTER 01 ·{" "}
                      {event.historical?.category === "novel"
                        ? "연의 기반"
                        : "황건적의 난"}
                    </p>
                    <span>선택 {game.turn + 1}</span>
                  </div>
                  <div className={s.eventArt}>
                    <Image
                      src={
                        process.env.NEXT_PUBLIC_CACHE_ENABLED === "true"
                          ? titleScreen
                          : "/title-screen.png"
                      }
                      alt="모닥불 주변에서 대화하는 사람들"
                      fill
                      priority
                      sizes="(max-width: 768px) 90vw, 420px"
                    />
                    <span>184 / 黃巾之亂</span>
                  </div>
                  <h1>{event.title}</h1>
                  <p className={s.dialogue}>{event.scene}</p>
                  <button
                    className={s.primaryButton}
                    disabled={!event.choices.length}
                    onClick={() => setModal("event")}
                  >
                    선택하기 <span>→</span>
                  </button>
                  {event.historical && (
                    <details className={s.source}>
                      <summary>사건 기록과 출처</summary>
                      <p>{event.historical.summary}</p>
                      <p>{event.historical.source.title}</p>
                      <p>{event.historical.source.record}</p>
                      {event.historical.dateNote && (
                        <p>{event.historical.dateNote}</p>
                      )}
                    </details>
                  )}
                  <p className={s.smallNote}>
                    능력 판정·역사 개입·대체 결과는 게임 창작입니다.
                  </p>
                </>
              )
            )}
          </section>}
          <section
            className={`${s.panel} ${s.historyPanel}`}
            aria-labelledby="log-heading"
          >
            <h2 className={s.panelTitle} id="log-heading">
              나의 기록 <span>{game.turn}번의 선택</span>
            </h2>
            {playback.waiting && <p className={s.playbackStatus} role="status">
              {playback.automatic ? `다음 기록까지 ${3 * playback.speed}초` : "다음 기록 버튼을 눌러 이야기를 이어가세요."}
            </p>}
            <ol className={s.historyLog} ref={logRef} data-testid="history-log">
              {view.world.log.length ? (
                view.world.log
                  .map((entry, index) => ({ entry, index }))
                  .reverse()
                  .map(({ entry, index }) => (
                    <li
                      key={`${index}-${entry.title}`}
                      data-testid="history-record"
                      className={`${entry.kind === "fiction" ? s.importantLog : ""} ${addedRecord && index === game.world.log.length - 1 ? s.newRecord : ""}`}
                    >
                      <span>{dateLabel(entry.year, entry.month)}</span>
                      <h3>{entry.title}</h3>
                      <p>{entry.detail}</p>
                    </li>
                  ))
              ) : (
                <li>
                  <span>184년 · 이야기의 시작</span>
                  <h3>{game.name}, 난세에 들어서다.</h3>
                  <p>
                    낯선 말발굽 소리에 손이 굳는다. 손바닥에는 거친 죽창의
                    감촉이 남아 있다.
                  </p>
                </li>
              )}
            </ol>
          </section>
        </div>
        <aside className={s.rightSidebar}>
          <OfficerRanking year={game.year} world={view.world} />
        </aside>
      </main>
      <GameDialog
        open={modal === "event" && playback.panelVisible}
        title={event?.title ?? "눈앞의 갈림길"}
        onClose={close}
      >
        <p className={s.dialogue}>{playback.panelVisible && event?.scene}</p>
        <div className={s.choiceButtons}>
          {playback.panelVisible && event?.choices.map((item, index) => (
            <ChoiceButton
              key={item.id}
              choice={item}
              index={index}
              onChoose={() => choice(item.id)}
            />
          ))}
        </div>
      </GameDialog>
      <GameDialog
        open={modal === "stats"}
        title={`${game.name}의 능력치`}
        onClose={close}
      >
        <CharacterDetails game={view} />
      </GameDialog>
      <GameDialog open={modal === "map"} title="현재 정세" onClose={close} wide>
        <SituationMap world={view.world} region={view.region} />
        <div className={s.factionSummary}>
          {Object.entries(view.world.factions).map(([id, state]) => (
            <span key={id}>
              {factionLabel(id, game.year)} ·{" "}
              {state === "preserved"
                ? "가상역사 존속"
                : state === "defeated"
                  ? "패망"
                  : "활동"}
            </span>
          ))}
        </div>
        <button className={s.textButton} onClick={() => setModal("people")}>
          인물별 생존 확인 →
        </button>
      </GameDialog>
      <GameDialog
        open={modal === "people"}
        title="인물과 세계의 발자취"
        onClose={close}
        wide
      >
        <p className={s.smallNote}>
          포로·피신·항복의 상세 경과는 나의 기록에서 확인할 수 있습니다.
        </p>
        <ul className={s.peopleList}>
          {Object.entries(view.world.people).map(([id, state]) => (
            <li key={id}>
              <strong>
                {people.get(id)?.name ?? id}
                <small>{people.get(id)?.officerId ?? id}</small>
              </strong>
              <span className={state === "dead" ? s.dead : s.alive}>
                {state === "dead" ? "사망" : "생존"}
              </span>
            </li>
          ))}
        </ul>
      </GameDialog>
      <GameDialog open={modal === "settings"} title="기록 설정" onClose={close}>
        <p className={s.smallNote}>
          진행 상황은 이 브라우저에 자동 저장됩니다. 현재 범위는 184년·20세 고정
          테스트입니다.
        </p>
        <nav className={s.settingsLinks}>
          <Link href="/history">사건 기록 탐색 ↗</Link>
          <Link href="/admin/events">사건 관리 ↗</Link>
          <Link href="/admin/collection">실행 플로우 ↗</Link>
        </nav>
        <details className={s.devTools}>
          <summary>개발용 테스트 도구</summary>
          <button
            disabled={game.completed}
            onClick={() => onStats(testAbilityDelta(game.stats))}
          >
            통솔·무력·지력·정치·매력 70 설정
          </button>
        </details>
        <button className={s.resetButton} onClick={onReset}>
          처음으로 · 새 인물 시작
        </button>
      </GameDialog>
    </div>
  );
}
