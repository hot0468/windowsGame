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

  it('마지막 구간을 넘어선 날짜는 마지막 구간을 유지한다', () => {
    expect(getEconomyTier(999).living).toBe(95000)
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
    expect(getNextTier(5)?.day).toBe(11)
  })

  it('마지막 구간에서는 null을 반환한다', () => {
    expect(getNextTier(999)).toBeNull()
  })
})
