import { describe, it, expect } from 'vitest'
import {
  advanceInternetBill,
  canChangePlan,
  changeBlockers,
  changePlan,
  daysToInternetBill,
  planOf,
  timeFactorOf,
} from './internet'
import { DEFAULT_PLAN_ID, INTERNET_PLANS } from '../data/internet'
import { BILLING_INTERVAL_DAYS } from '../data/subscriptions'
import { activityMinutes, createInitialState } from './turn'
import { findActivity, minutesOf } from '../data/activities'
import type { GameState } from '../types/game'

const study = findActivity('study')!
const rich = (): GameState => {
  const base = createInitialState('가입자')
  return { ...base, stats: { ...base.stats, money: 3_000_000 } }
}
const PAID = INTERNET_PLANS.find((p) => p.monthly > 0)!

describe('요금제', () => {
  it('안 고르면 기본 회선이고 배율이 1이다', () => {
    const s = createInitialState('기본')
    expect(planOf(s).id).toBe(DEFAULT_PLAN_ID)
    expect(timeFactorOf(s)).toBe(1)
    expect(daysToInternetBill(s)).toBeUndefined()
  })

  it('⚠️ 없는 요금제가 저장돼 있어도 기본 회선으로 읽는다 — 배율이 NaN이 되면 안 된다', () => {
    const broken: GameState = { ...createInitialState('손상'), internet: { planId: '없음', since: 1 } }
    expect(planOf(broken).id).toBe(DEFAULT_PLAN_ID)
    expect(Number.isFinite(timeFactorOf(broken))).toBe(true)
  })

  it('바꾸면 첫 달 요금이 그 자리에서 나가고 턴은 안 쓴다', () => {
    const before = rich()
    const after = changePlan(before, PAID.id)
    expect(planOf(after).id).toBe(PAID.id)
    expect(before.stats.money - after.stats.money).toBe(PAID.monthly)
    expect(after.day).toBe(before.day)
    expect(after.minute).toBe(before.minute)
  })

  it('돈이 모자라면 못 바꾸고 사유가 나온다', () => {
    const poor: GameState = { ...rich(), stats: { ...rich().stats, money: 1000 } }
    expect(canChangePlan(poor, PAID.id)).toBe(false)
    expect(changeBlockers(poor, PAID.id)[0]).toContain('모자랍니다')
    expect(changePlan(poor, PAID.id)).toBe(poor)
  })

  it('쓰고 있는 요금제로는 다시 못 바꾼다 — 누를 때마다 돈이 나가면 안 된다', () => {
    const s = changePlan(rich(), PAID.id)
    expect(canChangePlan(s, PAID.id)).toBe(false)
    expect(changePlan(s, PAID.id)).toBe(s)
  })
})

describe('활동 시간', () => {
  it('⚠️ 비싼 요금제일수록 같은 활동이 짧게 끝난다 — 이 규칙이 요금제의 전부다', () => {
    const basic = createInitialState('기본')
    const fast = changePlan(rich(), PAID.id)
    expect(activityMinutes(basic, study)).toBe(minutesOf(study))
    expect(activityMinutes(fast, study)).toBeLessThan(activityMinutes(basic, study))
  })

  it('아무리 빨라도 활동이 공짜가 되지 않는다', () => {
    for (const plan of INTERNET_PLANS) {
      const s = { ...rich(), internet: { planId: plan.id, since: 1 } }
      for (const a of [study, findActivity('work')!]) {
        expect(activityMinutes(s, a)).toBeGreaterThanOrEqual(10)
      }
    }
  })
})

describe('청구', () => {
  it('한 달이 지나면 요금이 나간다', () => {
    const s = changePlan(rich(), PAID.id)
    const later = advanceInternetBill({ ...s, day: s.day + BILLING_INTERVAL_DAYS })
    expect(s.stats.money - later.stats.money).toBe(PAID.monthly)
  })

  it('밀린 달을 차례로 따라잡는다 — 자동 진행으로 넘어간 달이 공짜가 되면 안 된다', () => {
    const s = changePlan(rich(), PAID.id)
    const later = advanceInternetBill({ ...s, day: s.day + BILLING_INTERVAL_DAYS * 3 })
    expect(s.stats.money - later.stats.money).toBe(PAID.monthly * 3)
  })

  it('⚠️ 못 내면 외상이 아니라 기본 회선으로 강등된다 — 소지금이 음수가 되면 파산 판정이 흐려진다', () => {
    const s = changePlan(rich(), PAID.id)
    const broke: GameState = {
      ...s,
      day: s.day + BILLING_INTERVAL_DAYS,
      stats: { ...s.stats, money: PAID.monthly },
    }
    const after = advanceInternetBill(broke)
    expect(planOf(after).id).toBe(DEFAULT_PLAN_ID)
    expect(after.internet?.downgraded).toBe(true)
    expect(after.stats.money).toBeGreaterThan(0)
  })

  it('기본 회선은 청구가 없다', () => {
    const s = createInitialState('기본')
    const later = { ...s, day: s.day + BILLING_INTERVAL_DAYS * 5 }
    expect(advanceInternetBill(later)).toBe(later)
  })
})
