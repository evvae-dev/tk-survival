'use client';
import type { Artwork } from '@/lib/artwork';
import { validArtwork } from '@/lib/artwork';

export default function ArtworkFields({ label, value, fallback, onChange }: {
  label: string;
  value?: Artwork | null;
  fallback?: Artwork | null;
  onChange: (artwork: Artwork | null | undefined) => void;
}) {
  const mode = value ? 'custom' : 'default';
  const base = fallback && validArtwork(fallback) ? fallback : {src:'/art/choices/strategy.png',alt:'군영의 지도와 주변 상황을 살피는 주인공'};
  const preview = value ?? base;
  return <details>
    <summary>{label}</summary>
    <label>{label} 설정<select aria-label={`${label} 설정`} value={mode} onChange={event => {
      onChange(event.target.value === 'default' ? undefined : base);
    }}>
      <option value="default">기본 이미지 사용</option>
      <option value="custom">직접 지정</option>
    </select></label>
    {value && <>
      <label>{label} 경로<input aria-label={`${label} 경로`} value={value.src} placeholder="/art/choices/conquest-dong-strategy.png" onChange={event => onChange({ ...value, src: event.target.value })} /></label>
      <label>{label} 설명<input aria-label={`${label} 설명`} value={value.alt} onChange={event => onChange({ ...value, alt: event.target.value })} /></label>
    </>}
    {preview && validArtwork(preview) && <img src={preview.src} alt={preview.alt} width={240} height={135} style={{ maxWidth: '100%', height: 'auto', objectFit: 'contain' }} />}
    {mode === 'default' && fallback && <p>기본 경로: {fallback.src}</p>}
    <p>환경이 포함된 장면 이미지가 필수입니다. 단독 캐릭터 기준 이미지는 게임 화면에서 사용할 수 없습니다.</p>
  </details>;
}
