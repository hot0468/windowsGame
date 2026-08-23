import type { IconName } from '../types/game'

/**
 * 게임 UI 골격(창·작업 표시줄·잠금화면)에 쓰는 아이콘 이름.
 * 아이콘 이름은 데이터이므로 컴포넌트에 하드코딩하지 않고 여기 모은다.
 * 특정 컴포넌트 안에서만 쓰이는 일회성 장식 아이콘(경고 등)은 예외로 그 컴포넌트에 둔다.
 *
 * ⚠️ **이모지를 쓰지 않는다**(설계자 지시 + ui-ux-pro-max `no-emoji-icons`). 이모지는 폰트에
 * 의존해 플랫폼마다 모양이 달라지고 디자인 토큰으로 통제할 수 없다. 다색이 필요한 자리는
 * **fluent-color 아이콘**, 설치된 프로그램은 devicon 로고, 셸 크롬 글리프는 mdi-light 라인이다.
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
  /** 작업 표시줄 지갑칸 버튼 — 트레이 라인 글리프. */
  walletPanel: 'mdi-light:wallet',
  /**
   * 작업 표시줄 [아이콘 위치 초기화] — 트레이 라인 글리프.
   * 새로 고침(refresh)이 아니라 **되돌리기(undo)** 글리프다: 하는 일이
   * "다시 그리기"가 아니라 "옮긴 기록을 버리고 기본 배치로 돌아가기"다.
   */
  resetIcons: 'mdi-light:undo-variant',
  /** 시작 메뉴 [새 게임] — 셸 크롬이라 라인 글리프다. 판을 다시 돌린다는 뜻의 refresh. */
  newGame: 'mdi-light:refresh',
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
  /**
   * 부팅 화면의 로고. **시작 버튼과 다른 글리프를 쓰는 유일한 자리다.**
   * 셸 크롬은 단색 라인(위 규칙)이지만 부팅 화면은 크롬이 아니라 **옮겨 온 화면**이고,
   * 실제 윈도우 부팅 로고는 채워진 사다리꼴 4분할이다 — 라인 글리프로 대신하면
   * "켜지는 중"이 아니라 "격자 아이콘"으로 읽힌다. 색은 `BootScreen.css`가 준다.
   */
  boot: 'mdi:microsoft-windows',
  /**
   * 시스템 속성 창(컴퓨터 사양).
   * ⚠️ **시작 글리프를 돌려쓰지 않는다** — 작업 표시줄에서 시작 버튼과 같은 그림이 되어
   * 어느 쪽이 창인지 구분이 안 됐다(실측 스크린샷에서 눈에 띄었다). 이 창의 주어는
   * 윈도우가 아니라 **이 컴퓨터**라 기기 글리프가 뜻에도 맞는다.
   */
  sysinfo: 'fluent-color:laptop-24',
  /** 슬롯 건너뛰기 버튼. */
  skipTurn: 'fluent-color:fast-forward-circle-24',
  /** 준비 중인 앱의 안내 창. */
  underConstruction: 'fluent-color:wrench-screwdriver-24',
  /** 자동 진행 요약 창. "지나간 시간의 기록"이므로 시계 방향 화살표 계열을 쓴다. */
  autoLog: 'fluent-color:history-24',
  /**
   * 잠금화면 아바타.
   * ⚠️ 예전의 다색 이모지 아이콘에서 바꿨다 — 어두운 잠금화면 위에서
   * 보라색 덩어리로 뭉쳐 보였다. 실제 윈도우 11 잠금화면의 기본 계정 사진도 단색 실루엣이고,
   * 이 자리는 셸 크롬이므로 셸 규칙(mdi-light 라인)을 따르는 것이 맞다.
   * 단색이라 CSS `color`로 흰색을 입힐 수 있다는 것도 다색 아이콘에는 없는 이점이다.
   */
  lockAvatar: 'mdi-light:account',
  /** 엔딩 도감 해금 안내. */
  endingUnlocked: 'fluent-color:book-star-24',
  /** 턴 소모 안내. */
  turnCost: 'fluent-color:clock-alarm-24',
  // slotMorning/slotAfternoon은 제거했다. 작업 표시줄 시계에 붙어 있던 해·달 이모지는
  // (1) 바로 옆 텍스트가 이미 "오전/오후"라 정보가 중복이고,
  // (2) mdi-light에는 해·달 글리프가 없어 라인 트레이에 홀로 남는 다색 이모지가 되며,
  // (3) 실제 윈도우 11 시계도 글리프 없는 텍스트다.
  // 해·달 표시는 그것이 정보인 자리(HUD 날짜칸 슬롯 칩)에만 남겼다 — HUD_ICONS 참조.
} as const satisfies Record<string, IconName>

