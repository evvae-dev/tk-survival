'use client';
import { useEffect, useState } from 'react';
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { firebaseClient, firebaseConfigured } from '@/lib/firebase-client';
import { useCatalogCloud } from '@/components/CatalogProvider';
import s from './CatalogCloudPanel.module.css';

export default function CatalogCloudPanel() {
  const cloud = useCatalogCloud();
  const [user, setUser] = useState<User | null>(null);
  const [admin, setAdmin] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!firebaseConfigured) return;
    const { auth, db } = firebaseClient();
    return onAuthStateChanged(auth, current => {
      setUser(current); setAdmin(false);
      if (current) void getDoc(doc(db, 'administrators', current.uid)).then(snapshot => {
        if (auth.currentUser?.uid === current.uid) setAdmin(snapshot.exists() && snapshot.data().enabled === true);
      }).catch(reason => setError(String(reason)));
    });
  }, []);
  async function login() {
    try { setError(''); await signInWithPopup(firebaseClient().auth, new GoogleAuthProvider()); }
    catch (reason) { setError(String(reason)); }
  }
  return <section aria-label="Firebase 공유 저장" className={s.panel}>
    <div className={s.heading}><span className={s.cloudIcon} aria-hidden="true">☁</span><div><strong>공유 사건 저장소</strong><span className={s.description}>Firebase 카탈로그 동기화</span></div></div><span className={`${s.status} ${admin?s.ready:''}`} role="status"><i/>{cloud.message}</span>
    {firebaseConfigured && <>
      {user ? <><span className={s.account}>{user.email} {admin ? '· 관리자' : '· 게시 권한 없음'}</span>{!admin && <span className={s.uid}>관리자 등록 UID: <code>{user.uid}</code></span>}<button onClick={() => void signOut(firebaseClient().auth)}>로그아웃</button></> : <button onClick={() => void login()}>Google 관리자 로그인</button>}
      <button disabled={cloud.busy} onClick={() => { if (window.confirm('브라우저의 저장된 편집본을 공유 목록으로 교체합니까? 미저장 폼은 목록에서 사건을 다시 선택해 갱신하세요.')) void cloud.pull(); }}>공유본 불러오기</button>
      <button className={s.publish} disabled={cloud.busy || !admin} onClick={() => { if (window.confirm('현재 브라우저에 저장한 전체 사건 목록을 모든 플레이어에게 게시합니까? 저장하지 않은 폼은 포함되지 않습니다.')) void cloud.publish(); }}>저장된 목록 공유 게시</button>
    </>}
    {error && <span className={s.error} role="alert">{error}</span>}
  </section>;
}
