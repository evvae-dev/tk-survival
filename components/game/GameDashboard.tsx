"use client";
import Image from "next/image";
import { popupArtwork } from "@/lib/choice-artwork";
import { sceneArt } from "@/lib/scene-art";
import Link from "@/components/HostedLink";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Game, Stats } from "@/lib/game";
import { factionLabel, regionLabels } from "@/lib/game";
import { choiceKey, type GameEvent } from "@/lib/event-engine";
import { testAbilityDelta } from "@/lib/game-presentation";
import { useRecordPlayback } from "@/hooks/use-record-playback";
import PlaybackControls from "./PlaybackControls";
import officerAbilities from "@/data/reference/officer-abilities.json";
import { chapterTitle } from "@/lib/chapter";
import CharacterPanel, { CharacterDetails } from "./CharacterPanel";
import SituationMap from "./SituationMap";
import HistoryFlow from "./HistoryFlow";

import { unifiedRecords } from '@/lib/history-records';
import GameDialog from "./GameDialog";
import Chronicle from "./Chronicle";
import AwakeningTransition from "./AwakeningTransition";
import s from "./game.module.css";
import ChoiceButton from "./ChoiceButton";
import OfficerName, { OfficerText } from "./OfficerName";

const people = new Map(officerAbilities.map((person) => [person.id, {...person,officerId:person.id}]));
type Modal = "event" | "stats" | "map" | "settings" | "people" | "source" | null;
type Props = {
  game: Game;
  view: Game;
  event: GameEvent | null;
  onChoose: (key: string) => void;
  onAdvanceRecord: (key: string) => void;
  onReset: () => void;
  onStats: (delta: Partial<Stats>) => void;
  onContinue?: () => void;
  continuationTitle?: string;
};
export default function GameDashboard({
  game,
  view,
  event,
  onChoose,
  onAdvanceRecord,
  onReset,
  onStats,
  onContinue,
  continuationTitle,
}: Props) {
  const [awakening, setAwakening] = useState(() => !!game.introChoicePending);
  const [modal, setModal] = useState<Modal>(null);
  const playback = useRecordPlayback(game, event, onAdvanceRecord, modal !== null || awakening);
  const historyEntries = useMemo(() => unifiedRecords(view.world), [view.world.historyLog, view.world.log]);

  const eventRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const panel = eventRef.current;
    if (!panel) return;
    const measure = () => panel.style.setProperty('--event-top', `${panel.getBoundingClientRect().top + window.scrollY}px`);
    const observer = new ResizeObserver(measure);
    if (headerRef.current) observer.observe(headerRef.current);
    if (sidebarRef.current) observer.observe(sidebarRef.current);
    measure();
    window.addEventListener('resize', measure);
    return () => { observer.disconnect(); window.removeEventListener('resize', measure); };
  }, [playback.panelVisible]);
  const close = () => setModal(null);
  const choice = (id: string) => {
    if (event) {
      onChoose(choiceKey(event, id));
      close();
    }
  };
  const choiceImages = event ? popupArtwork(event) : [];
  const art = event ? sceneArt(event) : null;
  const lastDecision = game.decisions.at(-1);
  const preserved = view.world.factions["yellow-turban"] === "preserved";
  const founded = view.world.flags.yellowEmpireFounded === true;
  const died = view.world.flags.playerDead === true;
  const executed = view.world.flags.playerExecuted === true;
  useEffect(() => { if (game.completed && died) eventRef.current?.scrollIntoView({block:'start',behavior:'instant'}); }, [game.completed,died]);
  return (
    <div className={`${s.app} ${game.completed ? s.completedApp : ""} ${playback.waiting && !modal ? s.clickToAdvance : ''}`} data-testid="game-screen">
      {awakening && <AwakeningTransition onComplete={() => setAwakening(false)} />}
      <header className={s.header} ref={headerRef}>
        <Link href="/" className={s.brand}>
          <span className={s.desktopBrand}>
            내가 삼국지에 떨어진다면<span className={s.logoPoint}>?!</span>
          </span>
          <span className={s.mobileBrand}>
            내삼떨<span className={s.logoPoint}>?!</span>
          </span>
        </Link>
        <div className={s.currentDate}>
          {view.year}년{" "}
          {event?.month && <span>음력 {event.month}월</span>}
        </div>
        <PlaybackControls playback={playback} />
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
        <aside className={s.leftSidebar} ref={sidebarRef}>
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
        <div className={`${s.centerContent} ${game.completed ? s.completedCenter : ""} ${!playback.panelVisible ? s.recordReading : ""}`}>
          {(playback.panelVisible || game.completed) && <section ref={eventRef} className={`${s.panel} ${s.eventPanel}`} aria-live="polite" data-testid="event-panel">
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
                <p><OfficerText text={lastDecision.detail.split("\n")[0]} /></p>
              </div>
            )}
            {game.completed ? (
              <div className={s.ending} data-testid="completed-screen">
                <span className={s.endingSeal}>記</span>
                <p className={s.eyebrow}>{founded || executed || died ? '가상 시나리오 / ' + (executed || died ? '패배' : '천하통일') : `${view.year}년 / 기록 완료`}</p>
                <h1>
                  {died ? "여포와의 일기토에서 전사했습니다." : executed ? "패배하여 처형당했습니다." : founded ? "황건국을 세워 천하를 통일했습니다." : preserved
                    ? "황건의 거점이 남았습니다."
                    : "난세에서 이어 온 발걸음입니다."}
                </h1>
                <p>
                  {died ? `${game.name}의 이야기는 낙양 길목의 일기토에서 끝났습니다. 이후 사건은 이 플레이에서 진행되지 않습니다.` : executed ? `${game.name}은(는) 전투에서 패해 생포된 뒤 처형당했습니다. 원정은 여기서 끝납니다.` : founded ? '동탁군·유비군·조조군을 차례로 격파하고 황제를 생포했습니다. 황건의 나라가 세워졌습니다.' : <>{game.name}의 {game.turn}번의 판단이<br />{view.year}년까지의 여정에 흔적을 남겼습니다.</>}
                </p>
                {continuationTitle && onContinue && <button className={s.primaryButton} onClick={onContinue}>{continuationTitle} 이어하기 →</button>}
                <button className={s.primaryButton} onClick={onReset}>
                  새로운 인물로 시작 →
                </button>
              </div>
            ) : (
              event && (
                <>
                  <div className={s.eventHeading}>
                    <p className={s.eyebrow}>
                      {chapterTitle(event.historical?.chapterId)} · 연의 기반
                    </p>
                    {event.historical && <button className={s.sourceButton} onClick={() => setModal('source')}>사건 기록과 출처 ↗</button>}
                  </div>
                  {art && <div className={s.eventArt} data-testid="scene-art">
                    <Image src={art.src} alt={art.alt} fill priority sizes="(max-width: 768px) 90vw, 640px" />
                  </div>}
                  <h1><OfficerText text={event.title} /></h1>
                  <p className={s.dialogue}><OfficerText text={event.scene} /></p>
                  <button
                    className={s.primaryButton}
                    disabled={!event.choices.length}
                    onClick={() => setModal("event")}
                  >
                    선택하기 <span>→</span>
                  </button>
                </>
              )
            )}
          </section>}
          {game.completed && <Chronicle game={game} />}
        </div>
        <aside className={s.rightSidebar}>
          <HistoryFlow entries={historyEntries} speed={playback.speed} reading={!game.completed && playback.waiting && !modal && !awakening} />
        </aside>
      </main>
      <GameDialog
        open={modal === "event" && playback.panelVisible}
        title={event?.title ? <OfficerText text={event.title} /> : "눈앞의 갈림길"}
        onClose={close}
      >
        <p className={s.dialogue}>{playback.panelVisible && event && <OfficerText text={event.scene} />}</p>
        <div className={s.choiceButtons}>
          {playback.panelVisible && event?.choices.map((item, index) => (
            <ChoiceButton
              key={item.id}
              choice={item}
              artwork={choiceImages[index] ?? null}
              index={index}
              onChoose={() => choice(item.id)}
            />
          ))}
        </div>
      </GameDialog>
      <GameDialog open={modal === 'source'} title="사건 기록과 출처" onClose={close}>
        {event?.historical && <div className={s.sourceDetails}>
          {historyEntries.filter(entry => entry.eventId === event.historical!.id && entry.recordType && entry.recordType !== 'personal').map((entry,index) => <p key={entry.recordId ?? index}><OfficerText text={entry.detail} /></p>)}
          <p>{event.historical.category === 'novel' ? '연의' : event.historical.id.startsWith('chapter-') ? '게임 창작' : '역사 계열'}</p><h3>{event.historical.source.title.replace(' (2차 자료 요약·원사서 미대조)', '')}</h3>


        </div>}
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
              {id === 'yellow-turban' && founded ? '황건국' : factionLabel(id, view.year)} ·{" "}
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
        {view.world.flags.emperorCaptured && <p>황제 · 생포됨</p>}
        {executed && <p>{game.name} · 생포 후 처형됨</p>}
        <ul className={s.peopleList}>
          {Object.entries(view.world.people).map(([id, state]) => (
            <li key={id}>
              <strong>
                <OfficerName name={people.get(id)?.name ?? id} officerId={people.get(id)?.officerId ?? undefined} />
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
        <h3>재생 속도</h3>
        <PlaybackControls playback={playback} inSettings onNext={() => { playback.step(); close(); }} />
        <p className={s.smallNote}>
          진행 상황은 이 브라우저에 자동 저장됩니다. 현재 여정은 184년부터 188년까지 이어집니다.
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
