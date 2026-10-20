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

For this game, run `node .agents/skills/playwright-page-check/scripts/check-tk-survival.cjs http://localhost:4173 /tmp/tk-game-browser`. It verifies game start, visible scene art, three choice images, next-scene changes, desktop/mobile/short-desktop layouts, and browser errors.

For a complete faction/image audit, run `node .agents/skills/playwright-page-check/scripts/audit-tk-images.cjs http://localhost:4173 /tmp/tk-image-audit`. It visits all 20 choice scenes on desktop/mobile/short screens, checks all 56 options, rejects repeated scene/choice images and `상대 없음`, and verifies actual opponent ability values. It uses only isolated test browser saves.

For name-dialog centering, mobile character/settings layout, and real growth/decrease feedback, run `node .agents/skills/playwright-page-check/scripts/check-layout-growth.cjs http://localhost:4173 /tmp/tk-layout-growth`. Check PC and 390px/320px mobile viewports. Mobile playback controls live in Settings; use `scripts/playback-helper.cjs` to operate the same controls without assuming they are in the header.

For the compact single-line mobile character row, run `node .agents/skills/playwright-page-check/scripts/check-inline-character.cjs http://localhost:4173 /tmp/tk-inline-check`. It checks all fields and six values on one line at 320px/390px, icon-only popup access, inline increase/decrease animation, and long names with values at 100.

New-game onboarding includes a 30–80 ability roulette with unlimited `다시 만들기` rerolls. Click `시작` inside `stat-roulette` to save the displayed stats and continue to the awakening transition and first-choice scene. Use `scripts/check-onboarding.cjs` to verify this sequence. Other checks can dismiss that first dialog with `dismissInitialChoice` from `scripts/playback-helper.cjs`; test fixtures for later scenes should set `introChoicePending: false`.

After roulette, verify the non-dismissible awakening transition on desktop/mobile and reduced-motion contexts before the first-choice scene appears. `check-onboarding.cjs` covers this ordering.

For completed-game chronicles, run `node .agents/skills/playwright-page-check/scripts/check-chronicle.cjs http://localhost:4173 /tmp/tk-chronicle`. It verifies year grouping, progressive reveal, downward scrolling, full view/replay, desktop/390px/320px layout and reduced motion using isolated completed-save fixtures. Synthetic fixture years are for grouping checks only, not new game content.

For story continuity after a checked choice, run `scripts/check-narrative-continuity.cjs`: it performs the Han Zhong negotiation, confirms success prose before the execution threat, and checks legacy-save rendering on PC/mobile.

For administrator edits across tabs, run `node .agents/skills/playwright-page-check/scripts/check-catalog-tabs.cjs http://localhost:4173 /tmp/tk-catalog-tabs`. It edits the opening Yellow Turban route in a separate admin tab, checks both save buttons, confirms the already-open game popup updates without reloading, and verifies reload persistence, images, and unchanged game progress on desktop/mobile/short screens. The optional final `before` argument reproduces the missing synchronization in an older build.

Append `legacy` to `check-catalog-tabs.cjs URL OUTPUT legacy` to preload the exact previous default prose in an isolated saved catalog. It checks the corrected palace-march introduction, then saves a different administrator title and verifies that it remains applied across tabs and reloads. Default captures wait for the first visible choice image to load.

For the unified record and contextual recruitment rework, run `node .agents/skills/playwright-page-check/scripts/check-record-campaign.cjs http://localhost:4173 /tmp/tk-record-campaign`. It checks desktop/short desktop/390px/320px/769px layouts, a single wider right record panel, historical background before the compatible battle outcome, Cao-only recruitment after Cao accompaniment, three destinations after rejection, and administrator record-type/text save/reload/game reflection. Fixtures use isolated contexts after real onboarding. Run against a stable production build to distinguish application failures from development hot-reload/router initialization errors.
