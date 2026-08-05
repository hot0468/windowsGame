---
name: project-context
description: 이 육성 게임 프로젝트의 압축 컨텍스트 — 확정된 게임 설계 결정, 기술 스택, 파일 맵, 코딩 컨벤션. 게임 기능의 구현/수정/설계/디버깅 등 코드를 만지는 모든 작업 전에 반드시 이 스킬을 로드할 것. 코드베이스 탐색 대신 이 문서를 읽는 것이 토큰 절약의 핵심이다. 설계 결정이 바뀌거나 새 파일/패턴이 생기면 이 문서를 즉시 갱신할 것.
---

# 프로젝트 컨텍스트 (단일 진실 공급원)

이 문서가 코드베이스 탐색을 대체한다. 여기 없는 정보만 파일을 직접 읽어라.
**갱신 의무:** 설계 결정 변경·새 파일·새 패턴 발생 시 같은 커밋에서 이 문서를 갱신한다.
**작성 규칙:** **규칙만 적는다.** 어떻게 알아냈는지·무엇을 실측했는지·어떤 대안을 기각했는지는 적지 않는다(단, "되살리지 말 것"은 규칙이므로 남긴다). 모든 에이전트가 매 작업 전 이 문서를 통째로 읽으므로 길이가 곧 비용이다.

## 게임 컨셉
- 웹브라우저용 육성 게임. UI 전체가 가짜 윈도우 OS다: 잠금화면 → user명 입력 → 바탕화면(게임 메인)
- 입력한 user명 = 플레이어 캐릭터 이름. "나 자신"을 육성(프린세스 메이커 스타일). 우상단에 스탯창 상시 표시

## 확정된 설계 결정
| 항목 | 결정 |
|---|---|
| 시간 구조 | 턴제, 일 단위. 1일 = 오전/오후 2슬롯. 밤은 자동 취침(체력 회복+정산) |
| 게임 길이 | 제한 없음. 물가 상승으로 후반 생존이 불가능해져 자연 종결(약 88~101일) |
| 스탯 | 12종. ⚠️ **`stamina` = "행동력", `maxStamina` = "체력"으로 표시된다**(코드 키는 그대로). 소모 자원: `stamina`/`maxStamina`/`mental`(0~100)/`money`. 성장 스탯 **10종**: `knowledge`·`charm`·`sensitivity`·`reputation`·`morality`·`creativity`·`sociability`·`vocabulary`·`athletics`·`gaming`. 상한은 `growthCap(key)`가 정한다 — 평판·도덕만 100, 나머지 999 |
| 엔딩 | **11종** = 성취 4종(스탯 조합으로 게임 **도중** 뜨고 [계속하기]로 물릴 수 있다) + 직업 5종(공고 하나당 하나, **파산했을 때만**) + 실패 2종(파산/번아웃). ⚠️ `bigtech`은 성취가 아니라 **직업 엔딩**이다 |
| 엔딩 공개 | 비공개. 엔딩 도감에 한 번 본 엔딩만 해금 |
| 활동 선택 | ⚠️ **바탕화면에 활동 아이콘은 없다**(`onDesktop` 전부 false). 실행 통로는 **넷**: ①카톡 대화창 [만나러 가기](=`social`) ②스케줄러 예약 ③브라우저 사이트의 확정 버튼 ④바탕화면 바로 가기. 활동 **21종** 정의는 `data/activities.ts` |
| 행동 비용 | **탐색 무료**, 확정 행동만 1턴 소모 |
| 날짜 제한 | **없음.** 대신 ①매일 생활비 차감(0→파산) ②10일 주기 물가 인상(뉴스 예고) ③번아웃 누적 |
| 알바비 | 물가보다 느리게 인상 → 고소득 알바 전환 압박 = 스탯 투자 이유 |
| 정규직 | 알바(일용직)와 별개 축. 지원→서류→면접→최종 절차, 채용되면 **고용이 지속**되고 급여일마다 월급. 출근은 플레이어가 고르는 활동이고 무단결근이 쌓이면 해고. **급여는 물가 배율을 안 탄다** → 중반에 강하고 후반에 반드시 무너진다 |
| 엔딩 도달 | 성취 엔딩은 [엔딩 보기]/[계속하기] 어느 쪽이든 도감 즉시 해금. 파산·번아웃·**직업 엔딩**은 강제 종료 |
| 체력 | `stamina`(일일 소모/취침 회복) / `maxStamina`(운동으로 영구 상승, 철인 엔딩 판정) 분리 |

**전체 설계 문서:** `docs/superpowers/specs/2026-08-03-windows-desktop-life-sim-design.md`
**구현 계획:** `docs/superpowers/plans/2026-08-03-playable-core.md` (Task 1~12 완료 = 완주 가능 코어)

## 구현 중 확정된 추가 결정

### 상태·저장
- 로그인 상태(`loggedIn`)는 세이브 존재 여부와 분리한다. `partialize`로 저장에서 제외 → 새로고침 시 항상 잠금화면부터. (세이브만으로 분기하면 "이어하기"에 도달할 수 없다)
- 상한은 `systems/turn.ts`의 명명 상수: `MAX_STAMINA_CAP`(200)/`MENTAL_CAP`(100)/`GROWTH_STAT_CAP`(999). `clampStats`는 `GROWTH_STAT_KEYS`를 순회하므로 성장 스탯 추가 시 `types/game.ts`만 고치면 된다. 엔딩 조건 수치는 `balance.verify.test.ts`가 지킨다. 스탯 상한이 올라도 도달 기준은 그대로 둔다. ⚠️ **직업 엔딩은 조건이 아니라 도달 가능성을 시뮬레이션으로 지킨다**(아래 "직업 엔딩")

### 바탕화면 아이콘 (격자 + 드래그)
- ⚠️ **아이콘은 격자에 절대 배치되고 끌어서 옮길 수 있다.** 모델은 실제 윈도우의 "아이콘 자동 정렬 끔 + 격자에 맞춤 켬"이다. **구 `ICON_COLUMNS`·`.desktop-column` flex 열은 사라졌다.**
- 기본 배치는 `src/data/desktopIcons.ts`의 **`DEFAULT_ICON_CELLS`**(+`DESKTOP_ICON_ORDER`)가 갖는다(배치는 콘텐츠이므로 `src/data/`). 규칙: **왼쪽 열 프로그램 / 오른쪽 열 폴더**
- 격자 수치 단일 출처는 `data/shell.ts`의 **`DESKTOP_GRID`**: 여백 12(`--sp-3`) · 칸 90×80 · 아이콘 폭 84 · 드래그 임계 4px. 좌표는 JS가 계산해 인라인 `left/top`으로 준다 — **CSS에 같은 숫자를 또 적지 않는다**
- 계산은 순수 함수 `src/systems/desktopGrid.ts`: `gridSize`·`cellOrigin`·`snapToCell`·`clampCell`·`nearestFreeCell`·`resolveLayout`. ⚠️ **`resolveLayout`이 "저장된 칸이 지금 화면에 없다"를 흡수한다**(클램프 → 겹침 해소). 없으면 좁은 화면에서 아이콘이 화면 밖에 그려져 다시 잡을 수도 열 수도 없다. **사용자가 옮긴 칸이 남의 기본 칸을 이긴다**(2단계 배치)
- ⚠️ **점유된 칸에 놓으면 맞바꾸지 않고 가장 가까운 빈 칸으로 민다**("내가 잡은 것만 움직인다"). 거리는 **칸이 아니라 픽셀**로 잰다
- 위치는 **`src/store/desktopIconStore.ts`**(persist, 키 `windows-game-desktop-icons`)에 남는다. ⚠️ **`gameStore`에 넣지 않는다** — `reset()`이 비워 새 판마다 제자리로 튄다. 아이콘 위치는 판이 아니라 사람의 취향이다(`browserStore`와 같은 판단). **옮긴 아이콘만** 저장한다(전부 저장하면 기본 배치 변경이 아무에게도 반영되지 않는다)
- ⚠️ **드래그 임계값 4px이 더블클릭을 지킨다**(윈도우 SM_CXDRAG와 같은 값·축별 판정). 드래그 직후 300ms 동안 더블클릭을 무시한다. **포인터 캡처는 아이콘 버튼 자기 자신에 건다**(캡처 대상과 클릭 대상이 같으면 click/dblclick이 성립한다 — 캡션 버튼 회귀와 다른 경우다)
- **되돌리는 길은 `아이콘 위치 초기화` 버튼**(`.desktop-restore`, 바탕화면 왼쪽 아래)이고 **옮긴 적이 있을 때만 나타난다**(ux `gesture-alternative`·`undo-support`). **키보드로도 열린다**(`onKeyDown` Enter/Space) — `onClick`은 쓰지 않는다(한 번 클릭으로 열리면 드래그로 잡을 수 없다)

