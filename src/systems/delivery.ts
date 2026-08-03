import { findItem } from '../data/items'
import { clampStats } from './turn'
import type { EventLog, GameState, Stats } from '../types/game'
import type { ShopItem } from '../data/items'

/**
 * 쇼핑 · 배송 · 사건 기록.
 *
 * ⚠️ **주문은 턴을 소모하지 않는다.** 돈만 나간다 — 클릭 한 번을 반나절로 치면
 * "탐색은 무료"라는 규칙(설계 문서 2.3)이 흔들린다. 대신 **효과는 도착해야 난다**:
 * 결제한 날과 물건이 오는 날 사이의 하루가 곧 쇼핑의 비용이다.
 *
 * `turn.ts`를 부르지만 그 반대는 없다(스케줄러와 같은 규칙) — 턴 규칙이 쇼핑을
 * 모르는 채로 있어야 밸런스 테스트가 쇼핑 없이도 성립한다.
 */

/** 주문한 다음 날 도착한다. */
const DELIVERY_DAYS = 1

export function inventoryOf(state: GameState): EventLog[] {
  return state.inventory ?? []
}

/** 이미 가진 물건인지. 보유 판정이 여러 곳에 흩어지지 않게 여기 하나만 둔다. */
export function owns(state: GameState, itemId: string): boolean {
  return inventoryOf(state).some((i) => i.id === itemId)
}

/** 살 수 있는지. 게임오버·잔액 부족·이미 보유·이미 배송 중이면 못 산다. */
export function canOrder(state: GameState, item: ShopItem): boolean {
  if (state.gameOver) return false
  if (state.stats.money < item.price) return false
  // 같은 물건을 두 개 사도 효과는 한 번뿐이라(도감 형식) 아예 막는다 —
  // 살 수는 있는데 아무 일도 안 일어나는 게 제일 나쁘다.
  if (owns(state, item.id)) return false
  return (state.deliveries ?? []).some((d) => d.itemId === item.id) === false
}

/** 사건을 기록한다. 이미 있는 사건은 덮어쓰지 않는다 — 처음 겪은 날이 기록의 내용이다. */
export function recordEvent(state: GameState, id: string): GameState {
  const events = state.events ?? []
  if (events.some((e) => e.id === id)) return state
  return { ...state, events: [...events, { id, day: state.day }] }
}

/** 주문한다. 조건이 안 되면 상태를 그대로 돌려준다(호출부에서 막지 않아도 안전). */
export function order(state: GameState, item: ShopItem): GameState {
  if (!canOrder(state, item)) return state
  const next: GameState = {
    ...state,
    stats: clampStats({ ...state.stats, money: state.stats.money - item.price }),
    deliveries: [...(state.deliveries ?? []), { itemId: item.id, day: state.day + DELIVERY_DAYS }],
  }
  return recordEvent(next, 'first-order')
}

function applyEffects(stats: Stats, effects: Partial<Stats>): Stats {
  const next = { ...stats }
  for (const [key, value] of Object.entries(effects)) {
    next[key as keyof Stats] += value
  }
  return next
}

/**
 * 도착할 때가 된 택배를 받는다. **턴이 넘어간 뒤 호출한다.**
 *
 * 받은 물건은 `arrived`로 돌려준다 — 알림을 띄우는 건 화면의 몫이고,
 * 여기서 스토어나 토스트를 부르면 순수 함수가 아니게 된다.
 */
export function collect(state: GameState): { state: GameState; arrived: ShopItem[] } {
  const pending = state.deliveries ?? []
  const due = pending.filter((d) => d.day <= state.day)
  if (!due.length) return { state, arrived: [] }

  const arrived: ShopItem[] = []
  let stats = state.stats
  const inventory = [...inventoryOf(state)]
  for (const d of due) {
    const item = findItem(d.itemId)
    // 없는 아이템 id(세이브가 구버전 데이터를 가리키는 경우)는 조용히 버린다.
    if (!item) continue
    arrived.push(item)
    stats = applyEffects(stats, item.effects)
    if (!inventory.some((i) => i.id === item.id)) inventory.push({ id: item.id, day: state.day })
  }

  let next: GameState = {
    ...state,
    stats: clampStats(stats),
    inventory,
    deliveries: pending.filter((d) => d.day > state.day),
  }
  if (arrived.length) next = recordEvent(next, 'first-delivery')
  return { state: next, arrived }
}
