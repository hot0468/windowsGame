import { BILLING_INTERVAL_DAYS, SUBSCRIPTIONS, findSubscription } from '../data/subscriptions'
import { clampStats, settleGameOver, subscribed } from './turn'
import type { Subscription } from '../data/subscriptions'
import type { GameState, SubscriptionState } from '../types/game'

/**
 * 구독 — 가입·해지·월 청구.
 *
 * ## ⚠️ 이 파일이 옛 규칙 하나를 뒤집었다
 * "구독은 만들지 않는다(지속 상태는 밤 정산이 필요해진다)"가 설계자 지시로 폐기됐다.
 * 그래서 **밤 정산에 나가는 돈이 처음 생겼다** — 지금까지 밤에 움직이는 돈은 생활비를
 * 빼면 전부 들어오는 쪽이었다(급여·만기·당첨금·트위터 정산).
 *
 * ## ⚠️ `nightPayoutPending`에는 넣지 않는다
 * 그 술어는 **"받을 돈이 남았으니 죽음 판정을 미룬다"**는 뜻이다. 구독료는 나가는 돈이라
 * 미룰 이유가 없고, 오히려 미루면 "낼 돈이 남아서 안 죽는" 거꾸로 된 말이 된다.
 *
 * ## ⚠️ 외상을 만들지 않는다 — 못 내면 해지된다
 * 잔액이 모자랄 때 그냥 빼면 소지금이 음수가 되어 파산 판정(`money <= 0`)이 흐려진다
 * (`spendMoney`가 잔액 부족에서 아무것도 안 하는 것과 같은 규칙). 대신 **구독을 끊는다** —
 * 그러면 포토샵 아이콘이 사라지고 디자인 일감이 잠기므로, 못 낸 사실이 화면에 드러난다.
 *
 * ## 의존 방향
 * `subscription.ts` → `turn.ts` (반대는 없다). `turn.ts`가 보는 것은 `canRun`이 물어볼
 * 수 있게 만든 술어 `subscribed(state, id)` 하나뿐이고(세이브의 키 유무만 읽는다),
 * 규칙(요금·주기·해지)은 전부 여기 있다 — `owns`/`jobStageOpen`과 같은 예외 형태다.
 */

export function emptySubscriptions(): SubscriptionState {
  return { active: {}, paid: 0 }
}

export function subscriptionsOf(state: GameState): SubscriptionState {
  return state.subscriptions ?? emptySubscriptions()
}

/** 구독 중인 상품 목록. 화면이 순회하는 것. */
export function activeSubscriptions(state: GameState): Subscription[] {
  return SUBSCRIPTIONS.filter((s) => subscribed(state, s.id))
}

/** 다음 청구까지 남은 날. 구독 중이 아니면 undefined. */
export function daysToBilling(state: GameState, id: string): number | undefined {
  const rec = subscriptionsOf(state).active[id]
  if (!rec) return undefined
  return Math.max(0, rec.billedDay + BILLING_INTERVAL_DAYS - state.day)
}

/**
 * 가입한다. **턴을 쓰지 않는다**(은행 거래·쇼핑 주문과 같은 규칙 — 결제는 시간을 쓰는
 * 일이 아니다). ⚠️ **첫 달치를 그 자리에서 낸다**(실제 구독과 같다) — 가입만 하고
 * 30일을 공짜로 쓰는 구멍을 만들지 않는다.
 *
 * ⚠️ 조건이 안 되면 **상태를 그대로 돌려준다**(반쪽 상태 금지). 잔액이 정확히 요금과
 * 같아도 막는다: 소지금을 0으로 만드는 결제는 그날 밤 파산이다.
 */
export function subscribe(state: GameState, id: string): GameState {
  const sub = findSubscription(id)
  if (!sub || state.gameOver || subscribed(state, id)) return state
  if (state.stats.money - sub.monthlyFee <= 0) return state

  const prev = subscriptionsOf(state)
  return {
    ...state,
    stats: clampStats({ ...state.stats, money: state.stats.money - sub.monthlyFee }),
    subscriptions: {
      active: { ...prev.active, [id]: { startedDay: state.day, billedDay: state.day } },
      paid: prev.paid + sub.monthlyFee,
    },
  }
}

/**
 * 해지한다. **이미 낸 달치를 돌려주지 않는다**(실제 구독과 같다) — 환불을 만들면
 * "쓰기 직전에 끊는" 것이 언제나 이득이 되어 구독이 비용이 아니게 된다.
 */
export function unsubscribe(state: GameState, id: string): GameState {
  if (!subscribed(state, id)) return state
  const prev = subscriptionsOf(state)
  const active = { ...prev.active }
  delete active[id]
  return { ...state, subscriptions: { ...prev, active } }
}

/**
 * 밤 정산 — **30일마다 요금이 빠진다.**
 *
 * ⚠️ 커서(`billedDay`)를 30씩 밀며 밀린 달을 따라잡는다(스케줄러 연쇄·자동 진행으로
 * 며칠이 한 번에 흐를 수 있다 — `advanceEmployment`의 급여 루프와 같은 장치).
 * 커서가 없으면 같은 달을 매 슬롯 청구해 소지금이 순식간에 마른다.
 *
 * ⚠️ 못 내면 **그 자리에서 해지된다**(외상 금지 — 위 주석). 남은 구독은 계속 청구된다.
 */
export function advanceSubscriptions(state: GameState): GameState {
  const prev = state.subscriptions
  if (!prev || state.gameOver) return state

  const active = { ...prev.active }
  let money = state.stats.money
  let paid = 0
  let changed = false

  for (const [id, rec] of Object.entries(prev.active)) {
    const sub = findSubscription(id)
    // 없는 상품을 가리키는 기록은 조용히 닫는다(상품이 사라져도 화면이 안 깨진다).
    if (!sub) {
      delete active[id]
      changed = true
      continue
    }
    let billedDay = rec.billedDay
    while (state.day - billedDay >= BILLING_INTERVAL_DAYS) {
      if (money - sub.monthlyFee <= 0) {
        // 못 냈다 → 해지. 커서는 더 밀지 않는다(이미 끊긴 달을 청구하지 않는다).
        delete active[id]
        changed = true
        break
      }
      money -= sub.monthlyFee
      paid += sub.monthlyFee
      billedDay += BILLING_INTERVAL_DAYS
      changed = true
    }
    if (active[id]) active[id] = { ...rec, billedDay }
  }

  if (!changed) return state
  return settleGameOver({
    ...state,
    stats: clampStats({ ...state.stats, money }),
    subscriptions: { active, paid: prev.paid + paid },
  })
}