### 활동 바로 가기 · 오른쪽 클릭 메뉴
- ⚠️ **사이트 확정 버튼 우클릭 → [바탕화면에 등록] → 더블클릭하면 확인창을 거쳐 그 활동이 실행된다.**
- **화면이 순회하는 목록은 하나다:** `data/desktopItems.ts`의 **`desktopEntries(shortcutActivityIds)`** = 내장 항목 + 바로 가기. 타입은 판별 합집합 `DesktopEntry`(`shortcut: false`→`item`, `true`→`activityId`). 격자·드래그·저장이 둘에게 같아야 하므로 목록을 나누지 않는다. **더블클릭 동작만** 갈린다. **id는 `shortcut:<활동id>`**(`systems/shortcuts.ts`의 `shortcutIdOf`) — 중복 등록 판정이 그냥 되고 새로고침해도 칸이 어긋나지 않는다. 콜론이 내장 id와의 충돌을 막고 `shortcuts.test.ts`가 순회로 지킨다
- **목록은 `store/shortcutStore.ts`**(persist, 키 `windows-game-shortcuts`, `activityIds`만). ⚠️ **`gameStore`에 넣지 않는다**(`desktopIconStore`·`browserStore`와 같은 판단). **새 판을 시작해도 남는다** — 바로 가기는 활동을 가리키기만 하고 실행 때마다 그 판의 `canRun`을 다시 묻는다
- ⚠️ **위치는 `desktopIconStore`가 그대로 담는다**(위치 규칙을 두 벌로 만들면 "바로 가기만 격자에 안 붙는" 버그가 난다). 배치는 **2단계**: `resolveLayout`으로 내장 아이콘을 먼저 다 놓고 **`placeShortcuts`**가 그 위에 얹는다(옮긴 칸이 있으면 그 칸, 없으면 **`firstFreeCell`** = 열 우선 첫 빈 칸). **섞어 돌리면 기본 배치가 통째로 밀린다**
- **바로 가기 화살표는 CSS 도형**(`.desktop-icon-link`)이고, 뜻이 있으므로 라벨에 스크린 리더용 "(바로 가기)"를 덧댄다. 삭제는 **바로 가기 아이콘 우클릭 → [바로 가기 삭제]**뿐이고 재확인을 받지 않는다(되돌리는 비용이 우클릭 한 번). 내장 아이콘 메뉴에는 [열기]밖에 없다. 등록은 브라우저 창 뒤에서 일어나 안 보이므로 확정 패널에 `.ac-added` 한 줄로 알리고, 이미 있으면 **"이미 바탕화면에 있습니다"** 비활성 항목으로 말해 준다
- **확인창은 `components/apps/ActivityConfirm.tsx`**(`role="alertdialog"`, `LAYERS.DIALOG`). ⚠️ **`window.confirm` 금지.** 기본 포커스는 덜 위험한 [취소]. **`canRun`이 false면 실행 버튼을 아예 안 그리고 사유를 적는다** — 지름길이 정상 경로의 제약(행동력·소지금·`requires`·`requiresItem`·게임오버)을 하나도 건너뛰지 않는다
- ⚠️ **경고 문구의 단일 출처는 `apps/activityPreview.ts`의 `previewWarnings`**(번아웃·조건 미달·오후 생활비)와 **`blockReasons`**(왜 못 하는가). 확정 화면이 셋(활동 창·사이트 확정 패널·확인창)이라 각자 적으면 반드시 하나를 빠뜨린다. 판정은 `canRun`/`getBurnoutPenalty`/`getLivingCost`가 하고 여기서는 **문장으로 옮기기만** 한다
- ⚠️ **오른쪽 클릭 메뉴는 공용 부품 `src/components/ContextMenu.tsx`다**(휴지통·폴더·빈 자리도 앞으로 이걸 쓴다). 인라인으로 만들면 열기·닫기·바깥 클릭·Esc·키보드 이동·화면 밖 클램프 여섯 가지를 매번 다시 만들게 된다
  - ⚠️ **`document.body`로 포탈한다** — `.win-body`가 `overflow: auto`라 창 안에 그리면 메뉴가 잘리고, 창의 쌓임 문맥 때문에 z를 올려도 작업 표시줄을 못 넘는다
  - 바깥 클릭은 **투명 판 한 장**(`.ctxmenu-scrim`)이 받는다(전역 리스너 정리 코드 없음). 화면 밖 클램프는 순수 함수 **`systems/contextMenu.ts`의 `clampMenuPosition`**이 하고 **넘칠 때 잘라 붙이지 않고 반대쪽으로 뒤집는다**
  - ⚠️ **고를 수 있는 항목이 하나도 없으면 판 자체에 포커스를 준다**(`tabIndex={-1}`) — 비활성 버튼은 포커스를 못 받아 Esc가 메뉴에 닿지 않는다. 열 때의 포커스를 기억했다가 닫을 때 **돌려준다**(ux `focus-management`). 아이콘은 우클릭 시 스스로 포커스를 잡는다
  - ⚠️ **비활성 버튼은 마우스 이벤트를 발사하지 않는다.** 확정 버튼이 `disabled`일 때 우클릭은 감싼 상자(`.ac-commit`)가 받고 `.ac-btn:disabled { pointer-events: none }`이 판정을 그리로 흘려보낸다 — 못 하는 상태에서도 바로 가기는 만들 수 있어야 한다

### 창 · 셸
- **바탕화면 항목 ≠ 활동.** `src/data/desktopItems.ts`의 `DESKTOP_ITEMS`(타입 `DesktopItem`)가 단일 출처다. 활동 기반 항목은 `Activity.onDesktop`에서 자동 파생되고(**id 하드코딩 필터 금지**), **스탯도 턴도 건드리지 않는 항목은 활동으로 위장시키지 않는다**(가짜 활동은 번아웃 이력·엔딩 판정·밸런스 테스트에 없는 id를 섞는다). 폴더·휴지통도 여기에 추가한다
- `'stub'`은 미구현 앱의 "준비 중" 안내 창(`StubApp`)이며 `OpenWindow.message`를 함께 쓴다. **새 앱은 stub으로 먼저 올리고 구현되면 kind만 바꾼다**
- **z-order는 `src/data/layers.ts`의 `LAYERS`가 단일 출처다.** `DESKTOP_ICON`(10) < `DESKTOP_PANEL`(100) < `WINDOW_BASE`(1000, `windowStore.topZ` 시작값) < `DESKTOP_PANEL_RAISED`(8000) < `TASKBAR`(9000) < `ENDING`(9500). CSS는 상수를 못 읽어 Desktop.css/EndingModal.css에 같은 값이 주석과 함께 중복돼 있다 — **바꿀 때 양쪽을 함께 고친다**. 같은 이유로 **셸 골격 치수는 `src/data/shell.ts`의 `SHELL`이 단일 출처다**(`TASKBAR_HEIGHT` 44, `TITLE_BAR_HEIGHT` 40)이고 `Desktop.css`의 44px 중복도 **함께 고친다**
- **스탯창·날짜칸은 바탕화면 요소다 → 일반 창에 가려지는 것이 정상이다**(설계자 요구). 되찾는 수단은 작업 표시줄 시계 왼쪽의 패널 버튼이고, `src/store/desktopPanelStore.ts`가 패널별 z를 들고 `raise(id)`로 `DESKTOP_PANEL_RAISED` 위로 올린다
  - ⚠️ **작업 표시줄 패널 버튼은 토글이다**(`toggle(id)`) — **숨김 ↔ 표시**를 오가고 켤 때 `raise`를 겸한다. 숨김 상태는 `visible` 레코드가 들고 패널 컴포넌트가 `!visible`이면 렌더하지 않는다. 상태는 `aria-pressed` + `.taskbar-panel-on` + 툴팁 문구로 알린다(**색만으로 알리지 않는다**)
  - 패널 **본문** 클릭은 `raise(id)`만 한다(토글은 작업 표시줄 버튼 전용). `windowStore.focus()`는 `windows` 배열만 갱신하므로 미등록 패널에는 듣지 않는다
- `Window`의 `onActivate` prop: 스토어에 등록되지 않은 창은 이 콜백으로 자체 z를 올린다(미등록 창이 `focus`를 부르면 `topZ`만 소모한다). 날짜/슬롯 표기와 날짜칸 배치 수치는 `src/data/calendar.ts`(`formatGameDate`·`CALENDAR_PANEL_LAYOUT`)가 단일 출처다(작업 표시줄 시계와 같은 함수)
- 건너뛰기 버튼은 **작업 표시줄이 아니라 날짜칸**에 있다. 라벨은 "오전/오후 건너뛰기" — `doSkip()`은 **한 슬롯**만 넘긴다. 작업 표시줄에는 시계와 패널 버튼만 둔다
- **창 상태(최소화·최대화)는 `windowStore`의 런타임 상태다.** `maximized`/`minimized`는 필수 불리언, `restore: {x, y, width}`가 최대화 직전 좌표를 든다. 액션은 `minimize(id)`/`toggleMaximize(id)`/`activate(id)`
- **`DesktopItem.openMaximized`는 "열릴 때의 초기 상태"일 뿐이다**(정적 플래그로 오해하면 복원이 막힌다). 컴포넌트에서 id로 분기하지 않고 데이터에서 켠다(현재 `browser`만 true). 이 항목의 `width`는 **복원 시 폭**이므로 의미 있는 값을 둔다. 최대화로 열리는 창에도 일반 좌표(`120+i*28`)를 넘긴다 — **0,0 금지**
- **최소화된 창은 렌더링하지 않되 목록에서 지우지 않는다**(`WindowManager`가 `.filter(w => !w.minimized)`). 작업 표시줄 항목 클릭은 `focus`가 아니라 **`activate`**를 부른다. **전체 화면 창은** x/y/width를 무시하고 `left:0, top:0, width=innerWidth, height=innerHeight-SHELL.TASKBAR_HEIGHT`로 그리며 **타이틀 바에 드래그 핸들러를 아예 붙이지 않는다**(캡션 버튼이 그대로 동작한다). `.win-max`가 grab 커서를 없애고 `.win-body`의 `max-height: 60vh` 상한을 푼다. `resize` 구독은 maximized 창에서만 건다
- ⚠️ **캡션 버튼 포인터 캡처 회귀 (두 번 터진 버그).** 타이틀 바 `pointerdown`이 `setPointerCapture`를 걸면 `pointerup`이 자식 버튼에 닿지 않아 **클릭이 성립하지 않는다**. `Window.tsx`의 `handlePointerDown`은 **`.win-caption-btn`(세 버튼 공통 클래스) 하나로** 걸러낸다 — **개별 클래스(`.win-close` 등)를 나열하지 말 것.** 캡션 버튼을 새로 추가하면 반드시 `win-caption-btn` 클래스를 함께 붙인다
- **캡션 버튼은 아이콘이 아니라 CSS 도형이다**(`.win-glyph-*`, `currentColor`) — 가는 단색 선이고 닫기 hover에서 흰색으로 덧칠해야 하므로 다색 아이콘을 쓸 수 없다. `UI_ICONS.windowClose`는 제거됐다. **캡션 버튼은 콜백 유무로 켜진다:** `onClose`/`onMinimize`/`onToggleMaximize`를 넘긴 것만 그려진다. HUD 패널은 셋 다 넘기지 않아 버튼이 없다(windowStore 미등록이라 최소화되면 되돌릴 수단이 없다)
- **윈도우 11 시각 언어(맥스러움 제거):** 타이틀 바는 그라데이션 없는 플랫 단색(`#f3f3f3`) `font-weight: 400`, 높이 `SHELL.TITLE_BAR_HEIGHT`(40px) 고정. 캡션 버튼은 `radius 0` · 폭 46px · 우상단 모서리 밀착(타이틀 바 오른쪽 패딩 0). hover는 최소화·최대화 `#e5e5e5`, **닫기만 `#e81123` + 흰 글리프**. 창 배경 `#f9f9f9`, 테두리 `#e5e5e5`, 그림자 2단(`0 2px 4px/.1` + `0 8px 20px/.14`). 작업 표시줄은 밝은 아크릴(`rgba(243,243,243,.85)` + blur)
- **바탕화면 배경은 슬롯을 따라간다.** `Desktop`이 `.desktop-day`(오전) / `.desktop-dusk`(오후, 광원 at 82% 62%)를 붙이고 색은 CSS가 정한다. **이미지 파일을 쓰지 않는다**(아이콘과 같은 이유). 전환은 `transition: background 600ms`. **작업 표시줄 창 목록은 아이콘만이다**(40×36 정사각). ⚠️ 글자가 없으므로 **`aria-label`이 필수**다. **정렬:** 시작 버튼+창 목록만 가운데, 패널 버튼·시계는 우측 트레이 고정. 좌측 `.taskbar-spacer`가 `.taskbar-tray`와 같은 `flex: 1 1 0`을 차지한다 — **지우면 가운데 묶음이 왼쪽으로 밀린다**