/**
 * 모바일 셸(휴대폰 UI) 크롬 글리프.
 *
 * ⚠️ **전부 단색(`mdi`)이고 `-outline` 변형을 우선한다.** 하단바 항목은 현재 위치를
 * 액센트 색으로 물들여야 하는데(`currentColor`), 다색 아이콘에는 CSS `color`가
 * 통하지 않는다 — 셸 크롬 = 단색이라는 규칙이 여기서도 그대로다.
 * 홈 화면 **앱 그리드의 아이콘은 여기가 아니다** — `desktopEntries`가 주는
 * 다색(fluent-color) 아이콘을 그대로 쓴다(앱 정체성 = 컬러).
 *
 * ⚠️ 하단바는 **아이콘만 두지 않는다**(ux `nav-label-icon`) — 글자 라벨이 함께 붙고,
 * 현재 위치는 색만이 아니라 **글자 굵기 + 아래 표식**으로도 알린다(`color-not-only`).
 */
export const MOBILE_ICONS = {
  /** 하단바: 홈(앱 그리드)으로. */
  home: 'mdi:view-grid-outline',
  /** 하단바: 뒤로/앱 닫기. ux `back-behavior` — 앱 뷰에서 항상 보여야 한다. */
  back: 'mdi:arrow-left',
  /** 하단바: 스탯 시트 열기. 데스크톱의 스탯창을 대신하는 유일한 창구다. */
  stats: 'mdi:chart-box-outline',
  /** 하단바: 데스크톱 셸로 전환. */
  desktop: 'mdi:monitor',
  /** 상태바: 소지금. */
  money: 'mdi:wallet-outline',
  /** 상태바: 행동력. */
  stamina: 'mdi:lightning-bolt-outline',
  /** 시트 닫기. */
  close: 'mdi:close',
  /**
   * 데스크톱 시작 메뉴의 "휴대폰 모드" 항목.
   * ⚠️ 시작 메뉴의 나머지 글리프는 mdi-light이지만 **mdi-light에는 휴대폰 글리프가 없다**
   * (phone = 유선 수화기뿐이라 뜻이 어긋난다). 같은 단색 계열인 mdi로 내려온다.
   */
  phone: 'mdi:cellphone',
} as const satisfies Record<string, IconName>

/**
 * 가짜 브라우저 도구 모음 글리프.
 *
 * 브라우저 크롬은 OS 창의 일부이므로 셸 규칙을 따른다 — **단색 `mdi-light` 라인**이다.
 * 뒤로·앞으로·새로 고침은 CSS 도형으로 그려져 있지만(BrowserApp.css 참조) 별·점 3개는
 * 도형으로 그리면 코드가 글리프보다 길어지므로 아이콘을 쓴다.
 *
 * ⚠️ **즐겨찾기 줄의 사이트 아이콘은 여기가 아니라 `SITES[].icon`(다색)이다.**
 * 규칙이 어긋난 것이 아니다: 셸 크롬 글리프는 단색, **정체성을 가진 대상**(앱 로고·사이트
 * 파비콘)은 컬러라는 같은 규칙의 양면이다. 실제 브라우저의 즐겨찾기도 파비콘은 컬러다.
 */
