import { describe, it, expect } from 'vitest'
import { RANK_ORDER, RANK_THRESHOLDS, rankOf, rankOfRatio, toNextRank } from './rank'
import { growthCap } from './turn'
import { GROWTH_STAT_KEYS } from '../types/game'

describe('랭크 척도', () => {
  it('여섯 단계다 (설계자 지시: F·C·B·A·S·SS)', () => {
    expect(RANK_ORDER).toEqual(['F', 'C', 'B', 'A', 'S', 'SS'])
  })

  it('문턱 표는 높은 등급부터 내림차순이다 — 뒤집히면 모든 스탯이 F가 된다', () => {
    const mins = RANK_THRESHOLDS.map((t) => t.min)
    expect([...mins].sort((a, b) => b - a)).toEqual(mins)
  })

  it('최하 등급의 문턱은 0이다 — 0점짜리 스탯도 등급을 받는다', () => {
    expect(RANK_THRESHOLDS.at(-1)).toEqual({ rank: 'F', min: 0 })
  })

  it('문턱 표와 순서 목록이 같은 여섯 등급을 담는다', () => {
    expect(RANK_THRESHOLDS.map((t) => t.rank).sort()).toEqual([...RANK_ORDER].sort())
  })
})

describe('비율 → 등급', () => {
  it('경계값은 그 등급에 포함된다 (>= 판정)', () => {
    for (const { rank, min } of RANK_THRESHOLDS) expect(rankOfRatio(min)).toBe(rank)
  })

  it('만점은 SS, 0점은 F다', () => {
    expect(rankOfRatio(1)).toBe('SS')
    expect(rankOfRatio(0)).toBe('F')
  })

  it('범위를 벗어난 값도 안전하다 — 상한을 넘긴 세이브가 들어와도 터지지 않는다', () => {
    expect(rankOfRatio(5)).toBe('SS')
    expect(rankOfRatio(-1)).toBe('F')
    expect(rankOfRatio(NaN)).toBe('F')
  })

  it('비율이 오를 때 등급이 내려가지 않는다 (단조 증가)', () => {
    let prev = 0
    for (let r = 0; r <= 1.0001; r += 0.01) {
      const i = RANK_ORDER.indexOf(rankOfRatio(r))
      expect(i).toBeGreaterThanOrEqual(prev)
      prev = i
    }
  })
})

/**
 * ⚠️ **이 구역이 이 파일의 핵심이다.**
 * 랭크가 상한을 자기가 다시 적으면 평판(상한 100)이 999 기준으로 계산돼 영원히 F에 머문다.
 * 눈에 보이는 버그가 아니라 "그 줄만 조용히 안 오르는" 종류라 순회로 지킨다.
 */
describe('상한의 단일 출처는 growthCap이다', () => {
  it.each(GROWTH_STAT_KEYS)('%s는 자기 상한에서 SS가 된다', (key) => {
    expect(rankOf(key, growthCap(key))).toBe('SS')
  })

  it.each(GROWTH_STAT_KEYS)('%s는 0에서 F다', (key) => {
    expect(rankOf(key, 0)).toBe('F')
  })

  it('상한이 다른 두 스탯이 같은 비율에서 같은 등급을 받는다', () => {
    // 평판은 100, 지식은 999가 상한이다. 절대값으로 재면 이 둘은 절대 안 맞는다.
    expect(growthCap('reputation')).toBe(100)
    expect(rankOf('reputation', 50)).toBe(rankOf('knowledge', 999 * 0.5))
  })
})

describe('다음 등급까지', () => {
  it('최고 등급이면 남은 것이 없다', () => {
    expect(toNextRank('knowledge', growthCap('knowledge'))).toBeUndefined()
  })

  it('알려 준 만큼 채우면 실제로 등급이 오른다 — 소수점을 버리면 안 오른다', () => {
    for (const key of GROWTH_STAT_KEYS) {
      const cap = growthCap(key)
      for (let v = 0; v < cap; v += Math.max(1, Math.floor(cap / 37))) {
        const need = toNextRank(key, v)
        if (need === undefined) continue
        const before = RANK_ORDER.indexOf(rankOf(key, v))
        const after = RANK_ORDER.indexOf(rankOf(key, v + need))
        expect(after, `${key} ${v}에서 ${need} 더해도 등급이 그대로다`).toBe(before + 1)
      }
    }
  })

  it('항상 1 이상이다 — 0이면 "조금만 더"가 영원히 뜬다', () => {
    for (const key of GROWTH_STAT_KEYS) {
      for (let v = 0; v < growthCap(key); v++) {
        const need = toNextRank(key, v)
        if (need !== undefined) expect(need).toBeGreaterThanOrEqual(1)
      }
    }
  })
})

