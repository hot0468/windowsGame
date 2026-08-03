import type { IconName } from '../types/game'

/**
 * 게임 UI 골격(창·작업 표시줄·잠금화면)에 쓰는 아이콘 이름.
 * 아이콘 이름은 데이터이므로 컴포넌트에 하드코딩하지 않고 여기 모은다.
 * 특정 컴포넌트 안에서만 쓰이는 일회성 장식 아이콘(경고 등)은 예외로 그 컴포넌트에 둔다.
 *
 * 세트 선택 기준: 컨셉 그림(잠금화면 아바타·준비 중 안내 등)은 윈도우 데스크톱 컨셉과
 * 맞는 fluent-emoji-flat, 설치된 **프로그램**은 devicon 로고, 셸 크롬 글리프는 mdi-light 라인.
 *
 * ⚠️ **작업 표시줄 트레이 글리프는 `mdi-light` 라인 아이콘이다**(2026-08-03 변경).
 * 다색 이모지 아이콘(달력·사람)이 시스템 트레이 자리에 앉으면 촌스럽다는 지적을 받았다.
 * 작업 표시줄의 아이콘 규칙은 두 줄로 요약된다:
 *   **앱 정체성(창 목록) = 컬러 프로그램 로고(devicon)**
 *   **셸 크롬(시작 버튼·트레이) = 단색 라인 글리프(mdi-light)**
 * 컬러를 앱에만 허용하니 "무엇이 실행 중인가"가 색으로 즉시 읽히고,
 * 한 계층 안에서는 한 세트만 쓴다(ui-ux-pro-max `icon-style-consistent`).
 */
export const UI_ICONS = {
  // 창 캡션 버튼(최소화·최대화·닫기)은 아이콘이 아니라 CSS 도형으로 그린다.
  // 윈도우 11의 캡션 글리프는 가는 단색 선이라 플랫 컬러 아이콘과 성격이 다르고,
  // 닫기 hover 시 흰색으로 바뀌어야 하는데 다색 아이콘은 색을 덧칠할 수 없다. (Window.css 참조)
  /** 작업 표시줄 스탯창 버튼 — 트레이 라인 글리프. */
  statPanel: 'mdi-light:account',
  /** 작업 표시줄 날짜칸 버튼 — 트레이 라인 글리프. */
  calendarPanel: 'mdi-light:calendar',
  /**
   * 작업 표시줄 시작 버튼 — 4분할 라운드 격자(윈도우 11 4창 로고의 실루엣).
   *
   * ⚠️ 예전의 flat-color-icons 다색 격자 아이콘은 **실측 결과 보이지 않았다**
   * (이름을 백틱으로 인용하지 않는다 — 서브셋 생성기가 주석 속 리터럴까지 수집한다):
   * 아크릴 작업 표시줄 rgb(176,201,226) 위에서 글리프의 가장 어두운 픽셀조차
   * rgb(146,201,247) = **1.03:1**로, UI 글리프 최소 3:1(ui-ux-pro-max `icon-contrast`)에
   * 한참 못 미쳤다. 색이 있다는 이유만으로 "브랜드 마크"가 되지는 않는다.
   * 같은 자리를 mdi-light 라인 글리프로 바꾸면 12:1이 나온다.
   *
   * 그래서 셸의 아이콘 규칙을 이렇게 정리한다:
   *   **앱 정체성 = 컬러 로고(devicon)**, **셸 크롬 = 단색 라인(mdi-light)**.
   * 작업 표시줄에서 컬러는 열린 앱만 갖는다 — 위계가 더 명확해지고
   * 한 계층 한 세트 원칙(`icon-style-consistent`)도 지켜진다.
   */
  start: 'mdi-light:grid-large',
  /** 슬롯 건너뛰기 버튼. */
  skipTurn: 'fluent-emoji-flat:fast-forward-button',
  /** 준비 중인 앱의 안내 창. */
  underConstruction: 'fluent-emoji-flat:construction',
  /** 잠금화면 아바타. */
  lockAvatar: 'fluent-emoji-flat:bust-in-silhouette',
  /** 엔딩 도감 해금 안내. */
  endingUnlocked: 'fluent-emoji-flat:closed-book',
  /** 턴 소모 안내. */
  turnCost: 'fluent-emoji-flat:alarm-clock',
  // slotMorning/slotAfternoon은 제거했다. 작업 표시줄 시계에 붙어 있던 해·달 이모지는
  // (1) 바로 옆 텍스트가 이미 "오전/오후"라 정보가 중복이고,
  // (2) mdi-light에는 해·달 글리프가 없어 라인 트레이에 홀로 남는 다색 이모지가 되며,
  // (3) 실제 윈도우 11 시계도 글리프 없는 텍스트다.
  // 해·달 표시는 그것이 정보인 자리(HUD 날짜칸 슬롯 칩)에만 남겼다 — HUD_ICONS 참조.
} as const satisfies Record<string, IconName>

/**
 * 게임 HUD(스탯창·날짜칸) 전용 **단색** 아이콘 이름.
 *
 * `UI_ICONS`와 나뉘어 있는 이유는 `--os-*`/`--hud-*` 토큰이 나뉜 이유와 같다.
 * 같은 개념(스탯창·오전/오후)이라도 OS 크롬(작업 표시줄)과 HUD 안에서는 성격이 다르다.
 * 한 벌로 합치면 둘 중 하나가 반드시 이질적이 된다.
 *
 * ⚠️ 세트는 Phosphor(`ph`) **외곽선(regular) 변형**으로 통일한다(2026-08-03 변경,
 * 이전에는 `-fill`이었다):
 *  - HUD가 밝은 모던 시스템 카드가 되면서 `-fill` 글리프는 13~16px에서 **검은 덩어리**로
 *    뭉쳐 보인다. 어두운 표면에서는 채워진 글리프가 "빛나는 점"이었지만, 밝은 표면에서는
 *    같은 글리프가 잉크 얼룩이 되어 **숫자가 주인공**이라는 위계를 빼앗는다.
 *  - 작업 표시줄이 `mdi-light` 라인 아이콘으로 옮겨간 것과 같은 방향이다. 라인 글리프끼리
 *    묶어야 앱 전체의 아이콘 언어가 하나로 읽힌다(`icon-style-consistent`).
 *  - 여전히 `currentColor`로 그려져 CSS에서 잉크/액센트로 물들일 수 있다(다색 플랫은 불가능).
 *  - 획이 얇아진 만큼 렌더 크기를 한 단 올려(13→14, 14→15) 대비를 유지한다.
 *  - 한 계층에 한 스타일만 쓰라는 "Filled vs Outline Discipline"은 그대로 지킨다 —
 *    HUD 안 글리프는 예외 없이 regular다.
 */
export const HUD_ICONS = {
  /** 스탯창 머리 — 플레이어 본인. */
  statPanel: 'ph:user',
  /** 오전 슬롯. */
  slotMorning: 'ph:sun',
  /** 오후 슬롯. */
  slotAfternoon: 'ph:moon',
  /** 슬롯 건너뛰기 버튼. */
  skipTurn: 'ph:fast-forward',
  /** 턴 소모 안내. */
  turnCost: 'ph:hourglass-simple',
  // calendarPanel(날짜칸 머리 글리프)은 제거했다 — 날짜칸에서 타이틀 영역 자체가 사라졌다.
  // sectionOrnament(✳)도 제거했다 — 다크 판타지 테마 장식이라 모던 시스템 카드와 맞지 않는다.
} as const satisfies Record<string, IconName>