### HUD (스탯창 · 날짜칸)
- ⚠️ **HUD 패널은 `Window` 크롬 예외다.** 공용 `Window` 대신 `src/components/desktop/HudPanel.tsx`(+`.css`)를 쓴다 — 설계자 요구가 "OS 창이 아니라 게임 오버레이로 읽혀야 한다"이기 때문
- ⚠️ **HUD 시각 언어 = 밝은 모던 시스템 카드**(윈도우 11 위젯 / SaaS 대시보드). **다크 판타지 방향(근검정 + 샴페인 골드 + 금테 + 세리프 영문 부제 + ✳ 오너먼트)은 설계자에게 기각되어 폐기됐다 — 되살리지 말 것.**
  - **액센트는 시스템 블루(`--hud-accent`) 하나뿐이다.** 스탯별 색·글로우·네온 전부 금지. `STAT_META.accent`는 제거됐고 게이지는 전부 한 색이다(구분은 글리프 + 한국어 라벨 → ux `color-not-only`). **테마 장식 금지**(세리프 영문 부제·✳ 글리프·금테) — 구역은 헤어라인 + 작고 흐린 한국어 라벨로만 가른다. 근거: style `Executive Dashboard`, `Swiss Modernism 2.0`
  - **날짜칸에는 타이틀 영역이 없다**(설계자 요구). 헤더는 **`header` 불리언**이 켠다(구 `headerIcon`) — 안 넘기면 헤더 블록 자체가 렌더되지 않고 접근성 이름은 `label`→`aria-label`이 계속 준다. 스탯창은 제목이 플레이어 이름이라 헤더를 유지하되 사람 모양 글리프는 제거했다
  - ⚠️ **스탯창에 세로 스크롤바가 뜨면 안 된다**(설계자 요구). 높이 상한은 `.hud-body`의 `70vh`가 아니라 **`.hud`의 `max-height: calc(100vh - 68px)`**가 쥔다(상단 여백 16 + 작업 표시줄 44 + 바닥 숨 8). `overflow-y: auto`는 극단적으로 짧은 화면에서만 살아난다. **줄을 추가하면 이 여유가 줄어든다**
  - **구역 라벨은 두 패널 모두에서 전부 사라졌다**(설계자 지시). `HudSection`은 **`label`을 생략할 수 있고**(`.hud-section-bare`, `aria-hidden`) 라벨을 받는 형태도 계속 지원하지만 **현재 쓰는 곳이 없다**. ⚠️ **제목을 지웠으면 제목이 차지하던 자리도 지운다** — 라벨용 `padding-top`을 남기면 "지웠다"가 아니라 "안 뜬다"로 읽힌다
  - 안쪽 여백은 **20px**(`--sp-5`, `.win-body`도 같은 값) — 장식선이 가장자리 5px 안에 있어 실제 여백은 14px이 된다. **스탯 배치**(설계자 지시): 자원 줄 = 행동력·멘탈·체력·**평판·도덕**, 그리드 = 나머지 성장 스탯 7종, 생계 = **소지금** + 생활비 2줄. 평판·도덕이 빠진 건 `GROWTH_STAT_ORDER`(표시용)에서만이고 스탯 자체는 여전히 성장 스탯이다
  - ⚠️ **평판·도덕의 상한은 100이다**(나머지 999). 단일 출처는 `systems/turn.ts`의 **`growthCap(key)`** — `clampStats`와 게이지가 같은 함수를 본다. 어떤 엔딩 조건도 이 둘을 쓰지 않는다. **이 둘을 쓰는 엔딩을 추가하면 조건을 100 이하로 잡을 것**
  - 게이지가 있는 줄은 값 옆에 **`/상한`**을 적는다(`.stat-max`, 한 단 작고 연하게). 능력치 칸에는 **옅은 배경**(`--hud-accent-wash`)이 깔린다. ⚠️ **9색 스탯별 틴트는 기각됐다 — 되살리지 말 것**(단일 액센트 규칙을 깬다)
  - **상자 금지.** 성장 스탯은 테두리·배경 없는 2열 그리드다(구 3열 칩 그리드는 "칸막이 서랍"으로 읽혔다). 구분은 간격과 헤어라인(`--hud-rule`)이 한다. **숫자가 주인공이다** — 값은 라벨보다 크게(`--fs-lg`/`--fs-base`), 우측 정렬, `font-variant-numeric: tabular-nums`, 단위("원")는 작고 흐리게
  - **바뀐 것은 외형뿐이다.** 고정 위치(드래그 핸들러 미부착) · 캡션 버튼 없음 · `windowStore` 미등록 · `desktopPanelStore.raise()`로만 앞으로 · z-order(`DESKTOP_PANEL` 100 → `DESKTOP_PANEL_RAISED` 8000+)는 전부 그대로다
  - **DOM 셀렉터:** `.win`은 **열린 일반 창만** 고른다. HUD 패널은 `.hud`, 제목은 `.hud-head-title`. `Window`의 `fixed` prop과 `.win-fixed`는 남아 있으나 현재 사용처가 없다
- ⚠️ **테두리 장식은 `src/components/PanelOrnament.tsx` 하나가 그린다.** 옅은 액자선 + 네 모서리 갈고리. **좌상단 도형 하나만 그려 두고 나머지 셋은 CSS `transform`으로 뒤집는다.** 색은 `--ornament-color`/`--ornament-frame`으로 받는다(기본 `--os-accent-line`). `pointer-events: none` + `aria-hidden`. **이미지가 아니라 인라인 SVG다**(크기·문맥별 색 + 오프라인 규칙) — 외부 이미지 금지
  - **붙는 곳: 활동창(`exe`) · 안내창(`stub`) · 엔딩 모달뿐이다.** **브라우저 제외**("설치된 프로그램"으로 읽혀야 하는 창에 장식이 붙으면 가짜 OS 컨셉이 깨진다). ⚠️ **HUD 패널에서는 설계자 지시로 걷어냈다 — 되살리지 말 것.** `Window`의 `ornament` prop은 **기본 꺼짐**이고 `WindowManager`가 kind별로 명시적으로 켠다
  - ⚠️ 창에서는 장식이 **`.win-body` 안이 아니라 밖**에 있고 `top: 45px`(타이틀 바 40 + 여백 5)이다(본문은 스크롤 컨테이너라 안에 넣으면 함께 굴러간다). 45px도 `SHELL.TITLE_BAR_HEIGHT`의 CSS 중복이므로 **함께 고칠 것**

### 디자인 토큰 · 폰트
- ⚠️ **간격 척도에 `--sp-7`은 없다**(4/8 리듬: 1·2·3·4·5·6·8 = 4/8/12/16/20/24/32). CSS는 **정의되지 않은 var를 만나면 그 선언 전체를 무효로 만든다** — 없는 토큰을 쓰면 빌드도 테스트도 통과하고 **화면에서만** 조용히 깨진다(시집이·아점에서 실제로 터졌다)
- **디자인 토큰은 `src/index.css`의 `:root`가 단일 출처다.** 간격 `--sp-1..8`, 타입 `--fs-xs..3xl`(11/12/13/14/16/18/24/32), 모서리 `--r-sm..xl`, 고도 `--el-1/2/3`(3단만), OS 색 `--os-*`, HUD 색 `--hud-*`, 폰트 `--font-base`/`--font-point`. **컴포넌트 CSS에 생 hex나 임의 px을 새로 적지 않는다**(ui-ux-pro-max `elevation-consistent`)
  - 두 시각 언어를 **섞지 않는 것**이 "게임이 OS 위에 얹혀 있다"는 인상의 근거다: OS 크롬(창·작업표시줄·바탕화면·잠금화면·엔딩 모달)은 `--os-*`, HUD 패널 내부는 `--hud-*`만. (`index.css`의 `.hud :focus-visible` 오버라이드는 HUD가 자기 액센트를 명시적으로 소유하도록 남겨 뒀다 — 값은 `--os-accent`와 같다)
  - ⚠️ **반투명 표면의 색은 토큰이 아니라 합성 결과가 정한다.** HUD는 `rgba(252,252,253,0.9)` 아크릴이라 벽지가 비친다. **색을 눈이나 계산으로 판단하지 말고 스크린샷 픽셀을 읽어라**(아래 "검증 도구")
- ⚠️ **폰트 변수는 셋이고 경계가 곧 OS/게임의 경계다.** `--font-base` = **Pretendard**(npm 패키지 `pretendard`, `@import`로 번들) → Segoe UI·Malgun Gothic 폴백. `--font-point` = **Cafe24 Ohsquare**(`@font-face`, family 이름은 지시대로 `Cafe24Anemone`, `font-display: swap`). `--font-date` = **SF 함박눈**(`SfHambakneun`) — **`.cal-date` 한 줄 전용**(다른 포인트 자리와 성격이 달라 따로 둔다)
  - **포인트/날짜 폰트는 게임이 자기 목소리를 내는 자리에만** 쓴다: `.cal-date`·`.hud-head-title`·`.ending-title`. **OS 크롬(잠금화면 시계·작업 표시줄·창 타이틀 바)에는 절대 쓰지 않는다**
  - 한 벌짜리 서체라 적용 자리는 **반드시 `font-weight: 400`**으로 못 박는다(600/700은 합성 볼드가 획을 뭉갠다). `font-variant-numeric: tabular-nums`도 걷어낸다
  - ⚠️ **폰트도 아이콘과 같은 오프라인 규칙이다.** Pretendard는 npm 패키지, 디스플레이 서체 4종(Cafe24 Ohsquare·SB 어그로 L/M/B·SF 함박눈)은 `src/assets/fonts/*.woff`에 넣고 상대 경로로 참조한다. **새 폰트를 CDN `<link>`나 `url(https://...)`로 추가하지 말 것**
  - ⚠️ Pretendard는 Segoe UI보다 획이 얇아 **같은 색이 더 낮은 대비로 합성된다. 폰트를 바꾸면 색도 다시 재야 한다**

