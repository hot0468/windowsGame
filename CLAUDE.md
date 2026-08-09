# windowsGame

## 하네스: 윈도우 데스크톱 육성 게임 개발

**목표:** Vite + React + TS 육성 게임을 최소 토큰으로 구현·유지보수한다.

**트리거:** 이 게임의 개발 작업(구현/수정/QA/이어하기) 요청 시 `game-pipeline` 스킬을 사용하라. 코드를 만지는 모든 작업 전에 `project-context` 스킬을 먼저 로드하라(코드베이스 탐색 대체). 단순 질문은 직접 응답 가능.

**디자인 규칙:** `ui-ux-pro-max`(685줄 + DB 조회)는 **새 시각 언어를 만들 때만** 로드한다 — 새 화면·새 사이트·팔레트나 타이포 변경. 이미 있는 화면을 고치는 작업은 로드하지 말고 `src/index.css`의 확정된 토큰(`--sp-*`·`--fs-*`·`--el-*`·`--os-*`·`--hud-*`·`--nv-*`)만 쓴다. **토큰에 없는 색·간격·그림자를 새로 만들어야 하면 그 순간 새 시각 언어이므로 스킬을 로드한다** — 이 예외가 규칙의 핵심이다. 감으로 정한 값 금지.

**토큰 규칙:** 파일 3개 이하 수정은 에이전트 스폰 없이 직접 처리. 에이전트 병렬 스폰 최대 2. 에이전트에게 코드 전문 반환 금지(요약만). **에이전트 `model`은 기본 생략(세션 모델 상속)** — 아키텍처·시각 언어 설계·전체 리뷰만 `opus` 명시.

**검증 규칙:** CDP 실측은 `node scripts/measure.mjs`로 한다(배선을 다시 쓰지 말 것 — 헤드리스의 함정이 전부 그 파일 주석에 있다. `--scan`이 화면의 AA 미달을 한 번에 훑고, **CSS 애니메이션을 찍으려면 `--reduced`가 필수**다). 실측은 **새로 만든 화면에만** 쓴다. 실측이 실제로 잡은 버그는 전부 신규 화면에서 나왔다(게이지 0% 렌더링·잠금화면 대비 미달·메뉴 Esc 먹통). 기존 화면 수정·수치 조정·버그 픽스는 **테스트 + 빌드**로 끝낸다. 다만 **화면에 보이는 결과가 바뀌는데 테스트로 증명할 수 없는 것**(레이아웃 겹침·대비·z-order)은 규모와 무관하게 실측한다.

**검증 분량:** 테스트는 **그 변경이 깨뜨릴 수 있는 것**만 덮는다. 한 기능에 40개씩 붙이지 않는다. 규칙을 뒤집어 실패를 확인하는 증명(이율 반전 등)은 **돈·턴·게임오버를 만드는 불변식에만** 쓴다.

**속도 규칙:** UI 작업은 규모로 경로를 가른다. 파일 3개 이하 + 기존 토큰 안에서 끝나면 **경량 경로**(직접 수정 → 빌드 → 스팟체크). 새 화면·시각 언어 변경·파일 4개 이상만 **풀 경로**. 상세는 `game-pipeline` 스킬.

**병렬 작업 규칙:** 한 워킹 트리에서 세션을 **둘 이상 동시에 돌리지 않는다.** 동시에 돌려야 하면 각자 자기 브랜치에서 `git worktree add`로 트리를 나눈다. ⚠️ 트리를 공유하면 `npm run build`·`npm test`가 **남의 미완성 코드에서 멈추고**, 원인이 내 변경이 아님을 가려내는 데 실제 작업보다 많은 토큰이 든다(2026-08-08 한 세션에서 다섯 번: 없는 아이콘 이름 두 곳·아직 없는 모듈 import·테스트 5건). ⚠️ **남의 미커밋 파일을 내 커밋에 넣지 않는다** — 빌드가 그 파일에서 막히면 **최소한으로만** 고치고, 커밋에서 빼고, 보고한다. 커밋은 `git add <내 파일>`로 **경로를 명시**한다(`git add -A`·`git commit -a` 금지).

**사유는 한 번만 쓴다 — 정본은 그 결정이 사는 소스 파일의 주석이다.** 다음 사람이 그 코드를 편집하는 바로 그 순간 읽히는 유일한 자리라서다. ⚠️ **같은 판단을 커밋 메시지·`docs/HISTORY.md`·아래 표에 다시 풀어 쓰지 않는다** — 세 벌로 쓰면 셋이 서로 어긋나고, 출력 분량이 한 작업의 체감 시간을 가장 크게 좌우한다. 커밋 메시지는 제목 + 무엇을/왜 3줄 이내로 끝내고 자세한 것은 코드를 가리킨다. **예외:** 코드에 앉힐 자리가 없는 결정(전역 방향 전환, 기각된 대안 전체)만 HISTORY.md가 정본이 된다.

