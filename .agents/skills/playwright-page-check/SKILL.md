---
name: playwright-page-check
description: Use Playwright to verify a web page in desktop and mobile Chromium, exercise user interactions, check image visibility and layout, capture screenshots, and report browser errors.
---

# Playwright page check

Use when the user asks to inspect a page, verify a UI change, or check responsive layout with Playwright. Read the target project's AGENTS.md and preview instructions first. Reuse installed Playwright and Chromium; check the project's dependencies and `/opt/codex/cua_node/lib/node_modules/playwright` before installing anything.

1. Identify the intended checkout and page. Start its documented preview command only when needed, keep the process session, and stop only the server you started after verification.
2. Use a fresh browser context for test saves. Never clear the user's real browser data. Use the user-visible start form and controls for interactive checks.
3. Run the supplied script with an explicit URL and artifact directory:
   `node .agents/skills/playwright-page-check/scripts/check-page.cjs http://localhost:4173 /tmp/page-check`
4. For application-specific steps, create an additional script that uses semantic selectors (`getByRole`, `getByLabel`, stable `data-testid`). Wait for visible UI or loaded images rather than arbitrary long sleeps. Check desktop 1440×1000, mobile 390×844, and a short desktop viewport where relevant.
5. Assert that intended images have a nonzero natural size and visible bounds, controls work, dialogs scroll, and the document has no horizontal overflow. Capture screenshots after the relevant interaction, not just the landing page. Collect page errors and failed same-origin requests; classify unrelated external font/network failures separately.
6. Inspect the captured screenshots with `view_image`. Fix actual failures, then repeat the affected checks. Report exactly which scenarios passed and any unverified behavior. A successful build alone is not a browser check.

For a private deployed site, use the supported Sites sign-in flow or an authorized short-lived bypass token. Keep tokens in memory or process stdin; never put them in files, screenshots, source, command-line arguments, logs, or Git. Do not bypass network policy or invent credentials. If private access cannot be established, verify the same built artifact locally and state that production browser access is unverified.

Keep page-check artifacts outside Git. Persist this skill in the project's `.agents/skills` and optionally the current user's `~/.codex/skills` so a future session can discover it. Do not overwrite an existing user skill with the same name.

## 사건 참여 화면 담당 지시 — 2026-10-23

이 게임에서는 [사건 참여 계약](../../../docs/EVENT_PARTICIPATION_CONTRACT.md)을 우선한다. 아래 과거 스크립트의 고정 사건 수·선택 3개·이미지 중복 금지 전제를 현재 인수 기준으로 사용하지 않는다. 현재 판본의 화면 검증은 `scripts/check-participation.cjs`, `scripts/check-participation-news.cjs`, `scripts/check-participation-results.cjs`를 사용한다. 참석 조건과 소식 편집의 실제 게임 반영은 `scripts/check-participation-admin.cjs`로 검사한다. 먼저 `npm test -- lib/participation-runtime.test.ts lib/chapter-five.test.ts`로 실제 경로 fixture를 생성한다. 스킬 문서 수정만 요청받았을 때 브라우저 검증을 수행한 것으로 보고하지 않는다.

1. 실제 직전 선택에서 생성한 성공·거절·미접촉·황건 합류·사건 불성립 fixture를 QA 담당에게 받아라. 임의로 참석 표식만 넣은 화면은 연속 경로 증거를 대신하지 않는다.
2. 동행 허락 경로에는 도원결의 현장이, 거절 경로에는 관련 소식 카드만 표시되는지 확인하라. 불참자의 현장 선택 팝업·도착문·개인 보상·위치 변경이 없고 다음 유효 사건으로 이어져야 한다.
3. 소식 재생 경계의 저장·새로고침을 검사하라. 중복 카드·중복 효과·빈 팝업·정지·새 추첨이 없어야 한다. 기존 기록 5초·선택 결과 5,000ms 규칙을 유지하라.
4. 황건 합류자의 아군/적군 문구와 이미지, 대체 생존 결과를 확인하라. 진영 변경 없이 유비군 화면으로 바뀌거나 직전 그림이 잔류하면 결함으로 기록하라.
5. 관리자에서 참여 조건·불참 기록을 실제 편집·저장·복원하고 게임의 참/거짓 경로에 반영되는지 확인하라. 기존 사용자 편집과 진행을 보존하며 공유 게시 없이 격리 데이터로 검사하라.
6. PC·모바일·낮은 화면에서 실제 노출된 선택별 이미지를 검사하라. 선택 개수를 무조건 3개로 단언하지 말고 소식 경로는 0개인지 확인하라. 중복 그림도 표시하며 단독 인물 이미지는 허용하지 않는다.

산출물은 경로/상태/실제 화면·저장 결과와 직접 확인한 캡처다. 기존 스크립트가 현재 사건을 다루지 못하면 범위 미지원으로 기록하고 보완하라. 옛 스크립트 통과를 새 참여 분기 통과로 보고하지 말라.

## 기존 화면 검사 도구

For the legacy game-start check, inspect `node .agents/skills/playwright-page-check/scripts/check-tk-survival.cjs http://localhost:4173 /tmp/tk-game-browser` before use. Its original three-choice assumptions must be adapted to the current participation contract when testing new branches.

