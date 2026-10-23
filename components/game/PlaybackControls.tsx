import { playbackSpeeds } from '@/lib/record-playback';
import type { useRecordPlayback } from '@/hooks/use-record-playback';
import s from './game.module.css';
export default function PlaybackControls({ playback, onNext, inSettings = false }: { playback: ReturnType<typeof useRecordPlayback>; onNext?: () => void; inSettings?: boolean }) {
  return <div className={`${s.playbackControls} ${inSettings ? s.settingsPlayback : s.headerPlayback}`} role="group" aria-label="기록 재생">
    <button aria-pressed={playback.automatic} onClick={playback.toggleAutomatic}>자동 {playback.automatic ? '▶' : 'Ⅱ'}</button>
    {playbackSpeeds.map(speed => <button key={speed} aria-label={`기록 간격 x${speed}`} aria-pressed={playback.speed === speed} onClick={() => playback.setSpeed(speed)}>x{speed}</button>)}
    <button aria-label="다음 기록" disabled={!!playback.result || !playback.waiting} onClick={onNext ?? playback.step}>Ⅱ▶</button>
  </div>;
}
