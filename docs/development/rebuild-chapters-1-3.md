# 챕터1~3 재개발 진행 기록

## 사용자 확정 범위

- 기존 사건·실행 흐름 데이터 전체를 제거하고 처음부터 재개발한다.
- 연도별 챕터를 사용하지 않는다. 사건 원본 파일의 챕터1부터 파일 순서대로 진행한다.
- 챕터1 완료 후 챕터2, 챕터2 완료 후 챕터3을 개발한다.
- 실행 흐름·QA·개발 스킬을 적용하고 QA 통과 후 이미지 생성·연결과 화면 검증을 한다.
- 이 요청에는 운영 배포나 Firebase 공유 게시 요청이 포함되지 않았다.

## 사전 확인 — 2026-10-22

- 현재 저장소: `/workspace/tk-survival`, 브랜치 `work`, 시작 HEAD `d56d34c`.
- 기존 사건 목록: `data/history/events.json`, 실행 사건 29개, 연도별 184~188년.
- 복구본: `/workspace/backups/tk-survival-before-rebuild-20261022T142845Z`.
- 복구본에는 기존 history JSON과 챕터/캠페인 생성·검증·게시 스크립트 15개 및 SHA-256 manifest가 있다.
- 변경 전 기준 테스트: `npm test`, 27개 파일·242개 통과. 로그 `/tmp/tk-before-rebuild-tests.log`.
- 기존 사용자 변경: 앞서 생성한 세 스킬 폴더는 미추적 상태이며 보존한다.

## 원본 확인 결과

로컬에는 없던 원본을 GitHub `evvae-dev/tk-survival` 최신 main에서 찾아 필요한 3개 파일을 가져왔다.

| 챕터 | 원본 | 제목 | 상태 |
|---|---|---|---|
| 1 | `docs/romance-three-kingdoms/chapters/001.md` | 도원결의와 황건적의 난 | 완료 |
| 2 | `docs/romance-three-kingdoms/chapters/002.md` | 황건 토벌의 마무리와 독우 매질 | 완료 |
| 3 | `docs/romance-three-kingdoms/chapters/003.md` | 하진 피살과 동탁의 입경 | 완료 |

## 기존 자료 초기화

- 나무위키 수집 JSON 2개, 기존 서사·이전 판본·원정 이미지 연결 JSON, 옛 챕터 생성·서사 결합·게시 스크립트를 제거했다.
- 기존 사건 목록 29개를 제거하고 새 챕터 사건을 별도 ID로 생성한다.
- 옛 이야기만 검사하는 테스트는 복구본에 보존하고 활성 테스트에서 제거했다. 현재 사건의 실제 경로·판정·저장·관리자 계약 검증으로 교체했다.
- 장수 1,000명 능력 자료와 주인공·장수 기준 이미지·공통 행동 이미지는 보존한다.
- 새 판본 저장 키: `tk-survival-game-romance-v1`, `tk-survival-event-catalog-romance-v1`. 기존 브라우저 저장은 옛 키에 보존되지만 새 게임에 섞이지 않는다.
- 공유 포인터는 `eventCatalog/romance-chapters-v1`로 분리했다. 외부 공유 게시를 수행하지 않았다.

## 1화 구현·검증

- 원본 여덟 전개를 `r001-01`~`r001-08` 사건으로 대응했다.
- 분기 원본: `data/chapters/chapter-001.json`; 생성기: `scripts/build-story.mjs`; 실행: `data/history/events.json`; 사실/원본 SHA 대응: `data/chapters/facts.json`.
- A/B 성공·실패와 C의 결과, 조기 경고·유비 접촉 여부·노식 증거에 따른 별도 장면과 결말을 구현했다.
- QA 점수·근거·수정 이력: `data/chapters/chapter-001-qa.json`. 장면 종합은 8.0~8.4점으로 모두 7점 초과다.
- 실제 수정: 접촉 없는 즉시 임관 분리, 주요 인물 사망 시 장면 차단, 결과 전체를 미리 노출하던 확률 안내를 짧은 힌트로 분리, 관리자 상황문 textarea 접근성 이름 지정.
- 타입 검사 통과. 현재 전체 테스트 81개 통과 후 사망 경로 1개 추가, 관련 23개 재검증 통과.
- 프로덕션 빌드 통과: `/tmp/tk-chapter1-build3.log`.
- 새 이미지 3개를 실제 생성·열람 검수·연결: `public/art/scenes/r001-market.png`, `r001-tavern.png`, `r001-oath.png`.
- PC 1440×1000, 모바일 390×844, 낮은 PC 1440×720에서 여덟 선택 장면의 이미지·선택·스크롤을 검증 중이다. 캡처 `/tmp/tk-story-browser-001`, 실행 로그 `/tmp/tk-chapter1-browser3.log`.
- 최종 관리자 편집→저장→새로고침→게임 반영까지 통과했다. 화면 캡처를 직접 열어 확인했고 브라우저 오류 0건이다. 1화 완료 후 2화로 진행한다.

운영 배포·Firebase 공유 게시를 수행하지 않았다.

## 2화 완료

