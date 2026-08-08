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
| 2026-08-08 | 랭크 이벤트 9종 추가(게임/어휘력 C 주간모임 · 매력/지식 A 제안 · 단발 5종) + 예의범절 상한 999 | rankEvents(data `kind: offer\|event` 확장, systems `offerUnlockedByRank`·메시지 표)+test, messages(방 3 + 미용실 옵션), activities(활동 4), events(도감 5), turn(예의범절 상한), ChatApp·TwitterSite(인증 뱃지) |
| 2026-08-08 | **행동력과 체력을 `stamina` 하나로 합쳤다** — 행동이 체력을 쓰고, 몸을 키운 결과는 운동 스탯으로 간다 | types(`maxStamina` 삭제), turn(`STAMINA_CAP` 고정·`SLEEP_RECOVERY` 고정값), activities·items(효과 → `athletics`), endings(철인 → `athletics: 200`), statMeta·StatPanel·MobileStatSheet·EndingModal·autoAdvance, gameStore(구세이브 → 운동 스탯 이관), balance.verify(철인 도달 시뮬)+test 12파일 |
| 2026-08-08 | 연재 중이면 월요일마다 담당 편집자가 카톡으로 지난 회차 조회수와 세간의 평가를 알린다 | webtoon(data 리뷰 풀·조회수 상수, systems `weeklyViews`·`reviewTier`·`webtoonReviewMessages` + test 8건), messages(`requiresWebtoon` + 카톡 방), ChatApp(파생 메시지 합류) |
| 2026-08-08 | 호감도(민지·가족·동아리, 만남 +8 / 문턱 60)와 **관계 부가엔딩** — 본엔딩 문단 아래 한 문단, 도감에 관계 시트 | relations(data 신규), affection(systems+test 14건 신규), types(`affection`), activities(`family-visit`), ChatApp(하드코딩 제거), gameStore, metaStore(`unlockedRelations`), EndingModal(+css), ExcelApp |
| 2026-08-08 | 랭크 이벤트 축 신설 — 운동 C면 러닝크루 권유(주간 예약), 감수성 A면 별똥별로 스탯 하나 +100 | rankEvents(data+systems+test 17건 신규), WishApp(tsx+css 신규), types(`rankEvents`·kind `wish`), messages(러닝크루 방·랭크 게이트)+test, ChatApp(`derivedMessages`), gameStore, appForWindow(+test) |
| 2026-08-08 | 행사에 보디빌딩·마라톤 대회 추가 + 수상 판정(`ExpoJoin.award`, 평판만·무작위 없음) | expos(data+systems+test 7건), activities(`expo-compete`), ExpoSite(tsx+css) |
| 2026-08-08 | 트위터 유료구독(월 1만원, 정산 2배) — 천장은 그대로 둬 판이 끝나는 것을 지켰다 | artworks(`PLUS_MULTIPLIER`·`WEEKLY_INCOME_CAP`), subscriptions, twitter(+test 5건), TwitterSite(tsx+css) |
| 2026-08-08 | 날씨(날짜의 순수 함수, 야외 활동 ±15%)와 아픔(행동력 바닥 → 3일, 회복 반감·효율 80%) 신설 | weather·illness(data+systems+test 21건 신규), turn(취침·효율), activityPreview, activities(`clinic`), types(`Illness`), gameStore, CalendarPanel·StatPanel·Desktop.css, icons |
| 2026-08-08 | 공고 3개 추가(새빛물류·햇살어린이집·픽셀로드 QA) + 직업 엔딩 3개, 요건이 운동·게임·예의범절·도덕을 처음 읽는다 | careers, endings, drive(`OFFICE_CAREER_IDS` 파생 폐기)+systems, balance.verify(요건 화이트리스트·공급원) |
| 2026-08-08 | 사무직 출근 미니게임(너드라이브) — 요청받은 파일을 채팅창에 끌어다 놓고, 성과 100% 초과분이 야근비가 된다. 주말엔 회사 규모만큼 확률로 호출 | drive(data+systems+test 23건 신규), DriveApp(tsx+css 신규), types(`performance`·kind `drive`), careers(`CompanyScale`·`WEEKEND_CALL_RATE`), turn(주말 게이트), employment(야근비 정산), ChatApp(파생 메시지), gameStore, appForWindow, Window.css, measure.mjs(`--seed`) |