The legacy image audit is `node .agents/skills/playwright-page-check/scripts/audit-tk-images.cjs http://localhost:4173 /tmp/tk-image-audit`. Its original coverage was 20 scenes and 56 options; this is not current chapter coverage. Before reuse, update any assertions rejecting repeated images or requiring a fixed option count. Current rules require contextual images for every displayed scene/choice/result, including repeated images. Use isolated test browser saves and inspect actual opponent values where applicable.

For name-dialog centering, mobile character/settings layout, and real growth/decrease feedback, run `node .agents/skills/playwright-page-check/scripts/check-layout-growth.cjs http://localhost:4173 /tmp/tk-layout-growth`. Check PC and 390px/320px mobile viewports. Mobile playback controls live in Settings; use `scripts/playback-helper.cjs` to operate the same controls without assuming they are in the header.

For the compact single-line mobile character row, run `node .agents/skills/playwright-page-check/scripts/check-inline-character.cjs http://localhost:4173 /tmp/tk-inline-check`. It checks all fields and six values on one line at 320px/390px, icon-only popup access, inline increase/decrease animation, and long names with values at 100.

New-game onboarding includes a 30–80 ability roulette with unlimited `다시 만들기` rerolls. Click `시작` inside `stat-roulette` to save the displayed stats and continue to the awakening transition and first-choice scene. Use `scripts/check-onboarding.cjs` to verify this sequence. Other checks can dismiss that first dialog with `dismissInitialChoice` from `scripts/playback-helper.cjs`; test fixtures for later scenes should set `introChoicePending: false`.

After roulette, verify the non-dismissible awakening transition on desktop/mobile and reduced-motion contexts before the first-choice scene appears. `check-onboarding.cjs` covers this ordering.

For completed-game chronicles, run `node .agents/skills/playwright-page-check/scripts/check-chronicle.cjs http://localhost:4173 /tmp/tk-chronicle`. It verifies year grouping, progressive reveal, downward scrolling, full view/replay, desktop/390px/320px layout and reduced motion using isolated completed-save fixtures. Synthetic fixture years are for grouping checks only, not new game content.

For story continuity after a checked choice, run `scripts/check-narrative-continuity.cjs`: it performs the Han Zhong negotiation, confirms success prose before the execution threat, and checks legacy-save rendering on PC/mobile.

For administrator edits across tabs, run `node .agents/skills/playwright-page-check/scripts/check-catalog-tabs.cjs http://localhost:4173 /tmp/tk-catalog-tabs`. It edits the opening Yellow Turban route in a separate admin tab, checks both save buttons, confirms the already-open game popup updates without reloading, and verifies reload persistence, images, and unchanged game progress on desktop/mobile/short screens. The optional final `before` argument reproduces the missing synchronization in an older build.

Append `legacy` to `check-catalog-tabs.cjs URL OUTPUT legacy` to preload the exact previous default prose in an isolated saved catalog. It checks the corrected palace-march introduction, then saves a different administrator title and verifies that it remains applied across tabs and reloads. Default captures wait for the first visible choice image to load.

For the unified record and contextual recruitment rework, run `node .agents/skills/playwright-page-check/scripts/check-record-campaign.cjs http://localhost:4173 /tmp/tk-record-campaign`. It checks desktop/short desktop/390px/320px/769px layouts, a single wider right record panel, historical background before the compatible battle outcome, Cao-only recruitment after Cao accompaniment, three destinations after rejection, and administrator record-type/text save/reload/game reflection. Fixtures use isolated contexts after real onboarding. Run against a stable production build to distinguish application failures from development hot-reload/router initialization errors.

For the actual Dong Zhuo continuity regression, first run `node .agents/skills/playwright-page-check/scripts/export-dong-journey.cjs /tmp/tk-continuity`. It executes the current engine from Liu Bei accompaniment through failed recruitment, the western events and Dong Zhuo recruitment, and exports the resulting game/paragraphs. It also retains a synthetic pre-fix v8 game fixture with the former headline wall. Read the exported paragraphs in order; counts alone do not verify narrative quality. Against a stable production build run `node .agents/skills/playwright-page-check/scripts/check-campaign-continuity.cjs http://localhost:4173 /tmp/tk-continuity /tmp/tk-continuity-browser`. This checks factual records without repeated scene headings, old/default prose repair, absence of annual filler and unrelated headlines, ordinary-word officer link guards, desktop/mobile reload, and preservation of decisions/stats/faction. The retained old fixture contains only an automated test character, not a user's save.

For the new scope-ending editor, run `node .agents/skills/playwright-page-check/scripts/check-continuity-admin.cjs http://localhost:4173 /tmp/tk-continuity/dong-journey.json /tmp/tk-continuity-admin`. It edits a real faction ending, toggles silent world-effect logging and checks persistence, saves `{region}` prose, and confirms that the actual game resolves the current region once after save/reload. It does not publish shared data.

For editorial-note leakage in the current participation edition, run `node .agents/skills/playwright-page-check/scripts/check-story-editorial.cjs URL OUTPUT` after generating participation fixtures. It uses real onboarding, restores an old opening record and catalog in an isolated context, preserves the saved game, checks administrator prose, and visits the chapter2 scene on desktop/mobile/short screens.
