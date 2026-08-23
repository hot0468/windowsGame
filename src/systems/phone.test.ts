import { DAY_END } from '../data/clock'
import { describe, expect, it } from 'vitest'
import { findActivity } from '../data/activities'
import { PHONE_BONUS, PHONE_FEE, PHONE_ID, PHONE_STAT, findItem } from '../data/items'
import { BILLING_INTERVAL_DAYS } from '../data/subscriptions'
import { advancePhoneBill, daysToPhoneBill, phoneBonusFor, phoneMessages } from './phone'
import { createInitialState, itemStatBonusFor, runActivity } from './turn'
import type { GameState } from '../types/game'

/** 산 날이 `day`인 휴대폰을 들고 있는 판. */
function withPhone(day = 1, money = 500000): GameState {
  const base = createInitialState('통신')
  return {
    ...base,
    day,
    stats: { ...base.stats, money, stamina: 100, mental: 100 },
    inventory: [{ id: PHONE_ID, day }],
  }
}

describe('휴대폰 — 가지고 있으면 친화력이 잘 오른다', () => {
  it('도착 효과가 없다 — 값어치는 가지고 있는 동안 나온다', () => {
    // ⚠️ effects가 생기면 사고 팔기를 반복해 상승분을 반복 수령할 길이 열린다.
    expect(findItem(PHONE_ID)!.effects).toEqual({})
  })

  it('친화력에만 붙는다', () => {
    const s = withPhone()
    expect(phoneBonusFor(s, PHONE_STAT)).toBe(PHONE_BONUS)
    expect(phoneBonusFor(s, 'knowledge')).toBe(0)
    expect(phoneBonusFor(createInitialState('맨손'), PHONE_STAT)).toBe(0)
  })

  it('실제 실행에서도 친화력만 더 오른다', () => {
    const club = findActivity('club')!
    const base = { ...createInitialState('비교'), minute: DAY_END - 60, slot: 'afternoon' as const }
    const rich = { ...base, stats: { ...base.stats, money: 500000 } }
    const bare = runActivity(rich, club)
    const withIt = runActivity({ ...rich, inventory: [{ id: PHONE_ID, day: 1 }] }, club)
    const raw = club.effects.sociability!
    expect(withIt.stats.sociability - bare.stats.sociability).toBe(Math.round(raw * PHONE_BONUS))
    // 같은 활동이 올리는 매력은 그대로다.
    expect(withIt.stats.charm).toBe(bare.stats.charm)
  })

  it('옷 보너스와 겹쳐 쌓인다 — 서로 다른 것을 본다', () => {
    // 실행이 쓰는 합산 함수가 곧 미리보기가 쓰는 함수다(둘이 갈리면 확인창이 거짓이 된다).
    expect(itemStatBonusFor(withPhone(), PHONE_STAT)).toBe(PHONE_BONUS)
  })
})

describe('휴대폰 요금', () => {
  it('주기가 안 됐으면 아무 일도 없다', () => {
    // 산 날 1 + 30 = 31일차부터 청구다. 30일차에는 상태가 **그대로** 돌아와야 한다.
    const s = { ...withPhone(1), day: BILLING_INTERVAL_DAYS }
    expect(advancePhoneBill(s)).toBe(s)
    expect(daysToPhoneBill(s)).toBe(1)
  })

  it('한 달이 지나면 요금이 빠지고 커서가 옮겨진다', () => {
    const due = { ...withPhone(1), day: 1 + BILLING_INTERVAL_DAYS }
    const after = advancePhoneBill(due)
    expect(due.stats.money - after.stats.money).toBe(PHONE_FEE)
    expect(after.phoneBilledDay).toBe(1 + BILLING_INTERVAL_DAYS)
    // 같은 날 다시 돌려도 두 번 빠지지 않는다.
    expect(advancePhoneBill(after).stats.money).toBe(after.stats.money)
  })

  it('며칠이 한 번에 흘러도 밀린 달을 차례로 따라잡는다', () => {
    const due = { ...withPhone(1), day: 1 + BILLING_INTERVAL_DAYS * 3 }
    const after = advancePhoneBill(due)
    expect(due.stats.money - after.stats.money).toBe(PHONE_FEE * 3)
  })

  it('못 내면 회선이 정지되고 기기가 빠진다 — 소지금은 음수가 되지 않는다', () => {
    const broke = { ...withPhone(1, PHONE_FEE), day: 1 + BILLING_INTERVAL_DAYS }
    const after = advancePhoneBill(broke)
    expect(after.stats.money).toBe(PHONE_FEE)
    expect(after.inventory?.some((i) => i.id === PHONE_ID)).toBe(false)
    expect(after.suspendedPhone).toBe(true)
    // 정지된 뒤에는 보너스도 사라진다.
    expect(phoneBonusFor(after, PHONE_STAT)).toBe(0)
    expect(phoneMessages(after)).toHaveLength(1)
  })

  it('휴대폰이 없으면 요금도 안내문도 없다', () => {
    const s = { ...createInitialState('맨손'), day: 90 }
    expect(advancePhoneBill(s)).toBe(s)
    expect(daysToPhoneBill(s)).toBeUndefined()
    expect(phoneMessages(s)).toHaveLength(0)
  })
})