**변경 이력:** 아래 표는 **색인이다 — 한 줄 요약만 적는다.** 최근 10행 유지, 넘치면 가장 오래된 행을 **한 줄 그대로** [docs/HISTORY.md](docs/HISTORY.md) 맨 위로 옮긴다.

| 날짜 | 변경 | 대상 |
|------|------|------|
| 2026-08-09 | VS 코드 창 — 받아 둔 일감이 파일·배지·상태 표시줄이 되고 ▶가 활동을 실행한다 | vscode(data+test 5 신규), VsCodeApp(tsx+css 신규), types(`WindowKind: vscode`), appForWindow(+test, `dark`·`bareTitle`), Window.css(`:has(> .vs)`), desktopItems(+test 불변식 확장) |
| 2026-08-09 | 개발용 UI 견본 화면(`?ui`) — 장면 10종 × 등급 상승 5단을 골라 재생, 세이브는 안 건드린다 | dev/UiGallery(tsx+css 신규), App(`import.meta.env.DEV` 분기) |
| 2026-08-09 | 등급 상승을 결과 판 게이지가 말한다(0에서 자라남 · 막대 발광 · `F → C` 표시) — 팝업은 만들었다 되돌렸다 | ToolRun(tsx+css), rank(원상복구), types·windowStore·appForWindow(+test)·App(`rankup` 되돌림), Daybreak(팝업 대기는 유지) |
| 2026-08-09 | 낮은 스탯의 대가(`below`+`afterDay`) · 요일의 질감(주말 알바 할증·`requiresWeek`) · 목돈 청구 4건 | rankEvents(data+systems+test 5), events(단발 4), calendar(`isWeekend`), economy(`WEEKEND_WAGE_BONUS`), types(`requiresWeek`·`paidBills`), turn·activityPreview, activities(3), bills(data+systems+test 10 신규), weekGate.test 신규, gameStore·MailApp |
| 2026-08-09 | 공부 팝업 — 종이 판 · 책장 그림 · 헤더 없는 시스템 팝업 + 전체 화면 딤, 날 밝음은 [확인] 뒤로 밀린다 | runScenes(`look`), types, windowStore(`popup`·`Z_STEP`), Window(tsx+css `win-popup`/`win-scrim`), WindowManager, appForWindow, ToolRun(tsx+css), Daybreak(`pending`), runScenes.test(+2) |
| 2026-08-09 | 알바몬 편성표 메일이 지원을 단정하던 버그 + 공부에도 실행 연출·성장 게이지·[확인] | messages(문구·규칙 주석)+test(불변식), ActivityConfirm(`onCommit` 갈래도 창을 연다), runScenes(`study`·`writing`), ToolRun(게이지+제목), ToolRun.css, CampusSite.css(실측 AA 3건) |
| 2026-08-08 | 하이마루 최신형 휴대폰 — 가지고 있으면 친화력 상승분 +25%, 대신 30일마다 3,000원 | items(`PHONE_*` + 물건), phone(systems+test 9건 신규), turn(`itemStatBonusFor`·applyEffects 합산), types(`phoneBilledDay`·`suspendedPhone`), gameStore(밤 정산·복원), MailApp, activityPreview |
| 2026-08-08 | 랭크 이벤트 6종 추가 — 친화력 C·경제 B가 방을 열고(집들이·투자 스터디), 예의범절 A·운동 S·지식 A·창의력 A는 단발 | rankEvents(data+systems 첫 마디), events(단발 4), messages(방 2), activities(`housewarming`·`study-talk`), rankEvents.test(스탯 전수 커버 불변식 2건) |
| 2026-08-08 | 음악 스탯에 쓸 곳 셋 — 오디션 도구·그몽 음악 일감 3종 + 음악 A가 여는 밴드(숙련도로 공연·앨범 해제) | types(`ToolId: audition`·`BandState`·`requiresBandSkill`/`buildsBandSkill`), band(data+systems+test 12건), turn(게이트·숙련·보수), gigs·activities·desktopItems·messages·rankEvents, StatPanel·MobileStatSheet·ToolRun |
| 2026-08-08 | 슬롯 제약(오전/오후 전용 활동 5종) · 장비 고장(사용 횟수, 무작위 없음) · 경제 스탯이 여는 주식 변동성 예보 | types(`requiresSlot`·`SLOT_NAMES`·`gear`/`broken`), turn(`canRun`·`wearGear`), gear(data+systems+test), delivery(되사기 자물쇠), stocks(예보)·StockSite, activityPreview, ExplorerApp, slotGate.test |

