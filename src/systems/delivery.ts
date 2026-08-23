import { EVENTS } from '../data/events'
import { findItem } from '../data/items'
import {
  COUPON_MAIL_ID,
  COUPON_MAX_DISCOUNT,
  COUPON_RATE,
  MESSAGE_SCHEDULE,
} from '../data/messages'
import { clampStats, inventoryOf, owns } from './turn'
import type { GameState, Stats } from '../types/game'
import type { ShopItem } from '../data/items'
import type { GameEvent } from '../data/events'

/**
 * 보유 판정은 `turn.ts`가 갖고 있다 — 활동 실행 조건(`canRun`)이 이걸 보게 되면서
 * 이 파일에 두면 `turn` ↔ `delivery` 순환이 되기 때문이다. 여기서 재수출하는 이유는
 * "인벤토리는 배송의 결과물"이라는 읽는 순서를 호출부에서 유지하기 위해서다.
 */
export { inventoryOf, owns }

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

/**
 * 반값 쿠폰 메일이 오는 날인가.
 *
 * ⚠️ **주기를 숫자로 적지 않는다** — 편성표에서 그 메일이 앉은 턴을 찾아 되돌린다.
 * 적어 두면 메일을 다른 턴으로 옮기는 순간 "메일은 안 왔는데 쿠폰은 되는 날"이 생긴다.
 * 편성표는 순환하므로(`systems/messages.ts`의 `scheduleAt`) 쿠폰도 그 주기로 돌아온다.
 *
 * ⚠️ **`systems/messages.ts`를 부르지 않는다**: 그쪽은 `rankEvents` → 이 파일로 돌아와
 * 순환이 된다. 필요한 것은 턴 번호 하나뿐이라 편성표를 직접 본다.
 */
export function couponDay(day: number): boolean {
  const at = MESSAGE_SCHEDULE.findIndex((ms) => ms.some((m) => m.id === COUPON_MAIL_ID))
  if (at < 0) return false
  const morning = (day - 1) * 2
  return morning % MESSAGE_SCHEDULE.length === at || (morning + 1) % MESSAGE_SCHEDULE.length === at
}

/**
 * 이 물건에 지금 붙는 쿠폰 할인액(원). 쿠폰이 없는 날·이미 쓴 날이면 0.
 *
 * ⚠️ **컬리엔마트(`store` 생략 = 'shop') 물건에만 붙는다** — 메일을 보낸 곳이 거기다.
 * 그래서 하이마루·무진장 화면은 이 함수를 몰라도 되고 값도 안 변한다.
 * ⚠️ **헬스장·미용실 오픈채팅의 정기권도 컬리엔마트 물건이라 쿠폰이 붙는다**(같은
 * `order`를 지난다) — 통로를 갈라 두 번 적느니 "컬리엔마트에서 파는 것"이라는 한 가지
 * 사실로 두는 쪽이 맞다.
 */
export function couponDiscount(state: GameState, item: ShopItem): number {
  if ((item.store ?? 'shop') !== 'shop') return 0
  if (!couponDay(state.day)) return 0
  if (state.couponUsedDay === state.day) return 0
  return Math.min(Math.floor(item.price * COUPON_RATE), COUPON_MAX_DISCOUNT)
}

/**
 * 지금 실제로 내는 값. **잔액 판정·화면·결제가 전부 이 함수를 지난다** —
 * 한 곳이라도 `item.price`를 그대로 쓰면 진열대와 계산대가 다른 값을 말한다.
 */
export function priceOf(state: GameState, item: ShopItem): number {
  return item.price - couponDiscount(state, item)
}

/** 살 수 있는지. 게임오버·잔액 부족·이미 보유·이미 배송 중이면 못 산다. */
export function canOrder(state: GameState, item: ShopItem): boolean {
  if (state.recovery) return false
  if (state.stats.money < priceOf(state, item)) return false
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

/**
 * 사진첩에 실제로 들어 있는 사진 — **겪은 사건만, 겪은 날과 함께.**
 *
 * ⚠️ **판정을 두 벌로 두지 않는다**: 탐색기의 사진첩 폴더와 트위터의 사진 고르기가
 * 같은 목록을 본다. 안 겪은 칸은 아예 없다(설계자 지시 2026-08-17 — 사진첩이
 * "안 한 일까지 한 것처럼" 읽혔다).
 */
export function albumPhotos(state: GameState): { event: GameEvent; day: number }[] {
  const log = new Map((state.events ?? []).map((e) => [e.id, e.day]))
  return EVENTS.filter((e) => log.has(e.id)).map((e) => ({ event: e, day: log.get(e.id)! }))
}

/** 사진첩의 사진 하나. 없으면 undefined(옛 세이브의 지워진 id를 막는다). */
export function findPhoto(id: string): GameEvent | undefined {
  return EVENTS.find((e) => e.id === id)
}

/** 주문한다. 조건이 안 되면 상태를 그대로 돌려준다(호출부에서 막지 않아도 안전). */
export function order(state: GameState, item: ShopItem): GameState {
  if (!canOrder(state, item)) return state
  const discount = couponDiscount(state, item)
  const next: GameState = {
    ...state,
    stats: clampStats({ ...state.stats, money: state.stats.money - (item.price - discount) }),
    deliveries: [...(state.deliveries ?? []), { itemId: item.id, day: state.day + DELIVERY_DAYS }],
    // 쿠폰은 하루 한 건이다. 깎인 주문에만 도장을 찍는다 — 할인 0원인 주문이
    // 쿠폰을 태워 버리면 "안 쓴 셈 치고 아무거나 먼저 사면 손해"가 된다.
    couponUsedDay: discount > 0 ? state.day : state.couponUsedDay,
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
    /* ⚠️ **한 번 손을 떠난 물건은 다시 받아도 효과가 없다.** 판 것(`sold`, 중고마켓)과
       부서진 것(`broken`, 장비 고장) 둘 다 본다 — 어느 쪽이든 "처음 받았을 때"는 이미
       지나갔고, 안 막으면 되사서 상승분을 무한히 반복한다. 규칙의 정본은
       `systems/resale.ts`·`systems/gear.ts`이고 여기서는 목록만 읽는다. */
    const usedBefore = (state.sold ?? []).includes(item.id) || (state.broken ?? []).includes(item.id)
    if (!usedBefore) stats = applyEffects(stats, item.effects)
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
