import { describe, it, expect } from 'vitest'
import {
  RANK_ORDER,
  RANK_THRESHOLDS,
  rankOf,
  rankOfRatio,
  rankProgress,
  rankUps,
  toNextRank,
} from './rank'
import { growthCap } from './turn'
import { GROWTH_STAT_KEYS, INITIAL_STATS } from '../types/game'
import type { Stats } from '../types/game'

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

describe('등급 구간 진행도', () => {
  it('등급이 막 바뀐 자리는 0이다 — 승급하면 막대가 비어 다시 시작한다', () => {
    for (const key of GROWTH_STAT_KEYS) {
      const cap = growthCap(key)
      for (const { rank, min } of RANK_THRESHOLDS) {
        if (rank === 'SS') continue
        expect(rankProgress(key, Math.ceil(min * cap)), `${key} ${rank} 문턱`).toBeLessThan(0.1)
      }
    }
  })

  /**
   * ⚠️ 이 게임에서 막대와 글자가 갈리면 거짓말이 된다: 다 찬 막대 옆에 "다음까지 30 남음"이
   * 붙으면 어느 쪽을 믿어야 할지 답할 수 없다. 두 함수가 같은 것을 말하는지 순회로 지킨다.
   */
  it('`toNextRank`와 같은 것을 말한다 — 남은 게 없을 때만 막대가 다 찬다', () => {
    for (const key of GROWTH_STAT_KEYS) {
      const cap = growthCap(key)
      for (let v = 0; v <= cap; v += Math.max(1, Math.floor(cap / 53))) {
        const full = rankProgress(key, v) >= 1
        expect(full, `${key} ${v}`).toBe(toNextRank(key, v) === undefined)
      }
    }
  })

  it('최고 등급은 1이다 — 다음 구간이 없어 나눌 것이 없다', () => {
    expect(rankProgress('knowledge', growthCap('knowledge'))).toBe(1)
  })

  it('범위를 벗어난 값도 0~1 안에 있다', () => {
    expect(rankProgress('knowledge', -50)).toBe(0)
    expect(rankProgress('knowledge', growthCap('knowledge') * 3)).toBe(1)
  })
})

describe('승급 판정', () => {
  const at = (over: Partial<Stats>): Stats => ({ ...INITIAL_STATS, ...over })

  it('오른 것만 잡는다 — 내려간 스탯은 알릴 것이 없다', () => {
    const before = at({ knowledge: 500, charm: 500 })
    const after = at({ knowledge: 760, charm: 0 })
    expect(rankUps(before, after)).toEqual([{ key: 'knowledge', from: 'A', to: 'S' }])
  })

  it('값이 늘어도 등급이 그대로면 잡지 않는다 — 매 턴 뜨면 연출이 아니라 통행세다', () => {
    expect(rankUps(at({ knowledge: 500 }), at({ knowledge: 520 }))).toEqual([])
  })

  it('두 칸을 한 번에 뛰어도 한 줄이다 — 도착한 등급만 말한다', () => {
    expect(rankUps(at({ knowledge: 0 }), at({ knowledge: 500 }))).toEqual([
      { key: 'knowledge', from: 'F', to: 'A' },
    ])
  })

  /** 상한이 다른 스탯이 섞여도 같은 기준으로 읽혀야 한다 — 랭크의 존재 이유 그 자체다. */
  it('상한 100짜리(평판)와 999짜리(지식)를 함께 잡는다', () => {
    const ups = rankUps(at({}), at({ knowledge: 300, reputation: 30 }))
    expect(ups.map((u) => u.key)).toEqual(['knowledge', 'reputation'])
    expect(ups.every((u) => u.to === 'B')).toBe(true)
  })
})
