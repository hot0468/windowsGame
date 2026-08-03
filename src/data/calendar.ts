/**
 * 게임 내 달력 기준일. 1일차 = 2026년 3월 1일.
 * 작업 표시줄 시계와 날짜칸이 같은 날짜를 보여야 하므로 환산 규칙을 여기 한 곳에 둔다.
 */
export const GAME_START_DATE = { year: 2026, month: 3, day: 1 } as const

/** 게임 내 날짜를 "3월 5일 (목)" 형태의 한국어 표기로 환산한다. */
export function formatGameDate(day: number): string {
  const base = new Date(GAME_START_DATE.year, GAME_START_DATE.month - 1, GAME_START_DATE.day)
  base.setDate(base.getDate() + day - 1)
  return base.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })
}

/**
 * 날짜칸의 크기·초기 배치.
 * statPanelReserve는 스탯창이 우상단에서 차지하는 폭(창 폭 280 + 오른쪽 여백 16)이며,
 * 날짜칸은 그만큼을 비켜 왼쪽에 붙는다.
 */
export const CALENDAR_PANEL_LAYOUT: {
  width: number
  gap: number
  top: number
  statPanelReserve: number
} = {
  width: 176,
  /** 스탯창과의 가로 간격. */
  gap: 12,
  /** 스탯창과 같은 높이에서 시작한다. */
  top: 16,
  /** 스탯창이 우상단에서 점유하는 폭(창 폭 + 여백). */
  statPanelReserve: 296,
}
