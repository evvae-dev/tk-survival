# 플레이 사이트 배포

- 원본 저장소의 게임과 API를 Vinext 및 Cloudflare Workers용 배포 사본으로 구성한다.
- 사이트 식별자는 `.openai/hosting.json`에 저장한다. 동일 사이트를 갱신할 때 해당 식별자를 유지한다.
- 배포 런타임에서 `next/link` 이동 오류가 재현되어, 배포 사본은 `HostedLink`로 일반 페이지 이동을 사용한다. 게임 진행과 편집 내용은 기존 브라우저 저장소에 유지된다.
- `npm run typecheck`, `npm test`, `npm run build`로 검증한다. 게시 전 실제 브라우저에서 게임 시작과 사건 기록 화면 이동을 확인한다.
- Firebase 환경변수가 설정되지 않은 상태에서는 기본 게임 데이터와 브라우저 저장 기능을 사용한다. Google 관리자 로그인 및 Firebase 공유 게시에는 별도 Firebase 웹 앱 설정이 필요하다.
