'use client';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import s from './game.module.css';

export default function GameDialog({ open, title, onClose, children, wide = false }: { open: boolean; title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (open && !dialog?.open) dialog?.showModal();
    if (!open && dialog?.open) dialog.close();
  }, [open]);
  return <dialog ref={ref} className={`${s.dialog} ${wide ? s.wideDialog : ''}`} aria-labelledby={titleId} onCancel={onClose} onClose={() => { if (open) onClose(); }} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className={s.dialogBody}><button className={s.closeButton} aria-label="팝업 닫기" onClick={onClose}>✕</button><h2 id={titleId}>{title}</h2>{children}</div>
  </dialog>;
}
