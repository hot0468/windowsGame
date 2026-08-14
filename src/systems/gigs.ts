import { GIGS, MISS_REPUTATION_PENALTY, findGig } from '../data/gigs'
import { clampStats, owns, settleRecovery } from './turn'
import type { Gig } from '../data/gigs'
import type { GameState, GigState } from '../types/game'

/**
 * 그몽 외주 — 수주 · 작업 · 납품 · 마감.
 *
 * ## 흐름
 * 1. **수주**: 그몽에서 일감을 받는다. ⚠️ **턴을 쓰지 않는다** — 계약을 수락하는 것은
 *    시간을 쓰는 일이 아니다(은행 거래·쇼핑 주문과 같은 규칙). 대신 **기한이 걸린다.**
 * 2. **작업**: 그 일감의 도구(포토샵/프리미어/VS 코드)를 켠다. 한 번이 1턴이고
 *    업무량이 `WORK_PER_SESSION`만큼 오른다 — 실제 적용은 `runActivity`가 한다
 *    (실행 통로가 넷이라 그 밖에 두면 하나가 반드시 샌다. `stampArtwork`와 같은 자리).
 * 3. **납품**: 업무량을 다 채우는 **그 자리에서** 보수가 들어온다.
 *    ⚠️ 밤으로 미루지 않는다 — 미루면 `nightPayoutPending`에 원천이 하나 더 생기고,
 *    "다 했는데 그날 밤 굶어 죽는" 판이 난다. 즉시 지급이면 그 위험 자체가 없다.
 * 4. **마감**: 기한이 지나면 실패한다(`advanceGigs`). 위약금이 아니라 **평판**을 깎는다.
 *
 * ## ⚠️ 보수는 물가 배율을 타지 않는다
 * 정규직 급여·트위터 정산과 **같은 장치**다. 외주가 물가를 따라 오르면 후반에도 살아남는
 * 수입원이 되어 "판은 반드시 끝난다"가 무너진다. 여기서는 `scalesWithWage`를 쓰지 않고
 * `Gig.pay`를 그대로 준다.
 *
 * ## 의존 방향
 * `gigs.ts` → `turn.ts` (반대는 없다). `turn.ts`가 아는 것은 `Activity.toolId`라는
 * 표식과 `GameState.gigs`의 모양뿐이고, 규칙은 전부 여기 있다.
 */

export function emptyGigs(): GigState {
  return { done: [], missed: 0, earned: 0 }
}

export function gigsOf(state: GameState): GigState {
  return state.gigs ?? emptyGigs()
}

/** 지금 받아 둔 일. 없으면 undefined. */
export function activeContract(state: GameState) {
  return gigsOf(state).active
}

/** 그 일감을 이미 납품했는가. 같은 일을 무한히 되받을 수 없게 하는 판정이다. */
export function isDone(state: GameState, gigId: string): boolean {
  return gigsOf(state).done.includes(gigId)
}

/** 마감까지 남은 날. 받아 둔 일이 없으면 undefined. 0이면 오늘이 마지막 날이다. */
export function daysLeft(state: GameState): number | undefined {
  const c = activeContract(state)
  return c ? c.dueDay - state.day : undefined
}

/**
 * 지금 이 일감을 받을 수 있는가. **못 받는 이유는 `takeBlockers`가 글자로 만든다** —
 * 화면이 두 번째 판정을 만들지 않게 판정과 사유를 나란히 둔다(`blockReasons`와 같은 규칙).
 */
export function canTake(state: GameState, gig: Gig): boolean {
  return takeBlockers(state, gig).length === 0
}

export function takeBlockers(state: GameState, gig: Gig): string[] {
  const reasons: string[] = []
  if (state.recovery) return ['게임이 끝나 더 이상 일을 받을 수 없습니다.']
  if (activeContract(state)) reasons.push('이미 받아 둔 일이 있습니다 — 한 번에 하나만 받습니다')
  if (isDone(state, gig.id)) reasons.push('이미 납품한 일감입니다')
  if (gig.requiresItem && !owns(state, gig.requiresItem)) {
    reasons.push('자격 요건을 갖추지 못했습니다')
  }
  return reasons
}

/**
 * 일감을 받는다. **턴을 쓰지 않고 돈도 오가지 않는다** — 이 순간 생기는 것은 **기한**뿐이다.
 * 조건이 안 되면 상태를 그대로 돌려준다(반쪽 상태 금지).
 */
export function takeGig(state: GameState, gigId: string): GameState {
  const gig = findGig(gigId)
  if (!gig || !canTake(state, gig)) return state
  const prev = gigsOf(state)
  return {
    ...state,
    gigs: {
      ...prev,
      active: { gigId, takenDay: state.day, dueDay: state.day + gig.days, progress: 0 },
    },
  }
}

/**
 * 받아 둔 일을 포기한다. ⚠️ **마감을 놓친 것과 같은 대가를 치른다**(평판) —
 * 그렇지 않으면 "안 될 것 같으면 포기"가 언제나 공짜라 기한이 아무 무게도 갖지 못한다.
 */
export function abandonGig(state: GameState): GameState {
  const prev = state.gigs
  if (!prev?.active) return state
  return {
    ...state,
    stats: clampStats({
      ...state.stats,
      reputation: state.stats.reputation - MISS_REPUTATION_PENALTY,
    }),
    gigs: { ...prev, active: undefined, missed: prev.missed + 1 },
  }
}

/**
 * 도구 한 세션의 반영은 **`systems/turn.ts`에 있고 여기서 재수출한다.**
 *
 * ⚠️ `owns`/`inventoryOf`가 `delivery.ts`에서 `turn.ts`로 옮겨 간 것과 **정확히 같은 이유**다:
 * 활동을 실행하는 통로가 넷이라 반영이 `runActivity` 밖에 있으면 그중 하나(스케줄러 예약)가
 * 반드시 샌다. 그런데 `gigs.ts`는 이미 `turn.ts`를 부르므로 반대 방향 import는 순환이 된다.
 * 그래서 **함수는 아래 계층(turn)에 두고 규칙의 집은 여기로 남긴다.**
 */
export { applyToolSession } from './turn'

/**
 * 밤 정산 — **기한이 지난 계약을 실패로 닫는다.**
 *
 * ⚠️ **돈을 만지지 않는다**(평판만 깎는다) — 그래서 `nightPayoutPending`에 원천을 더할
 * 필요가 없고, 밤 정산 어디에 놓아도 파산 판정이 흔들리지 않는다(자격시험 발표와 같은 부류).
 * 다만 평판이 0 밑으로 내려가지 않도록 `clampStats`를 지나고, 그 김에 `settleRecovery`로
 * 판정을 한 번 물어본다(멘탈·소지금은 안 건드리므로 사실상 통과다).
 */
export function advanceGigs(state: GameState): GameState {
  const prev = state.gigs
  const contract = prev?.active
  if (!prev || !contract || state.recovery) return state
  if (state.day <= contract.dueDay) return state

  return settleRecovery({
    ...state,
    stats: clampStats({
      ...state.stats,
      reputation: state.stats.reputation - MISS_REPUTATION_PENALTY,
    }),
    gigs: { ...prev, active: undefined, missed: prev.missed + 1 },
  })
}

/** 아직 받을 수 있는 일감(납품한 것은 빠진다). 화면이 목록을 만드는 곳. */
export function openGigs(state: GameState): Gig[] {
  return GIGS.filter((g) => !isDone(state, g.id))
}
