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
| 게임 길이 | 30일 = 60턴 |
| 스탯 | 12종. 소모 자원: `stamina`/`maxStamina`, `mental`(0~100), `money`. 성장 스탯 9종(상한 999): `knowledge`, `charm`, `sensitivity`, `reputation`, `morality`, `creativity`, `sociability`, `vocabulary`, `athletics` |
| 엔딩 | 멀티 엔딩 6종(대기업 합격/인플루언서/철인/현실주의자/번아웃/평범). 스탯 조합 판정 |
| 엔딩 공개 | 비공개. 엔딩 도감에 한 번 본 엔딩만 해금 |
| 활동 선택 | (전환 중) 바탕화면에는 메신저 + 인터넷(준비 중 stub)만 노출. 활동 5종 정의는 `data/activities.ts`에 보존, 추후 브라우저/스케줄 시스템에서 선택하게 할 예정 |
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
- 활동 창은 오후 슬롯일 때 생활비 차감을 경고한다. 오후 행동은 하루를 끝내며 `sleep()`이 생활비를 빼가는데, 이를 안 보여주면 "+42,780원" 표시 후 실제로는 적자가 되어 플레이어를 오도함

## 아이콘 (Iconify, 오프라인 전용)
- 세트 3종을 오프라인 패키지로 설치: `@iconify-json/fluent-emoji-flat`(기본 — 윈도우 데스크톱 컨셉과 맞음), `@iconify-json/flat-color-icons`(작은 UI 컨트롤), `@iconify-json/twemoji`. **CDN 금지**
- 렌더는 `src/icons/AppIcon.tsx`의 `<AppIcon name size className style />`만 쓴다. 컴포넌트가 `@iconify/react`를 직접 import하지 않는다
- `@iconify/react/offline` 엔트리를 쓴다 — 이 빌드에는 fetch/API 코드가 없어 이름을 못 찾아도 네트워크로 나가지 않는다
- `src/icons/bootstrap.ts`가 `main.tsx`에서 App보다 먼저 import되어 `addCollection()`으로 아이콘 데이터를 등록한다
- ⚠️ `@iconify-json/*`의 icons.json을 통째로 import하면 번들이 **20MB**가 된다(JSON은 트리셰이킹 안 됨). 그래서 `scripts/build-icon-subset.mjs`가 `src/`를 스캔해 실제 사용하는 아이콘만 `src/icons/generated.ts`로 추출한다(현재 31개, 번들 251KB). **`generated.ts`는 직접 수정 금지, 커밋 대상**
- 아이콘 이름을 추가·변경하면 `npm run icons` 실행. `npm run build`/`npm run dev`가 자동 선행 실행하고, 존재하지 않는 이름이면 **빌드가 실패**한다(오타로 빈 아이콘이 조용히 나오는 것 방지)
- 아이콘 이름은 데이터다: 스탯은 `src/data/statMeta.ts`의 `STAT_META`, UI 골격(창 닫기·작업표시줄·잠금화면 등)은 `src/data/icons.ts`의 `UI_ICONS`가 단일 출처. 한 컴포넌트 안에서만 쓰는 일회성 장식 아이콘만 예외로 그 컴포넌트에 둔다(예: `ExeApp.tsx`의 `WARN_ICON`)
- `STAT_META.color`는 **`accent`로 이름이 바뀌었다.** 플랫 아이콘은 이미 다색이라 CSS `color`로 덧칠하면 원래 색을 망친다 → 아이콘에는 색을 입히지 않고, `accent`는 게이지 막대(`stat-fill`) 등 아이콘 외 요소에만 쓴다. CSS의 아이콘 `color`/`stroke-width` 선언도 같은 이유로 전부 제거했다

