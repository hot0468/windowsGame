import { describe, it, expect } from 'vitest'
import { getEconomyTier, getLivingCost, getWageMultiplier, getNextTier } from './economy'

describe('getEconomyTier', () => {
  it('1일차는 첫 구간을 반환한다', () => {
    expect(getEconomyTier(1).living).toBe(30000)
  })

  it('구간 경계 직전에는 이전 구간을 유지한다', () => {
    expect(getEconomyTier(10).living).toBe(30000)
  })

  it('구간 경계일에 다음 구간으로 넘어간다', () => {
    expect(getEconomyTier(11).living).toBe(38000)
  })

  it('마지막 표 구간 당일은 표의 값을 그대로 쓴다', () => {
    expect(getEconomyTier(51).living).toBe(95000)
    expect(getEconomyTier(51).wageMultiplier).toBe(1.55)
  })

  it('마지막 표 구간과 다음 외삽 구간 사이에는 값이 유지된다', () => {
    expect(getEconomyTier(60).living).toBe(95000)
  })

  it('마지막 표 구간을 넘어서면 생활비가 계속 오른다', () => {
    expect(getEconomyTier(61).living).toBeGreaterThan(95000)
    expect(getEconomyTier(71).living).toBeGreaterThan(getEconomyTier(61).living)
    expect(getEconomyTier(999).living).toBeGreaterThan(getEconomyTier(101).living)
  })

  it('외삽 구간에서도 10일 주기로만 인상된다', () => {
    expect(getEconomyTier(61).living).toBe(getEconomyTier(70).living)
    expect(getEconomyTier(71).living).toBeGreaterThan(getEconomyTier(70).living)
  })
})

describe('물가 외삽 — 무한 플레이 차단', () => {
  it('알바비도 오르지만 생활비보다 훨씬 느리게 오른다', () => {
    const livingRatio = getLivingCost(151) / getLivingCost(51)
    const wageRatio = getWageMultiplier(151) / getWageMultiplier(51)
    expect(wageRatio).toBeGreaterThan(1)
    expect(wageRatio).toBeLessThan(livingRatio)
  })

  it('생활비가 결국 하루 최대 수입(알바 2회)을 넘어선다', () => {
    // 알바 기본 보상 60000원 * 하루 2슬롯이 이론상 최대 수입이다.
    const maxDailyIncome = (day: number) => 2 * 60000 * getWageMultiplier(day)
    expect(getLivingCost(51)).toBeLessThan(maxDailyIncome(51))
    expect(getLivingCost(91)).toBeGreaterThan(maxDailyIncome(91))
  })

  it('한 번 역전된 뒤에는 영구히 회복되지 않는다', () => {
    const maxDailyIncome = (day: number) => 2 * 60000 * getWageMultiplier(day)
    for (let day = 91; day <= 1000; day += 10) {
      expect(getLivingCost(day)).toBeGreaterThan(maxDailyIncome(day))
    }
  })
})

describe('getLivingCost', () => {
  it('해당 날짜의 생활비를 반환한다', () => {
    expect(getLivingCost(25)).toBe(48000)
  })
})

describe('getWageMultiplier', () => {
  it('알바비 배율은 생활비 인상률보다 낮게 오른다', () => {
    const livingRatio = getLivingCost(51) / getLivingCost(1)
    const wageRatio = getWageMultiplier(51) / getWageMultiplier(1)
    expect(wageRatio).toBeLessThan(livingRatio)
  })
})

describe('getNextTier', () => {
  it('다음 인상 구간을 반환한다', () => {
    expect(getNextTier(5).day).toBe(11)
  })

  it('표를 넘어선 날짜에서도 다음 구간을 반환한다', () => {
    // null을 반환하면 후반에 인상 경고가 사라져 압박이 전달되지 않는다.
    const next = getNextTier(999)
    expect(next.day).toBeGreaterThan(999)
    expect(next.living).toBeGreaterThan(getLivingCost(999))
  })

  it('다음 구간은 항상 현재 날짜보다 미래다', () => {
    for (const day of [1, 10, 51, 61, 100, 137, 500]) {
      expect(getNextTier(day).day).toBeGreaterThan(day)
    }
  })
})
