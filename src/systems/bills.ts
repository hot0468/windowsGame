import { BILLS, MISS_REPUTATION_PENALTY, NOTICE_DAYS, billOn, noticedBills } from '../data/bills'
import { clampStats, settleGameOver } from './turn'
import type { GameState } from '../types/game'

/**
 * 목돈 청구 규칙.
 *
 * ## 의존 방향
 * `bills.ts` → `turn.ts`(반대는 없다). 구독료와 같은 자리·같은 형태다.
 *
 * ## ⚠️ 낸 것을 기록한다
 * 자동 진행으로 며칠이 한 번에 흐르면 지나간 청구일을 따라잡아야 하는데, 낸 기록이
 * 없으면 매 밤 다시 문다. `GameState.paidBills`가 그 기록이고 **한 번 적힌 id는 지워지지
 * 않는다**(못 냈어도 적힌다 — 못 낸 것은 평판으로 이미 치렀다).
 */

/** 이미 지나간 청구인가. */
export function billSettled(state: GameState, id: string): boolean {
  return (state.paidBills ?? []).includes(id)
}

/** 지금 예고 중이고 아직 안 지나간 청구. 화면·메일이 읽는 목록. */
export function pendingBills(state: GameState): typeof BILLS {
  return noticedBills(state.day).filter((b) => !billSettled(state, b.id))
}

/** 그 청구까지 남은 날. 예고 중이 아니면 undefined. */
export function daysToBill(state: GameState, id: string): number | undefined {
  const bill = BILLS.find((b) => b.id === id)
  if (!bill || billSettled(state, bill.id)) return undefined
  const left = bill.day - state.day
  return left <= NOTICE_DAYS && left >= 0 ? left : undefined
}

/**
 * 밤 정산에서 오늘치 청구를 낸다. **구독료와 같은 자리에서 돈다.**
 *
 * ⚠️ **지나간 청구도 따라잡는다** — 자동 진행이 며칠을 한 번에 흘리면 그 사이의 청구일이
 * 통째로 사라진다(급여·구독과 같은 함정).
 * ⚠️ **가진 만큼만 내고 모자란 몫은 평판으로 치른다.** 그냥 빼면 잔액이 음수가 되어
 * 단발 사건이 파산을 만든다 — 종결 사유는 물가여야 한다(`data/bills.ts` 주석).
 */
export function advanceBills(state: GameState): GameState {
  const due = BILLS.filter((b) => b.day <= state.day && !billSettled(state, b.id))
  if (!due.length) return state

  let stats = state.stats
  for (const bill of due) {
    /* ⚠️ **1원은 남긴다**(랭크 대가와 같은 규칙) — 0으로 만들면 `money <= 0`이라
       그날 밤 파산 판정이 이 청구 때문에 내려간다. */
    const paid = Math.max(0, Math.min(bill.amount, stats.money - 1))
    const short = bill.amount - paid
    stats = {
      ...stats,
      money: stats.money - paid,
      reputation:
        stats.reputation -
        (short > 0 ? Math.ceil((short / bill.amount) * MISS_REPUTATION_PENALTY) : 0),
    }
  }

  return settleGameOver({
    ...state,
    stats: clampStats(stats),
    paidBills: [...(state.paidBills ?? []), ...due.map((b) => b.id)],
  })
}

/**
 * 예고 메일. **저장하지 않고 매번 만든다**(`gearMessages`·`phoneMessages`와 같은 자리).
 *
 * ⚠️ **새 알림 창구를 만들지 않는다**: 아웃룩을 그대로 탄다.
 * ⚠️ **얼마가 며칠에 나가는지 본문에 적는다** — 예고가 있어도 액수를 모르면 준비할 수 없다.
 */
export function billMessages(
  state: GameState,
): { id: string; channel: string; from: string; subject: string; text: string }[] {
  return pendingBills(state).map((bill) => {
    const left = bill.day - state.day
    const when = left <= 0 ? '오늘' : `${left}일 뒤`
    return {
      id: `bill-${bill.id}`,
      channel: 'outlook',
      from: bill.from,
      subject: bill.subject,
      text: `${bill.text}\n\n— ${when}(${bill.day}일차) ${bill.amount.toLocaleString('ko-KR')}원이 나갑니다. 잔액이 모자라면 있는 만큼만 나가고 나머지는 평판으로 남습니다.`,
    }
  })
}

/** 세이브 보정. 모르는 id는 버린다. */
export function revivePaidBills(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const ids = raw.filter((v): v is string => typeof v === 'string' && BILLS.some((b) => b.id === v))
  return ids.length ? [...new Set(ids)] : undefined
}

export { BILLS, MISS_REPUTATION_PENALTY, NOTICE_DAYS, billOn }
