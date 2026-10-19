# 플레이 사이트 배포

- 원본 저장소의 게임과 API를 Vinext 및 Cloudflare Workers용 배포 사본으로 구성한다.
- 사이트 식별자는 `.openai/hosting.json`에 저장한다. 동일 사이트를 갱신할 때 해당 식별자를 유지한다.
- 배포 런타임에서 `next/link` 이동 오류가 재현되어, 배포 사본은 `HostedLink`로 일반 페이지 이동을 사용한다. 게임 진행과 편집 내용은 기존 브라우저 저장소에 유지된다.
- Sites 로컬 실행은 `npm run dev:sites`, 배포 빌드는 `npm run build:sites`를 사용한다. `npm run typecheck`, `npm test`, `npm run build:sites`로 검증한다. 게시 전 실제 브라우저에서 게임 시작과 사건 기록 화면 이동을 확인한다.
- 기본 `npm run dev`, `npm run build`, `npm run start`는 로컬 및 Vercel용 Next.js 명령이다. Vercel은 `.next` 결과물을 사용하므로 Sites용 Vinext 빌드 결과물과 혼용하지 않는다.
- Firebase 환경변수가 설정되지 않은 상태에서는 기본 게임 데이터와 브라우저 저장 기능을 사용한다. Google 관리자 로그인 및 Firebase 공유 게시에는 별도 Firebase 웹 앱 설정이 필요하다.
