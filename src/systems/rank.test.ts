import { describe, it, expect } from 'vitest'
import {
  RANK_ORDER,
  RANK_THRESHOLDS,
  rankOf,
  rankOfRatio,
  rankProgress,
  rankRose,
  toNextRank,
} from './rank'
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


describe('rankRose', () => {
  it('오른 것만 상승이다 — 제자리·하락은 아니다', () => {
    expect(rankRose('F', 'C')).toBe(true)
    expect(rankRose('B', 'SS')).toBe(true)
    expect(rankRose('C', 'C')).toBe(false)
    // ⚠️ 이 줄이 이 함수의 존재 이유다: 평판은 마감을 놓치면 깎여 실제로 내려간다.
    expect(rankRose('A', 'B')).toBe(false)
  })
})

describe('rankProgress — 등급 구간을 채우는 막대 (2026-08-14)', () => {
  /* ⚠️ **상한이 아니라 등급 구간을 잰다** — 상한 대비로 재면 999짜리 스탯의 막대가
     대부분 비어 보여, 예전에 게이지를 걷어냈던 그 이유가 그대로 돌아온다. */
  /* ⚠️ 문턱은 **상한의 비율**이라 딱 떨어지는 정수가 아니다(C = 0.1 × 999 = 99.9).
     그래서 바닥을 잴 때는 문턱 자체를 계산해서 쓴다 — 100 같은 어림수를 넣으면
     구간에 살짝 들어간 값이 되어 0이 아니다. */
  const floorOf = (rank: string) =>
    RANK_THRESHOLDS.find((t) => t.rank === rank)!.min * growthCap('knowledge')

  it('구간 바닥에서 0, 다음 문턱 직전에 1에 가깝다', () => {
    expect(rankProgress('knowledge', floorOf('C'))).toBe(0)
    expect(rankProgress('knowledge', floorOf('B') - 0.01)).toBeCloseTo(1, 2)
  })

  /* 설계자 지시의 핵심: **꽉 차는 순간이 곧 승급**이다. */
  it('꽉 찬 다음 값에서 등급이 오르고 막대는 0으로 돌아간다', () => {
    const b = floorOf('B')
    expect(rankOf('knowledge', b - 0.01)).toBe('C')
    expect(rankProgress('knowledge', b - 0.01)).toBeCloseTo(1, 2)
    expect(rankOf('knowledge', b)).toBe('B')
    expect(rankProgress('knowledge', b)).toBe(0)
  })

  it('최고 등급은 꽉 찬 채로 둔다 — 갈 데가 없는데 빈 막대면 거짓이다', () => {
    expect(rankProgress('knowledge', growthCap('knowledge'))).toBe(1)
  })

  it('상한이 다른 스탯도 같은 규칙이다', () => {
    expect(rankProgress('reputation', growthCap('reputation') * 0.1)).toBe(0)
    expect(rankProgress('reputation', growthCap('reputation'))).toBe(1)
  })

  it('언제나 0~1 안에 있다', () => {
    for (const v of [0, 1, 99, 100, 500, 749, 998, 999]) {
      const p = rankProgress('knowledge', v)
      expect(p).toBeGreaterThanOrEqual(0)
      expect(p).toBeLessThanOrEqual(1)
    }
  })
})
