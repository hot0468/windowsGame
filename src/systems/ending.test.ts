import { describe, it, expect } from 'vitest'
import { checkAchievementEnding, epitaphCareerId, hasHigherTier, getFailureEnding } from './ending'
import { ACHIEVEMENT_ENDINGS, CAREER_ENDINGS, ENDINGS, careerEnding } from '../data/endings'
import { CAREERS } from '../data/careers'
import { createInitialState } from './turn'
import { INITIAL_STATS } from '../types/game'
import type { GameState, Stats } from '../types/game'

const statsWith = (overrides: Partial<Stats>): Stats => ({ ...INITIAL_STATS, ...overrides })

/** 최고 경력만 심어 둔 상태. 직업 엔딩 판정은 이 값 하나만 본다. */
const stateWith = (peakCareerId?: string): GameState => ({
  ...createInitialState('테스터'),
  peakCareerId,
})

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

  it('성취 엔딩 목록에 직업 엔딩이 섞여 있지 않다', () => {
    for (const e of ACHIEVEMENT_ENDINGS) {
      expect(e.careerId, `${e.id}에 careerId가 붙어 있다`).toBeUndefined()
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

describe('getFailureEnding', () => {
  it('직장을 가져 본 적 없으면 그냥 파산 엔딩이다', () => {
    const ending = getFailureEnding('bankrupt', stateWith(undefined))
    expect(ending.id).toBe('bankrupt')
    expect(ending.isFailure).toBe(true)
  })

  it('번아웃 엔딩을 반환한다', () => {
    expect(getFailureEnding('burnout', stateWith(undefined)).id).toBe('burnout')
  })

  it('경력이 있어도 번아웃은 번아웃이다 — 마음이 떨어져 죽는 것은 다른 죽음이다', () => {
    expect(getFailureEnding('burnout', stateWith('cheongram-group')).id).toBe('burnout')
  })

  it('경력이 있으면 그 회사의 직업 엔딩으로 죽는다', () => {
    for (const career of CAREERS) {
      const ending = getFailureEnding('bankrupt', stateWith(career.id))
      expect(ending.careerId, `${career.id}의 엔딩이 없다`).toBe(career.id)
      expect(ending.isFailure, '직업 엔딩도 강제 종료여야 한다').toBe(true)
    }
  })

  it('없는 공고를 가리키면 조용히 그냥 파산이다', () => {
    expect(getFailureEnding('bankrupt', stateWith('없는회사')).id).toBe('bankrupt')
  })
})

describe('직업 엔딩 정의', () => {
  it('공고와 1:1이다 — 공고를 늘리고 엔딩을 안 만들면 무직으로 기록된다', () => {
    expect(CAREER_ENDINGS.length).toBe(CAREERS.length)
    for (const career of CAREERS) expect(careerEnding(career.id), career.id).toBeDefined()
    for (const ending of CAREER_ENDINGS) {
      expect(CAREERS.some((c) => c.id === ending.careerId), ending.id).toBe(true)
    }
  })

  it('전부 강제 종료이고 스탯 조건이 없다 — 취직으로는 엔딩이 뜨지 않는다', () => {
    for (const e of CAREER_ENDINGS) {
      expect(e.isFailure, e.id).toBe(true)
      expect(e.condition, e.id).toBeUndefined()
    }
  })

  it('엔딩 id와 아이콘이 서로 겹치지 않는다 — 도감에서 구분되는 근거다', () => {
    const ids = ENDINGS.map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
    const icons = ENDINGS.map((e) => e.icon)
    expect(new Set(icons).size).toBe(icons.length)
  })

  it('문장을 돌려 쓰지 않는다 — 직함만 갈아 끼운 다섯 개는 엔딩이 아니라 표다', () => {
    const texts = CAREER_ENDINGS.map((e) => e.text)
    expect(new Set(texts).size).toBe(texts.length)
    const titles = CAREER_ENDINGS.map((e) => e.title)
    expect(new Set(titles).size).toBe(titles.length)
  })
})

describe('epitaphCareerId — 비문에 새기는 경력', () => {
  it('지금 다니는 곳이 아니라 도달한 최고 직장을 본다', () => {
    // 대기업까지 갔다가 잘려서 무직으로 죽은 판.
    const fired: GameState = { ...stateWith('cheongram-group'), employment: undefined }
    expect(epitaphCareerId(fired)).toBe('cheongram-group')
    expect(getFailureEnding('bankrupt', fired).id).toBe('bigtech')
  })
})
