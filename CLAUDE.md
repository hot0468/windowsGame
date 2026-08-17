# windowsGame

## 하네스: 윈도우 데스크톱 육성 게임 개발

**목표:** Vite + React + TS 육성 게임을 최소 토큰으로 구현·유지보수한다.

**트리거:** 이 게임의 개발 작업(구현/수정/QA/이어하기) 요청 시 `game-pipeline` 스킬을 사용하라. 코드를 만지는 모든 작업 전에 `project-context` 스킬을 먼저 로드하라(코드베이스 탐색 대체). 단순 질문은 직접 응답 가능.

**디자인 규칙:** `ui-ux-pro-max`(685줄 + DB 조회)는 **새 시각 언어를 만들 때만** 로드한다 — 새 화면·새 사이트·팔레트나 타이포 변경. 이미 있는 화면을 고치는 작업은 로드하지 말고 `src/index.css`의 확정된 토큰(`--sp-*`·`--fs-*`·`--el-*`·`--os-*`·`--hud-*`·`--nv-*`)만 쓴다. **토큰에 없는 색·간격·그림자를 새로 만들어야 하면 그 순간 새 시각 언어이므로 스킬을 로드한다** — 이 예외가 규칙의 핵심이다. 감으로 정한 값 금지.

**토큰 규칙:** 파일 3개 이하 수정은 에이전트 스폰 없이 직접 처리. 에이전트 병렬 스폰 최대 2. 에이전트에게 코드 전문 반환 금지(요약만). **에이전트 `model`은 기본 생략(세션 모델 상속)** — 아키텍처·시각 언어 설계·전체 리뷰만 `opus` 명시.

**검증 규칙:** CDP 실측은 `node scripts/measure.mjs`로 한다(배선을 다시 쓰지 말 것 — 헤드리스의 함정이 전부 그 파일 주석에 있다. `--scan`이 화면의 AA 미달을 한 번에 훑고, **CSS 애니메이션을 찍으려면 `--reduced`가 필수**다). 실측은 **새로 만든 화면에만** 쓴다. 실측이 실제로 잡은 버그는 전부 신규 화면에서 나왔다(게이지 0% 렌더링·잠금화면 대비 미달·메뉴 Esc 먹통). 기존 화면 수정·수치 조정·버그 픽스는 **테스트 + 빌드**로 끝낸다. ⚠️ **반복 중에는 전체 스위트를 돌리지 않는다** — 만진 파일만 `npx vitest run <파일>`로 돌리고, 트리가 크면 `npx vitest run --changed`(git 변경분에 딸린 테스트만). **전체 스위트는 커밋 직전 한 번**이다(격리를 꺼서 3.4초 — 사유는 `vite.config.ts` 주석). 다만 **화면에 보이는 결과가 바뀌는데 테스트로 증명할 수 없는 것**(레이아웃 겹침·대비·z-order)은 규모와 무관하게 실측한다.

**검증 분량:** 테스트는 **그 변경이 깨뜨릴 수 있는 것**만 덮는다. 한 기능에 40개씩 붙이지 않는다. 규칙을 뒤집어 실패를 확인하는 증명(이율 반전 등)은 **돈·턴·게임오버를 만드는 불변식에만** 쓴다.

**속도 규칙:** UI 작업은 규모로 경로를 가른다. 파일 3개 이하 + 기존 토큰 안에서 끝나면 **경량 경로**(직접 수정 → 빌드 → 스팟체크). 새 화면·시각 언어 변경·파일 4개 이상만 **풀 경로**. 상세는 `game-pipeline` 스킬.

**병렬 작업 규칙:** 한 워킹 트리에서 세션을 **둘 이상 동시에 돌리지 않는다.** 동시에 돌려야 하면 각자 자기 브랜치에서 `git worktree add`로 트리를 나눈다. ⚠️ 트리를 공유하면 `npm run build`·`npm test`가 **남의 미완성 코드에서 멈추고**, 원인이 내 변경이 아님을 가려내는 데 실제 작업보다 많은 토큰이 든다(2026-08-08 한 세션에서 다섯 번: 없는 아이콘 이름 두 곳·아직 없는 모듈 import·테스트 5건). ⚠️ **남의 미커밋 파일을 내 커밋에 넣지 않는다** — 빌드가 그 파일에서 막히면 **최소한으로만** 고치고, 커밋에서 빼고, 보고한다. 커밋은 `git add <내 파일>`로 **경로를 명시**한다(`git add -A`·`git commit -a` 금지).

**사유는 한 번만 쓴다 — 정본은 그 결정이 사는 소스 파일의 주석이다.** 다음 사람이 그 코드를 편집하는 바로 그 순간 읽히는 유일한 자리라서다. ⚠️ **같은 판단을 커밋 메시지·`docs/HISTORY.md`·아래 표에 다시 풀어 쓰지 않는다** — 세 벌로 쓰면 셋이 서로 어긋나고, 출력 분량이 한 작업의 체감 시간을 가장 크게 좌우한다. 커밋 메시지는 제목 + 무엇을/왜 3줄 이내로 끝내고 자세한 것은 코드를 가리킨다. **예외:** 코드에 앉힐 자리가 없는 결정(전역 방향 전환, 기각된 대안 전체)만 HISTORY.md가 정본이 된다.

