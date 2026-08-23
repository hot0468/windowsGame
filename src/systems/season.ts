import { seasonOf } from '../data/season'
import type { SeasonId } from '../data/season'

export { seasonOf }

/**
 * 계절 규칙 — **날짜의 순수 함수**다(날씨·행사 개최와 같은 자리).
 *
 * ⚠️ 저장하지 않는다. `GameState`에 계절 필드가 없는 것이 곧 규칙이다.
 * ⚠️ `seasonOf` 자체는 `data/season.ts`에 산다(행사 개최 판정이 data에서 그것을 쓴다) —
 * 여기서는 그대로 내보내기만 한다. **두 곳에 같은 계산을 적지 않는다.**
 */

/** 오늘이 계절의 첫날인가. 뉴스가 계절이 바뀐 것을 알리는 자리다. */
export function isSeasonStart(day: number): boolean {
  return day > 1 && seasonOf(day).id !== seasonOf(day - 1).id
}

/**
 * 이 계절이 며칠 남았는가(오늘 포함).
 *
 * ⚠️ 달의 길이가 제각각이라 **상수로 못 적는다** — 실제 달력을 앞으로 훑는다.
 * 한 계절이 100일을 넘지 않으므로 순회는 곧 끝난다.
 */
export function daysLeftInSeason(day: number): number {
  const now = seasonOf(day).id
  for (let i = 1; i <= 120; i++) {
    if (seasonOf(day + i).id !== now) return i
  }
  return 120
}

/** 그 계절이 다음에 시작하는 날. "내년 여름까지 기다린다"를 화면이 적을 수 있어야 한다. */
export function nextSeasonStart(day: number, id: SeasonId): number {
  for (let i = 1; i <= 400; i++) {
    if (seasonOf(day + i).id === id && seasonOf(day + i - 1).id !== id) return day + i
  }
  return day
}