export const BROWSER_ICONS = {
  /** 주소창 안 즐겨찾기 별표. mdi-light에는 채운 변형이 없어 상태는 색·배경·문구로 알린다. */
  bookmark: 'mdi-light:star',
  /** 더보기(점 3개) 메뉴. */
  more: 'mdi-light:dots-vertical',
} as const satisfies Record<string, IconName>

/**
 * 게임 HUD(스탯창·날짜칸) 전용 **단색** 아이콘 이름.
 *
 * `UI_ICONS`와 나뉘어 있는 이유는 `--os-*`/`--hud-*` 토큰이 나뉜 이유와 같다.
 * 같은 개념(스탯창·오전/오후)이라도 OS 크롬(작업 표시줄)과 HUD 안에서는 성격이 다르다.
 * 한 벌로 합치면 둘 중 하나가 반드시 이질적이 된다.
 *
 * ⚠️ 세트는 **Material Design Icons(`mdi`)**다(2026-08-03 변경, 설계자 지시.
 * 이전에는 Phosphor `ph` 외곽선이었다):
 *  - `-outline` 변형이 있는 이름은 전부 그쪽을 쓴다. 밝은 카드 위에서 꽉 찬 글리프는
 *    13~16px에서 잉크 얼룩이 되어 **숫자가 주인공**이라는 위계를 빼앗는다.
 *  - ⚠️ 다만 mdi는 외곽선 변형이 **없는** 이름이 섞여 있다(`brain`·`shimmer`·`run`·
 *    `heart-pulse`·`scale-balance`). 한 계층 한 스타일("Filled vs Outline Discipline")을
 *    완벽히는 못 지키는 세트라는 뜻이므로, 새 글리프를 고를 때 `-outline`이 있으면 반드시
 *    그쪽을 택해 섞임을 더 늘리지 말 것.
 *  - 단색이라 `currentColor`로 잉크/액센트를 입힐 수 있다(다색 플랫 아이콘은 불가능).
 *  - **스탯창 안은 한 세트로 통일한다** — 능력치만 바꾸고 자원(체력·멘탈·소지금)을 두면
 *    한 카드에 두 아이콘 언어가 남는다(`icon-style-consistent`).
 */
export const HUD_ICONS = {
  // statPanel(스탯창 머리 글리프)은 제거했다 — 바로 옆이 플레이어 이름이라
  // 아이콘이 같은 말을 한 번 더 하는 자리였다(설계자 지시).
  /** 오전 슬롯. */
  slotMorning: 'mdi:white-balance-sunny',
  /** 오후 슬롯. */
  slotAfternoon: 'mdi:weather-night',
  /** 슬롯 건너뛰기 버튼. */
  skipTurn: 'mdi:fast-forward-outline',
  /**
   * 자동 진행 시작. 건너뛰기(fast-forward)와 **다른 글리프여야 한다** —
   * 바로 위아래에 붙는 두 버튼이 같은 모양이면 "한 칸"과 "계속"이 구분되지 않는다.
   */
  autoRun: 'mdi:play-speed',
  /** 자동 진행 멈추기. 정지는 단호한 뜻이라 유일하게 채운 글리프를 쓴다. */
  autoStop: 'mdi:stop-circle-outline',
  /** 턴 소모 안내. */
  turnCost: 'mdi:timer-sand',
  /**
   * 앓는 중 배지(스탯창). ⚠️ **단색이라야 한다** — 배지가 경고색을 입으므로
   * `currentColor`가 통해야 하고, 다색 아이콘에는 CSS `color`가 먹지 않는다.
   */
  illness: 'mdi:emoticon-sick',
  // calendarPanel(날짜칸 머리 글리프)은 제거했다 — 날짜칸에서 타이틀 영역 자체가 사라졌다.
  // sectionOrnament(✳)도 제거했다 — 다크 판타지 테마 장식이라 모던 시스템 카드와 맞지 않는다.
} as const satisfies Record<string, IconName>
