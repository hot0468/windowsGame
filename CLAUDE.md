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
| 2026-08-08 | **행동력과 체력을 `stamina` 하나로 합쳤다** — 행동이 체력을 쓰고, 몸을 키운 결과는 운동 스탯으로 간다 | types(`maxStamina` 삭제), turn(`STAMINA_CAP` 고정·`SLEEP_RECOVERY` 고정값), activities·items(효과 → `athletics`), endings(철인 → `athletics: 200`), statMeta·StatPanel·MobileStatSheet·EndingModal·autoAdvance, gameStore(구세이브 → 운동 스탯 이관), balance.verify(철인 도달 시뮬)+test 12파일 |
| 2026-08-08 | 연재 중이면 월요일마다 담당 편집자가 카톡으로 지난 회차 조회수와 세간의 평가를 알린다 | webtoon(data 리뷰 풀·조회수 상수, systems `weeklyViews`·`reviewTier`·`webtoonReviewMessages` + test 8건), messages(`requiresWebtoon` + 카톡 방), ChatApp(파생 메시지 합류) |
| 2026-08-08 | 호감도(민지·가족·동아리, 만남 +8 / 문턱 60)와 **관계 부가엔딩** — 본엔딩 문단 아래 한 문단, 도감에 관계 시트 | relations(data 신규), affection(systems+test 14건 신규), types(`affection`), activities(`family-visit`), ChatApp(하드코딩 제거), gameStore, metaStore(`unlockedRelations`), EndingModal(+css), ExcelApp |
| 2026-08-08 | 날씨(날짜의 순수 함수, 야외 활동 ±15%)와 아픔(행동력 바닥 → 3일, 회복 반감·효율 80%) 신설 | weather·illness(data+systems+test 21건 신규), turn(취침·효율), activityPreview, activities(`clinic`), types(`Illness`), gameStore, CalendarPanel·StatPanel·Desktop.css, icons |
| 2026-08-08 | 공고 3개 추가(새빛물류·햇살어린이집·픽셀로드 QA) + 직업 엔딩 3개, 요건이 운동·게임·예의범절·도덕을 처음 읽는다 | careers, endings, drive(`OFFICE_CAREER_IDS` 파생 폐기)+systems, balance.verify(요건 화이트리스트·공급원) |
| 2026-08-08 | 사무직 출근 미니게임(너드라이브) — 요청받은 파일을 채팅창에 끌어다 놓고, 성과 100% 초과분이 야근비가 된다. 주말엔 회사 규모만큼 확률로 호출 | drive(data+systems+test 23건 신규), DriveApp(tsx+css 신규), types(`performance`·kind `drive`), careers(`CompanyScale`·`WEEKEND_CALL_RATE`), turn(주말 게이트), employment(야근비 정산), ChatApp(파생 메시지), gameStore, appForWindow, Window.css, measure.mjs(`--seed`) |
| 2026-08-08 | 도감 직업 시트에 웹툰작가 한 줄 추가, 직업 레벨 상한 5 → 10 | careers(`CAREER_MAX_LEVEL`), webtoon(`webtoonLevel`+test 3건), ExcelApp |
| 2026-08-08 | 중고마켓(두손마켓) 신설 — 산 물건·포스트카드를 반값에 판다, 도감에 업적 시트 추가 | resale·achievements(data+systems+test 신규), ResaleSite(tsx+css 신규), types(`sold`), delivery(되사기 효과 차단), sites(+`resale`, +STORE_SITES)+test, BrowserApp, gameStore, ExcelApp |
| 2026-08-08 | **행사 안내(모두의행사) 신설 — 참관/참여 두 갈래, 코미콘이 그 목록에 들어갔다** | expos(data+systems 신규 + test 17건), activities(참관 2종·참여 1종), sites(`render: 'expo'`), news(검색어 추천 "행사"), gameStore(`visitExpo`·`joinExpo`), ExpoSite(tsx+css 신규), BrowserApp, sites.test | 사용자 지시. ⚠️ **사이트에 기본 `activityId`가 없다** — 알바몬·배달처럼 "고른 항목이 활동을 정한다"이되 **축이 둘**(참관/참여)이라 기본값을 하나로 정할 수 없다. ⚠️ **개최 여부는 날짜의 순수 함수다**(주기·기간·오프셋) — 저장하면 새로 고칠 때마다 다시 굴러 세이브 스커밍이 열린다(주식 시세와 같은 이유). 오프셋을 흩어 둔 것도 규칙이다: 전부 같은 날 열리면 목록이 "전부 열림/전부 닫힘" 두 상태만 오간다(테스트가 지킨다). ⚠️ **입장료·참가비는 행사가 갖고 스탯은 활동이 갖는다**(강의 수강료와 같은 방향) — 활동 하나가 여러 행사를 대신 실행하므로 반대로 두면 밸런스 테스트가 못 보는 두 번째 출처가 생긴다. 돈은 `runActivity`보다 **먼저** 뺀다(뒤에 빼면 그 슬롯이 밤이었을 때 취침 정산이 먼저 지나가 파산 판정이 한 프레임 어긋난다). ⚠️ **개최 기간은 `canRun`이 모르는 잠금이다** — 활동은 언제든 실행 가능하고 "오늘 열려 있는가"는 행사가 가진 사실이라 판정은 `visitBlockers`/`joinBlockers`가 하고 화면은 그 문장을 그대로 적는다. ⚠️ **`join`이 없는 행사에는 참여 버튼을 안 그린다**(죽은 컨트롤 금지) — 그 문구도 시스템이 돌려주는 것을 쓴다. ⚠️ **`ExpoJoin`의 `activityId`와 `siteId`는 배타다**: 고를 것이 있는 참여는 **그 사이트로 보낸다**(코미콘 → `openSite`) — 여기 판매 통로를 또 만들면 "한 권은 한 번만 쓴다"가 두 곳에서 갈린다. 그래서 그 버튼만 `canJoin`으로 안 막는다(이동은 턴도 돈도 안 쓰고, 막는 일은 코미콘 화면이 한다). ⚠️ **행사는 수입원이 아니다** — 활동 셋 다 돈을 한 푼도 안 주고 부스로 얻는 것은 평판·친화력이다. 벌게 하면 회지 판매와 같은 상한이 두 곳으로 갈린다. 번아웃 키는 셋 다 `'expo'`. ⚠️ **실측이 잡은 것**: 보조 글자색이 **흰 배경 기준 4.8:1이었는데 연한 인디고 판(`--ep-bg` #f5f5ff) 위에서 합성 4.39:1**로 AA를 못 넘겼다(18곳) — 토큰 하나를 #475569로 바꿔 6.99:1. "계산이 아니라 픽셀"이 정확히 이 자리다. 나머지 확인: 검색 추천 "행사" → 사이트 이동 · 1일차에 코미콘만 열리고("열림 · 1일째 / 총 3일") 나머지 5건은 "n일 뒤 개막"으로 비활성 · 참관만 받는 행사 3건에 참여 버튼 없음 · [참관 신청] 확인창(입장료 15,000원) → 실행 후 소지금 −15,000·오전→오후 · 코미콘 [참여 신청] → 코미콘 사이트로 이동 |
| 2026-08-08 | 도감.xlsx 신설 — 사진첩 옆 엑셀 창에 직업(레벨·판마다 리셋)과 엔딩을 회색/검정으로 늘어놓는다 | ExcelApp(tsx+css 신규), careerLog(systems+test 신규), types(`careerLog`·kind `excel`), careers(레벨 상수), turn·employment(기록 지점 둘), desktopItems·desktopIcons(+test), Window.css, appForWindow(+test) |