### 브라우저 · 사이트
- ⚠️ **브라우저는 사이트 컨테이너다.** `src/data/sites.ts`의 `SITES`가 사이트 단일 출처이고(id·가짜 URL·제목·아이콘·`render`·안내 문구·`bookmark`·`activityId`), `BrowserApp`은 **`site.render`로만 분기한다**(`'portal' | 'construction' | 'shop' | 'library' | 'cinema' | 'publish' | 'tube' | 'jobs' | 'career' | 'bank'`). **사이트 id로 분기 금지.** 새 사이트 = SITES 항목 하나 + (새 종류라면) `render` 값 하나와 컴포넌트 하나. ⚠️ **사이트 아이콘은 서로 겹치면 안 된다**(`sites.test.ts`가 지킨다) — 탭 파비콘·포털 퀵메뉴·즐겨찾기 줄 세 자리에 흐르는 정체성이다
- ⚠️ **"즐겨찾기"가 두 곳에 있고 서로 다른 것이다.** ①**브라우저 크롬의 즐겨찾기 줄** = `browserStore.bookmarks`(영구, 주소창 별표로 추가·삭제) ②**네이놈 포털 홈의 카테고리 줄** = 정적 `BOOKMARK_SITES`(사이트 콘텐츠, 플레이어가 못 바꾼다). `sites.ts`의 `bookmark: true`는 **②만** 담당한다. ⚠️ **①에는 기본 즐겨찾기가 없다**(설계자 지시, 저장 버전 2의 `migrate`가 v1의 기본 5개를 비운다) — 미리 채우면 "내가 고른 것"이라는 감각이 사라진다
- **크롬(탭 줄·도구 모음·즐겨찾기 줄)은 흰색(`--os-surface`), 본문은 그보다 어둡다(`--nv-bg`)** — 이 밝기 차가 "브라우저가 사이트를 담고 있다"를 만든다. **상단 구성은 실제 크롬을 따른다: 탭 줄 → 도구 모음 → 즐겨찾기 줄.** 탭 줄 띠만 `--os-chrome-alt`로 어둡고 **활성 탭만 도구 모음과 같은 흰색**이라 두 줄이 이어져 보인다. ⚠️ **탭은 하나뿐이고 "+"(새 탭)가 없다**(다중 탭 미구현 — 눌러도 아무 일 없는 버튼을 두지 않는다). 탭의 ✕는 진짜이고 `WindowManager`가 넘긴 `onClose`에 연결돼 있다
- **주소창 오른쪽 = 별표(알약 안), 도구 모음 맨 오른쪽 = ⋮ 더보기 메뉴.** 메뉴 항목은 실제로 동작하는 것만 둔다(홈으로·새로 고침·즐겨찾기 토글). 바깥 클릭은 전역 리스너가 아니라 **투명 scrim `div` 한 장**(`.browser-menu-scrim`)이 처리하고 Esc는 메뉴의 `onKeyDown`이 받는다. 포털 홈의 카테고리 줄은 `BOOKMARK_SITES`(= `bookmark: true` 필터)가 만든다 — **컴포넌트가 id를 나열하지 않는다.** 내용 없는 사이트(슬로우캠퍼스·트위터)는 공용 `ConstructionSite`를 공유한다. ⚠️ 구 `sns` 사이트는 **트위터가 흡수했다** — `activities.ts`의 `sns` 활동은 사이트가 아니라 행동이라 그대로 남는다
- 뒤로/앞으로 이력은 **`BrowserApp`의 로컬 `useState`**다(창 하나의 휘발 상태 — 스토어에 올리면 창 id별 정리 코드가 필요해진다). 인덱스 계산만 순수 함수 `src/systems/browserHistory.ts`로 분리해 테스트한다(`navigate`는 앞으로 이력을 자르고, 같은 사이트 재클릭은 이력을 늘리지 않는다). 새로 고침은 페이지 컨테이너의 `key`를 바꿔 다시 마운트시킨다
- ⚠️ **주소창은 입력 가능하다.** `<form>`으로 감싸 Enter 제출을 기본 동작에 맡긴다(IME 조합 중 Enter도 알아서 처리된다). 입력값 → 사이트 id 변환은 `sites.ts`의 **`resolveUrl`**이 한다: 프로토콜·`www.`·끝 슬래시·대소문자를 무시하고, **모르는 주소는 입력값을 그대로 돌려준다**(없는 id는 "페이지를 찾을 수 없습니다"로 끝나므로 실패 경로용 상태가 없다). 주소창 문자열은 로컬 state이고 `siteId`가 바뀔 때만 되돌아간다
- 주소창은 **테두리 없는 회색 알약**이다(`--os-fill`, 포커스 시에만 액센트 테두리 + 흰 배경). 투명 테두리를 미리 잡아 둬 포커스 시 폭이 변하지 않는다. 반면 포털의 **검색창은 장식**이다 — 자유 검색은 1차 제외라 항상 "검색 결과가 없습니다"로 끝난다(실시간 검색어는 `siteId`가 있으면 이동, 없으면 같은 안내)
- ⚠️ **네이놈 포털은 "모던"이다. 되살리지 말 것:** 검색창의 3px 초록 테두리, 카드 제목 밑 2px 초록 밑줄, 즐겨찾기 줄의 위아래 가로줄, 목록 항목마다 그은 구분선. 현재는 **1.5px 초록 링 + 브랜드 글자("네")를 품은 알약 검색창**, **원형 아이콘 판 퀵메뉴**, 큰 모서리(`--r-xl`) 카드, **리드 기사 1건 + 출처·시각 메타 줄**이다. 뉴스 시각은 인덱스에서 뽑는다(`Date`를 쓰면 결정성이 깨진다). 로고 서체는 `--font-logo`(SB 어그로). 사이트 아이콘은 `fluent-color`. ⚠️ **검색 실행 글리프만 단색(`mdi:magnify` + 브랜드 초록)**이다(정체성=컬러 / 컨트롤 글리프=단색, 단색이라야 CSS로 초록을 입힌다). **브랜드 초록은 로고·태그·포커스에만.** 근거: style `Bento Grids`, ux `whitespace-balance`
- ⚠️ **탐색은 무료라는 규칙을 코드로 지킨다:** 브라우저 크롬(주소·이력·즐겨찾기)은 `gameStore`를 **읽기만** 한다. 상태를 바꾸는 자리는 **셋뿐**이고 전부 명시적 버튼이다: ①배너존 광고 보상(턴 없음) ②쇼핑 주문(턴 없음) ③**활동 사이트의 확정 버튼(1턴)**. 그 밖에 스탯을 건드리는 코드를 사이트에 넣지 말 것
- ⚠️ **활동을 실행하는 사이트 5종:** **미디북스**(`render: 'library'` → `reading`) · **시집이**(극장 예매, `'cinema'` → `movie`) · **아점**(`'publish'` → `writing`) · **알바몬**(`'jobs'` → **알바 4종** = 일용직) · **벼룩장터**(`'career'` → **정규직** 지원/면접/출근)
  - ⚠️ **알바몬과 벼룩장터는 다른 것이다**(일용직 vs 지속 고용). 색 계열도 갈라 뒀다: 알바몬 하늘색 `--ab-*` #0369A1 / 벼룩장터 남색 `--fl-*` #2563EB(color `Classifieds / Buy-Sell`). 벼룩장터 판형은 style `Editorial Grid / Magazine` + `Data-Dense Dashboard`
  - ⚠️ **알바몬만 활동이 여럿이다.** `Site.activityId`는 "아무것도 안 고른 상태의 기본값"(`work`)이고 실제 실행 활동은 고른 공고(`data/jobs.ts`의 `Job.activityId`)가 정한다. 공고 8개 / 활동 4종이라 **같은 직종 2개씩**이 같은 활동을 가리킨다(일당이 같아야 표시가 참이다). **공고에 급여를 다시 적지 않는다** — 카드의 일당은 `previewActivity`가 돌려준 money 행을 읽는다
  - ⚠️ **조건 미달 공고는 감추지 않고 비활성으로 보여 주고 사유를 글자로 적는다**("매력 12 이상 필요 — 현재 10"). 판정은 `canRun`이 하고 화면은 **사유만 파생**한다(두 번째 판정 규칙 금지)
  - **활동은 `Site.activityId`로 가리키기만 한다** — 수치를 사이트에 다시 적으면 밸런스 테스트가 못 보는 두 번째 출처가 생긴다. id 유효성은 `sites.test.ts`가 순회로 지킨다
  - ⚠️ **확정 UI는 `sites/ActivityCommit.tsx` 하나다.** 이 패널이 지는 약속이 넷이라 사이트마다 만들면 반드시 하나를 빠뜨린다: ①증감 미리보기 ②번아웃 경고 ③조건 미달 경고 ④**오후 슬롯 생활비 차감 경고**. 증감 계산은 활동 창(`ExeApp`)과 **같은 `previewActivity`**를 쓴다. **어느 사이트에서든 같은 밝은 카드**다
  - **콘텐츠는 `src/data/media.ts`**(`BOOKS`·`FILMS`·`WRITING_PROMPTS`·`findShowtime`) — 책 하나 늘리는 비용이 "배열에 한 줄"이어야 한다. ⚠️ 잔여 좌석은 **정적 값**이다(`Math.random` 금지 — 뉴스·메시지와 같은 결정성 규칙). **실존 인물 이름 금지**, 패러디는 호의적인 톤만
  - ⚠️ **사이트별 색은 그 사이트의 CSS 파일 안에 가둔다**(너튜브 `--tb-*` / 시집이 `--cn-*` / 아점 `--pb-*` / 미디북스 `--lb-*` / 알바몬 `--ab-*` / 벼룩장터 `--fl-*`). 전역 팔레트를 사이트 수만큼 부풀리면 색의 출처를 못 찾는다. **간격·타입·모서리만 전역 토큰**
  - **미디북스** = 흰 배경 + 파랑. 헤더 → 카테고리 탭 → 배너 캐러셀 → 퀵메뉴 원형 → 지금 많이 읽는 작품(별점 순 9권, 3열) → 오늘의 발견(6열) → 이벤트 → 새로 나온 작품 → 확정 패널 → 푸터. `Book`에 `cover`(그라데이션)·`category`·`rating`·`ratings`·`badge`가 있고 **20권**이다
  - **아점** = 크림 배경 + 자간 벌린 영문 소제목. 프로모션 띠 → 헤더 → 히어로 카피 → 대표작 캐러셀 → **KEYWORD 격자** → 요일별 연재 → 작가 소개 → 배너 → 확정 패널. ⚠️ **키워드 격자가 곧 글감 고르기다**(레퍼런스의 판에 게임 기능을 앉혔다) — 그래서 `WritingPrompt.keyword`가 짧다(문장형 `theme`은 격자 칸을 무너뜨린다)
  - **시집이** = 흰 배경 + 빨강(어두운 극장 톤을 버렸고 `.cine` 전용 포커스 링 규칙도 함께 지웠다). 프로모션 띠 → 유틸 줄 → 내비 → 히어로 → 현재 상영작/개봉 예정작/아르떼 TOP 5 → 와이드 배너 → 확정 패널 → 푸터. **레퍼런스가 있으면 레퍼런스가 스펙이다**
  - ⚠️ **`auto-fit` 격자의 열 수는 `minmax`의 최소 폭이 정한다.** 판이 1080px일 때 3열을 원하면 최소 폭이 1080/4보다 커야 한다. 카드 폭 상한으로는 못 막고 **판의 폭을 묶은 뒤 최소 폭을 계산**해야 한다
