import type { Metadata } from "next";
import "./globals.css";
import CatalogProvider from '@/components/CatalogProvider';
import { connection } from 'next/server';

export const metadata: Metadata = { title: "내가 삼국지에 떨어진다면", description: "한 이름, 작은 선택. 후한 말의 세상에서 시작하는 당신의 이야기." };
export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  if (process.env.NEXT_PUBLIC_CACHE_ENABLED !== 'true') await connection();
  return <html lang="ko"><head>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/galmuri/dist/galmuri.css"/>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700&display=swap"/>
  </head><body><CatalogProvider>{children}</CatalogProvider></body></html>;
}