## 기술 스택 (실제 설치·빌드 검증 완료)
- React 19.2 / Vite 8.2 / TypeScript 7.0 / Zustand 5.0 / Vitest 4.1 / @iconify/react 6(아이콘)
- 명령: `npm run dev` · `npm run build`(icons && tsc -b && vite build) · `npm test`(vitest run) · `npm run icons`(아이콘 서브셋 재생성)
- 환경: Windows 11, Node v24.18.0, npm 8.19.1, git 저장소 초기화됨
- ⚠️ TS7의 `noUncheckedSideEffectImports` 때문에 CSS import에 `src/vite-env.d.ts` 필수
- ⚠️ `create-vite` v9는 비대화형 환경에서 취소됨 → 설정 파일 수동 구성함

## 파일 맵
- 진입: `index.html` → `src/main.tsx` → `src/App.tsx` (`loggedIn && state`로 잠금화면/바탕화면 분기)
- 타입: `src/types/game.ts` — Stats, Activity, GameState 등 도메인 타입 전부
- 데이터(수치): `src/data/` — activities(활동 5종, `onDesktop` 플래그), desktopItems(`DESKTOP_ITEMS` — 바탕화면 아이콘 단일 출처, 활동/비활동 통합), layers(`LAYERS` — z-order 상수), calendar(날짜 환산·날짜칸 배치), economy(물가 구간 6단계), endings(엔딩 6종), statMeta(스탯별 아이콘·accent + 표시 순서), icons(`UI_ICONS` — 창·작업표시줄·잠금화면 아이콘 이름)
- 아이콘: `src/icons/` — AppIcon(공용 렌더 컴포넌트), bootstrap(시작 시 addCollection), generated.ts(자동 생성, 수정 금지). 생성기는 `scripts/build-icon-subset.mjs`
- 로직(순수함수): `src/systems/` — turn(활동 실행·슬롯 전환·취침 정산·게임오버 판정), economy(생활비·알바비), burnout(연속 페널티), ending(티어 판정). 각각 `.test.ts` 동반 + `balance.verify.test.ts`(밸런스 회귀 방지). 총 **123개** 테스트(`src/systems`+`src/store`+`src/data`)
- 상태: `src/store/` — gameStore(세이브+loggedIn), metaStore(도감·영구), windowStore(창·휘발), desktopPanelStore(스탯창·날짜칸 z, 휘발)
- UI: `src/components/window/`(Window·WindowManager), `desktop/`(Desktop·StatPanel·CalendarPanel·Taskbar), `lockscreen/`, `apps/`(ExeApp·StubApp·EndingModal)
- 설정: `vite.config.ts`, `tsconfig.json`(+`.app`/`.node`), 전역 CSS `src/index.css`
- 미구현(별도 계획 필요): 브라우저 본체/포털/사이트(바탕화면 아이콘은 있으나 stub 창만 뜸), 엔딩 도감 UI, 랜덤 이벤트, 폴더 앱·휴지통(`DesktopItem`으로 추가), 은행/대출

## 코딩 컨벤션
- 모든 게임 수치(스탯 변화량, 엔딩 조건, 활동 정의)는 컴포넌트에 하드코딩하지 않고 `src/data/` 데이터 파일로 분리
- 모든 창 UI는 공용 Window 컴포넌트 위에 구현 (스탯창, 활동창, 팝업, 도감 전부)
- 주석·UI 텍스트는 한국어
- 스탯 키는 전 코드에서 통일: `stamina`, `maxStamina`, `mental`, `money`, `knowledge`, `charm`, `sensitivity`, `reputation`, `morality`, `creativity`, `sociability`, `vocabulary`, `athletics` (구 `intelligence`는 `knowledge`로 개명됨)
- `src/systems/`는 React import 금지, 상태 mutation 금지 — 새 객체를 반환한다
- 창은 `windowStore.open()`으로 열고, 종류는 `OpenWindow.kind`(`'exe' | 'ending'`)로 구분
- 스탯창처럼 스토어에 등록하지 않는 창은 `Window`에 `onMove` 콜백을 넘겨 위치를 직접 관리한다 (스토어의 `move`는 `windows` 배열에 있는 창만 갱신하므로 등록 안 하면 드래그가 무시됨)
- `Window`에 `onClose`를 넘기지 않으면 닫기 버튼이 사라진다 (상시 표시 창용)
