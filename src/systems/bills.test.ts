import { describe, expect, it } from 'vitest'
import { BILLS, MISS_REPUTATION_PENALTY, NOTICE_DAYS } from '../data/bills'
import { BASE_LIVING_COST } from '../data/economy'
import { advanceBills, billMessages, daysToBill, pendingBills, revivePaidBills } from './bills'
import { createInitialState } from './turn'
import type { GameState } from '../types/game'

function at(day: number, money: number): GameState {
  const base = createInitialState('청구')
  return { ...base, day, stats: { ...base.stats, money, reputation: 50 } }
}

describe('목돈 청구', () => {
  it('청구일 전에는 아무것도 안 나간다', () => {
    const s = at(BILLS[0].day - 1, 500000)
    expect(advanceBills(s)).toBe(s)
  })

  it('청구일 밤에 빠지고, 같은 청구를 두 번 물지 않는다', () => {
    const bill = BILLS[0]
    const s = at(bill.day, 500000)
    const after = advanceBills(s)
    expect(s.stats.money - after.stats.money).toBe(bill.amount)
    expect(after.paidBills).toContain(bill.id)
    expect(advanceBills(after)).toBe(after)
  })

  it('며칠이 한 번에 흘러도 지나간 청구를 따라잡는다', () => {
    // ⚠️ 자동 진행이 며칠을 흘리면 그 사이 청구일이 통째로 사라지는 함정.
    const s = at(BILLS[1].day, 900000)
    const after = advanceBills(s)
    expect(after.paidBills).toEqual([BILLS[0].id, BILLS[1].id])
    expect(s.stats.money - after.stats.money).toBe(BILLS[0].amount + BILLS[1].amount)
  })

  it('⚠️ 못 내도 소지금은 음수가 안 된다 — 파산은 물가의 몫이다', () => {
    const bill = BILLS[0]
    const after = advanceBills(at(bill.day, 1000))
    expect(after.stats.money).toBeGreaterThan(0)
  })

  it('모자란 몫은 평판으로 치른다 — 전액 못 내면 최대치가 깎인다', () => {
    const bill = BILLS[0]
    const before = at(bill.day, 1)
    const after = advanceBills(before)
    expect(before.stats.reputation - after.stats.reputation).toBe(MISS_REPUTATION_PENALTY)
    // 다 내면 평판은 그대로다.
    const rich = at(bill.day, 900000)
    expect(advanceBills(rich).stats.reputation).toBe(rich.stats.reputation)
  })

  it('예고 메일은 청구 전에만 뜨고 액수와 날짜를 적는다', () => {
    const bill = BILLS[0]
    expect(billMessages(at(bill.day - NOTICE_DAYS - 1, 500000))).toHaveLength(0)
    const notice = billMessages(at(bill.day - NOTICE_DAYS, 500000))
    expect(notice).toHaveLength(1)
    // ⚠️ 숨은 비용 금지 — 본문에 금액이 반드시 있다.
    expect(notice[0].text).toContain(bill.amount.toLocaleString('ko-KR'))
    expect(daysToBill(at(bill.day - 2, 500000), bill.id)).toBe(2)
    // 낸 뒤에는 사라진다.
    const paid = advanceBills(at(bill.day, 500000))
    expect(pendingBills(paid)).toHaveLength(0)
  })

  it('세이브 보정은 모르는 id를 버린다', () => {
    expect(revivePaidBills(['없는-청구'])).toBeUndefined()
    expect(revivePaidBills([BILLS[0].id, BILLS[0].id])).toEqual([BILLS[0].id])
  })
})

describe('⚠️ 불변식 — 청구가 파산을 만들지 않는다', () => {
  /*
   * 금액이 커지면 "예고를 봐도 못 막는 날"이 생기고, 그때 판을 망치는 것은 사건이 아니라
   * 이 표가 된다. 상한은 **평시 생활비 열흘치**다 — 예고(`NOTICE_DAYS`) 안에 대출·
   * 중고마켓·정기예금을 다 동원하면 막을 수 있는 폭이다.
   * ⚠️ 2026-08-22에 기준이 바뀌었다: 옛 기준은 "마지막 물가 구간(95,000원)의 일주일치"라
   * 실제로는 지금의 열흘치보다 컸다. 물가가 안 오르게 된 뒤로 그 기준은 존재하지 않는다.
   */
  const ceiling = BASE_LIVING_COST * 10

  it('청구 하나하나가 생활비 열흘치를 넘지 않는다', () => {
    for (const b of BILLS) expect(b.amount, b.id).toBeLessThan(ceiling)
  })

  it('같은 날에 두 청구를 겹쳐 두지 않는다', () => {
    const days = BILLS.map((b) => b.day)
    expect(new Set(days).size).toBe(days.length)
  })

  it('예고 기간이 겹치지 않는다 — 겹치면 준비할 시간이 반으로 준다', () => {
    const sorted = [...BILLS].sort((a, b) => a.day - b.day)
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i].day - sorted[i - 1].day, `${sorted[i].id}`).toBeGreaterThan(NOTICE_DAYS)
    }
  })
})
