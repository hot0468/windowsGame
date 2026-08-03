/**
 * 화면 z-order 레이어. z-index 숫자를 컴포넌트/CSS에 흩뿌리지 않고 여기 한 곳에 모은다.
 *
 * 쌓임 순서(아래 → 위):
 *   바탕화면 아이콘 < 바탕화면 패널(스탯창·날짜칸) < 일반 창 < 작업 표시줄 < 엔딩 모달
 *
 * 핵심 규칙: 스탯창·날짜칸은 "바탕화면에 놓인 요소"다.
 * 따라서 windowStore로 열린 일반 창이 그 위를 덮어야 한다(가려지는 게 정상).
 * 대신 작업 표시줄의 전용 버튼이 이들을 잠시 일반 창 위로 끌어올린다(DESKTOP_PANEL_RAISED).
 *
 * ⚠️ windowStore.topZ는 WINDOW_BASE에서 시작해 창을 열/포커스할 때마다 1씩 오른다.
 * 그러므로 DESKTOP_PANEL_RAISED와 TASKBAR 사이의 간격이 곧 z가 고갈되기까지의
 * 창 조작 횟수다. 넉넉히(1000단위) 벌려 둔다.
 */
export const LAYERS = {
  /** 바탕화면 아이콘. 모든 창보다 아래. */
  DESKTOP_ICON: 10,
  /** 스탯창·날짜칸의 평소 위치. 아이콘보다는 위, 일반 창보다는 아래. */
  DESKTOP_PANEL: 100,
  /** windowStore가 여는 일반 창의 시작 z. focus할 때마다 여기서 1씩 올라간다. */
  WINDOW_BASE: 1000,
  /**
   * "앞으로 가져오기"를 누른 바탕화면 패널의 z.
   * 일반 창의 z가 여기까지 자라면 다시 가려지므로, WINDOW_BASE와 크게 벌려 둔다.
   */
  DESKTOP_PANEL_RAISED: 8000,
  /** 작업 표시줄. 항상 모든 창 위에 있어야 한다. */
  TASKBAR: 9000,
  /** 엔딩 모달. 최상단. */
  ENDING: 9500,
} as const
