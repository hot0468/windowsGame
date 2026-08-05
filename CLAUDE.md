# windowsGame

## 하네스: 윈도우 데스크톱 육성 게임 개발

**목표:** Vite + React + TS 육성 게임을 최소 토큰으로 구현·유지보수한다.

**트리거:** 이 게임의 개발 작업(구현/수정/QA/이어하기) 요청 시 `game-pipeline` 스킬을 사용하라. 코드를 만지는 모든 작업 전에 `project-context` 스킬을 먼저 로드하라(코드베이스 탐색 대체). 단순 질문은 직접 응답 가능.

**디자인 규칙(필수):** 화면·컴포넌트·스타일을 만들거나 고치는 모든 작업은 시작 전에 `ui-ux-pro-max` 스킬을 로드하고, DB 조회(Python 설치됨: `%LOCALAPPDATA%\Programs\Python\Python313\python.exe`)로 근거를 확보한 뒤 작업하라. UI 작업을 에이전트에 위임할 때는 프롬프트에 이 스킬 로드 지시를 반드시 포함하라. 감으로 정한 색·간격·그림자 금지.

**토큰 규칙:** 파일 3개 이하 수정은 에이전트 스폰 없이 직접 처리. 에이전트 병렬 스폰 최대 2. 에이전트에게 코드 전문 반환 금지(요약만). **에이전트 `model`은 기본 생략(세션 모델 상속)** — 아키텍처·시각 언어 설계·전체 리뷰만 `opus` 명시.

**속도 규칙:** UI 작업은 규모로 경로를 가른다. 파일 3개 이하 + 기존 토큰 안에서 끝나면 **경량 경로**(직접 수정 → 빌드 → 스팟체크). 새 화면·시각 언어 변경·파일 4개 이상만 **풀 경로**(DB 조회 → 위임 → CDP 실측). 상세는 `game-pipeline` 스킬.

