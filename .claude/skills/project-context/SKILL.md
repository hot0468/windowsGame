---
name: project-context
description: 이 육성 게임 프로젝트의 압축 컨텍스트 — 확정된 게임 설계 결정, 기술 스택, 파일 맵, 코딩 컨벤션. 게임 기능의 구현/수정/설계/디버깅 등 코드를 만지는 모든 작업 전에 반드시 이 스킬을 로드할 것. 코드베이스 탐색 대신 이 문서를 읽는 것이 토큰 절약의 핵심이다. 설계 결정이 바뀌거나 새 파일/패턴이 생기면 이 문서를 즉시 갱신할 것.
---

# 프로젝트 컨텍스트 (단일 진실 공급원)

이 문서가 코드베이스 탐색을 대체한다. 여기 없는 정보만 파일을 직접 읽어라.
**갱신 의무:** 설계 결정 변경·새 파일·새 패턴 발생 시 이 문서를 같은 커밋 단위로 갱신한다.

## 게임 컨셉
- 웹브라우저용 육성 게임. UI 전체가 가짜 윈도우 OS다: 잠금화면 → user명 입력 → 바탕화면(게임 메인)
- 입력한 user명 = 플레이어 캐릭터 이름. "나 자신"을 육성 (프린세스 메이커 스타일)
- 우상단에 스탯창 상시 표시

## 확정된 설계 결정
| 항목 | 결정 |
|---|---|
| 시간 구조 | 턴제, 일 단위. 1일 = 오전/오후 2슬롯. 밤은 자동 취침(체력 회복+정산) |
| 게임 길이 | 제한 없음. 물가 상승으로 후반 생존이 불가능해져 자연 종결 (약 88~101일이 한계) |
| 스탯 | 12종. 소모 자원: `stamina`/`maxStamina`, `mental`(0~100), `money`. 성장 스탯 9종(상한 999): `knowledge`, `charm`, `sensitivity`, `reputation`, `morality`, `creativity`, `sociability`, `vocabulary`, `athletics` |
| 엔딩 | 멀티 엔딩 6종(대기업 합격/인플루언서/철인/현실주의자/번아웃/평범). 스탯 조합 판정 |
| 엔딩 공개 | 비공개. 엔딩 도감에 한 번 본 엔딩만 해금 |
| 활동 선택 | (전환 중) 바탕화면에는 메신저 + 인터넷(NEVER 포털 동작)만 노출. 활동 5종 정의는 `data/activities.ts`에 보존, 추후 브라우저 사이트(알바몬 등)에서 선택하게 할 예정 |
| 행동 비용 | **탐색 무료**, 확정 행동만 1턴 소모 |
| 날짜 제한 | **없음.** 대신 ①매일 생활비 차감(0→파산) ②10일 주기 물가 인상(뉴스 예고) ③번아웃 누적 |
| 알바비 | 물가보다 느리게 인상 → 고소득 알바 전환 압박 = 스탯 투자 이유 |
| 엔딩 도달 | 성취 엔딩은 [엔딩 보기]/[계속하기] 선택, 어느 쪽이든 도감 즉시 해금. 파산·번아웃은 강제 종료 |
| 체력 | `stamina`(일일 소모/취침 회복) / `maxStamina`(운동으로 영구 상승, 철인 엔딩 판정) 분리 |

**전체 설계 문서:** `docs/superpowers/specs/2026-08-03-windows-desktop-life-sim-design.md`
**구현 계획:** `docs/superpowers/plans/2026-08-03-playable-core.md` (Task 1~12 완료 = 완주 가능 코어)

