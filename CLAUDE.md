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
| 2026-08-14 | 랭크 이벤트의 윗칸 — S가 여는 고수익 일감 5종 + **생활 등급이 여는 방 2개**(`RankEvent.key`가 옵셔널이 되어 15종 평균을 본다) | activities(7), messages(방 7), rankEvents(data 7 + systems 권유 7 + `rankReached`), rankEvents.test(생활 등급 묶음 신규) |
| 2026-08-14 | 육성물 전환 — 게임오버를 없애고(파산·번아웃은 며칠짜리 `Recovery`) 무한 생활 등급이 판을 이끈다. 직업·실패 엔딩 11종은 도감 콜렉션으로 | economy(상승률 동률), recovery(data+systems+test 신규), lifeRank(+test 신규), types(`Recovery`), turn·store·가드 15곳, endings(15→4), metaStore(`unlockedCareers`), StatPanel·ExcelApp·EndingModal·CalendarPanel·MobileStatSheet, balance.verify(전제 반전) |
| 2026-08-14 | 육성 복리 — 스탯 등급 한 단계당 상승분 +15%(`masteryBonusFor`) + 첫 보상이 B·A뿐이던 스탯에 C 단발 첫 칸 7종 | turn(`statBonusFor`), rankScale 신규(rank가 재수출), activityPreview, mastery.test 신규, rankEvents·events(각 7) |
| 2026-08-14 | 악성코드 감염 — 포털 스캠 배너를 누르면 매 턴 광고 팝업 + 밤마다 3,000원이 새고, 백신 결제나 IT B의 `clean`이 끊는다 | malware(data+systems+test 신규), AdwareApp(tsx+css 신규), types(`malware`·`WindowKind: adware`), turn(취침), gameStore(액션 3+afterTurn), appForWindow(+test), banners(`scam`), NeverPortal, SystemApps(`scan`·`clean`·`ver`) |
| 2026-08-14 | 블루스크린 — 번아웃 효율이 하한에 닿으면 화면이 3초 뻗는다(연출뿐, 상태 불변) | BlueScreen(tsx+css 신규), burnout(`EFFICIENCY_FLOOR` 공개), layers(`BLUESCREEN`), Desktop |
| 2026-08-14 | 그림판 — 시작 메뉴의 낙서 장난감(색 8·굵기 3·지우개·전체 지우기). 창을 닫으면 그림이 사라진다 | paint(data 신규), PaintApp(tsx+css 신규), types(`WindowKind: paint`), appForWindow(+test), startMenu |
| 2026-08-14 | 휴지통 — 고장 난 장비(`broken`)의 잔해가 처음 남는 자리 + 고정 파일 3개. `sold`는 안 들어가고 비우기도 없다 | trash(data 신규), ExplorerApp(+test 신규), types(`FolderId: trash`), desktopItems |
| 2026-08-13 | IT에 쓸 곳 — 코딩 공부(둘째 공급원) · IT B가 여는 유지보수 의뢰 방 | activities(`coding-study`·`maintenance`), courses(`ai-automation`), messages(방 `devcrew`), rankEvents(data+systems 첫 마디) |
| 2026-08-13 | 장면 없는 활동의 등급 상승을 스탯창 뱃지가 말한다 + 너튜브 갈래별 시청(게임·음악·뉴스) | rank(`rankRose`+test), StatPanel, Desktop.css, activities(3), videos(`CATEGORY_ACTIVITY`), TubeSite |
| 2026-08-13 | 너튜브 영상 감상 — 시청 화면 [끝까지 보기]가 1턴을 쓰고 감수성·창의력 소량 + 멘탈을 준다 | activities(`watch-video`), TubeSite(tsx+css) |
