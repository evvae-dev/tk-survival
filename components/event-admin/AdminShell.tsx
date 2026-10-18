'use client';

import Link from '@/components/HostedLink';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import NavIcon from './NavIcon';
import s from './AdminShell.module.css';

const menus = [
  { href: '/admin/events', label: '사건 관리', kind: 'events' },
  { href: '/admin/data', label: '수집 자료', kind: 'history' },
  { href: '/admin/collection', label: '실행·수집 플로우', kind: 'flow' },
  { href: '/admin/history', label: '사건 기록', kind: 'history' },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [drawer, setDrawer] = useState(false);
  const navigationRef = useRef<HTMLElement>(null);
  const menuToggleRef = useRef<HTMLButtonElement>(null);
  const title = menus.find(item => item.href === pathname)?.label ?? '관리 작업실';

  useEffect(() => {
    const mobile = window.matchMedia('(max-width:760px)');
    const closeOnDesktop = () => { if (!mobile.matches) setDrawer(false); };
    mobile.addEventListener('change', closeOnDesktop);
    return () => mobile.removeEventListener('change', closeOnDesktop);
  }, []);

  useEffect(() => {
    if (!drawer) return;
    const links = () => Array.from(navigationRef.current?.querySelectorAll<HTMLAnchorElement>('a[href]') ?? []);
    links()[0]?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); setDrawer(false); return; }
      if (event.key !== 'Tab') return;
      const items = links(), first = items[0], last = items[items.length - 1];
      if (!first) return;
      if (!navigationRef.current?.contains(document.activeElement)) { event.preventDefault(); first.focus(); }
      else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('keydown', handleKey);
      if (window.matchMedia('(max-width:760px)').matches) menuToggleRef.current?.focus();
    };
  }, [drawer]);

  return <div className={s.shell} data-testid="admin-shell">
    {drawer && <button className={s.scrim} tabIndex={-1} aria-label="메뉴 닫기" onClick={() => setDrawer(false)}/>}
    <aside id="admin-navigation" ref={navigationRef} className={`${s.sidebar} ${drawer ? s.drawerOpen : ''}`} aria-label="관리 메뉴">
      <Link className={s.brand} href="/" onClick={() => setDrawer(false)}><b>TK</b><span>삼국 생존기<small>관리 작업실</small></span></Link>
      <nav>{menus.map(item => <Link key={item.href} href={item.href} aria-label={item.label} aria-current={pathname === item.href ? 'page' : undefined} onClick={() => setDrawer(false)}><NavIcon kind={item.kind}/><span>{item.label}</span></Link>)}
        <Link href="/admin/events#shared-catalog" aria-label="공유 저장" onClick={() => setDrawer(false)}><NavIcon kind="cloud"/><span>공유 저장</span></Link>
        <Link href="/" aria-label="게임으로" onClick={() => setDrawer(false)}><NavIcon kind="game"/><span>게임으로</span></Link>
      </nav>
      <p className={s.sidebarNote}>사건을 기록하고<br/>새로운 선택을 연결하세요.</p>
    </aside>
    <div className={s.main}>
      <header className={s.header}><button className={s.menuToggle} ref={menuToggleRef} aria-label="관리 메뉴 열기" aria-expanded={drawer} aria-controls="admin-navigation" onClick={() => setDrawer(!drawer)}>☰</button><span>관리 작업실 / <strong>{title}</strong></span></header>
      <div className={s.content}>{children}</div>
    </div>
  </div>;
}
