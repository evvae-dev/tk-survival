# 내가 삼국지에 떨어진다면

현재는 **184년·20세 고정으로 5.1 황건적의 난을 시험하는 버전**입니다. 진영·전선·가정·능력에 따라 전투와 인물 생존이 달라지고 다음 사건의 성립 여부도 바뀝니다. 이전 10살 시작과 연간 성장 진행은 이번 테스트에서 폐기했습니다.

## 실행

```bash
npm install
npm run dev
npm run typecheck
npm test
npm run build
```

Next.js App Router, TypeScript, React, Tailwind CSS, Zustand persist, Firebase를 사용합니다. 일반 글꼴은 서울한강체, 대사는 궁서체입니다.

## 화면과 데이터

- 게임: [http://localhost:3000](http://localhost:3000). 이름 입력 → 관군·황건군·주민 선택 → 탁군/청주·완성·광종/하곡양 전선 선택.
- 실행·수집 플로우: [http://localhost:3000/admin/collection](http://localhost:3000/admin/collection). 사건 간 연결과 전투 내부 분기를 확인합니다.
- 사건 편집: [http://localhost:3000/admin/events](http://localhost:3000/admin/events). 노드·조건·선택·결과·선행 사건을 편집하고 Firebase에 공유 게시합니다.
- 연표·장수: [http://localhost:3000/admin/data](http://localhost:3000/admin/data). 활성 연표 6개와 장수 1,000명을 조회합니다.

기본 사건은 도입 1개·전투 5개·결말 1개·황건 천하통일 가상 원정 1개, 총 8개입니다. 이전 기본·공유 사건은 활성 목록에서 제거했습니다. 다른 전선은 기본 경과를 따르며 대흥산과 광종의 결과는 각각 청주·하곡양의 전제를 바꿉니다. 월 미상 자료에 가짜 월을 붙이지 않습니다. 통솔·무력·지력·매력 판정과 대체 역사는 게임 창작입니다.

게임은 브라우저에 자동 저장합니다. 이전 연간 성장 세이브는 초기화하며, 5.1 버전 4 저장은 정치 능력을 보충해 유지합니다. 사건 편집은 같은 브라우저에 먼저 저장되고, 관리자 Google 로그인 후 공유 게시하면 다른 브라우저에도 전달됩니다. Firebase의 현재 리비전만 활성 목록으로 사용하며 이전 리비전은 복구 이력입니다.

황건군으로 **황건적 코스프레 → 천하통일에 나선다**를 선택하면 동탁군 → 유비군 → 조조군을 차례로 상대합니다. 세 전투 승리 후 황제를 생포하고 황건국을 세워 통일하며, 어느 전투든 패하면 생포·처형으로 끝납니다. [가상 시나리오 설계](docs/YELLOW_CONQUEST.md)를 참고하세요.

## 이어서 개발하기

[5.1 실행 설계·분기·저장 전환](docs/CHAPTER_5_1_RUNTIME.md)을 현재 기준으로 사용하세요. [원자료 수집 기록](docs/COLLECTION_5_1.md), [관리 화면](docs/ADMIN_GUIDE.md), [Firebase 연결](docs/FIREBASE_SETUP.md), [인과 이벤트 설계](docs/CAUSAL_EVENT_DESIGN.md)도 참고합니다.

5.2 이후는 아직 수집·실행에 추가하지 않았습니다. 다음 장 수집은 사용자 확인 후 Gemini CLI로 진행합니다. 원사서가 미확인인 자료는 미확인으로 유지하고, 수집본의 이견을 임의로 교정하지 않습니다. 수명·세대교체·전면적인 세력 AI는 구현 범위에 포함하지 않습니다.

## 화면과 코드 구성

제공된 HTML 샘플의 다크 테마를 전체 화면에 적용했습니다. 데스크톱 3단 게임 패널, 모바일 능력·정세 팝업, 선택 모달, 실제 장수 순위를 제공합니다. CSS·컴포넌트·저장 훅·차트 계산 함수의 분리는 [UI 적용 문서](docs/UI_REDESIGN.md)를 확인하세요.

이벤트는 [이벤트 작성 지침](docs/EVENT_WRITING_GUIDE.md)에 따라 짧은 1인칭 웹소설 독백과 `[행동] 속마음`으로 작성합니다. 5.1 문구는 `data/history/narrative-5-1.json`에서 관리하며 사실·출처와 분리합니다. `node scripts/build-chapter-5-1.mjs`로 재생성해도 문체가 유지됩니다. 체력·자금 없이 다섯 능력을 사용하며, [능력 확률 판정](docs/ABILITY_CHECKS.md)의 가중치는 `.env`의 `ABILITY_CHECK_WEIGHT`로 설정합니다.

테스트 기본값은 `.env`의 `CACHE_ENABLED=false`입니다. `CACHE_TTL_SECONDS`로 캐시 시간을 초 단위로 설정합니다. 설정 변경 후 서버를 재시작하며, 상세 범위는 [캐시 설정 문서](docs/CACHE_SETTINGS.md)를 확인하세요. 본문은 Noto Sans KR, 로고는 Galmuri9로 샘플과 맞췄습니다.
