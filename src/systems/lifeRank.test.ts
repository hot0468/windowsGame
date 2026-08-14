import { describe, expect, it } from 'vitest'
import { lifeProgress, lifeRankOf, lifeRankRose, lifeRatio } from './lifeRank'
import { growthCap } from './turn'
import { GROWTH_STAT_KEYS, INITIAL_STATS } from '../types/game'
import type { Stats } from '../types/game'

/** 성장 스탯 전부를 상한의 `ratio`만큼 채운 스탯. */
function filled(ratio: number): Stats {
  const stats = { ...INITIAL_STATS }
  for (const key of GROWTH_STAT_KEYS) stats[key] = growthCap(key) * ratio
  return stats
}

describe('생활 등급', () => {
  it('빈 스탯은 F, 만점은 SS다', () => {
    expect(lifeRankOf(filled(0)).rank).toBe('F')
    expect(lifeRankOf(filled(1)).rank).toBe('SS')
  })

  /* ⚠️ 상한이 다른 스탯을 절대값으로 합치면 평판·도덕·예의범절(상한 100)이 묻힌다. */
  it('상한이 다른 스탯을 같은 무게로 센다', () => {
    expect(lifeRatio(filled(0.5))).toBeCloseTo(0.5, 5)
  })

  it('소모 자원은 등급을 흔들지 않는다 — 쌓아 온 것만 센다', () => {
    const rich = { ...filled(0.5), money: 99_999_999, stamina: 100, mental: 100 }
    const poor = { ...filled(0.5), money: 0, stamina: 1, mental: 1 }
    expect(lifeRatio(rich)).toBeCloseTo(lifeRatio(poor), 10)
  })
})

describe('끝이 없다 — 천장에 닿아도 목표가 끊기지 않는다', () => {
  it('SS를 넘어서면 plus가 붙는다', () => {
    expect(lifeRankOf(filled(0.95)).label).toBe('SS')
    expect(lifeRankOf(filled(1)).plus).toBeGreaterThan(0)
    expect(lifeRankOf(filled(1)).label).toMatch(/^SS\+\d+$/)
  })

  /* SS에 닿는 순간 게이지가 100%로 굳으면 "다음"이 사라진다 — 그게 끝이 있는 게임이다. */
  it('SS 안에서도 게이지가 굳지 않는다', () => {
    expect(lifeProgress(filled(0.96))).toBeLessThan(1)
    expect(lifeProgress(filled(0.99))).toBeLessThan(1)
  })
})

describe('진행 게이지', () => {
  it('등급 문턱 바로 위는 0에 가깝다', () => {
    expect(lifeProgress(filled(0.3))).toBeCloseTo(0, 5)
  })

  it('다음 문턱에 가까울수록 1에 가깝다', () => {
    expect(lifeProgress(filled(0.49))).toBeGreaterThan(lifeProgress(filled(0.31)))
  })

  it('항상 0~1 안에 있다', () => {
    for (const r of [0, 0.05, 0.3, 0.5, 0.75, 0.95, 1]) {
      const p = lifeProgress(filled(r))
      expect(p).toBeGreaterThanOrEqual(0)
      expect(p).toBeLessThanOrEqual(1)
    }
  })
})

describe('승급 판정', () => {
  it('오른 것만 승급이다 — 내려간 것은 아니다', () => {
    const b = lifeRankOf(filled(0.3))
    const a = lifeRankOf(filled(0.5))
    expect(lifeRankRose(b, a)).toBe(true)
    expect(lifeRankRose(a, b)).toBe(false)
    expect(lifeRankRose(a, a)).toBe(false)
  })

  it('SS 안에서 plus가 오르는 것도 승급이다', () => {
    expect(lifeRankRose(lifeRankOf(filled(0.95)), lifeRankOf(filled(1)))).toBe(true)
  })
})
