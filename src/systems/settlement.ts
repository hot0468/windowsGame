import { DEADLINE_DAY, isDeadlineReached } from '../data/calendar'
import type { Activity, GameState, Settlement } from '../types/game'

/**
 * 결산 — **1년이 끝나는 날**(2026-08-24 설계자 설정: "20대의 딱 1년").
 *
 * ## ⚠️ 게임오버가 아니다
 * 2026-08-14에 없앤 것(파산·번아웃으로 판이 끝나는 장치)과 **다른 것**이다. 그 결정은
 * 그대로다 — 여기서 생기는 것은 끝나는 날이 아니라 **돌아보는 날**이고, 그날 이후로도
 * 계속 산다. 달라지는 것은 **진로를 더 못 바꾼다**는 하나뿐이다(설계자 지시:
 * "회사에 들어가서 일을 하고 있으면 그 회사 일만 계속 할 수 있음").
 *
 * ## ⚠️ 회복(`Recovery`)과 독립이다
 * 결산일에 주저앉아 있어도 결산은 뜬다. 회복 조건에 묶으면 **363일차에 파산한 사람의
 * 결산이 통째로 사라진다** — 1년을 살았는데 돌아볼 자리가 없는 것은 버그다.
 * 그리고 결산과 함께 회복을 털어낸다: 1년이 끝났으므로 남은 며칠은 뜻이 없다.
 *
 * ## ⚠️ 한 판에 한 번만 굳는다
 * `settled`가 이미 있으면 아무것도 하지 않는다. 매 밤 다시 찍으면 결산 날짜가 계속
 * 갱신되고, 도감의 '지난 삶'에도 같은 판이 여러 번 남는다(`recordLife`에 중복 검사가 없다).
 */

/** 1년이 끝났는가. 화면·가드 전부가 이 하나를 본다. */
export function isSettled(state: GameState): boolean {
  return state.settled !== undefined
}

/**
 * 결산일이 됐으면 굳힌다. **밤 정산의 종점이 부른다**(`gameStore.afterTurn`).
 *
 * ⚠️ **`>=`로 본다**(`isDeadlineReached`) — 자동 진행이나 여행으로 며칠이 한 번에
 * 흐르면 정확히 365일차를 밟지 않고 지나갈 수 있다. 그때도 결산이 새면 안 된다.
 * ⚠️ **회복을 털어낸다**: 1년이 끝났는데 "3일 더 주저앉음"이 남아 있을 이유가 없다.
 */
export function settleYear(state: GameState): GameState {
  if (isSettled(state) || !isDeadlineReached(state.day)) return state
  return {
    ...state,
    recovery: null,
    settled: {
      day: DEADLINE_DAY,
      careerId: state.employment?.careerId,
      housingId: state.housing?.id,
    },
  }
}

/**
 * 결산 뒤에 **막히는 활동인가**. `canRun`이 이 하나를 본다.
 *
 * ⚠️ **막는 것은 진로를 바꾸는 둘뿐이다**(설계자 결정): 새 직장 지원·이사.
 * 공부·운동·관계·알바·출근은 그대로 된다 — "삶이 굳었지만 생활은 이어진다"가 그 뜻이고,
 * 전부 막으면 결산 뒤에 할 일이 없어져 이어하기가 무의미해진다.
 *
 * ⚠️ **`canRun`이 유일하게 옳은 자리다.** 활동 실행 통로가 넷이라(확정 버튼·스케줄러
 * 예약·바탕화면 바로 가기·카톡) 화면에서만 막으면 반드시 샌다.
 */
export function blockedBySettlement(state: GameState, activity: Activity): boolean {
  if (!isSettled(state)) return false
  return activity.id === 'job-apply' || activity.id === 'job-interview'
}

/**
 * 결산 뒤 **이사할 수 있는가**. 활동이 아닌 통로(부동산 사이트)가 이것을 본다.
 *
 * ⚠️ 활동 가드(`blockedBySettlement`)와 갈라 둔 이유: 이사는 활동이 아니라 사이트의
 * 버튼이라 `canRun`을 지나지 않는다. 같은 규칙을 두 자리가 나눠 지는 형태다.
 */
export function canMoveAfterSettlement(state: GameState): boolean {
  return !isSettled(state)
}

/**
 * 세이브 보정. **못 믿을 값이면 통째로 버린다**(`reviveRecovery`와 같은 규칙).
 *
 * ⚠️ **이 함수가 없으면 결산이 새로고침으로 풀린다** — 굳은 판을 다시 열었을 때
 * 직업·이사 잠금이 통째로 사라진다(실제로 그렇게 짤 뻔했다).
 */
export function reviveSettlement(raw: unknown): Settlement | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const { day, careerId, housingId } = raw as Partial<Settlement>
  if (typeof day !== 'number' || !Number.isFinite(day) || day <= 0) return undefined
  return {
    day: Math.round(day),
    careerId: typeof careerId === 'string' ? careerId : undefined,
    housingId: typeof housingId === 'string' ? housingId : undefined,
  }
}
