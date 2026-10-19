import type { Metadata } from "next";
import "./globals.css";
import CatalogProvider from '@/components/CatalogProvider';
import { connection } from 'next/server';

const title = "내가 삼국지에 떨어진다면?!";
const description = "184년 황건적의 난, 당신은 어느 편에 설 것인가? 선택으로 운명을 바꾸는 삼국지 생존 게임.";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  || (process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`)
  || (process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`)
  || "https://tk-survival-3imn03ptl-rently-bro.vercel.app";
const cover = {
  url: "/share/game-cover.jpg",
  width: 1200,
  height: 630,
  alt: "모닥불 앞에서 유비·관우·장비와 마주한 주인공 — 내가 삼국지에 떨어진다면?!",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: title,
    title,
    description,
    url: "/",
    images: [cover],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [{ url: cover.url, alt: cover.alt }],
  },
};
export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  if (process.env.NEXT_PUBLIC_CACHE_ENABLED !== 'true') await connection();
  return <html lang="ko"><head>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/galmuri/dist/galmuri.css"/>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700&display=swap"/>
  </head><body><CatalogProvider>{children}</CatalogProvider></body></html>;
}