**변경 이력:** 아래 표는 **색인이다 — 한 줄 요약만 적는다.** 최근 10행 유지, 넘치면 가장 오래된 행을 **한 줄 그대로** [docs/HISTORY.md](docs/HISTORY.md) 맨 위로 옮긴다.

| 날짜 | 변경 | 대상 |
|------|------|------|
| 2026-08-17 | 재미 4종 — 효과음(WebAudio 합성·설정 토글) · 지뢰찾기(`game` 실행이 여는 순수 장난감) · 돌발 사건 셋째 부류 딜레마(아침 창, 돈 vs 도덕) · 관계 서사 비트(`close` 말 5일 회전) + 새 판 투어 물음 복원(`tourAsk`, 기본 초점 [보기]) | sound(신규)·metaStore·toastStore·windowStore·LockScreen·BlueScreen·SettingsApp, MinesweeperApp(tsx+css+test 신규)·DilemmaApp(tsx+css 신규)·appForWindow(+test)·types·gameStore, chance(data+systems+test)·autoAdvance, relations·affection(+test), Tour |
| 2026-08-17 | 시간대는 **결과 창을 닫을 때** 넘어간다 — 행동 직후가 아니라 [확인]·`Daybreak` 팝업과 같은 순간에 풍경·날짜칸·시계가 함께 바뀐다(게임 상태는 그대로 즉시 확정) | shownTime(신규 — 표시 시각 단일 출처), Daybreak, Desktop, CalendarPanel, Taskbar, MobileStatusBar, MobileStatSheet |
| 2026-08-17 | 활동에 **반발 스탯** — IT를 올리는 다섯은 매력·감수성을, 게임은 친화력·경제·운동을 깎는다 + AI 입문 강의 전용 활동(`ai-study`: 지식 주 + IT 곁가지) | activities(반발 6곳·`ai-study` 신규), courses(`ai-basic` 연결 교체), runScenes(장면 1) |
| 2026-08-17 | 반값 쿠폰이 실제로 쓰인다 — 광고 메일이 온 날 컬리엔마트 주문 **한 건**이 반값(최대 5,000원) | messages(data 쿠폰 상수 3 + 메일 문구), delivery(`couponDay`·`couponDiscount`·`priceOf` + test 묶음), types(`couponUsedDay`), ShopSite(안내 줄·쿠폰가 + css 1) |
| 2026-08-17 | 복권을 로또처럼 — 산 표는 **다음 토요일 밤**에 한꺼번에 추첨한다(구매 시 굴리지 않는다) | lottery(data `DRAW_WEEKDAY`·systems `nextDrawDay`/`draw`+test 묶음), types(`LotteryTicket`), turn(`nightPayoutPending` 날짜 판정), gameStore(옛 표 `drawn: true` 이관), ShopSite(+css) |
| 2026-08-17 | 사진첩은 **겪은 것만** 싣는다(안 겪은 빈 칸 삭제 — 잠긴 줄 표시가 겪은 줄과 구분이 안 됐다) | ExplorerApp(codex 갈래+test), events(`hint` 사용처 없음 표시) |
| 2026-08-17 | 실제 윈도우 소품 3종 — 작업 관리자(프로세스 판형 진단 창 · 우클릭/Ctrl+Shift+Esc, 구판 삭제) · 탐색기 숨김 파일 · cmd `defrag` | TaskMgrApp(tsx+css 신규), appForWindow, Taskbar(우클릭·단축키), hidden(data 신규), ExplorerApp(+css·test), SystemApps(defrag·구판 삭제+css), measure(`--rightclick`) |
| 2026-08-17 | 길고양이 — 시드가 정한 밤에 창밖에 오고(8~14일차, 재방문 3~5일), 세 번 먹이면 들여서 바탕화면을 걷는 펫이 된다(사료 1,500/밤·쓰다듬기 1/일) | cat(data+systems+test 신규), CatApp(tsx+css), CatPet(tsx+css), types(`CatState`·`WindowKind`), turn(취침), gameStore(창+액션 4), appForWindow(+test), Desktop·layers·ToastHost·events |
| 2026-08-17 | 후반 돈 싱크 — 사치 집 2종(`rate>1`, 밤 멘탈 보너스) + 호텔 오픈채팅(스파·호캉스). "가장 싼 집"의 정본은 `CHEAPEST_HOUSING` | housing(data 2+`CHEAPEST_HOUSING`·test 갈래), activities(2), messages(방 1), RealtySite(색·문구), economy·balance.verify(셀렉터 교체) |
| 2026-08-17 | 돌발 사건 — 판 시드(재굴림 불가)로 4~7일에 한 번 소소한 사건·**오늘만 기회**(활동 하나 ×1.5/반값)가 뜨고, 기회일엔 자동 진행이 멈춘다 | chance(data+systems+test 신규), types(`seed`), turn(취침+배율), activityPreview, autoAdvance(정지 1), gameStore(시드·토스트), ToastHost |