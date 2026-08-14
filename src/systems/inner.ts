import {
  CATEGORY_LINES,
  DRAINED_LINES,
  DRAINED_MENTAL,
  TIRED_LINES,
  TIRED_STAMINA,
} from '../data/inner'
import type { Activity, GameState } from '../types/game'

/**
 * 행동 뒤에 스치는 혼잣말을 고른다. 문장은 전부 `data/inner.ts`에 있고 여기 있는 것은
 * **고르는 규칙**뿐이다.
 *
 * ## 순서가 규칙이다
 * 1. **몸** → 2. **마음** → 3. **갈래**. 체력이 바닥인데 "오늘 몫은 했다"가 뜨면
 *    화면이 플레이어가 겪은 것과 다른 말을 하는 것이다. 잔량이 위험할수록 먼저 말한다.
 *
 * ## ⚠️ 무작위가 아니다(`Math.random` 금지)
 * 턴 번호로 목록을 돌린다 — 같은 상황이 이어져도 같은 문장이 연달아 나오지 않고,
 * 테스트는 결정적으로 남는다(뉴스 편성표와 같은 수법).
 */

/** 턴 번호. 하루 2슬롯이므로 오전·오후가 다른 문장을 고른다. */
function turnOf(state: GameState): number {
  return state.day * 2 + (state.slot === 'afternoon' ? 1 : 0)
}

/**
 * 그 행동 뒤의 감상 한 줄. **`after`는 행동이 끝난 뒤 상태다** — 잔량을 보고 말하므로
 * 행동 전 값으로 물으면 방금 쓴 체력이 반영되지 않는다.
 *
 * ⚠️ **모든 행동에 붙이지 않는다**(`undefined`를 돌려줄 수 있게 열어 둔 이유). 매 턴
 * 혼잣말이 뜨면 그건 감상이 아니라 소음이다 — 지금은 **갈래가 있는 활동 전부**에
 * 붙이되, 잦다고 판단되면 여기 한 줄로 조절한다.
 */
export function innerLine(after: GameState, activity: Activity): string | undefined {
  const turn = turnOf(after)
  const pick = (lines: string[]) => lines[turn % lines.length]
  /* 몸이 먼저, 그다음 마음. 둘 다 멀쩡할 때만 갈래가 말한다. */
  if (after.stats.stamina <= TIRED_STAMINA) return pick(TIRED_LINES)
  if (after.stats.mental <= DRAINED_MENTAL) return pick(DRAINED_LINES)
  const lines = CATEGORY_LINES[activity.category]
  return lines ? pick(lines) : undefined
}
