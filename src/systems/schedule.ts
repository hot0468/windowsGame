import { findActivity } from '../data/activities'
import { weekdayOf } from '../data/calendar'
import { canRun, runActivity, skipSlot } from './turn'
import type { GameState, Plan, Slot } from '../types/game'

export type { Plan }

/*
 * 예약(`Plan`)의 타입 정의는 `types/game.ts`에 있다 — 세이브에 들어가는 값이라
 * 다른 세이브 필드와 한자리에 있어야 한다. 규칙은 전부 이 파일에 있다.
 *
 * 과거는 기록하지 않는다 — 지나간 일은 `recentActivities`가 이미 들고 있다.
 * 여기는 **앞으로의 계획**만 담는다(설계자 결정).
 */

/** 예약을 못 지킨 사유. 조용히 사라지면 왜 안 됐는지 알 수 없으므로 밖으로 내보낸다. */
export interface SkippedPlan extends Plan {
  reason: '조건 미달' | '없는 활동'
}

/** 같은 슬롯에는 하나만 둔다 — 한 슬롯에 두 활동을 할 수는 없다. */
export function findPlan(plans: Plan[], day: number, slot: Slot): Plan | undefined {
  return plans.find((p) => p.day === day && p.slot === slot)
}

/** 그 슬롯의 예약을 새로 정한다(있으면 교체). */
export function setPlan(plans: Plan[], day: number, slot: Slot, activityId: string): Plan[] {
  return [...plans.filter((p) => !(p.day === day && p.slot === slot)), { day, slot, activityId }]
}

export function clearPlan(plans: Plan[], day: number, slot: Slot): Plan[] {
  return plans.filter((p) => !(p.day === day && p.slot === slot))
}

/** 지금(day, slot)보다 앞선 예약을 버린다. 지나간 계획이 쌓이면 달력이 과거로 더러워진다. */
export function prunePast(plans: Plan[], day: number, slot: Slot): Plan[] {
  const now = day * 2 + (slot === 'afternoon' ? 1 : 0)
  return plans.filter((p) => p.day * 2 + (p.slot === 'afternoon' ? 1 : 0) >= now)
}

/**
 * `fromDay`부터 **비어 있는 첫 슬롯**. 예매처럼 "며칠 뒤에 잡아 달라"는 예약이 쓴다.
 *
 * ⚠️ **남의 예약을 덮지 않는다** — `setPlan`은 같은 자리를 말없이 교체하는데,
 * 플레이어가 직접 짠 계획을 예매가 지워 버리면 달력을 믿을 수 없게 된다.
 * 2주(28슬롯)를 다 뒤져도 빈자리가 없으면 마지막 날 오후를 돌려준다 — 달력을 통째로
 * 채운 사람에게 "예매할 수 없다"고 하는 것보다 하나를 밀어내는 편이 낫다.
 */
export function firstFreeSlot(plans: Plan[], fromDay: number): { day: number; slot: Slot } {
  const SLOTS: Slot[] = ['morning', 'afternoon']
  for (let day = fromDay; day < fromDay + 14; day++) {
    for (const slot of SLOTS) if (!findPlan(plans, day, slot)) return { day, slot }
  }
  return { day: fromDay + 13, slot: 'afternoon' }
}

/**
 * 앞으로 `weeks`주 동안 **매주 같은 요일**에 예약을 건다(헬스장 월결제).
 *
 * 오늘이 그 요일이어도 **다음 주부터** 잡는다 — 등록한 그날 바로 운동하러 가는 건
 * 결제와 별개의 행동이고, 대화창에서 이미 [하루만]이 그 자리를 맡고 있다.
 * 슬롯은 오후로 고정한다: 오전은 플레이어가 쓰고 싶어 하는 자리라 통째로 묶으면 답답하다.
 */
export function planWeekly(
  plans: Plan[],
  fromDay: number,
  weekday: number,
  weeks: number,
  activityId: string,
): Plan[] {
  let next = plans
  // 다음 그 요일까지의 간격(1~7일). 오늘이 그 요일이면 7일 뒤부터다.
  const gap = ((weekday - weekdayOf(fromDay) + 7 - 1) % 7) + 1
  for (let i = 0; i < weeks; i++) {
    next = setPlan(next, fromDay + gap + i * 7, 'afternoon', activityId)
  }
  return next
}

/**
 * 연쇄 실행 상한.
 *
 * 예약이 실행되면 턴이 넘어가고, 넘어간 턴에 또 예약이 있으면 이어서 실행된다.
 * 달력을 빽빽하게 채우면 며칠이 한 번에 흘러갈 수 있다 — 그게 스케줄러의 쓸모다.
 * 다만 무한 루프(예약이 턴을 넘기지 못하는 경우)를 막을 상한은 반드시 필요하다.
 */
export const MAX_CHAIN = 40

/**
 * 예약을 실행해 시간을 밀어낸다.
 *
 * **현재 슬롯에 예약이 있으면 실행하고, 그 결과로 넘어간 슬롯에 또 있으면 이어서 실행한다.**
 * 조건이 안 되는 예약은 **건너뛰되 지운다** — 남겨 두면 다음 날에도 같은 자리에서
 * 계속 실패한다. 사유는 `skipped`로 돌려주므로 호출부가 알릴 수 있다.
 *
 * `limit`은 이번 호출에서 이어 실행할 최대 슬롯 수다. 기본값은 안전 상한(`MAX_CHAIN`)이고,
 * ⚠️ **자동 진행만 1을 넘긴다**: 자동 진행은 슬롯마다 멈춰야 할지를 물어야 하는데,
 * 그 판정에 필요한 재료(도착한 택배·회사 소식)는 연쇄가 끝난 뒤에야 나오므로 연쇄 안에서는
 * 알 수 없다. 그래서 **연쇄를 자동 진행 루프가 대신 돈다**(`store/gameStore.ts`).
 * 규칙을 두 벌로 만들지 않기 위해 실행 통로는 여전히 이 함수 하나다.
 *
 * ⚠️ `turn.ts`를 부르지만 그 반대는 없다 — 턴 규칙이 스케줄러를 몰라야
 * 밸런스 테스트가 스케줄러 없이도 성립한다.
 */
export function runPlans(
  state: GameState,
  limit: number = MAX_CHAIN,
): { state: GameState; skipped: SkippedPlan[] } {
  let current = state
  const skipped: SkippedPlan[] = []

  for (let i = 0; i < Math.min(limit, MAX_CHAIN); i++) {
    if (current.recovery) break
    const plans = current.plans ?? []
    const plan = findPlan(plans, current.day, current.slot)
    if (!plan) break

    const activity = findActivity(plan.activityId)
    if (!activity) {
      skipped.push({ ...plan, reason: '없는 활동' })
      current = { ...current, plans: clearPlan(plans, plan.day, plan.slot) }
      continue
    }
    if (!canRun(current, activity)) {
      // 조건 미달: 예약을 버리고 **슬롯은 그냥 흘려보낸다**.
      // 여기서 멈춰 세우면 플레이어가 아무것도 못 하는 상태로 갇힐 수 있다.
      skipped.push({ ...plan, reason: '조건 미달' })
      current = skipSlot({ ...current, plans: clearPlan(plans, plan.day, plan.slot) })
      continue
    }

    // 실행하면 턴이 넘어간다. 쓴 예약은 지운다.
    current = runActivity({ ...current, plans: clearPlan(plans, plan.day, plan.slot) }, activity)
  }

  return { state: { ...current, plans: prunePast(current.plans ?? [], current.day, current.slot) }, skipped }
}
