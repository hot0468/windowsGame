/**
 * 게임 내 달력 기준일. 1일차 = 2026년 3월 1일.
 * 작업 표시줄 시계와 날짜칸이 같은 날짜를 보여야 하므로 환산 규칙을 여기 한 곳에 둔다.
 */
export const GAME_START_DATE = { year: 2026, month: 3, day: 1 } as const

/** 게임 N일차 → 실제 달력 날짜. 날짜를 다루는 모든 화면이 이 함수를 쓴다. */
export function dateOf(day: number): Date {
  const d = new Date(GAME_START_DATE.year, GAME_START_DATE.month - 1, GAME_START_DATE.day)
  d.setDate(d.getDate() + day - 1)
  return d
}

/** 실제 달력 날짜 → 게임 N일차. `dateOf`의 역함수다. */
export function dayOf(date: Date): number {
  const base = new Date(GAME_START_DATE.year, GAME_START_DATE.month - 1, GAME_START_DATE.day)
  return Math.round((date.getTime() - base.getTime()) / 86400000) + 1
}

/** 그 날의 요일(0=일 … 6=토). 헬스장 회원권처럼 "매주 목요일"을 다룰 때 쓴다. */
export function weekdayOf(day: number): number {
  return dateOf(day).getDay()
}

/**
 * 주말(토·일)인가.
 *
 * ⚠️ **`data/careers.ts`의 `isWorkWeekday`와 다른 물음이다.** 그쪽은 "이 직장의 근무일인가"라
 * 회사 규칙(`WORKDAYS`)을 보고, 이쪽은 달력이 주말인가를 본다 — 지금은 같은 답이 나오지만
 * 근무일이 다른 직장이 생기는 순간 갈린다. 요일 규칙은 달력이 갖는 것이 맞다.
 */
export function isWeekend(day: number): boolean {
  const w = weekdayOf(day)
  return w === 0 || w === 6
}

/** 게임 내 날짜를 "3월 5일 (목)" 형태의 한국어 표기로 환산한다. */
export function formatGameDate(day: number): string {
  const base = new Date(GAME_START_DATE.year, GAME_START_DATE.month - 1, GAME_START_DATE.day)
  base.setDate(base.getDate() + day - 1)
  return base.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })
}

/**
 * 날짜칸의 크기·초기 배치.
 * statPanelReserve는 스탯창이 우상단에서 차지하는 폭(창 폭 320 + 오른쪽 여백 16)이며,
 * 날짜칸은 그만큼을 비켜 왼쪽에 붙는다.
 */
export const CALENDAR_PANEL_LAYOUT: {
  width: number
  gap: number
  top: number
  statPanelReserve: number
} = {
  /**
   * 공용 Window의 `min-width: 200px`보다 작게 잡으면 실제 렌더 폭(200)과 어긋나
   * 그만큼 스탯창을 침범한다. 최소 폭과 같은 값으로 맞춰 둔다.
   */
  width: 200,
  /** 스탯창과의 가로 간격. */
  gap: 12,
  /** 스탯창과 같은 높이에서 시작한다. */
  top: 16,
  /** 스탯창이 우상단에서 점유하는 폭(창 폭 + 여백). */
  statPanelReserve: 336,
}