**변경 이력:**
| 날짜 | 변경 내용 | 대상 | 사유 |
|------|----------|------|------|
| 2026-08-03 | 초기 구성 (dev/qa 에이전트, pipeline/context 스킬) | 전체 | 토큰 최적화 하네스 신규 구축 |
| 2026-08-03 | project-context에 창 런타임 상태·캡션 버튼 회귀·윈도우 11 시각 규칙 추가 | project-context 스킬 | 최대화가 런타임 상태로 바뀌고 캡션 버튼 3종이 생겨 컨벤션이 변경됨 |
| 2026-08-03 | 플레이 가능 코어 구현 완료 (Task 1~12) | src/ 전체 | 계획 2026-08-03-playable-core 실행 |
| 2026-08-03 | 파일 맵·컨벤션·구현 중 결정 사항 반영 | skills/project-context | 다음 세션의 코드베이스 재탐색 방지 |
| 2026-08-03 | 디자인 규칙 추가: UI 작업 전 ui-ux-pro-max 필수 로드 | CLAUDE.md, game-pipeline | 디자인 스킬을 설치했는데 참조하지 않고 감으로 스타일링한 문제 재발 방지 |
| 2026-08-04 | 활동 15종·분류·아이템 잠금 규칙 반영 | project-context 스킬 | 활동 8종 추가로 성장 스탯 10종 전부 육성 가능해지고, `Activity.category`/`requiresItem`이라는 새 컨벤션이 생김 |
| 2026-08-04 | 쇼핑·택배·인벤토리/이벤트 도감 추가, 카톡 일반/오픈 탭 분리, 일정 창 전체 높이화 | src/, project-context | 설계자 요청 배치 실행 |
| 2026-08-03 | HUD 밝은 모던 리스타일 완료 + 폰트 3벌(Pretendard/Cafe24 Ohsquare/SF 함박눈) 도입 | src/index.css, HudPanel/Desktop/EndingModal CSS, index.html | 다크 판타지 방향 기각분 마무리, 설계자 폰트 지시 반영 |
| 2026-08-03 | 브라우저 즐겨찾기 줄·별표·더보기 메뉴 추가, 스탯창 스크롤 제거·"생계" 제목 삭제 | BrowserApp, browserStore(신규), HudPanel, StatPanel | 설계자 지시 |
| 2026-08-04 | UI 경량/풀 경로 분리 + 에이전트 모델 상속 규칙 | CLAUDE.md, game-pipeline | 소규모 스타일 수정에도 풀 파이프라인이 돌아 작업이 느려짐 |
| 2026-08-04 | 폰트 5벌 전부 CDN → 번들 셀프호스팅 | index.css, index.html, src/assets/fonts/(신규), package.json | CDN 지연·오프라인 불가로 첫 화면이 흔들림. 아이콘의 오프라인 규칙과 불일치 |
| 2026-08-03 | 테두리 장식 추가 (HUD·게임 팝업·엔딩 모달, 브라우저 제외) | PanelOrnament(신규), Window/WindowManager, HudPanel, EndingModal | 설계자 지시. 외부 이미지 대신 인라인 SVG |
| 2026-08-03 | HUD 아이콘 세트 ph → mdi 교체(`@iconify-json/ph` 제거), 구역 라벨 전부 삭제, 브라우저 탭 줄 추가 | statMeta, icons, StatPanel, BrowserApp, build-icon-subset | 설계자 지시 |
| 2026-08-03 | 스탯 개명(행동력/체력), 평판·도덕 상한 100 + 자원 줄 이동, 트레이 버튼 토글화, 낮/해질녘 배경, 브라우저 흰 크롬·기본 즐겨찾기 제거 | turn.ts(growthCap), StatPanel, desktopPanelStore, Desktop, browserStore | 설계자 지시 |
| 2026-08-03 | 주소창 입력 가능화(`resolveUrl`), NEVER 포털 모던 리스타일 | sites.ts, BrowserApp, NeverPortal.css | 설계자 지시 |
| 2026-08-03 | NEVER→네이놈 개명, 로고 서체(SB 어그로), 검색창·퀵메뉴·뉴스 리스타일, 배너존 + 광고 보상(하루 1회 100원) | sites, banners(신규), news, turn.ts, gameStore, NeverPortal | 설계자 지시 |
| 2026-08-04 | 메신저(카톡·너아무튼온)·아웃룩·토스트 알림 신설 | messages(데이터/시스템), toastStore, ChatApp, MailApp, ToastHost | 설계자 지시 |
| 2026-08-04 | 시작 메뉴 + 시스템 도구 3종(저장·작업관리자·명령프롬프트), 스탯 `gaming` 추가 | startMenu, StartMenu, SystemApps, types/statMeta | 설계자 지시 |
| 2026-08-04 | 스케줄러(예약 자동 실행) + 포털 검색 결과 + 브라우저 개발자 모드 | schedule(신규), search(신규), SchedulerApp, NeverPortal, BrowserApp | 설계자 지시 |
| 2026-08-04 | `Window`에 `bareTitle`·`dark` 옵션, 열릴 때 위치 클램프. HUD 테두리 장식 제거 | Window, WindowManager, HudPanel | 레퍼런스 충실도 + 창이 작업표시줄 아래로 빠지던 문제 |
| 2026-08-05 | 알바 4종 + 알바몬 사이트 신설, `Activity.burnoutKey`로 번아웃 키 공유 | activities, jobs(신규), AlbamonSite(신규), sites, burnout, turn, SchedulerApp | 설계 문서의 "고소득 알바 전환 압박"이 알바가 하나뿐이라 구현되지 않았음. 알바를 늘리면 번갈아 일해 번아웃을 우회할 수 있어 키를 묶음 |
| 2026-08-05 | 직업 엔딩 5종 — 취직이 아니라 **파산했을 때** 뜬다. `bigtech`의 스탯 조건 삭제, `GameState.peakCareerId` 신설, 세이브 version 2 | endings, careers, ending, employment, gameStore, types, EndingModal | 설계자 지시("직업엔딩은 취직한 순간이 아닌 돈 없어서 죽은 후 뜨게 해"). 취직은 결말이 아니라 도중의 사건이고, '대기업 합격'이라는 이름이 스탯 문턱과 청람그룹 입사 **두 가지**를 뜻하고 있었다 |
| 2026-08-05 | 활동 바로가기(확정 버튼 우클릭 → 바탕화면 등록 → 더블클릭 실행) + 공용 ContextMenu | shortcuts/contextMenu(신규 systems), shortcutStore(신규), ContextMenu·ActivityConfirm(신규), desktopItems, Desktop, ActivityCommit, activityPreview | 설계자 지시. 경고 문구를 `previewWarnings`로 모은 것은 확정 화면이 셋이 되어 한 곳만 빠뜨리는 사고를 막기 위함 |
| 2026-08-05 | project-context 다이어트 493 → 250줄 (규칙 전량 보존, 실측·기각안·경위 서술 삭제) + "규칙만 적는다" 작성 규칙 명문화 | skills/project-context | 모든 에이전트가 코드를 만지기 전에 이 문서를 통째로 읽는데, 길이가 늘어 작업마다 수 분씩 지연됐다. 규칙과 그 규칙을 알아낸 보고서를 한 문서에 섞은 것이 원인 |
