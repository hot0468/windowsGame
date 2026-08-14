import { describe, it, expect } from 'vitest'
import { checkAchievementEnding, hasHigherTier } from './ending'
import { ACHIEVEMENT_ENDINGS, ENDINGS } from '../data/endings'
import { CAREERS } from '../data/careers'
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
    // 매력 80(인플루언서 · tier 3)과 지식 40+매력 40(평범한 일상 · tier 1)을 함께 채운 상태.
    const result = checkAchievementEnding(statsWith({ charm: 80, knowledge: 40 }), [])
    expect(result?.id).toBe('influencer')
  })

  it('조건이 여러 개인 엔딩은 전부 충족해야 한다', () => {
    // 평범한 일상은 지식 40 **그리고** 매력 40이다.
    const result = checkAchievementEnding(statsWith({ knowledge: 40, charm: 10 }), [])
    expect(result?.id).not.toBe('ordinary')
  })

  /**
   * ⚠️ 2026-08-05 설계자 지시로 뒤집힌 규칙이다:
   * **"직업엔딩은 취직한 순간이 아닌 돈 없어서 죽은 후 뜨게 해."**
   * 예전에는 지식 90 · 멘탈 40이면 게임 도중 '대기업 합격'이 떴다.
   */
  it('지식 90 · 멘탈 40으로는 대기업 엔딩이 뜨지 않는다 — 직업은 스탯 문턱이 아니다', () => {
    const result = checkAchievementEnding(statsWith({ knowledge: 90, mental: 40 }), [])
    expect(result?.id).not.toBe('bigtech')
  })

  /* ⚠️ 예전에는 `careerId`가 안 붙었는지도 함께 봤다 — 직업 엔딩이 도감 콜렉션으로
     옮겨 가면서(2026-08-14) 그 필드 자체가 없어졌다. */
  it('성취 엔딩은 전부 스탯 조건을 갖는다', () => {
    for (const e of ACHIEVEMENT_ENDINGS) {
      expect(e.condition, `${e.id}에 조건이 없다`).toBeDefined()
    }
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
    // 대기업이 성취 엔딩에서 빠지면서 인플루언서(tier 3)가 최상위가 됐다.
    const top = checkAchievementEnding(statsWith({ charm: 80 }), [])!
    expect(hasHigherTier(top)).toBe(false)
  })

  it('하위 엔딩은 상위가 있다', () => {
    const low = checkAchievementEnding(statsWith({ knowledge: 40, charm: 40 }), [])!
    expect(hasHigherTier(low)).toBe(true)
  })
})

/**
 * 직업 콜렉션 (2026-08-14).
 *
 * ⚠️ **여기 있던 블록 셋이 통째로 뒤집혔다.** `getFailureEnding`·`직업 엔딩 정의`·
 * `epitaphCareerId`는 전부 **"파산해야 직업 엔딩이 뜬다"**를 지키고 있었는데, 게임오버가
 * 없어져 함수들이 사라졌다. 취직 기록은 이제 도감의 직업 시트가 받는다.
 *
 * 살릴 값이 있는 것은 **"아무도 볼 수 없는 것을 만들지 않는다"**는 규칙 하나였다 —
 * 그 규칙 자체는 콜렉션에도 그대로 옳으므로 형태만 바꿔 남긴다.
 */
describe('직업 콜렉션 — 아무도 볼 수 없는 줄은 없다', () => {
  it('도감이 세는 회사는 실제 공고와 같다', () => {
    expect(CAREERS.length).toBeGreaterThan(0)
    const ids = CAREERS.map((c) => c.id)
    expect(new Set(ids).size, '공고 id가 겹치면 도감에 같은 줄이 두 번 뜬다').toBe(ids.length)
  })

  it('회사 이름과 직함이 서로 겹치지 않는다 — 도감에서 구분되는 근거다', () => {
    const labels = CAREERS.map((c) => `${c.company}/${c.title}`)
    expect(new Set(labels).size).toBe(labels.length)
  })
})

describe('엔딩 정의', () => {
  it('성취 엔딩뿐이다 — 파산·취직으로는 엔딩이 뜨지 않는다', () => {
    expect(ENDINGS).toEqual(ACHIEVEMENT_ENDINGS)
    for (const e of ENDINGS) expect(e.condition, e.id).toBeDefined()
  })

  it('엔딩 id와 아이콘이 서로 겹치지 않는다 — 도감에서 구분되는 근거다', () => {
    const ids = ENDINGS.map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
    const icons = ENDINGS.map((e) => e.icon)
    expect(new Set(icons).size).toBe(icons.length)
  })

  it('문장을 돌려 쓰지 않는다', () => {
    const texts = ENDINGS.map((e) => e.text)
    expect(new Set(texts).size).toBe(texts.length)
  })
})
