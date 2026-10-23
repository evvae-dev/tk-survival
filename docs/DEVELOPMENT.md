# 챕터 파일 기반 개발 구조

## 현재 작업 기준 — 2026-10-23

[사건 참여·분기 계약](EVENT_PARTICIPATION_CONTRACT.md)을 개발·기획·QA·관리자·아트 담당의 공통 기준으로 사용한다. 기존 엔진을 유지하고 사건 시작의 성립/참여/진영 판정, 불참 소식·취소, 결과 전파를 원본과 생성기에 보완한다. 최신 사용자 요청에 따라 기존41건을 폐기하고 1~5화를 실제 재개발한 판본은 `romance-participation-v2`다. 완료 근거는 [재개발 기록](development/rebuild-participation-1-5.md)에서 확인한다.

- 착수: 분기 스킬의 진입 결정표·상태 생산/소비표를 작성하고 개발 스킬의 역할별 인계 순서를 따른다.
- 구현: 현장 이동보다 먼저 조건을 검사하며 불참·취소도 처리 순서를 진행시킨다. 사건 완료 여부를 참석/성공 권한으로 사용하지 않는다.
- 검증: QA 매트릭스의 직전 선택→후속 사건 경로를 실행한다. 기존 테스트의 고정 3선택·무조건 현장 접근 전제를 유지하려고 제품 조건을 완화하지 않는다.
- 범위: 최초 개선 검증은 r001-01~05에서 시작한다. 120회 전면 재작성이나 엔진 교체는 선행 작업이 아니다. 구체 개발·배포는 해당 사용자 요청 범위를 따른다.

## 기존 실행 구조와 명령

`data/chapters/index.json`의 순서가 진행 기준이다. `lib/history.ts`는 챕터 순서→사건 sequence 순으로 정렬하며, `lib/event-engine.ts`는 연도를 진입 조건으로 삼지 않는다. 실제 날짜는 기록에 남기고 나이는 역행시키지 않는다.

사건 원본과 분기는 `data/chapters/chapter-NNN.json`에 둔다. `node scripts/build-story.mjs`는 실제 `EventFlow` 타입에 맞는 사건 목록·사실 대응·연표를 생성한다. `lib/event-flow.ts`가 조건·효과·그래프를, `lib/ability-check.ts`가 능력 판정을 검증한다. 선택 미리보기는 추첨하지 않고 확정 시 한 번 판정해 저장하며 재제출로 재추첨하지 않는다.

사건 목록·관리자·게임은 공통 `events.json`과 같은 브라우저 편집본을 사용한다. 현재 판본은 게임·사건 편집·클라우드 포인터를 옛 연도별 판본과 분리한다. 새 판본의 편집과 명시적 삭제를 보존한다. 외부 게시·운영 배포는 별도 요청 시 수행한다.

검증은 `npm run typecheck`, `npm test`, `npm run build`, `node scripts/validate-event-data.mjs`, `node scripts/validate-reference-data.mjs`를 사용한다. `lib/participation-runtime.test.ts`, `lib/chapter-four.test.ts`, `lib/chapter-five.test.ts`, `lib/story-runtime.test.ts`가 실제 선행 선택→후속 진입·실패·소속·세계 생존·챕터 연결·저장 복원을 검증한다. 참여 테스트는 `/tmp/tk-participation-fixtures/`에 실제 엔진 경로의 화면 인수 상태를 내보낸다. 이는 사용자 실저장이 아니다.

```sh
npm run start -- --hostname 127.0.0.1 --port 4173
node .agents/skills/playwright-page-check/scripts/check-participation.cjs http://127.0.0.1:4173 001 /tmp/tk-participation-browser-001
```

`002`~`005`도 같은 방식으로 검증한다. 실제 엔진 상태로 조건별 장면을 방문하고 이미지·PC/모바일·짧은 화면·관리자 편집·저장·복원·게임 반영을 확인한다. `check-participation-news.cjs URL OUTPUT`은 실제 동행 거절 뒤 도원결의 소식만 표시되고 저장이 유지되는지 검사한다. `check-participation-results.cjs URL OUTPUT`은 실제 생포 선택 뒤 결과 이미지와 5초 재생을 검사한다. 결과 검사 전 `npm test -- lib/chapter-five.test.ts`로 군적 있는 실제 선행 경로 fixture도 생성한다. `check-participation-admin.cjs URL OUTPUT`은 참석 조건과 소식 편집을 게임의 참/거짓 경로에서 확인한다. 캡처와 실제 결과는 `docs/development/rebuild-participation-1-5.md`에 기록한다.

완료 저장의 새 화 이어하기는 `continuationEvent`와 `continueStory`를 사용한다. 완료 상태를 자동으로 바꾸지 않으며 과거 완료 챕터 뒤의 신규 사건이 있을 때만 버튼을 연다. 전사·처형·통일 엔딩은 제외한다.

재생·명성·가중치·이미지 규칙과 당시 검증은 `docs/development/game-rules-20261022.md`를 따른다. `check-game-rules.cjs`가 4,999/5,000ms, 속도 변경, 저장한 결과 기한, 실패 소수점 명성, 전사, 관리자 비중·난도·명성 편집을 실제 화면에서 검증한다. `check-story-chapters.cjs`의 기존 옵션 이미지 3개 검사는 참여 분기 구현 시 실제 노출 선택별 이미지 검사로 보완해야 한다. 소식 전용 경로에는 선택지를 요구하지 않는다.
