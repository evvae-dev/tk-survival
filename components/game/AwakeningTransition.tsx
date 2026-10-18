'use client';
import { useEffect, useRef } from 'react';
import s from './game.module.css';

/** A modal focus barrier keeps the scene visible through the opening eyelids. */
export default function AwakeningTransition({ onComplete }: { onComplete: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const complete = useRef(onComplete);
  complete.current = onComplete;
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timer = window.setTimeout(() => {
      element?.close();
      complete.current();
    }, reduced ? 300 : 2600);
    return () => { window.clearTimeout(timer); element?.close(); };
  }, []);
  return <dialog ref={dialog} className={s.awakening} data-testid="awakening-transition"
    aria-label="낯선 시대에서 눈을 뜨는 중" onCancel={event => event.preventDefault()}>
    <span className={s.awakeningTop} aria-hidden="true" />
    <span className={s.awakeningBottom} aria-hidden="true" />
    <span className={s.awakeningStatus} role="status">눈을 뜨는 중…</span>
  </dialog>;
}
