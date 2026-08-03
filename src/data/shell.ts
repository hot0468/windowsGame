/**
 * 가짜 윈도우 셸(작업 표시줄·창)의 레이아웃 수치. 단일 출처.
 *
 * z-index를 layers.ts에 모은 것과 같은 이유로, 화면 골격 치수도 여기 한 곳에 모은다.
 * 이 값이 흩어지면 "작업 표시줄에 가려지지 않는다"는 규칙이 곳곳에서 어긋난다.
 *
 * ⚠️ CSS는 TS 상수를 참조할 수 없으므로 Desktop.css(.taskbar height, .desktop-icons height)와
 * Window.css(.win.win-max height, .win min-width)에 같은 값이 중복돼 있다 — 바꿀 때 반드시 함께 고친다.
 */
export const SHELL = {
  /** 화면 하단에 고정된 작업 표시줄 높이(px). 창이 이 아래로 내려가면 안 된다. */
  TASKBAR_HEIGHT: 44,
  /** 타이틀 바 높이(px, 패딩 포함 여유값). 최소한 타이틀 바는 항상 잡을 수 있어야 한다. */
  TITLE_BAR_HEIGHT: 40,
  /**
   * 창 최소 폭(px). Window.css의 `.win { min-width }`와 반드시 같아야 한다.
   * 이보다 좁은 폭을 요청해도 실제로는 이 값으로 그려지므로, 위치를 계산할 때
   * 요청 폭을 그대로 믿으면 옆 창을 침범한다 (날짜칸이 스탯창을 12px 덮은 원인).
   */
  MIN_WINDOW_WIDTH: 200,
} as const