## 구현 중 확정된 추가 결정
- 로그인 상태(`loggedIn`)는 세이브 존재 여부와 분리한다. 세이브만으로 화면을 분기하면 세이브가 있을 때 잠금화면에 도달할 수 없어 "이어하기"를 누를 수 없다. `loggedIn`은 `partialize`로 저장에서 제외 → 새로고침 시 항상 잠금화면부터 시작
- 아이콘은 **Iconify 플랫 컬러 아이콘을 문자열 이름으로 참조**한다(`"세트:이름"`, 예: `"fluent-emoji-flat:books"`). `Activity.icon`/`Ending.icon`/`OpenWindow.icon`/`Window` prop의 타입은 `IconName`(= string, `src/types/game.ts`). 이모지 문자열 금지. 자세한 규칙은 아래 "아이콘" 절 참조
- 스탯 한국어 라벨은 `src/types/game.ts`의 `STAT_NAMES`만 참조한다. 컴포넌트에 라벨을 다시 적지 않는다
- **바탕화면 항목 ≠ 활동.** 바탕화면 아이콘은 `src/data/desktopItems.ts`의 `DESKTOP_ITEMS`(타입 `DesktopItem`)가 단일 출처다. 활동 기반 항목은 `Activity.onDesktop` 플래그에서 자동 파생되고(id 하드코딩 필터 금지), 브라우저처럼 **스탯도 턴도 건드리지 않는 항목은 활동으로 위장시키지 않는다** — 가짜 활동을 만들면 번아웃 이력·엔딩 판정·밸런스 테스트에 없는 id가 섞인다. 폴더·휴지통도 여기에 추가한다. (구 `DESKTOP_ACTIVITIES`는 제거됨)
- 창 종류는 `WindowKind`(`'exe' | 'ending' | 'stub'`). `'stub'`은 미구현 앱의 "준비 중" 안내 창(`StubApp`)이며 `OpenWindow.message`를 함께 쓴다. 새 앱은 stub으로 먼저 올리고 구현되면 kind만 바꾼다
- 상한은 `src/systems/turn.ts`의 명명 상수: `MAX_STAMINA_CAP`(200) / `MENTAL_CAP`(100) / `GROWTH_STAT_CAP`(999). `clampStats`는 `GROWTH_STAT_KEYS`를 순회하므로 성장 스탯 추가 시 `types/game.ts`만 고치면 된다
- 엔딩 조건 수치는 `balance.verify.test.ts`가 지킨다. 스탯 상한이 올라도 도달 기준은 그대로 둔다
- **z-order는 `src/data/layers.ts`의 `LAYERS` 상수가 단일 출처다.** 숫자를 컴포넌트에 흩뿌리지 않는다. 순서: `DESKTOP_ICON`(10) < `DESKTOP_PANEL`(100) < `WINDOW_BASE`(1000, windowStore.topZ 시작값) < `DESKTOP_PANEL_RAISED`(8000) < `TASKBAR`(9000) < `ENDING`(9500). CSS는 상수를 참조할 수 없어 Desktop.css/EndingModal.css에 같은 값을 주석과 함께 중복해 두었다 — **바꿀 때 반드시 양쪽을 함께 고친다**
- **스탯창·날짜칸은 바탕화면 요소다 → 일반 창에 가려지는 것이 정상이다.** (설계자 명시 요구) 되찾는 수단은 작업 표시줄 시계 왼쪽의 패널 버튼이며, `src/store/desktopPanelStore.ts`가 패널별 z를 들고 `raise(id)`로 `DESKTOP_PANEL_RAISED` 위로 올린다. `windowStore.focus()`는 `windows` 배열만 갱신하므로 등록되지 않은 이 패널들에는 듣지 않는다
- `Window`의 `onActivate` prop: 스토어에 등록되지 않은 창은 이 콜백으로 자체 z를 올린다. 넘기지 않으면 기존대로 `windowStore.focus(id)`를 부른다. (등록 안 된 창이 `focus`를 부르면 아무것도 갱신하지 못한 채 `topZ`만 소모시킨다)
- 날짜/슬롯 표기와 날짜칸 배치 수치는 `src/data/calendar.ts`(`formatGameDate`, `CALENDAR_PANEL_LAYOUT`)가 단일 출처다. 작업 표시줄 시계와 날짜칸이 같은 함수를 쓴다
- 건너뛰기 버튼은 **작업 표시줄이 아니라 날짜칸**에 있다. 라벨은 "오전/오후 건너뛰기" — `doSkip()`은 하루가 아니라 **한 슬롯**만 넘기므로 라벨도 슬롯 단위여야 한다. 실제 윈도우처럼 작업 표시줄에는 시계와 패널 버튼만 둔다
- **창 상태(최소화·최대화)는 `windowStore`의 런타임 상태다.** `OpenWindow.maximized`/`minimized`는 필수 불리언이고, `restore: {x, y, width}`가 최대화 직전 좌표를 들고 있다(복원이 0,0으로 튀는 것을 막는 유일한 근거). 액션은 `minimize(id)` / `toggleMaximize(id)` / `activate(id)`. `toggleMaximize`는 최대화 시 현재 좌표를 `restore`에 저장하고, 복원 시 `...w.restore`를 펼쳐 되돌린다
- **`DesktopItem.openMaximized`는 "열릴 때의 초기 상태"일 뿐이다**(구 `maximized`에서 개명 — 정적 플래그로 오해되어 인터넷 창이 복원 불가였다). 컴포넌트에서 id로 분기하지 않고 데이터에서 켠다(현재 `browser`만 true). 이 항목의 `width`는 **복원 시 폭**이 되므로 반드시 의미 있는 값을 둔다. `Desktop.tsx`는 최대화로 열리는 창에도 일반 좌표(`120+i*28`)를 넘긴다 — 최대화 중엔 무시되지만 복원 좌표가 되므로 0,0을 주면 안 된다
- **최소화된 창은 렌더링하지 않되 목록에서 지우지 않는다.** `WindowManager`가 `.filter(w => !w.minimized)`로 거르고, 작업 표시줄 항목은 남아 복원 수단이 된다. 작업 표시줄 항목 클릭은 `focus`가 아니라 **`activate`**를 부른다(최소화면 복원+앞으로, 아니면 앞으로만 — 실제 윈도우 동작)
- **전체 화면 창은** `Window`가 x/y/width를 무시하고 `left:0, top:0, width=innerWidth, height=innerHeight-SHELL.TASKBAR_HEIGHT`로 그리며, **타이틀 바에 드래그 핸들러를 아예 붙이지 않는다**(포인터 캡처가 안 걸려 캡션 버튼도 그대로 동작하고, 클램핑 로직에 노출되지도 않는다). `.win-max` 클래스가 grab 커서를 없애고 `.win-body`의 `max-height: 60vh` 상한을 풀어 남은 높이를 채운다. 뷰포트 리사이즈 구독(`resize`)은 maximized 창에서만 건다
- **셸 골격 치수는 `src/data/shell.ts`의 `SHELL` 상수가 단일 출처다**(`TASKBAR_HEIGHT` 44, `TITLE_BAR_HEIGHT` 40). layers.ts와 같은 이유로 숫자를 흩뿌리지 않는다. CSS는 TS 상수를 못 읽으므로 `Desktop.css`(`.taskbar` height, `.desktop-icons` height)에 44px가 주석과 함께 중복돼 있다 — **바꿀 때 반드시 양쪽을 함께 고친다**
- ⚠️ **캡션 버튼 포인터 캡처 회귀 (두 번 터진 버그).** 캡션 버튼 3종은 타이틀 바 안에 있고, 타이틀 바 `pointerdown`이 `setPointerCapture`를 걸면 `pointerup`이 버튼에 닿지 않아 **클릭이 성립하지 않는다**. `Window.tsx`의 `handlePointerDown`은 `.win-caption-btn`(세 버튼 공통 클래스) 하나로 걸러낸다 — **개별 클래스(`.win-close` 등)를 나열하지 말 것.** 나열하면 버튼을 추가할 때마다 같은 버그가 재발한다. 캡션 버튼을 새로 추가하면 반드시 `win-caption-btn` 클래스를 함께 붙인다
- **캡션 버튼은 아이콘이 아니라 CSS 도형이다**(`.win-glyph-*`, `currentColor` 기반). 윈도우 11 캡션 글리프는 가는 단색 선이라 다색 플랫 아이콘과 성격이 다르고, 닫기 hover 시 흰색으로 덧칠해야 하는데 다색 아이콘은 색을 바꿀 수 없다. 그래서 `UI_ICONS.windowClose`는 제거됐다
- **`Window`의 캡션 버튼은 콜백 유무로 켜진다:** `onClose`/`onMinimize`/`onToggleMaximize`를 넘긴 것만 그려진다. 스탯창·날짜칸은 셋 다 넘기지 않아 버튼이 하나도 없다 — 이 패널들은 windowStore에 없어 작업 표시줄에서 되돌릴 수단이 없으므로 최소화되면 영영 사라진다
- **윈도우 11 시각 언어(맥스러움 제거):** 타이틀 바는 그라데이션 없는 플랫 단색(`#f3f3f3`)에 `font-weight: 400`, 높이는 `SHELL.TITLE_BAR_HEIGHT`(40px)로 고정(캡션 버튼이 꽉 채우려면 필요). 캡션 버튼은 `radius 0` · 폭 46px · 우상단 모서리 밀착(타이틀 바 오른쪽 패딩 0). hover는 최소화·최대화가 `#e5e5e5`, **닫기만 `#e81123` + 흰 글리프**. 창 배경 `#f9f9f9`, 테두리 `#e5e5e5`, 그림자는 은은한 2단(`0 2px 4px/.1` + `0 8px 20px/.14`). 작업 표시줄은 밝은 아크릴(`rgba(243,243,243,.85)` + blur)
- **작업 표시줄 정렬:** 시작 버튼+창 목록만 가운데, 패널 버튼·시계는 우측 트레이에 고정(윈도우도 트레이는 우측이다). 좌측 `.taskbar-spacer`가 `.taskbar-tray`와 같은 `flex: 1 1 0`을 차지해 가운데 묶음을 광학적 중심에 맞춘다 — 스페이서를 지우면 묶음이 왼쪽으로 밀린다
- ⚠️ **HUD 패널은 `Window` 크롬 예외다** (2026-08-03 변경). 스탯창·날짜칸은 더 이상 공용 `Window`를 쓰지 않고 `src/components/desktop/HudPanel.tsx`(+`HudPanel.css`)라는 전용 컨테이너를 쓴다. **사유:** 설계자 요구가 "이 둘은 OS 창이 아니라 게임 오버레이로 읽혀야 한다"인데, 윈도우 11 크롬(밝은 타이틀 바 `#f3f3f3` + 캡션 버튼 자리)을 유지한 채로는 그 인상을 만들 수 없다.
- ⚠️ **HUD 시각 언어 = AAA 다크 판타지 RPG 상태창** (2026-08-03 리스타일). 예전의 "다크 글래스 + 네온 파랑(#4cc2ff) + 게이지 글로우"는 촌스럽다는 지적을 받아 폐기했다. 현재 규칙:
  - **액센트는 샴페인 골드(`--hud-gold` #c9a96a) 하나뿐이다.** 네온·`box-shadow` 글로우·스탯별 색 전부 금지. 우아함은 효과가 아니라 타이포그래피·간격·절제에서 나온다. 게이지 선단의 "빛"도 그림자가 아니라 그라데이션 끝을 `--hud-gold-hi`로 밝혀 만든다
  - **이중 언어 구역 라벨이 시그니처다:** `HudPanel.tsx`가 내보내는 `<HudSection label="능력치" en="Attributes" />` = ✳ 글리프(골드) + 한국어(아이보리) + 바랜 영문(세리프). 마크업을 컴포넌트 밖에 다시 적지 않는다
  - **세리프(`--hud-serif`)는 ASCII 영문 부제 전용이다.** 한글에 걸면 폴백이 고딕이라 "폰트 로딩 실패"로 보이고, 숫자에 걸면 Georgia의 올드스타일 figure가 tabular 정렬을 깬다. 숫자·한글은 Segoe UI + `tabular-nums`. **네트워크 폰트 로딩 금지**(오프라인 요구)
  - **상자 금지.** 성장 스탯 9종은 테두리·배경 없는 2열 그리드다(구 3열 칩 그리드는 "칸막이 서랍"으로 읽혔다). 구분은 간격과 금색 헤어라인(`--hud-rule`)이 한다
  - **숫자가 주인공이다.** 값은 라벨보다 크게(`--fs-lg`/`--fs-base`), 우측 정렬, `font-variant-numeric: tabular-nums`. 단위("원")는 작고 흐리게 떨어뜨린다
  - 실측(1280×900, 헤드리스 크롬 픽셀): 텍스트 48개 최저 **6.66:1**, 골드 글리프 8.0:1, 포커스 링 `--hud-gold-hi` 11.0:1. 패널 크기 스탯창 280×499 / 날짜칸 200×241
  - **바뀐 것은 외형뿐이다.** 고정 위치(드래그 핸들러 미부착) · 캡션 버튼 없음 · `windowStore` 미등록 · `desktopPanelStore.raise()`로만 앞으로 오는 규칙은 전부 그대로다. z-order도 그대로(`DESKTOP_PANEL` 100 → `raise` 시 `DESKTOP_PANEL_RAISED` 8000+)
  - **DOM 셀렉터가 바뀌었다:** 이제 `.win`은 **열린 일반 창만** 고른다(패널이 더는 걸리지 않는다). HUD 패널은 `.hud`, 제목은 `.hud-head-title`이다. 예전처럼 타이틀 텍스트로 구분할 필요가 없다
  - `Window`의 `fixed` prop과 `.win-fixed` CSS는 남아 있으나 현재 사용처가 없다(앞으로 생길 고정 창용)
- **디자인 토큰은 `src/index.css`의 `:root`가 단일 출처다** (2026-08-03 신설). 간격 `--sp-1..8`(4/8 리듬), 타입 `--fs-xs..3xl`(11/12/13/14/16/18/24/32), 모서리 `--r-sm..xl`, 고도 `--el-1/2/3`(3단만), OS 색 `--os-*`(윈도우 11 라이트), HUD 색 `--hud-*`(다크 판타지 + 샴페인 골드 단일 액센트). **컴포넌트 CSS에 생 hex나 임의 px을 새로 적지 않는다** — 그림자를 컴포넌트마다 새로 쓰면 고도 척도가 무너진다(ui-ux-pro-max `elevation-consistent`).
  - 두 시각 언어를 **섞지 않는 것**이 "게임이 OS 위에 얹혀 있다"는 인상의 근거다: OS 크롬(창·작업표시줄·바탕화면·잠금화면·엔딩 모달)은 `--os-*`, HUD 패널 내부는 `--hud-*`만 쓴다
  - HUD는 어두워서 `:focus-visible`의 기본 링(`--os-accent` #0067c0)이 묻힌다 → `index.css`에 `.hud :focus-visible { outline-color: var(--hud-gold-hi) }`가 있다
  - ⚠️ **반투명 표면의 색은 토큰이 아니라 합성 결과가 정한다.** HUD 배경을 `rgba(…, 0.86)`으로 두었더니 파란 벽지가 비쳐 합성 픽셀이 `rgb(19,23,27)` — "온기 도는 근검정"이 아니라 차가운 회색으로 읽혔다. 0.94 + 웜 베이스(`#14110c`)로 올려 `rgb(22,22,21)`을 얻었다. 색을 눈으로 판단하지 말고 스크린샷 픽셀을 읽어라
  - 대비는 실측으로 검증했다(헤드리스 크롬 스크린샷 픽셀). 반투명 표면 위 글자는 **계산이 아니라 픽셀을 읽어야** 한다 — 잠금화면 플레이스홀더가 눈으로는 멀쩡한데 3.97:1이었다(입력창 배경을 어두운 틴트로 바꿔 해결)
- ⚠️ **브라우저는 사이트 컨테이너다** (2026-08-03 신설). `src/data/sites.ts`의 `SITES`가 사이트 단일 출처이고(id·가짜 URL·제목·아이콘·`render`·안내 문구·`bookmark` 플래그), `BrowserApp`은 **`site.render`로만 분기한다**(`'portal'` | `'construction'`). 사이트 id로 분기하는 순간 "데이터 한 줄 + 컴포넌트 하나"로 사이트를 늘리는 구조가 무너진다. 새 사이트 추가 = SITES에 항목 하나 + (새 종류라면) `render` 값 하나와 컴포넌트 하나
  - 즐겨찾기 줄은 `BOOKMARK_SITES`(= `bookmark: true` 필터)가 만든다 — 컴포넌트가 id를 나열하지 않는다. 알바몬·쇼핑·SNS·강의·은행 5종은 아직 내용이 없어 공용 `ConstructionSite` 한 컴포넌트를 공유한다(은행은 설계상 1차 제외라 그 사실을 문구로 밝힌다)
  - 뒤로/앞으로 이력은 **`BrowserApp`의 로컬 `useState`**다. 스토어에 올리지 않는 이유: 창 하나의 휘발 상태라 볼 다른 컴포넌트가 없고, 스토어에 두면 창 id별로 나눠 담고 닫을 때 지우는 코드가 새로 필요하다. 다만 인덱스 계산은 off-by-one이 나기 쉬워 순수 함수 `src/systems/browserHistory.ts`로 분리해 테스트한다(`navigate`는 앞으로 이력을 자르고, 같은 사이트 재클릭은 이력을 늘리지 않는다)
  - 새로 고침은 페이지 컨테이너의 `key`를 바꿔 다시 마운트시킨다(사이트의 로컬 상태 초기화 = 새로고침)
  - 주소창은 **표시 전용**이다(읽기 전용 input). 자유 입력 검색은 설계 문서 6장의 1차 제외 항목이라 검색창도 장식이며 항상 "검색 결과가 없습니다"로 끝난다. 실시간 검색어는 `siteId`가 있으면 이동, 없으면 같은 안내로 끝난다
  - **탐색은 무료라는 규칙을 코드로 지킨다:** 브라우저와 하위 사이트는 `gameStore`를 **읽기만** 한다(현재 `state.day` 하나). 액션 호출 금지 — 여기서 스탯을 건드리면 게임의 핵심 규칙이 깨진다
- **뉴스 영역이 게임의 알림 창구다**(설계 문서 3.4). 정적 기사·광고 풀과 실검은 `src/data/news.ts`, 오늘 띄울 목록은 순수 선택자 `src/systems/news.ts`의 `selectNews({ day })`가 만든다. 첫 항목은 항상 `getNextTier(day)`에서 파생된 물가 인상 예고(스탯창과 같은 함수를 본다)이고, 나머지는 **날짜를 오프셋 삼아 풀을 회전**시킨다. `Math.random` 금지 — systems는 결정적이어야 하고, 무료로 다시 굴릴 수 있는 무작위는 정보가 아니라 소음이다
- **`--nv-*`는 세 번째 시각 언어다**(`index.css`). OS 크롬(`--os-*`) / HUD(`--hud-*`) / **브라우저 안의 웹페이지(`--nv-*`)**. 브라우저 크롬은 창의 일부이므로 `--os-*`, 그 안의 사이트는 `--nv-*`만 쓴다 — 섞으면 "브라우저가 사이트를 담고 있다"는 인상이 사라진다. `--nv-green-bright`(#03c75a, 2.25:1)는 **장식 전용**이고 텍스트에는 `--nv-green`(#0b7a3b, 5.4:1)을 쓴다
- 브라우저 창만 `.win-body`의 본문 패딩을 걷어낸다: `BrowserApp.css`의 `.win-body:has(> .browser) { padding: 0 }`. 크롬이 창 가장자리에 붙어야 하는데 `Window.tsx`에 prop을 늘리지 않기 위한 선택이다
- 브라우저 도구 모음 글리프(뒤로·앞으로·새로 고침)도 캡션 버튼과 같은 이유로 **CSS 도형**이다 — 가는 단색 선이라 다색 플랫 아이콘과 성격이 다르고 disabled에서 `currentColor`로 함께 흐려져야 한다
- 활동 창은 오후 슬롯일 때 생활비 차감을 경고한다. 오후 행동은 하루를 끝내며 `sleep()`이 생활비를 빼가는데, 이를 안 보여주면 "+42,780원" 표시 후 실제로는 적자가 되어 플레이어를 오도함

## 아이콘 (Iconify, 오프라인 전용)
- 세트 4종을 오프라인 패키지로 설치: `@iconify-json/fluent-emoji-flat`(기본 — 윈도우 데스크톱 컨셉과 맞음), `@iconify-json/flat-color-icons`(작은 UI 컨트롤), `@iconify-json/twemoji`, **`@iconify-json/ph`(Phosphor — HUD 전용 단색)**. **CDN 금지**
- ⚠️ **아이콘 세트는 시각 언어별로 나뉜다** (2026-08-03 변경). **OS 크롬·바탕화면·잠금화면·활동창·엔딩 모달 = 다색 플랫**(fluent-emoji-flat / flat-color-icons). **게임 HUD 안(스탯창·날짜칸) = 단색 Phosphor `ph:*-fill`**. HUD는 액센트가 샴페인 골드 하나뿐이라 다색 아이콘이 들어오는 순간 절제가 무너지고, 단색 아이콘만이 `currentColor`로 금색을 입을 수 있다. `-fill` 변형으로 통일한다(12~16px에서 외곽선 변형은 획이 뭉개진다 — ui-ux-pro-max "Filled vs Outline Discipline")
  - 데이터 출처도 둘로 나뉜다: 스탯은 `STAT_META[key].icon`(다색) / `.hudIcon`(단색), UI 골격은 `UI_ICONS`(다색) / **`HUD_ICONS`**(단색, `sectionOrnament` 포함). 같은 개념(날짜칸·오전/오후)이 두 벌인 것은 의도다 — 한 벌로 합치면 둘 중 하나가 반드시 이질적이 된다
  - `STAT_META.accent`(스탯별 강조색)는 **제거됐다.** 레퍼런스가 단일 액센트라 게이지는 전부 `--hud-gold` 하나로 칠하며, 스탯 구분은 색이 아니라 글리프+한국어 라벨이 한다
- 렌더는 `src/icons/AppIcon.tsx`의 `<AppIcon name size className style />`만 쓴다. 컴포넌트가 `@iconify/react`를 직접 import하지 않는다
- `@iconify/react/offline` 엔트리를 쓴다 — 이 빌드에는 fetch/API 코드가 없어 이름을 못 찾아도 네트워크로 나가지 않는다
- `src/icons/bootstrap.ts`가 `main.tsx`에서 App보다 먼저 import되어 `addCollection()`으로 아이콘 데이터를 등록한다
- ⚠️ `@iconify-json/*`의 icons.json을 통째로 import하면 번들이 **20MB**가 된다(JSON은 트리셰이킹 안 됨). 그래서 `scripts/build-icon-subset.mjs`가 `src/`를 스캔해 실제 사용하는 아이콘만 `src/icons/generated.ts`로 추출한다(현재 31개, 번들 251KB). **`generated.ts`는 직접 수정 금지, 커밋 대상**
- 아이콘 이름을 추가·변경하면 `npm run icons` 실행. `npm run build`/`npm run dev`가 자동 선행 실행하고, 존재하지 않는 이름이면 **빌드가 실패**한다(오타로 빈 아이콘이 조용히 나오는 것 방지)
- 아이콘 이름은 데이터다: 스탯은 `src/data/statMeta.ts`의 `STAT_META`, UI 골격(작업표시줄·잠금화면 등)은 `src/data/icons.ts`의 `UI_ICONS`/`HUD_ICONS`가 단일 출처. 한 컴포넌트 안에서만 쓰는 일회성 장식 아이콘만 예외로 그 컴포넌트에 둔다(예: `ExeApp.tsx`의 `WARN_ICON`)
- **다색 플랫 아이콘에는 CSS `color`를 절대 입히지 않는다**(원래 색을 망치거나 아무 효과도 없다). 색을 입혀야 하는 자리에는 단색 세트(`ph`)를 쓴다 — 이것이 HUD를 Phosphor로 옮긴 이유다. HUD CSS는 `.stat-icon`/`.hud-head-icon`/`.hud-section-mark`에 `color: var(--hud-gold)`를 건다

## 기술 스택 (실제 설치·빌드 검증 완료)
- React 19.2 / Vite 8.2 / TypeScript 7.0 / Zustand 5.0 / Vitest 4.1 / @iconify/react 6(아이콘)
- 명령: `npm run dev` · `npm run build`(icons && tsc -b && vite build) · `npm test`(vitest run) · `npm run icons`(아이콘 서브셋 재생성)
- 환경: Windows 11, Node v24.18.0, npm 8.19.1, git 저장소 초기화됨
- ⚠️ TS7의 `noUncheckedSideEffectImports` 때문에 CSS import에 `src/vite-env.d.ts` 필수
- ⚠️ `create-vite` v9는 비대화형 환경에서 취소됨 → 설정 파일 수동 구성함

## 파일 맵
- 진입: `index.html` → `src/main.tsx` → `src/App.tsx` (`loggedIn && state`로 잠금화면/바탕화면 분기)
- 타입: `src/types/game.ts` — Stats, Activity, GameState 등 도메인 타입 전부
- 데이터(수치): `src/data/` — activities(활동 5종, `onDesktop` 플래그), desktopItems(`DESKTOP_ITEMS` — 바탕화면 아이콘 단일 출처, 활동/비활동 통합, `openMaximized` 옵트인), **sites**(`SITES`·`BOOKMARK_SITES`·`HOME_SITE_ID`·`findSite` — 브라우저가 이동할 사이트 단일 출처), **news**(`NEWS_POOL`·`NEWS_VISIBLE_COUNT`·`TRENDING_TERMS` — 포털 뉴스/실검 정적 콘텐츠), layers(`LAYERS` — z-order 상수), shell(`SHELL` — 작업표시줄·타이틀바 높이), calendar(날짜 환산·날짜칸 배치), economy(물가 구간 6단계), endings(엔딩 6종), statMeta(스탯별 아이콘·accent + 표시 순서), icons(`UI_ICONS` — 창·작업표시줄·잠금화면 아이콘 이름)
- 아이콘: `src/icons/` — AppIcon(공용 렌더 컴포넌트), bootstrap(시작 시 addCollection), generated.ts(자동 생성, 수정 금지). 생성기는 `scripts/build-icon-subset.mjs`
- 로직(순수함수): `src/systems/` — turn(활동 실행·슬롯 전환·취침 정산·게임오버 판정), economy(생활비·알바비), burnout(연속 페널티), ending(티어 판정), **news**(오늘의 뉴스 선택 — 날짜 결정적), **browserHistory**(뒤로/앞으로 이력 계산). 각각 `.test.ts` 동반 + `balance.verify.test.ts`(밸런스 회귀 방지). 총 **177개** 테스트(`src/systems`+`src/store`+`src/data`)
- 상태: `src/store/` — gameStore(세이브+loggedIn), metaStore(도감·영구), windowStore(창 목록 + 최소화/최대화 런타임 상태·휘발), desktopPanelStore(스탯창·날짜칸 z, 휘발)
- UI: `src/components/window/`(Window·WindowManager — OS 창 크롬), `desktop/`(Desktop·**HudPanel**·StatPanel·CalendarPanel·Taskbar), `lockscreen/`, `apps/`(ExeApp·StubApp·EndingModal·**BrowserApp**), `apps/sites/`(**NeverPortal**·**ConstructionSite** — 브라우저 안에 뜨는 웹페이지들)
- 설정: `vite.config.ts`, `tsconfig.json`(+`.app`/`.node`), 전역 CSS `src/index.css`(**디자인 토큰 `:root` 단일 출처**)
- 미구현(별도 계획 필요): 사이트 **내용**(알바몬 지원·쇼핑 구매·SNS·강의 — 지금은 공용 준비 중 페이지), 엔딩 도감 UI, 랜덤 이벤트(뉴스 클릭 발동 자리는 비어 있음), 폴더 앱·휴지통(`DesktopItem`으로 추가), 은행/대출(설계상 1차 제외)

## 코딩 컨벤션
- 모든 게임 수치(스탯 변화량, 엔딩 조건, 활동 정의)는 컴포넌트에 하드코딩하지 않고 `src/data/` 데이터 파일로 분리
- 창 UI는 공용 `Window` 컴포넌트 위에 구현한다 (활동창·stub·도감 등 **OS 창으로 읽혀야 하는 것 전부**). **예외는 HUD 패널(스탯창·날짜칸) 하나뿐이며 `HudPanel`을 쓴다** — 사유는 위 참조
- 주석·UI 텍스트는 한국어
- 스탯 키는 전 코드에서 통일: `stamina`, `maxStamina`, `mental`, `money`, `knowledge`, `charm`, `sensitivity`, `reputation`, `morality`, `creativity`, `sociability`, `vocabulary`, `athletics` (구 `intelligence`는 `knowledge`로 개명됨)
- `src/systems/`는 React import 금지, 상태 mutation 금지 — 새 객체를 반환한다
- 창은 `windowStore.open()`으로 열고, 종류는 `OpenWindow.kind`(`'exe' | 'ending' | 'stub' | 'browser'`)로 구분
- 스탯창처럼 스토어에 등록하지 않는 창은 `Window`에 `onMove` 콜백을 넘겨 위치를 직접 관리한다 (스토어의 `move`는 `windows` 배열에 있는 창만 갱신하므로 등록 안 하면 드래그가 무시됨)
- `Window`에 `onClose`를 넘기지 않으면 닫기 버튼이 사라진다 (상시 표시 창용)
