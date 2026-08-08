# 아이콘 (Iconify, 오프라인 전용)

> **언제 읽나:** 아이콘 이름을 추가·변경하거나 세트를 고를 때 읽는다.
> 규칙만 적는다. 사연·실측 과정은 소스 파일 주석과 `docs/HISTORY.md`가 진다.

## 아이콘 (Iconify, 오프라인 전용)
- ⚠️ **UI에 이모지를 쓰지 않는다**(ui-ux-pro-max `no-emoji-icons`) — 플랫폼마다 모양이 달라지고 토큰으로 통제할 수 없다. `fluent-emoji-flat`/`flat-color-icons`/`twemoji`는 **제거됐다. 이모지 세트를 다시 들이지 말 것**
- 세트 4종을 오프라인 패키지로 설치: **`fluent-color`**(다색 아이콘 — 바탕화면 앱·사이트·활동·엔딩), **`mdi`**(단색 — 게임 HUD·메신저 글리프), **`mdi-light`**(단색 라인 — 셸 크롬: 시작 버튼·트레이·시작 메뉴·잠금화면 아바타), **`devicon`**(프로그램 로고). **CDN 금지**
- ⚠️ **아이콘 세트는 시각 언어별로 나뉜다**: 바탕화면 앱·사이트·활동창·엔딩 모달 = **다색**, HUD 안(스탯창·날짜칸)과 메신저 글리프 = **단색 `mdi`**(구 Phosphor `ph`는 제거됨). HUD는 액센트가 하나뿐이라 다색이 들어오면 절제가 무너지고, 단색만이 `currentColor`로 색을 입는다. **`-outline` 변형이 있으면 반드시 그쪽을 쓴다**(꽉 찬 글리프는 13~16px에서 잉크 얼룩이 된다). ⚠️ mdi는 외곽선 변형이 **없는** 이름이 섞여 있어(`brain`·`shimmer`·`run`·`heart-pulse`·`scale-balance`) 완벽히는 못 지킨다 — **섞임을 더 늘리지 말 것.** **스탯창 안은 한 세트로 통일한다**
- 아이콘은 **Iconify 아이콘을 문자열 이름으로 참조**한다(`"세트:이름"`, 예: `"fluent-color:book-24"`). `Activity.icon`/`Ending.icon`/`OpenWindow.icon`/`Window` prop의 타입은 `IconName`(= string, `src/types/game.ts`)이다. 렌더는 `src/icons/AppIcon.tsx`의 `<AppIcon name size className style />`만 쓴다(컴포넌트가 `@iconify/react`를 직접 import하지 않는다). `@iconify/react/offline` 엔트리를 써서 이름을 못 찾아도 네트워크로 나가지 않는다. `src/icons/bootstrap.ts`가 `main.tsx`에서 App보다 먼저 import되어 `addCollection()`한다
- ⚠️ `@iconify-json/*`의 icons.json을 통째로 import하면 번들이 **20MB**가 된다(JSON은 트리셰이킹 안 됨). `scripts/build-icon-subset.mjs`가 `src/`를 스캔해 쓰는 것만 `src/icons/generated.ts`로 추출한다(현재 31개, 251KB). **`generated.ts`는 직접 수정 금지, 커밋 대상**
- 아이콘 이름을 추가·변경하면 `npm run icons`(`build`/`dev`가 자동 선행하고 **존재하지 않는 이름이면 빌드가 실패한다**). 아이콘 이름은 데이터다: 스탯은 `src/data/statMeta.ts`의 `STAT_META`, UI 골격은 `src/data/icons.ts`의 `UI_ICONS`/`HUD_ICONS`가 단일 출처. 한 컴포넌트 안에서만 쓰는 일회성 장식만 예외(예: `ExeApp.tsx`의 `WARN_ICON`)
- **다색 플랫 아이콘에는 CSS `color`를 절대 입히지 않는다**(원래 색을 망치거나 아무 효과도 없다). 색을 입혀야 하는 자리에는 단색 세트를 쓴다 — HUD CSS는 `.stat-icon`/`.hud-head-icon`/`.hud-section-mark`에 액센트 색을 건다
