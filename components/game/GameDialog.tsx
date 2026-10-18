'use client';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import s from './game.module.css';

export default function GameDialog({ open, title, onClose, children, wide = false, dismissible = true }: { open: boolean; title: ReactNode; onClose: () => void; children: ReactNode; wide?: boolean; dismissible?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (open && !dialog?.open) dialog?.showModal();
    if (!open && dialog?.open) dialog.close();
  }, [open]);
  return <dialog ref={ref} className={`${s.dialog} ${wide ? s.wideDialog : ''}`} aria-labelledby={titleId} onCancel={event => { if (dismissible) onClose(); else event.preventDefault(); }} onClose={() => { if (open && dismissible) onClose(); }} onClick={event => { if (dismissible && event.target === event.currentTarget) onClose(); }}>
    <div className={s.dialogBody}>{dismissible && <button className={s.closeButton} aria-label="팝업 닫기" onClick={onClose}>✕</button>}<h2 id={titleId}>{title}</h2>{children}</div>
  </dialog>;
}
