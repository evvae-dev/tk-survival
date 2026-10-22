# 내가 삼국지에 떨어진다면

`docs/romance-three-kingdoms/chapters/001.md`~`003.md`의 사건 문서를 기준으로 만든 삼국지 빙의 인터랙티브 웹소설 게임입니다. 연도별 챕터를 폐기하고 **1화 → 2화 → 3화의 파일 순서**로 진행합니다. 날짜는 사건 정보로 보존하며, 월을 모르는 사건에 임의의 월을 붙이지 않습니다.

- 1화: 도원결의와 황건적의 난. 조기 경고, 유비 접촉·지원, 첫 전투, 청주 구원, 노식의 지휘권, 동탁과의 충돌.
- 2화: 황건 토벌의 마무리와 독우 매질. 완성 항복 협상, 전공 증거, 독우 모함, 관직 유지/이탈, 영제 사후와 하진의 소환.
- 3화: 하진 피살과 동탁의 입경. 하진 생존/피살, 궁중 혼란, 왕실 피란, 동탁의 군권, 여포와 정원 암살 저지.

기본 사건은 24개, 상태에 따라 달라지는 선택 장면은 37개입니다. 매 장면은 A 원작 파괴, B 영웅과 인연, C 생존 우선의 세 행동을 제공합니다. 통솔·무력·지력·정치·매력으로 판정하고 성공/실패의 실제 결과를 기록합니다. 임관은 매력으로 판정하며 접촉과 정식 소속을 구별합니다. 여포 일기토 패배는 사전에 안내한 전사 엔딩으로 끝납니다.

챕터 문서의 연의 전개, 플레이어의 실제 결과, 게임 창작을 구분합니다. 선택 전에는 현재 배경과 짧은 위험 힌트를 보여 주고, 결과는 선택 뒤에 공개합니다.

## 실행·검증

```sh
npm install
npm run dev
npm run typecheck
npm test
npm run build
node scripts/build-story.mjs
node scripts/validate-event-data.mjs
node scripts/validate-reference-data.mjs
```

게임은 `/`, 사건 편집은 `/admin/events`, 전체/내부 실행 플로우는 `/admin/collection`, 장수·사건 자료는 `/admin/data`에서 확인합니다. 게임과 관리자가 동일한 사건 목록을 사용합니다. 사건 제목·ID로 검색하거나 `/admin/events?event=r001-01`처럼 직접 엽니다.

## 데이터와 저장

| 역할 | 위치 |
|---|---|
| 회차 원본 | `docs/romance-three-kingdoms/chapters/001.md`~`003.md` |
| 챕터 순서 | `data/chapters/index.json` |
| 장면·선택·조건·판정·효과·문구·이미지 원본 | `data/chapters/chapter-001.json`~`chapter-003.json` |
| 생성기 | `scripts/build-story.mjs` |
| 공통 실행 사건 | `data/history/events.json` |
| 사실·원본 파일·SHA-256 대응 | `data/chapters/facts.json` |
| QA 점수·수정 근거 | `data/chapters/chapter-001-qa.json`~`chapter-003-qa.json` |
| 개발·검증 기록 | `docs/development/rebuild-chapters-1-3.md` |
| 이미지 | `public/art/characters/`, `public/art/scenes/`, `public/art/choices/` |

기존 나무위키 5.1~5.5 수집·서사·실행 데이터와 생성기를 제거했습니다. 장수 1,000명의 능력 자료와 공통 이미지 자산은 보존했습니다. 연표 API도 현재 챕터의 사실 목록을 사용합니다.

새 게임은 `tk-survival-game-romance-v1`, 사건 편집은 `tk-survival-event-catalog-romance-v1`에 저장합니다. 예전 저장은 옛 키에 남아 있고 새 판본에 자동 혼합하지 않습니다. 새 판본 안에서는 선택·효과·판정을 중복 적용하지 않으며 편집본과 명시적 삭제를 보존합니다. Firebase 공유 포인터는 `eventCatalog/romance-chapters-v1`이며 로컬 개발 완료와 공유 게시·배포는 별개입니다.

## 후속 개발과 배포

`.agents/skills/three-kingdoms-development/SKILL.md`로 챕터를 순차 개발하고 실행 흐름·QA 스킬을 적용합니다. 확인된 오류를 모두 수정하고 종합 점수 7점 초과 후 이미지를 생성·연결하며 게임·관리자·저장·PC/모바일을 확인합니다.

운영 배포는 사용자가 요청하면 GitHub `origin/main` 푸시 → Vercel 자동 배포를 사용합니다. 운영 주소는 https://tk-survival.vercel.app 입니다. Next.js 빌드 결과는 `.next`를 사용합니다. Firebase 환경 설정은 `docs/FIREBASE_SETUP.md`, 별도 요청하는 Sites 배포는 `docs/SITES_DEPLOYMENT.md`를 참고합니다.