- ⚠️ **배너존 = 광고 배너 클릭 보상.** 하루 한 번 100원. 판정·금액은 전부 `systems/turn.ts`(`AD_BONUS_MONEY`·`canClaimAdBonus`·`claimAdBonus`)가 갖고 컴포넌트는 부르기만 한다. 제한은 `GameState.adBonusDay`(마지막으로 받은 날)로 건다 — **불리언이 아니라 날짜**라야 날이 바뀔 때 초기화가 필요 없고, 옵셔널이라 구세이브도 마이그레이션 없이 동작한다. **금액이 생활비의 1% 미만인 것은 의도이고 테스트로 지킨다**. **배너는 이미지가 아니라 CSS 그라데이션 + 글자다**(`data/banners.ts`) — 외부 이미지는 오프라인 규칙을 깨고 창 크기마다 잘린다. ⚠️ **실존 브랜드 금지**(전부 지어낸 상호). 광고 뱃지([AD])와 보상 문구는 항상 표시한다
- **뉴스 영역이 게임의 알림 창구다**(설계 문서 3.4). 정적 기사·광고 풀과 실검은 `src/data/news.ts`, 오늘 띄울 목록은 순수 선택자 `src/systems/news.ts`의 `selectNews({ day })`가 만든다. 첫 항목은 항상 `getNextTier(day)`에서 파생된 물가 인상 예고(스탯창과 같은 함수)이고 나머지는 **날짜를 오프셋 삼아 풀을 회전**시킨다. **`Math.random` 금지** — systems는 결정적이어야 한다
- **`--nv-*`는 세 번째 시각 언어다.** OS 크롬(`--os-*`) / HUD(`--hud-*`) / **브라우저 안의 웹페이지(`--nv-*`)**. 브라우저 크롬은 창의 일부이므로 `--os-*`, 그 안의 사이트는 `--nv-*`만 쓴다. `--nv-green-bright`(#03c75a, 2.25:1)는 **장식 전용**이고 텍스트에는 `--nv-green`(#0b7a3b, 5.4:1)을 쓴다
- 브라우저 창만 `.win-body`의 본문 패딩을 걷어낸다(`BrowserApp.css`의 `.win-body:has(> .browser) { padding: 0 }` — `Window.tsx`에 prop을 늘리지 않기 위한 선택). 도구 모음 글리프(뒤로·앞으로·새로 고침)도 캡션 버튼과 같은 이유로 **CSS 도형**이다(disabled에서 `currentColor`로 함께 흐려져야 한다)
- 활동 창은 오후 슬롯일 때 생활비 차감을 경고한다(안 보여 주면 "+42,780원" 뒤에 적자가 되어 플레이어를 오도한다)

## 앱과 시스템

### 창 종류
`WindowKind`: `exe` · `stub` · `browser` · `chat`(메신저 목록) · `thread`(대화) · `mail` · `save` · `taskmgr` · `cmd` · `scheduler` · `folder`(파일 탐색기) · `autolog`(자동 진행 요약) · `solitaire`(예약만, 미구현) · `ending`. `WindowManager`가 kind로 분기해 그린다.

### `Window`의 옵션 셋
- `ornament` — 테두리 장식. **기본 꺼짐.** 활동창·안내창·엔딩 모달만 켠다. ⚠️ HUD 패널·브라우저는 끈다(되살리지 말 것)
- `bareTitle` — 타이틀 바를 **투명하게** 만들고 제목·아이콘을 감춘다. 바는 본문 **위에 겹쳐** 뜨므로 앱이 스스로 위쪽 48px을 비운다(메신저·명령 프롬프트). 흐름에 그대로 두면 빈 띠가 생겨 "타이틀 바를 지운" 인상이 안 난다
- `dark` — 크롬을 어둡게 + 캡션 글리프를 밝게 뒤집는다(명령 프롬프트). ⚠️ **창은 열릴 때 실제 높이를 재서 작업 표시줄 위로 끌어올린다**(마운트 effect). 여는 쪽에서 y를 고르는 걸로는 못 막는다 — 높이는 내용이 정한다

### 창 높이 규약
- 메신저 목록·대화창·아웃룩·파일 탐색기는 **560px**, 스케줄러는 **화면 높이 - 140px**(설계자 지시)
- ⚠️ 전부 `min-height: min(N, calc(100vh - 여백))` 형태다 — 고정값을 박으면 짧은 화면에서 **창 안에 세로 스크롤바**가 생긴다. 음수 마진으로 `.win-body` 패딩을 상쇄하는 방식도 금지(높이 계산이 40px 어긋난다)
- ⚠️ **`.win-body`에는 `max-height: 60vh` 상한이 따로 있다.** 안 풀면 480px에서 잘린다 — 큰 창은 `Window.css`의 `:has(> .sch), :has(> .ex)` 목록에 셀렉터를 추가한다(높이 자체는 앱 CSS가 정한다). ⚠️ 창은 열릴 때 화면 가장자리에서 **8px 띄운다**(`Window.tsx`의 `GAP`)
- ⚠️ **화면을 꽉 채우는 창은 `min-height`가 아니라 `height`를 쓴다**(min-height는 내용이 더 크면 무력하다). 넘치는 부분은 **안쪽 목록만** 스크롤시킨다(`min-height: 0` + `overflow-y: auto`)

### 메시지 · 토스트
- 데이터: `data/messages.ts` — **앱 → 채팅방** 2단계(`CHAT_APPS` → `THREADS`). 메일은 `MAILBOX`. 메시지는 `channel`(채팅방 id 또는 `'outlook'`)로 묶인다
- `MESSAGE_SCHEDULE`은 **턴 번호로 색인된 배열**이고 **끝에서 처음으로 순환**한다(유한한 대본을 결정적으로 계속 흐르게 한다). **빈 배열인 턴이 있는 게 중요하다** — 매 턴 알림은 소음이다
- ⚠️ **받은 메시지를 세이브에 저장하지 않는다.** `(day, slot)`이면 언제든 다시 계산된다(`systems/messages.ts`의 `selectChannel`). 시각(`오전 9:08`)도 턴에서 뽑는다(`Date` 금지 — 결정성)
- 토스트(`toastStore` + `ToastHost`)는 **턴이 넘어갈 때만** 뜬다. 누르면 해당 대화창/사서함이 열리고 게임 상태는 안 바뀐다

### 스케줄러
- `GameState.plans`(옵셔널)에 `{day, slot, activityId}`가 쌓인다. 규칙은 전부 `systems/schedule.ts`. 턴을 넘기는 통로는 `gameStore`의 `doActivity`·`doSkip` 둘뿐이라 **거기서만** `runPlans`를 부른다
- ⚠️ **`turn.ts`는 스케줄러를 모른다.** 의존은 한 방향(schedule → turn)이다 — 밸런스 테스트가 스케줄러 없이도 성립해야 한다
- **조건 미달이면 예약을 버리고 슬롯은 흘려보낸다**(남기면 같은 자리에서 계속 실패하고, 멈춰 세우면 플레이어가 갇힌다). 사유는 `skippedPlans`(휘발)로 꺼내 둔다. 연쇄 실행 상한 40슬롯. **번아웃을 우회하지 못한다**(테스트로 지킨다) — 깨지면 달력을 한 활동으로 도배하는 게 최적해가 된다
- ⚠️ **왼쪽 클릭 = 예약/교체, 오른쪽 클릭 = 취소**(설계자 지시). `onContextMenu`에서 `preventDefault()`로 브라우저 기본 메뉴를 막는다(뜨면 확인창이 가려진다). ⚠️ **취소에는 확인을 받는다**(ux `confirmation-dialogs`) — alertdialog의 기본 초점은 **덜 위험한 [그대로 두기]**이고 **`window.confirm`은 쓰지 않는다**(가짜 OS 위의 진짜 대화상자는 컨셉을 깬다)
- 달력은 항상 **6주 42칸**을 그린다(달마다 주 수를 바꾸면 창 높이가 들쭉날쭉해진다)
- ⚠️ **`runPlans(state, limit)`의 `limit`은 자동 진행 전용이다**(기본값 `MAX_CHAIN` 40). 자동 진행만 1을 넘긴다 — 연쇄 안에서는 급여·택배가 아직 안 나와 "멈춰야 하는가"를 물을 수 없다
- ⚠️ **고르기 판은 묶음별로 그린다.** 라벨과 순서는 `data/activities.ts`의 **`ACTIVITY_CATEGORIES`**가 정한다(컴포넌트에 적지 않는다). **`Activity.category`는 옵셔널이 아니다** — 분류 없는 활동은 판에서 조용히 사라진다. 각 항목은 설명 대신 **증감 칩**을 보여 준다(설명은 `title` 툴팁). 색은 `--os-success`/`--os-danger`이고 부호와 스탯 이름이 함께 있어 **색만으로 뜻을 전하지 않는다**. 목록만 스크롤한다(`.sch-picker-list`)

### 자동 진행
- **날짜칸의 [자동 진행]이 멈출 이유가 생길 때까지 슬롯을 계속 넘긴다.** 수치는 `data/autoAdvance.ts`(`AUTO_MAX_SLOTS` 60=30일 · `AUTO_STEP_MS` 120 · `MONEY_DANGER_DAYS` 3), 규칙·기록은 `systems/autoAdvance.ts`, 루프는 `gameStore`, 요약 창은 `apps/AutoLogApp.tsx`(`kind: 'autolog'`)
- ⚠️ **턴을 넘기는 방법을 새로 만들지 않는다** — 한 걸음은 `afterTurn(state, 1)` 하나뿐이다. 병렬 경로를 만들면 예약·택배·고용 정산 중 하나가 조용히 안 돌기 시작한다
- ⚠️ **정지 조건은 순수 술어의 배열 `STOP_RULES`다**(루프 안 `if` 사슬 금지). 배열 순서가 곧 우선순위이고, 랜덤 이벤트가 생기면 **항목 하나만 추가**한다. 각 규칙은 멈출 이유 **문장**을 돌려준다 — 사유를 못 대는 정지를 만들지 않는다
- ⚠️ **예약이 없는 슬롯은 자동으로 건너뛰지 않고 멈춘다**(설계자 결정). 계획 없는 날을 조용히 태우면 생활비만 빠지고 플레이어는 판이 왜 죽었는지 모른다. 긴 구간은 `planWeekly`로 채운다
- ⚠️ **소지금 위험선은 "넘어가는 순간"에만 발화한다**(상태만 보면 다시 눌러도 한 슬롯도 못 간다). 전·후를 **각자의 날 기준**으로 잰다 — 물가 구간이 바뀌는 날에 한쪽 기준만 쓰면 경고가 통째로 사라진다
- ⚠️ **편성표 메시지(`MESSAGE_SCHEDULE`)로는 멈추지 않는다** — 8턴 중 6턴에 있고 순환하므로 멈추면 세 슬롯을 못 간다. 사서함 메일은 **첫 한 바퀴(8턴) 안에서만** 멈추고, 그 뒤로도 요약 창에는 전부 적힌다
- ⚠️ **컨트롤은 날짜칸이고 스케줄러 창이 아니다** — 창을 닫으면 멈출 수단이 사라진다. [자동 진행] ↔ [멈추기]는 **같은 버튼의 상태 전환**이다. 게임오버면 시작조차 안 한다(규칙이 한 번 더 막는다)
- ⚠️ **끝나면 요약 창이 스스로 뜬다**(0슬롯이면 안 뜨고 날짜칸 한 줄로만 알린다). 여는 effect는 **바탕화면(`Desktop.tsx`)**에 있다 — 날짜칸에 두면 패널을 꺼 놨을 때 영영 안 뜬다. 토스트·메일 경로는 그대로 탄다(요약은 그 위에 얹히는 전말이다)
- ⚠️ **오후 슬롯의 소지금 차액은 이미 `수입 − 생활비`로 상계돼 있다.** 그대로 적으면 "지출 0원"이 된다 — `getLivingCost`로 되돌려 더한 뒤 갈라 놓는다

### 활동 · 성장 스탯
- ⚠️ **성장 스탯 10종은 전부 올릴 방법이 있어야 한다.** `src/data/activities.test.ts`가 `GROWTH_STAT_KEYS`를 순회하며 지킨다 — **스탯만 늘리고 활동을 안 만들면 거기서 실패한다**
- 수치 규칙 셋(사유는 `data/activities.ts` 상단 주석): ①**평판·도덕은 상한 100**이라 상승폭을 작게 준다 ②비용의 **성격**을 갈라 둔다(행동력만/돈/멘탈 소모/멘탈 회복) ③**멘탈 회복처는 넷이다**(game·movie·club·running) — 하나뿐이면 선택지가 아니라 통행세가 된다
- ⚠️ **`movie`는 극장 기준이다**(집이 아니라 외출): 행동력 **-15** · 돈 **-15,000** · 멘탈 **8** · `requires` 15/15,000. `activities.test.ts`가 이 네 값과 "effects와 requires가 어긋나지 않는다"를 지킨다. ⚠️ **`balance.verify.test.ts`는 영향받지 않는다**(그 시뮬레이션은 `work`·`game`만 쓴다)
- ⚠️ **알바는 4종이다.** `work`(편의점, **조건 없는 유일한 알바**) · `work-cafe`(카페, 매력 12) · `work-logistics`(물류센터, 운동 25) · `work-tutor`(과외, 지식 60 — 행동력당 수입 최고). **조건이 걸린 알바가 편의점보다 벌이가 좋아야 한다**(`activities.test.ts`). ⚠️ **편의점의 조건을 늘리지 말 것**(첫날 돈 벌 길이 사라진다). ⚠️ **넷 다 `burnoutKey: 'work'`다** — 없으면 종류를 돌려 가며 일해 연속 노동의 대가를 안 치른다
- ⚠️ **`athletics`(운동)와 `maxStamina`(체력)는 다른 스탯이다** — 기존 운동 활동들은 그릇(maxStamina)만 키우고, 운동 스탯을 올리는 것은 `running`이다. ⚠️ **`Activity.requiresItem`은 아이템 잠금이고 판정은 `systems/turn.ts`의 `canRun` 하나가 한다** — 화면에서만 막으면 스케줄러 예약이 잠금을 통과한다. 현재 유일한 사례는 `gym-member` ← `gym-pass`(헬스장 회원권, 90,000원 = 1일권 6회분). **이 잠금이 `gym-day`(1일권)의 존재 이유다**
- 회원권을 얻는 길은 **둘이지만 통로는 하나다**: 쇼핑(`ShopSite`)과 헬스장 오픈채팅의 [한 달 끊을게요]가 **같은 아이템을 `order()`로 주문**한다(`OfferOption.itemId`). 가격도 도착일도 `data/items.ts`가 갖는다. 이미 가진 경우 결제를 건너뛰고 주간 예약만 다시 건다. 잠긴 활동은 고르기 판에서 **감추지 않고 비활성으로 보여 주며 사유를 글자로 적는다**(ux `empty-nav-state`) — 감추면 회원권의 존재를 알 길이 없어 쇼핑으로 가는 길이 끊긴다
- 쇼핑 카드의 "○○ 활동 해제" 줄은 `activitiesUnlockedBy(itemId)`가 **`requiresItem`에서 뒤집어 찾는다**(아이템 쪽에 활동 id를 또 적지 않는다). `gym-pass`는 `effects`가 빈 유일한 물건이다

### 정규직
- ⚠️ **알바(`data/jobs.ts`)와 구조가 다르다.** 알바는 일용직, 정규직은 **한 번 채용되면 고용이 지속**되므로 `GameState`에 상태가 남는다(`application`·`employment`·`jobNotices`, 셋 다 옵셔널 = 구버전 세이브는 무직으로 읽힌다)
- **수치는 전부 `data/careers.ts`**, **규칙은 전부 `systems/employment.ts`**, **화면은 `apps/sites/FleaSite.tsx`**(벼룩장터, 토큰 `--fl-*`, `render: 'career'`). **서류는 지식·어휘력·창의력, 면접은 매력·평판·친화력**을 본다
- ⚠️ **급여의 단일 출처는 공고(`Career.salary`)다.** 출근 활동(`commute`)은 **돈을 한 푼도 만지지 않는다** — 출근은 하나뿐인데 회사마다 급여가 다르다(알바와 정확히 반대 방향의 같은 원칙). `balance.verify.test.ts`가 지킨다. ⚠️ **급여는 물가 배율(`scalesWithWage`)을 타지 않는다** — 이 한 줄이 "고용이 경제를 무의미하게 만들지 않는다"를 보장한다
- **수치**: 급여 주기 15일(격주) · 급여 170만~460만(공고 5종) · 서류 3일 · 면접 안내 2일 · 면접 기한 3일 · 최종 4일(지원→입사 최소 9일) · 경고 3회 / 해고 6회 · 근무일 월~금. ⚠️ **30일(월급) 주기로 되돌리지 말 것** — 100일 판에서 급여가 두 번뿐이라 리듬이 안 돈다
- ⚠️ **합격 판정에 무작위가 없다.** 탈락은 무엇이 모자랐는지 말해 줘야 하는데(ux `error-clarity`) 주사위를 섞으면 그 설명이 거짓이 된다. 불확실성은 **결과가 나오는 날까지의 지연**이 맡는다(지원한 날 모자라도 결과일까지 채우면 통과 — 플레이어가 개입할 수 있는 유일한 도박). 판정·사유의 단일 출처는 `shortfalls()`
- ⚠️ **`turn.ts`에 정규직이 두 군데 들어가 있고 그건 의도다**(나머지는 전부 `employment.ts`): ①`canRun`의 `requiresJobStage` 게이트 ②`runActivity`의 출근·면접 기록. 실행 통로가 넷이라 그 밖에 두면 하나가 반드시 샌다. ⚠️ **기록은 턴을 넘기기 전에 찍는다**(오후 행동은 날짜를 바꾼다)
- ⚠️ **게이트는 "이미 했는가"가 아니라 "지금 할 수 있는가"를 묻는다**(`'applying'` = `!employment && !application`). `gameStore.applyToCareer`는 **게이트를 먼저 묻고 기록을 만든다**(순서를 뒤집으면 자기가 만든 기록에 자기가 막힌다)
- ⚠️ **`Activity.requiresPick`**: 고른 대상이 있어야 뜻이 성립하는 활동(현재 `job-apply`뿐). **스케줄러 고르기 판(`plannableOf`)과 바탕화면 바로 가기 등록에서 뺀다** — 둘 다 "나중에 실행"이라 그 시점엔 고른 공고가 없고 턴만 먹는다. **`activitiesOf`에서는 빼지 않는다**(그러면 "묶음의 합 = 활동 전체" 불변식이 깨진다)
- **결근의 정의**: 지나간 근무일 중 출근하지 않은 날. **오늘과 입사일은 세지 않는다.** `employment.checkedDay` 커서가 같은 날을 두 번 세는 것을 막는다(스케줄러가 며칠을 한 번에 밀어도 그 사이가 전부 감사된다). **정산 순서가 규칙이다**(`advanceEmployment`): 채용 절차 → 결근 감사 → **급여** → 경고/해고 → **게임오버 확정**. 급여가 해고보다 앞인 것은 "이미 일한 대가는 받는다", 감사가 급여보다 앞인 것은 급여일에 지난 주기 출근부를 버리기 때문이다
- ⚠️ **급여가 우선한다 — 게임오버는 밤이 다 정산된 뒤 딱 한 번 결정된다**(설계자 지시). 생활비는 `turn.ts`의 취침 정산이 먼저 빼고 급여는 `advanceEmployment`가 넣으므로, 그 **중간**에서 판정하면 **월급을 손에 쥔 채 파산**한다. 그래서 `runActivity`/`skipSlot`은 입금이 남은 밤이면 판정을 미루고(`turn.ts`의 **`nightPayoutPending`** = `employment && day >= paydayDay`), 밤의 마지막 지점인 `advanceEmployment`가 **`settleGameOver`**로 결정한다. ⚠️ **`settleGameOver`를 급여보다 앞으로 올리거나 빼지 말 것.** ⚠️ **되살리는 함수가 아니다** — 이미 확정된 사유는 그대로 두고 null인 판만 판단한다(죽었다 살아나는 프레임을 만들지 않는다). ⚠️ **미루기는 재직자에게만 적용된다** — 무직은 그 자리에서 판정되므로 `runActivity`/`skipSlot`만 부르는 밸런스 시뮬레이션이 그대로 성립한다. ⚠️ **의존 방향은 그대로다**(`turn`은 `employment.ts`를 import하지 않고 `GameState.employment`의 날짜 하나만 읽는다 — `canRun`의 `jobStageOpen`과 같은 예외)
- ⚠️ **소식(`JobNotice`)은 세이브에 남는다 — 메시지 규칙의 유일한 예외다**(플레이어가 언제 어디에 지원했는지에 달려 있어 재계산이 불가능하다). 대신 **사실만**(종류·회사·날·사유·금액) 남기고 **문장은 `noticeMail()`이 매번 만든다.** 채널은 `MAILBOX.id`라 **아웃룩과 토스트를 그대로 탄다**(새 알림 창구를 만들지 않는다). ⚠️ 그래서 `TimedMessage`에 **`turn`(정렬 키)**이 있다 — 시각 문자열은 며칠에도 같은 값이라 두 출처를 시간순으로 합칠 수 없다
- 확정 UI는 여전히 `ActivityCommit` 하나이고 지원만 `onCommit`으로 동작을 바꾼다("어느 회사인가"를 함께 넘겨야 해서). ⚠️ **`previewWarnings`의 '지금은 할 수 없습니다'는 사유를 함께 적는다**(`blockReasons` 재사용) — 조건이 스탯·아이템·정규직 상태로 늘면서 "행동력이나 소지금이 부족합니다" 한 문장은 거짓이 됐다

### 직업 엔딩
설계자 지시: **"직업엔딩은 취직한 순간이 아닌 돈 없어서 죽은 후 뜨게 해."**
- ⚠️ **취직은 엔딩이 아니다.** `bigtech`은 스탯 조건(지식 90·멘탈 40)으로 뜨던 성취 엔딩에서 **최상위 직업 엔딩**으로 옮겨졌다. ⚠️ **스탯 조건을 되살리지 말 것**(`ending.test.ts`가 순회로 지킨다). `ACHIEVEMENT_ENDINGS`의 **최상위 티어는 인플루언서(tier 3)**다
- **id `bigtech`은 그대로 물려받았다** — 바꾸면 이미 도감을 해금해 둔 사람의 기록(`metaStore`)이 끊긴다. 제목만 '대기업 합격' → **'대기업 사원'**. 나머지 넷은 `career-<공고id>`
- **데이터는 `data/endings.ts`의 `CAREER_ENDINGS`**(+`careerEnding(careerId)`). `Ending.careerId`가 관계를 갖고 **엔딩 → 공고 방향으로만** 적는다(공고 쪽에 엔딩 id를 또 적으면 한쪽만 고쳐도 테스트가 안 터진다). 공고와 **1:1**이고 `ending.test.ts`가 양방향으로 지킨다. 전부 `isFailure: true`
- ⚠️ **비문에 새기는 것은 "도달한 최고 직장"이지 죽을 때의 직함이 아니다.** 판단은 **`systems/ending.ts`의 `epitaphCareerId` 한 함수**에 모아 뒀다(뒤집으려면 반환값 한 줄만 고친다) — 해고는 이미 파산을 앞당기는데 기록까지 지우면 한 사건에 벌이 두 번이다
- **상태는 `GameState.peakCareerId`**(옵셔널). 올라가는 곳은 **채용되는 한 지점**뿐이다(`employment.ts`의 `recordPeakCareer`). 해고는 `employment`만 지우고 이 값은 건드리지 않는다. 서열은 `data/careers.ts`의 **`careerRank`**(= 배열 순서 = 급여 오름차순)이고 무직·모르는 id는 -1이다. **판정은 `getFailureEnding(reason, state)`** 하나다: 파산이면 경력 엔딩(없으면 `bankrupt`), **번아웃은 경력과 무관하게 `burnout`**. **`state`를 옵셔널로 두지 않는다** — 넘기지 않아도 되게 만들면 언젠가 빠뜨려 그 화면에서만 조용히 직업 엔딩이 안 뜬다
- ⚠️ **세이브 버전이 1 → 2로 올랐다.** zustand의 `migrate`는 **저장 버전이 다를 때만** 불리므로 v1 세이브는 `reviveState`를 지나지 않았다. 보정 내용: `peakCareerId`가 없으면 **재직 중인 회사로 메운다**(해고된 뒤 저장된 옛 세이브는 복원할 흔적이 없어 무직으로 남는다)
- ⚠️ **도달 가능성은 단언이 아니라 시뮬레이션으로 지킨다**(`balance.verify.test.ts`의 `playToward`). 아무도 볼 수 없는 엔딩은 버그이므로 **공고 5종 전부** "실제로 취직 → 결국 파산"을 밟는다. 정책이 `playEmployed`(평범한 플레이)와 다른 것은 의도다 — 핵심은 **지식 60을 먼저 채워 과외를 여는 것**이다

### 은행 (예금 · 대출)
- **수치는 `data/bank.ts`, 규칙은 `systems/bank.ts`, 화면은 `apps/sites/BankSite.tsx`**(`--bk-*`, `render: 'bank'`). 상태는 `GameState.bank`(옵셔널 = 구세이브는 "거래한 적 없음")
- ⚠️ **은행은 활동을 실행하지 않는 유일한 사이트다** — `activityId`가 없고 `ActivityCommit`도 없다. **거래는 턴을 쓰지 않는다**(쇼핑 주문과 같은 규칙). 비용은 슬롯이 아니라 **기회비용·만기·이자**다. `sites.test.ts`가 `activityId` 없음을 지킨다
- ⚠️ **절대 깨면 안 되는 것: `LOAN_RATE > DEPOSIT_RATE > SAVINGS_RATE`.** 뒤집히면 "빌려서 예금하기"가 무위험 차익이 되어 판이 무한해진다. `bank.test.ts`가 **데이터에서 직접 읽어** 부등식을 지킨다 — 이율을 손볼 때 여기서 터진다
- **계좌 둘**: 자유예금(일 0.4%, 언제든 출금) / 정기예금(일 0.9%, `DEPOSIT_TERM_DAYS` 12일 잠금, 최소 10만). ⚠️ **정기예금이 "계획을 보상한다"는 이 시스템의 본체다** — 자유예금만 두면 은행이 플레이를 바꾸지 못한다
- ⚠️ **만기 원리금은 자유예금이 아니라 소지금으로 나온다.** 자유예금으로 넣으면 만기가 와도 은행에 들러 출금하기 전에는 굶어 죽어 "참으면 그날 밤 살아난다"는 약속이 성립하지 않는다
- ⚠️ **정기예금 만기가 `nightPayoutPending`의 두 번째 원천이다**(첫째는 급여). 밤 정산은 생활비를 먼저 빼고 만기금은 그 뒤 `advanceBank`가 넣으므로, 그 중간에서 판정하면 **원리금을 쥔 채 굶어 죽는다**. `turn.ts`는 `bank.ts`를 import하지 않고 `GameState.bank.deposits`의 **날짜 하나**(`matureDay`)만 읽는다(`employment`와 같은 예외)
- **대출 한도는 고용이 정한다**: 무직 30만(`LOAN_LIMIT_BASE`) + 재직 시 급여 × 2(`LOAN_LIMIT_SALARY_MULTIPLE`). ⚠️ **해고되면 한도가 내려가도 빚은 그대로다** — 그것이 해고의 무게다. **자동 상환은 없다**(갚는 시점은 언제나 플레이어의 선택). 갚지 않으면 계속 불어나 파산이 앞당겨진다
- ⚠️ **빚 이자는 소지금을 깎지 않고 빚에 얹힌다** — 이자로 즉사시키면 "빌린 돈으로 오늘을 산다"가 깨진다. 대출이 죽음을 앞당기는 방식은 즉사가 아니라 **갚을 돈이 계속 커지는 것**이다
- `advanceBank(state)` 순서가 규칙: **만기 상환 → 이자 정산 → `settleGameOver`**. `accruedDay` 커서가 같은 날 두 번 정산을 막는다(`Employment.checkedDay`와 같은 장치). `gameStore.afterTurn`이 **`advanceEmployment`보다 먼저** 부른다. ⚠️ **`state.bank`가 없으면 아무것도 하지 않는다**(은행에 안 간 사람의 세이브를 부풀리지 않는다)
- ⚠️ **`reviveBank`의 검증은 다른 옵셔널 필드보다 빡빡하다**(`reviveJob`과 같은 이유 — 돈을 만드는 상태다). 잔액이 NaN이면 이자가 NaN이 되고 만기금이 NaN으로 소지금에 흘러 `NaN <= 0`이 false라 **파산이 영영 안 걸린다.** 숫자 하나라도 못 믿으면 **은행 기록을 통째로 버린다**
- ⚠️ **`balance.verify.test.ts`가 "은행을 최대한 굴려도 결국 파산한다"를 시뮬레이션으로 지킨다**(단언이 아니다). 상한 240일 — 이자를 올리다가 이 선을 넘으면 거기서 터진다. **기존 알바·정규직 시뮬레이션은 약화시키지 않는다**(정규직 때와 같은 원칙)
- 색은 color `Banking/Traditional Finance`(navy #0F172A / #1E3A8A + gold #A16207). ⚠️ **벼룩장터(#2563EB)·알바몬(#0369A1)과 계열을 갈라 둔다** — 파란 사이트가 이미 둘이다. 판형은 style `Financial Dashboard` + `Data-Dense Dashboard`

### 쇼핑 · 택배 · 폴더
- 흐름: **쇼핑에서 주문 → 다음 날 도착 → 토스트 → 아이템 인벤토리 폴더**. 데이터는 `data/items.ts`(`SHOP_ITEMS`)·`data/events.ts`(`EVENTS` — 이벤트 도감), 규칙은 `systems/delivery.ts`(`turn.ts`를 부르지만 반대는 없다 — 스케줄러와 같은 규칙)
- ⚠️ **주문은 턴을 소모하지 않는다**("탐색은 무료"). 대신 **효과는 도착해야 난다** — 결제한 날과 오는 날 사이의 하루가 쇼핑의 비용이다. **같은 물건은 한 번만 산다**. ⚠️ **턴이 넘어간 뒤 처리는 `gameStore`의 `afterTurn` 하나에 모여 있다**(`runPlans` + `collect`) — 호출부마다 적으면 새 통로가 생길 때마다 빠뜨린다. 도착분은 `gameStore.arrivals`(휘발)로 나가고 `ToastHost`가 배송 토스트를 띄운 뒤 비운다. 채널 값은 `'delivery'`(채팅방도 사서함도 아닌 별도 분기)
- **이벤트 도감(`GameState.events`)은 엔딩 도감(`metaStore`)과 다른 것이다** — 엔딩은 판을 넘어 영구, 이벤트는 이번 판의 일이라 세이브에 들어간다. 기록은 `recordEvent(state, id)` 한 줄이고 **처음 겪은 날만 남긴다**. 랜덤 이벤트가 생기면 `EVENTS`에 정의를 늘리고 발생 지점에서 부르기만 하면 된다
- 폴더 UI는 `components/apps/ExplorerApp.tsx` **하나**다(인벤토리·도감 공용, 다른 것은 목록을 만드는 방법뿐). 인벤토리는 **가진 것만**, 도감은 **안 겪은 것도 흐리게** 보여 준다
- ⚠️ 바탕화면 폴더 2개는 `DESKTOP_ITEMS`에서 **폴더 열의 맨 앞**을 차지한다(설계자 요구). **배열 순서가 곧 좌표는 아니다** — 기본 배치는 `DEFAULT_ICON_CELLS`가 갖고 배열 순서는 겹침이 생겼을 때의 우선순위만 정한다

### 시작 메뉴
바탕화면 = **게임 세계의 앱**(메신저·브라우저·메일·일정), 시작 메뉴 = **게임 바깥의 도구**(세이브·작업 관리자·명령 프롬프트·솔리테어). 합치면 "게임하는 곳"과 "관리하는 곳"이 섞인다.
- **저장/불러오기**: 세이브는 원래 자동이다. 버튼이 하는 일은 **문자열을 꺼내고 되돌려 넣는 것**뿐이고 화면에 자동 저장 사실을 먼저 적는다. 불러오기는 **기존 검증기 `reviveState`를 그대로 쓴다**(따로 검사하면 규칙이 갈라져 NaN 스탯이 들어온다)
- **작업 관리자**: 가짜 CPU 그래프 대신 실제 값(열린 창·번아웃 효율·생활비·알바비 배율). **명령 프롬프트**: 동작하는 명령만(`help/date/stats/activities/cls`). ⚠️ **게임 상태를 바꾸는 명령은 없다.** 배너에 "Microsoft Windows"를 쓰지 않는다

### 포털 검색 · 개발자 모드
- 검색은 **같은 사이트의 다른 화면**이다(별도 site로 만들면 주소·이력·즐겨찾기까지 얽힌다). 결과는 `systems/search.ts`가 **게임 안에 실제로 있는 것**만 찾는다(사이트·기사·실시간 검색어) — 가짜 결과는 눌러도 갈 데 없는 링크가 된다. 브라우저 ⋮ 메뉴의 **개발자 모드**는 진짜 개발자 도구를 흉내 내지 않는다(DOM 트리·네트워크 탭은 이 게임에 없는 것이라 만들면 전부 장식이다). 이 가짜 브라우저가 실제로 들고 있는 값만 보여 준다

## 아이콘 (Iconify, 오프라인 전용)
- ⚠️ **UI에 이모지를 쓰지 않는다**(ui-ux-pro-max `no-emoji-icons`) — 플랫폼마다 모양이 달라지고 토큰으로 통제할 수 없다. `fluent-emoji-flat`/`flat-color-icons`/`twemoji`는 **제거됐다. 이모지 세트를 다시 들이지 말 것**
- 세트 4종을 오프라인 패키지로 설치: **`fluent-color`**(다색 아이콘 — 바탕화면 앱·사이트·활동·엔딩), **`mdi`**(단색 — 게임 HUD·메신저 글리프), **`mdi-light`**(단색 라인 — 셸 크롬: 시작 버튼·트레이·시작 메뉴·잠금화면 아바타), **`devicon`**(프로그램 로고). **CDN 금지**
- ⚠️ **아이콘 세트는 시각 언어별로 나뉜다**: 바탕화면 앱·사이트·활동창·엔딩 모달 = **다색**, HUD 안(스탯창·날짜칸)과 메신저 글리프 = **단색 `mdi`**(구 Phosphor `ph`는 제거됨). HUD는 액센트가 하나뿐이라 다색이 들어오면 절제가 무너지고, 단색만이 `currentColor`로 색을 입는다. **`-outline` 변형이 있으면 반드시 그쪽을 쓴다**(꽉 찬 글리프는 13~16px에서 잉크 얼룩이 된다). ⚠️ mdi는 외곽선 변형이 **없는** 이름이 섞여 있어(`brain`·`shimmer`·`run`·`heart-pulse`·`scale-balance`) 완벽히는 못 지킨다 — **섞임을 더 늘리지 말 것.** **스탯창 안은 한 세트로 통일한다**
  - **잠금화면 아바타는 `mdi-light:account`다**(셸 크롬 규칙 + 단색이라 CSS로 흰색을 입힌다). 데이터 출처도 둘로 나뉜다: 스탯은 `STAT_META[key].icon`(다색) / `.hudIcon`(단색), UI 골격은 `UI_ICONS`(다색) / **`HUD_ICONS`**(단색, `sectionOrnament` 포함) — 같은 개념이 두 벌인 것은 의도다. `STAT_META.accent`는 **제거됐다**(게이지는 단일 액센트 하나, 구분은 글리프+한국어 라벨)
- 아이콘은 **Iconify 아이콘을 문자열 이름으로 참조**한다(`"세트:이름"`, 예: `"fluent-color:book-24"`). `Activity.icon`/`Ending.icon`/`OpenWindow.icon`/`Window` prop의 타입은 `IconName`(= string, `src/types/game.ts`)이다. 렌더는 `src/icons/AppIcon.tsx`의 `<AppIcon name size className style />`만 쓴다(컴포넌트가 `@iconify/react`를 직접 import하지 않는다). `@iconify/react/offline` 엔트리를 써서 이름을 못 찾아도 네트워크로 나가지 않는다. `src/icons/bootstrap.ts`가 `main.tsx`에서 App보다 먼저 import되어 `addCollection()`한다
- ⚠️ `@iconify-json/*`의 icons.json을 통째로 import하면 번들이 **20MB**가 된다(JSON은 트리셰이킹 안 됨). `scripts/build-icon-subset.mjs`가 `src/`를 스캔해 쓰는 것만 `src/icons/generated.ts`로 추출한다(현재 31개, 251KB). **`generated.ts`는 직접 수정 금지, 커밋 대상**
- 아이콘 이름을 추가·변경하면 `npm run icons`(`build`/`dev`가 자동 선행하고 **존재하지 않는 이름이면 빌드가 실패한다**). 아이콘 이름은 데이터다: 스탯은 `src/data/statMeta.ts`의 `STAT_META`, UI 골격은 `src/data/icons.ts`의 `UI_ICONS`/`HUD_ICONS`가 단일 출처. 한 컴포넌트 안에서만 쓰는 일회성 장식만 예외(예: `ExeApp.tsx`의 `WARN_ICON`)
- **다색 플랫 아이콘에는 CSS `color`를 절대 입히지 않는다**(원래 색을 망치거나 아무 효과도 없다). 색을 입혀야 하는 자리에는 단색 세트를 쓴다 — HUD CSS는 `.stat-icon`/`.hud-head-icon`/`.hud-section-mark`에 액센트 색을 건다

## 기술 스택 (실제 설치·빌드 검증 완료)
- React 19.2 / Vite 8.2 / TypeScript 7.0 / Zustand 5.0 / Vitest 4.1 / @iconify/react 6. 환경: Windows 11, Node v24.18.0, npm 8.19.1
- 명령: `npm run dev` · `npm run build`(icons && tsc -b && vite build) · `npm test`(vitest run) · `npm run icons`
- ⚠️ TS7의 `noUncheckedSideEffectImports` 때문에 CSS import에 `src/vite-env.d.ts` 필수
- ⚠️ `create-vite` v9는 비대화형 환경에서 취소된다 → 설정 파일은 수동 구성돼 있다

## 파일 맵
- 진입: `index.html` → `src/main.tsx` → `src/App.tsx` (`loggedIn && state`로 잠금화면/바탕화면 분기)
- 타입: `src/types/game.ts` — Stats, Activity, GameState 등 도메인 타입 전부
- 데이터(수치): `src/data/` — **videos**(`VIDEOS`·`SHORTS`·`CHANNELS` — 썸네일은 그라데이션+글자), **items**(`SHOP_ITEMS`·`fakeSize`), **events**(`EVENTS`), activities(활동 **21종** + `ACTIVITY_CATEGORIES` + `WORK_ACTIVITIES`(`burnoutKey === 'work'`에서 파생 — 목록을 따로 적으면 한쪽만 고친다) + `activitiesOf`/`activitiesUnlockedBy`, `onDesktop`은 현재 전부 false), **jobs**(`JOBS`·`jobsOf`·`findJob` — 알바몬 공고 8개. **수치가 없다**: `activityId`로 가리키기만 한다), **bank**(이율·한도·만기 상수. ⚠️ ), **bank**(이율·한도·만기 상수. ⚠️ `LOAN_RATE > DEPOSIT_RATE > SAVINGS_RATE`), **careers**(`CAREERS`·`findCareer`·**`careerRank`**·채용 일정/급여 주기/결근 상수 — 정규직 공고 5개. ⚠️ 알바와 반대로 **급여를 여기가 갖는다**), **startMenu**(`START_MENU_ITEMS`), **messages**(`CHAT_APPS`·`THREADS`·`MAILBOX`·`MESSAGE_SCHEDULE`), **banners**(`BANNERS`), desktopItems(`DESKTOP_ITEMS` — 바탕화면 아이콘 단일 출처 + `desktopEntries`), **desktopIcons**(`DEFAULT_ICON_CELLS`·`DESKTOP_ICON_ORDER` — 기본 격자 배치), **sites**(`SITES`·`BOOKMARK_SITES`·`HOME_SITE_ID`·`findSite`·`resolveUrl`), **media**(`BOOKS`·`FILMS`·`WRITING_PROMPTS`·`MAIN_FILM_ID`·`findShowtime`. ⚠️ `Film.section`이 `now`/`soon`/`arte`를 가르고 **`soon`만 회차가 없다**. 포스터도 그라데이션이다), **news**(`NEWS_POOL`·`NEWS_VISIBLE_COUNT`·`TRENDING_TERMS`), **autoAdvance**(자동 진행 수치), layers(`LAYERS`), shell(`SHELL` + **`DESKTOP_GRID`**), calendar(날짜 환산·날짜칸 배치), economy(물가 구간 6단계), endings(**11종** — `ACHIEVEMENT_ENDINGS` 4 + **`CAREER_ENDINGS` 5**(`careerEnding(careerId)`) + `FAILURE_ENDINGS` 2), statMeta(`icon`(다색)·`hudIcon`(단색) + 표시 순서), icons(`UI_ICONS`/`HUD_ICONS`/`BROWSER_ICONS`)
- 아이콘: `src/icons/` — AppIcon · bootstrap · generated.ts(자동 생성, 수정 금지). 생성기는 `scripts/build-icon-subset.mjs`
- 로직(순수함수): `src/systems/` — turn(활동 실행·슬롯 전환·취침 정산·게임오버 + **`nightPayoutPending`**(급여 + **정기예금 만기** 둘을 본다)·**`settleGameOver`**), economy(생활비·알바비), burnout(연속 페널티 + **`burnoutKeyOf`** — 이력에 넣는 키와 세는 키를 한 함수로 묶는다. ⚠️ 키가 갈라지면 페널티가 조용히 0이 된다), ending(티어 판정 + `getFailureEnding(reason, state)`·**`epitaphCareerId`**), **news**, **browserHistory**, **messages**, **search**, **schedule**, **employment**(정규직 + **`recordPeakCareer`**. `turn.ts`를 부르지만 반대는 없다), **desktopGrid**, **shortcuts**(`shortcutIdOf`·`firstFreeCell`·`placeShortcuts`), **contextMenu**(`clampMenuPosition`), **autoAdvance**(`STOP_RULES`·`findStop`·진행 기록), **bank**(예금·대출 + ****·****. 를 부르지만 반대는 없다), **bank**(예금·대출 + **`bankNightCredit`**·**`advanceBank`**. `turn.ts`를 부르지만 반대는 없다), **delivery**(⚠️ `owns`/`inventoryOf`는 **turn.ts로 옮겨졌고 여기서 재수출**한다 — `canRun`이 보유를 봐야 해서 두면 순환이 된다). 각각 `.test.ts` 동반 + `balance.verify.test.ts` + `data/activities.test.ts`. 총 **449개** 테스트
- 상태: `src/store/` — **shortcutStore**(바로 가기 목록·영구), gameStore(세이브+loggedIn, **persist version 2**), metaStore(도감·영구), windowStore(창 목록 + 최소화/최대화·휘발), desktopPanelStore(패널 z·휘발), **desktopIconStore**(아이콘 격자 위치·영구, 옮긴 것만), **browserStore**(즐겨찾기 + 개발자 모드·영구), **toastStore**(휘발)
- UI: `src/components/`(**PanelOrnament** / **ContextMenu**), `window/`(Window·WindowManager), `desktop/`(Desktop·HudPanel·StatPanel·CalendarPanel·Taskbar·StartMenu·ToastHost), `lockscreen/`, `apps/`(ExeApp·StubApp·EndingModal·BrowserApp·ChatApp·MailApp·SystemApps·SchedulerApp·ExplorerApp·**AutoLogApp**·**ActivityConfirm**), `apps/sites/`(NeverPortal·ShopSite·ConstructionSite·**ActivityCommit**·LibrarySite(미디북스)·CinemaSite(시집이)·PublishSite(아점)·AlbamonSite·FleaSite·**BankSite**), `apps/activityPreview.ts`(`previewActivity` + **`previewWarnings`** + **`blockReasons`** — 확정 화면 셋이 공유)
- 설정: `vite.config.ts`, `tsconfig.json`(+`.app`/`.node`), 전역 CSS `src/index.css`(**디자인 토큰 `:root` 단일 출처**)
- 미구현(별도 계획 필요): 사이트 **내용**(슬로우캠퍼스·트위터), **솔리테어**(`kind: 'solitaire'`만 예약됨), 엔딩 도감 UI, **랜덤 이벤트**(정의는 `data/events.ts`에 있고 발생 지점만 없다), 휴지통

## 코딩 컨벤션
- 모든 게임 수치(스탯 변화량, 엔딩 조건, 활동 정의)는 컴포넌트에 하드코딩하지 않고 `src/data/`로 분리. 주석·UI 텍스트는 한국어
- 창 UI는 공용 `Window` 위에 구현한다(**OS 창으로 읽혀야 하는 것 전부**). **예외는 HUD 패널 하나뿐이며 `HudPanel`을 쓴다**
- 스탯 키는 전 코드에서 통일: `stamina`·`maxStamina`·`mental`·`money`·`knowledge`·`charm`·`sensitivity`·`reputation`·`morality`·`creativity`·`sociability`·`vocabulary`·`athletics`·`gaming` (구 `intelligence`는 `knowledge`로 개명됨). 스탯 **한국어 라벨은 `src/types/game.ts`의 `STAT_NAMES`만 참조**한다 — 컴포넌트에 라벨을 다시 적지 않는다
- `src/systems/`는 React import 금지, 상태 mutation 금지 — 새 객체를 반환한다
- 창은 `windowStore.open()`으로 열고 종류는 `OpenWindow.kind`로 구분한다. 스토어에 등록하지 않는 창은 `Window`에 `onMove` 콜백을 넘겨 위치를 직접 관리한다(스토어의 `move`는 등록된 창만 갱신한다). `onClose`를 넘기지 않으면 닫기 버튼이 사라진다(상시 표시 창용)

## 검증 도구 (CDP 스크린샷·대비 실측)
반투명 표면 위 글자 색은 **계산이 아니라 합성 픽셀**로만 판정한다. 헤드리스 크롬을 CDP로 몰아 잠금화면 로그인까지 진행한 뒤 캡처하고, 그 PNG를 페이지 안 canvas로 되돌려 요소별 대비를 잰다. **의존성 0** — Node 24 내장 `WebSocket` + `fetch`만 쓴다(**`ws`·puppeteer 설치 금지**). 스크립트는 스크래치패드에 두고 **커밋하지 않는다**(`shot.mjs`/`contrast.mjs`). 크롬 경로 `C:/Program Files/Google/Chrome/Application/chrome.exe`. React 제어 input에 값을 넣을 때는 `HTMLInputElement.prototype.value` 네이티브 setter로 쓰고 `input` 이벤트를 직접 발사해야 한다.
