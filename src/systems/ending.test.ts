import { describe, it, expect } from 'vitest'
import { checkAchievementEnding, hasHigherTier, getFailureEnding } from './ending'
import { ACHIEVEMENT_ENDINGS } from '../data/endings'
import { INITIAL_STATS } from '../types/game'
import type { Stats } from '../types/game'

const statsWith = (overrides: Partial<Stats>): Stats => ({ ...INITIAL_STATS, ...overrides })

describe('checkAchievementEnding', () => {
  it('조건 미달이면 null을 반환한다', () => {
    expect(checkAchievementEnding(INITIAL_STATS, [])).toBeNull()
  })

  it('조건을 채우면 해당 엔딩을 반환한다', () => {
    const result = checkAchievementEnding(statsWith({ charm: 80 }), [])
    expect(result?.id).toBe('influencer')
  })

  it('여러 조건을 동시에 채우면 상위 티어를 우선한다', () => {
    const result = checkAchievementEnding(
      statsWith({ knowledge: 90, mental: 40, charm: 80 }),
      [],
    )
    expect(result?.id).toBe('bigtech')
  })

  it('조건이 여러 개인 엔딩은 전부 충족해야 한다', () => {
    const result = checkAchievementEnding(statsWith({ knowledge: 90, mental: 10 }), [])
    expect(result?.id).not.toBe('bigtech')
  })

  it('이미 본 엔딩은 다시 반환하지 않는다', () => {
    const result = checkAchievementEnding(statsWith({ charm: 80 }), ['influencer'])
    expect(result).toBeNull()
  })

  it('이미 본 엔딩을 건너뛰고 아래 티어를 반환한다', () => {
    const stats = statsWith({ charm: 80, knowledge: 40 })
    const result = checkAchievementEnding(stats, ['influencer'])
    expect(result?.id).toBe('ordinary')
  })
})

describe('현실주의자 엔딩 기준', () => {
  it('조정된 기준으로 도달 가능하다', () => {
    expect(checkAchievementEnding(statsWith({ money: 1800000 }), [])?.id).toBe('realist')
  })

  it('기준 미달이면 도달하지 않는다', () => {
    expect(checkAchievementEnding(statsWith({ money: 1799999 }), [])?.id).not.toBe('realist')
  })

  it('물가 외삽 후 도달 가능한 최대 잔고 아래에 있다', () => {
    // 시뮬레이션상 알바 특화 플레이의 최고 잔고는 약 265만원이다.
    // 기준이 그보다 높으면 엔딩이 영영 도달 불가가 된다.
    const realist = ACHIEVEMENT_ENDINGS.find((e) => e.id === 'realist')!
    expect(realist.condition?.money).toBeLessThan(2650000)
  })
})

describe('hasHigherTier', () => {
  it('최상위 엔딩은 상위가 없다', () => {
    const top = checkAchievementEnding(statsWith({ knowledge: 90, mental: 40 }), [])!
    expect(hasHigherTier(top)).toBe(false)
  })

  it('하위 엔딩은 상위가 있다', () => {
    const low = checkAchievementEnding(statsWith({ knowledge: 40, charm: 40 }), [])!
    expect(hasHigherTier(low)).toBe(true)
  })
})

describe('getFailureEnding', () => {
  it('파산 엔딩을 반환한다', () => {
    expect(getFailureEnding('bankrupt').isFailure).toBe(true)
  })

  it('번아웃 엔딩을 반환한다', () => {
    expect(getFailureEnding('burnout').id).toBe('burnout')
  })
})
