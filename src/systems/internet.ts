import { DEFAULT_PLAN_ID, findPlan, planOf, timeFactorOf } from '../data/internet'
import { BILLING_INTERVAL_DAYS } from '../data/subscriptions'
import { clampStats, settleRecovery } from './turn'
import type { GameState } from '../types/game'

/**
 * 인터넷 요금제 규칙 — **돈으로 시간을 산다**(2026-08-22 설계자 지시).
 *
 * ## ⚠️ 휴대폰 요금과 같은 판형이다
 * 매달 나가고(같은 `BILLING_INTERVAL_DAYS`), **못 내면 외상이 아니라 강등된다**
 * (`systems/phone.ts`가 인벤토리에서 빼는 것과 같은 자리). 소지금이 음수가 되면
 * 파산 판정(`money <= 0`)이 흐려지므로 그 길을 만들지 않는다.
 *
 * ## ⚠️ 바꾸는 데 턴을 쓰지 않는다
 * 전화 한 통이다(은행 거래·구독 결제와 같은 부류). 대신 **바꾼 그날부터 요금 주기가
 * 다시 시작된다** — 달 말에 올렸다가 곧장 내리는 식으로 공짜 속도를 얻을 수 없다.
 */

/* ⚠️ `planOf`·`timeFactorOf`는 **`data/internet.ts`에 산다**(`turn.ts`가 써야 하는데
   여기 두면 `turn ↔ internet` 순환이 된다) — 여기서는 그대로 내보내기만 한다. */
export { planOf, timeFactorOf }

/** 마지막으로 요금을 낸 날(처음이면 바꾼 날). 기본 요금제는 청구가 없다. */
function lastBilledDay(state: GameState): number | undefined {
  return state.internet?.billedDay ?? state.internet?.since
}

/** 다음 청구까지 남은 날. 기본 회선이면 undefined(낼 것이 없다). */
export function daysToInternetBill(state: GameState): number | undefined {
  if (planOf(state).monthly <= 0) return undefined
  const last = lastBilledDay(state)
  return last === undefined ? undefined : Math.max(0, last + BILLING_INTERVAL_DAYS - state.day)
}

/** 지금 이 요금제로 바꿀 수 있는가. 못 하는 이유는 `changeBlockers`가 글자로 만든다. */
export function canChangePlan(state: GameState, planId: string): boolean {
  return changeBlockers(state, planId).length === 0
}

export function changeBlockers(state: GameState, planId: string): string[] {
  const plan = findPlan(planId)
  if (!plan) return ['없는 요금제입니다']
  if (state.recovery) return ['지금은 바꿀 수 없습니다']
  if (plan.id === planOf(state).id) return ['이미 쓰고 있는 요금제입니다']
  /* ⚠️ 첫 달 요금을 그 자리에서 받는다 — 안 받으면 "바꾸고 그날 밤 해지"가 공짜가 된다.
     잔액이 요금과 같아도 막는다(0으로 만드는 결제는 그날 밤 파산이다 — 구독과 같은 판정). */
  if (plan.monthly > 0 && state.stats.money - plan.monthly <= 0) {
    return [`첫 달 요금 ${plan.monthly.toLocaleString('ko-KR')}원이 모자랍니다`]
  }
  return []
}

/**
 * 요금제를 바꾼다. **턴을 쓰지 않고 첫 달 요금을 그 자리에서 낸다.**
 * 조건이 안 되면 상태를 그대로 돌려준다(반쪽 상태 금지).
 */
export function changePlan(state: GameState, planId: string): GameState {
  if (!canChangePlan(state, planId)) return state
  const plan = findPlan(planId)!
  return {
    ...state,
    stats: clampStats({ ...state.stats, money: state.stats.money - plan.monthly }),
    internet: { planId: plan.id, since: state.day, billedDay: state.day },
  }
}

/**
 * 밤 정산 — **달마다 요금을 낸다.** 못 내면 기본 회선으로 강등된다.
 *
 * ⚠️ 며칠이 한 번에 흐르면(자동 진행) 밀린 달을 **차례로** 따라잡는다 —
 * 한 번만 빼면 잠자코 넘어간 달이 공짜가 된다(`advancePhoneBill`과 같은 규칙).
 */
export function advanceInternetBill(state: GameState): GameState {
  let next = state
  for (;;) {
    const plan = planOf(next)
    if (plan.monthly <= 0) return next
    const last = lastBilledDay(next)
    if (last === undefined || next.day < last + BILLING_INTERVAL_DAYS) return next
    const due = last + BILLING_INTERVAL_DAYS
    if (next.stats.money - plan.monthly <= 0) {
      /* 강등도 사실이므로 남긴다 — 화면이 "왜 느려졌나"를 말할 수 있어야 한다. */
      return { ...next, internet: { planId: DEFAULT_PLAN_ID, since: next.day, downgraded: true } }
    }
    next = settleRecovery({
      ...next,
      stats: clampStats({ ...next.stats, money: next.stats.money - plan.monthly }),
      internet: { ...next.internet!, billedDay: due },
    })
  }
}
