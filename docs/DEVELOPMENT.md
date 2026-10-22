# 챕터 파일 기반 개발 구조

`data/chapters/index.json`의 순서가 진행 기준이다. `lib/history.ts`는 챕터 순서→사건 sequence 순으로 정렬하며, `lib/event-engine.ts`는 연도를 진입 조건으로 삼지 않는다. 실제 날짜는 기록에 남기고 나이는 역행시키지 않는다.

사건 원본과 분기는 `data/chapters/chapter-NNN.json`에 둔다. `node scripts/build-story.mjs`는 실제 `EventFlow` 타입에 맞는 사건 목록·사실 대응·연표를 생성한다. `lib/event-flow.ts`가 조건·효과·그래프를, `lib/ability-check.ts`가 능력 판정을 검증한다. 선택 미리보기는 추첨하지 않고 확정 시 한 번 판정해 저장하며 재제출로 재추첨하지 않는다.

사건 목록·관리자·게임은 공통 `events.json`과 같은 브라우저 편집본을 사용한다. 현재 판본은 게임·사건 편집·클라우드 포인터를 옛 연도별 판본과 분리한다. 새 판본의 편집과 명시적 삭제를 보존한다. 외부 게시·운영 배포는 별도 요청 시 수행한다.

검증은 `npm run typecheck`, `npm test`, `npm run build`, `node scripts/validate-event-data.mjs`, `node scripts/validate-reference-data.mjs`를 사용한다. `lib/story-runtime.test.ts`는 실제 엔진의 성공/실패·조건·전사·소속·챕터 연결·저장 복원을 검증하고 `/tmp/tk-story-fixtures/`에 자동 테스트 상태를 내보낸다. 이는 사용자 실저장이 아니다.

```sh
npm run start -- --hostname 127.0.0.1 --port 4173
node .agents/skills/playwright-page-check/scripts/check-story-chapters.cjs http://127.0.0.1:4173 001 /tmp/tk-story-browser-001
```

`002`, `003`도 같은 방식으로 검증한다. A/B/C 성공·실패의 실제 엔진 상태를 모아 조건별 장면을 방문하고 이미지·PC/모바일·짧은 화면·관리자 편집·저장·복원·게임 반영을 확인한다. 캡처와 실제 테스트 결과는 `docs/development/rebuild-chapters-1-3.md`에 기록한다.