- 원본 여덟 전개 → `r002-01`~`r002-08`, 장면별 QA 8.0~8.6점, 평균 8.2점. 보고서 `data/chapters/chapter-002-qa.json`.
- 지도부 사망 소식과 실제 생존 상태, 독우 증거·현장 증언 공개 성공과 관직 유지/이탈, 안희 관직 유지 후의 중앙 위기 연결을 수정·검증했다.
- 전체 93개 테스트 통과(`/tmp/tk-chapter2-final-tests.log`), 타입 검사·프로덕션 빌드 통과. 원본·장수·이미지 경로 검증 통과.
- 새 이미지 `r002-evidence.png`, `r002-gate.png`, `r002-rally.png` 3개를 생성·직접 열람·연결했다.
- PC·모바일·낮은 PC 24장면과 관리자 편집·저장·새로고침·게임 반영 통과. 브라우저 오류 0건. `/tmp/tk-story-browser-002/report.json`. 캡처를 직접 열어 확인했다.
- 2화 완료 후 3화로 진행한다.

## 3화 및 범위 전체 완료

- `r003-01`~`r003-08` 여덟 사건을 구현했다. 하진 생존/피살, 왕실 피란처, 동탁의 병력 과시·임관, 정원 암살 저지, 여포 일기토의 전사 분기를 실제 상태와 연결했다.
- 각 화의 모든 조건별 선택 장면을 평가했다. 1화 11장면 8.2점, 2화 11장면 8.2점, 3화 15장면 8.4점이다. 장면별 점수와 근거는 `data/chapters/chapter-NNN-qa.json`에 있으며 모두 7점 초과다. 점수는 편집 평가이고 실행 검증과 별개다.
- 전체 사건 24개, 선택 장면 37개, 선택 항목 111개, 실행 노드 489개다. source 문서의 여덟 주요 전개를 각 화에서 모두 대응했다.
- 최종 테스트: 12개 파일·107개 통과(`/tmp/tk-final-tests5.log`). 최종 프로덕션 빌드 통과(`/tmp/tk-final-build4.log`, 타입 검사 포함). 별도 타입 검사와 사건·참조 검증기도 통과.
- 실제 엔진에서 A/B 성공·실패, C, 유비 접촉과 임관, 기존 소속 보존, 노식·독우·하진·정원 분기, 생존·전사, 판정 1회, 저장 복원과 재전송을 검증했다.
- PC 1440×1000·모바일 390×844·짧은 PC 1440×720에서 모든 조건별 장면 37개를 방문했다. 111개 화면 방문의 이미지 로드·선택 3개·가로 넘침·게임 pageerror를 검사했고 통과했다. 각 화 관리자 편집→저장→새로고침→게임 반영도 통과했다. 보고서 `/tmp/tk-story-final-001/report.json`~`003/report.json`.
- 3화 새 이미지는 왕실 피란·여포 대치·적토마 행렬·정원군 경보 장면 4개와 여포 기준 이미지 1개다. 전체 생성 자산은 11개이며 `data/chapters/artwork-manifest.json`에 실제 경로·SHA-256을 남겼다. 기존 공통 이미지는 문맥에 맞는 것만 연결했다.
- 시각 QA에서 3화 후퇴 이미지의 불필요한 유비와 호위 이미지의 황건 표식을 찾아 교체했다. 전사 직후 연대기 자동 스크롤이 결과를 가리는 문제도 수정하고 PC·모바일에서 안내가 먼저 보임을 확인했다. 캡처 `/tmp/tk-story-final-003/death-fixed-desktop.png`, `death-fixed-mobile.png`.
- 실제 새 게임 UI에서 이름 입력·능력치 룰렛을 거쳐 C 경로로 1~3화 24개 사건을 연속 완주했다. 24회 판단·84개 기록이 남았고 새로고침 후 저장 JSON이 동일했다. `/tmp/tk-story-playthrough-final/report.json`, `completed.png`.
- 생성기를 다시 실행한 사건·사실·연표·메타데이터 5개 파일의 SHA-256이 일치했다. `/tmp/tk-story-regeneration.json`. 재생성으로 이미지 연결도 사라지지 않았다.
- 마지막 관리자 검수에서 A/B 판정 노드가 같은 좌표를 쓰는 문제를 수정했다. 실행 단계별로 노드를 분리 배치하며 모든 489개 노드의 좌표가 사건 내에서 중복되지 않는다. 각 화에서 A/B 판정 안내를 각각 편집→저장→새로고침→게임 선택 팝업 반영까지 검증했고 브라우저 오류는 0건이다. `/tmp/tk-story-conditions/report.json`, `001-checks.png`~`003-checks.png`. 캡처를 직접 열어 분리 배치도 확인했다.
- 알려진 미해결 오류·필수 미검증 항목은 없다. 운영 배포·Firebase 공유 게시·외부 기존 데이터 삭제는 수행하지 않았다.

### 주요 관리자 링크와 노드

- `/admin/events?event=r001-04`: `known`, `scene`, `known-b-check` — 접촉 여부와 임관.
- `/admin/events?event=r001-08`: `evidence`, `scene`, `outcome-if-0` — 노식 장부의 결과.
- `/admin/events?event=r002-06`: `proof`, `scene`, `outcome-if-0` — 독우 증거 공개·관직 유지.
- `/admin/events?event=r003-01`: `warning`, `scene`, `outcome-if-0` — 하진 입궁 보류/피살.
- `/admin/events?event=r003-05`: `liu`, `contact`, `scene` — 소속 유지·접촉·지원.
- `/admin/events?event=r003-06`: `scene-a-check`, `scene-a-fail`, `outcome-if-0` — 여포 무력 100·전사 종료.
- `/admin/events?event=r003-08`: `guarded`, `wounded`, `scene`, `outcome-if-0`, `outcome-if-1` — 정원/하진 생존과 군권 독점.
