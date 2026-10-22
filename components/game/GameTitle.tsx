'use client';
import Image from 'next/image';
import titleScreen from '@/public/title-screen.png';
import Link from '@/components/HostedLink';
import { useCallback, useState } from 'react';
import s from './game.module.css';
import GameDialog from './GameDialog';
import StatRoulette from './StatRoulette';
import type { Stats } from '@/lib/game';

export default function GameTitle({ onStart }: { onStart: (name: string, stats?: Stats) => void }) {
  const [entering, setEntering] = useState(false);
  const [name, setName] = useState('');
  const [rolling, setRolling] = useState(false);
  const finishRoll = useCallback((stats: Stats) => onStart(name.trim(), stats), [name, onStart]);
  return <main className={s.titlePage} data-testid="title-screen"><div className={s.titleArt}><Image src={process.env.NEXT_PUBLIC_CACHE_ENABLED === 'true' ? titleScreen : '/title-screen.png'} alt="모닥불 주변에서 대화하는 사람들" fill priority sizes="100vw"/></div><header className={s.titleHeader}><Link href="/" className={s.brand}>三國 <span>· 나의 기록</span></Link><nav><Link href="/history">사건 기록</Link><Link href="/admin/events">관리 작업실 ↗</Link></nav></header>
    <section className={s.titleContent}><p className={s.eyebrow}>CHAPTER 01 / 도원결의와 황건적의 난</p><h1>내가 삼국지에<br/>떨어진다면<span>?!</span></h1><p className={s.titleIntro}>역사의 이름들 사이에,<br/>당신의 선택을 새기다.</p><p className={s.titleDescription}>어느 편에 설 것인가. 누구를 살릴 것인가.<br/>작은 판단 하나가 다음 전투의 역사를 바꿉니다.</p><div className={s.titleChips}><span>원작 파괴</span><span>영웅과 인연</span><span>선택으로 바뀌는 역사</span></div>
      <button className={s.primaryButton} aria-label="시작하기" onClick={() => setEntering(true)}>시작하기 <span>→</span></button><p className={s.smallNote}>챕터 순서로 이어지는 이야기 · 선택은 자동 저장됩니다.</p>
    </section><footer className={s.titleFooter}><span>내가 삼국지에 떨어진다면</span><span>삼국지연의 사건과 나의 선택으로 이어지는 이야기</span></footer>
    <GameDialog open={entering} title="이 시대에 남길 이름" onClose={() => setEntering(false)}>{entering && <form className={s.entryForm} onSubmit={event => { event.preventDefault(); if (name.trim() && !rolling) { event.currentTarget.querySelector('input')?.blur(); setEntering(false); setRolling(true); } }}><label htmlFor="player-name">이 시대에 남길 이름</label><div><input id="player-name" autoFocus required maxLength={20} placeholder="이름을 입력하세요" value={name} onChange={event => setName(event.target.value)}/><button className={s.primaryButton} disabled={!name.trim()} type="submit">이름 넣고 시작 →</button></div><p>20세 · 탁현에서 시작 · 다음은 능력치 룰렛</p><button type="button" className={s.textButton} onClick={() => setEntering(false)}>← 뒤로</button></form>}</GameDialog>
    {rolling && <StatRoulette onComplete={finishRoll} />}
  </main>;
}
