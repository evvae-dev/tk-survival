'use client';
import GameTitle from '@/components/game/GameTitle';
import GameDashboard from '@/components/game/GameDashboard';
import { useGameSession } from '@/hooks/use-game-session';
import { chapterTitle } from '@/lib/chapter';

export default function Home() {
  const { ready, game, view, event, continuation, continueStory, finishResult, startGame, nextTurn, advanceRecord, changeStats, resetGame } = useGameSession();
  if (!ready) return <main className="loading" role="status">이야기를 펼치고 있습니다…</main>;
  if (!game || !view) return <GameTitle onStart={startGame}/>;
  return <GameDashboard key={`${game.name}-${game.startYear}`} game={game} view={view} event={event} onChoose={nextTurn} onAdvanceRecord={advanceRecord} onReset={resetGame} onStats={changeStats} onContinue={continueStory} continuationTitle={continuation ? chapterTitle(continuation.chapterId) : undefined} onFinishResult={finishResult}/>;
}
