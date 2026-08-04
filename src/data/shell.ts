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

/**
 * 바탕화면 아이콘 격자.
 *
 * 실제 윈도우의 **"아이콘 자동 정렬 끔 + 격자에 맞춤 켬"**과 같은 모델이다:
 * 아이콘은 어디로든 끌어다 놓을 수 있지만, 놓는 순간 가장 가까운 칸에 달라붙는다.
 * 그래서 위치의 단위는 픽셀이 아니라 **칸(col, row)**이다 —
 * 픽셀로 저장하면 창 크기가 바뀔 때마다 배치가 조금씩 어긋난다.
 *
 * ⚠️ 수치는 기존 flex 배치를 **실측해서** 옮긴 것이다(1264×805 헤드리스 크롬):
 *  - 열 간격 90 = 실제 열 폭 86 + `--sp-1`(4).
 *    (`.desktop-icons`가 200px 폭에 패딩 12를 빼고 96px 열 둘을 담느라 flex-shrink로 86이 됐다)
 *  - 행 간격 80 = 한 줄 라벨 아이콘 높이 76 + `--sp-1`(4).
 *  - 시작 여백 12 = `--sp-3`.
 * 전부 4의 배수라 ux `spacing-scale`(4/8 리듬)을 지킨다.
 *
 * ⚠️ **라벨이 두 줄인 아이콘(높이 92)은 칸보다 12px 크다.** 실제 윈도우도 칸이
 * 아이콘 내용보다 우선이며, 칸이 위치를 쥐어야 "격자에 맞춤"이 성립한다.
 * 라벨은 두 줄까지만 늘어난다(`.desktop-icon`의 line-clamp).
 */
export const DESKTOP_GRID = {
  /** 격자 원점(왼쪽·위 여백). `.desktop-icons`의 padding과 같아야 한다. */
  PAD: 12,
  /** 한 칸의 가로 간격. */
  CELL_WIDTH: 90,
  /** 한 칸의 세로 간격. */
  CELL_HEIGHT: 80,
  /** 아이콘 버튼 폭. `.desktop-icon`의 width와 같아야 한다(오른쪽 경계 계산에 쓴다). */
  ICON_WIDTH: 84,
  /**
   * 드래그로 인정하는 최소 이동 거리(px, 축별).
   *
   * ux `drag-threshold`: "Use a movement threshold before starting drag to avoid
   * accidental drags". 이 값이 없으면 아이콘을 **더블클릭할 때의 미세한 손떨림**이
   * 드래그로 잡혀 창이 열리는 대신 아이콘이 옆 칸으로 튄다.
   * 4px은 윈도우의 시스템 드래그 임계값(SM_CXDRAG)과 같고 4px 리듬에도 맞는다.
   */
  DRAG_THRESHOLD: 4,
} as const
