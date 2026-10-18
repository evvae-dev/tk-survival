# 샘플 HTML 기반 UI 적용

2026-10-16에 제공받은 `C:/Users/BA200205/Desktop/1111.html`을 기준으로 게임·타이틀·관리자·자료·사건 기록 화면에 다크 테마를 적용했다. 원본 파일은 수정하지 않았다.

## 화면 기준

- 다크 배경, 도트 패턴, 둥근 패널, 빨간 주요 버튼, 노란 순위 강조를 공통으로 사용한다.
- 데스크톱 게임은 좌측 인물·정세, 중앙 사건·기록, 우측 장수 순위의 3단 구조다. 각 패널을 별도로 스크롤한다.
- 모바일은 인물 요약·사건·기록·순위를 세로로 배치한다. 능력치와 정세는 팝업으로 연다.
- 선택하기와 상단 진행은 현재 사건의 선택 팝업을 연다. 선택한 후 팝업을 닫고 실제 다음 단계로 진행한다. 연도를 임의로 증가시키지 않는다.
- 자동 사건은 한 건씩 나의 기록에 쌓는다. 헤더의 자동·대기 배율·수동 진행과 카드 공개 시점은 [기록 재생 문서](RECORD_PLAYBACK.md)를 따른다.
- 후속 요청에 따라 일반 텍스트·대사는 샘플의 Noto Sans KR, 로고·선택 팝업 제목은 Galmuri9로 변경했다. 샘플의 외부 예시 사진 대신 기존 타이틀 일러스트를 활용했다.
- 샘플과 동일하게 데스크톱 로고 28.8px, 모바일 로고 24px, 사건 본문·패널 제목·주요 버튼 17.6px, 선택지 16px, 순위 탭 14.4px를 사용한다. 모바일에서도 본문 크기를 줄이지 않는다.

## 파일 분리

관리자 좌측 메뉴·모바일 메뉴·현재 메뉴 표시는 `app/admin/layout.tsx`와 `components/event-admin/AdminShell.tsx`에서 공통 관리한다. `/admin/events`, `/admin/data`, `/admin/collection`, `/admin/history` 전환 시 공통 레이아웃을 유지하고 본문만 교체한다. 관리자 사건 기록은 `/admin/history`, 게임에서 여는 사건 기록은 기존 `/history`를 사용한다. 게임으로 이동하는 링크는 관리자 영역을 나간다.

| 역할 | 파일 |
|---|---|
| 페이지 진입·화면 전환 | `app/page.tsx` |
| 공통 색상·기본 요소·React Flow 테마 | `app/globals.css` |
| 게임·타이틀·모달 반응형 스타일 | `components/game/game.module.css` |
| 타이틀·이름 입력 | `components/game/GameTitle.tsx` |
| 게임 배치·선택·기록·설정 | `components/game/GameDashboard.tsx` |
| 인물 정보 | `components/game/CharacterPanel.tsx` |
| 능력 레이더 차트 | `components/game/StatsRadar.tsx` |
| 정세 배치도 | `components/game/SituationMap.tsx` |
| 장수 순위·탭·조회 상태 | `components/game/OfficerRanking.tsx` |
| 팝업 열기·닫기·Escape·포커스 처리 | `components/game/GameDialog.tsx` |
| 저장 복원·현재 사건 계산 | `hooks/use-game-session.ts` |
| 능력 목록·차트 좌표 계산·개발 도구 수치 | `lib/game-presentation.ts` |
| 장수 조회·정렬·등장 조건 | `app/api/officers/route.ts` |

관리자 기존 화면의 CSS 모듈도 같은 공통 색상 변수를 사용한다. HTML에 인라인 스크립트나 전역 `window.onload`를 삽입하지 않는다. 샘플의 `drawRadarChart`는 React SVG와 좌표 함수로, `renderRanking`·`changeRankTab`은 API·컴포넌트 상태로, `openModal`·`closeModal`은 네이티브 `dialog` 컴포넌트로 옮겼다. 모달은 키보드 포커스와 Escape를 지원한다. 정적 샘플의 더미 버튼·장수 수치·189년 사건은 사용하지 않는다.

## 실제 게임 데이터 연결

주인공은 통솔·무력·지력·정치·매력 5개 능력을 표시한다. 체력과 자금은 후속 요청으로 프로세스에서 제거했다. 정치 초기값은 50이며 서생은 +5, 사족은 +10을 받는다. 선택지는 관련 능력 아이콘·성공과 실패 결과·파란 성공률·빨간 실패율을 표시한다. 전투의 복합 능력과 상대 장수 ID는 관리자 판정 노드에서 편집한다.

게임 persist 버전은 6이다. 버전 4·5의 5.1 진행 기록·선택 커서·세계 상태는 보존하고 정치 기본값을 보충하며 체력·자금은 제거한다. 이전 버전 3 이하의 연간 성장 세이브는 5.1 전환 정책대로 초기화한다.

장수 순위는 `/api/officers?year=184&sort=leadership&ranked=true&limit=10` 형태로 조회한다. `sort`는 `leadership`, `strength`, `intelligence`, `politics`, `charisma`만 허용한다. 생몰년과 등장 연도가 현재 연도에 맞는 장수를 정렬하며, 게임에서 사망한 장수 ID는 `exclude`로 제외한다. 동점은 무장 번호 순서다. 순위는 삼국지14의 게임 수치이며 실제 역사적 서열로 표현하지 않는다.

정세는 저장된 `world.control`의 도시·전장 지배 상태를 표시한다. 샘플의 임의 위성 사진과 고정 동탁·원소 핀은 사용하지 않는다. 배치도는 실제 지형·거리의 비율과 다르다는 점을 화면에 표시한다. 포로·항복·피신 상세는 나의 기록에서 확인한다.

## 확인 경로

- 게임·타이틀: `http://localhost:3000`
- 사건 관리: `http://localhost:3000/admin/events`
- 실행·수집 플로우: `http://localhost:3000/admin/collection`
- 자료 조회: `http://localhost:3000/admin/data`
- 사건 기록: `http://localhost:3000/history`

실행·검증은 `npm run dev`, `npm run typecheck`, `npm test`, `npm run build`를 사용한다. 현재 5.1 사건·분기 계약은 [5.1 실행 문서](CHAPTER_5_1_RUNTIME.md)를 함께 확인한다. Firebase의 사건 데이터는 그대로 사용하며 이번 UI 적용을 이유로 새 사건을 게시하지 않는다.
