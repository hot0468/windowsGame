import { describe, expect, it } from 'vitest'
import { findActivity } from '../data/activities'
import {
  MASTERY_BONUS_PER_RANK,
  createInitialState,
  masteryBonusFor,
  runActivity,
} from './turn'
import { previewActivity } from '../components/apps/activityPreview'
import type { GameState, Stats } from '../types/game'

/**
 * 랭크 숙련 보너스 — 키운 스탯일수록 같은 활동에서 더 오른다(2026-08-14).
 *
 * 지키는 것 셋: ① F는 보너스가 없다(기존 판의 수치가 그대로다) ② 성장 스탯의 상승분에만
 * 붙는다(돈·손해는 그대로 — 밸런스 축) ③ 미리보기와 실행이 같은 숫자다(옷 보너스와 같은 약속).
 */
function at(stats: Partial<Stats>): GameState {
  const s = createInitialState('숙련')
  return { ...s, stats: { ...s.stats, ...stats } }
}

describe('보너스 판정', () => {
  it('F면 0이다 — 판 시작 수치는 그대로다', () => {
    expect(masteryBonusFor(at({}), 'knowledge')).toBe(0)
  })

  it('등급 한 단계당 일정 비율씩 커진다', () => {
    expect(masteryBonusFor(at({ knowledge: 100 }), 'knowledge')).toBeCloseTo(MASTERY_BONUS_PER_RANK) // C
    expect(masteryBonusFor(at({ knowledge: 999 }), 'knowledge')).toBeCloseTo(5 * MASTERY_BONUS_PER_RANK) // SS
    // 상한이 다른 스탯도 **비율** 기준이라 같은 눈금을 탄다 (평판 50/100 = A).
    expect(masteryBonusFor(at({ reputation: 50 }), 'reputation')).toBeCloseTo(3 * MASTERY_BONUS_PER_RANK)
  })

  it('성장 스탯이 아니면 0이다 — 돈·체력에 붙으면 밸런스 축이 흔들린다', () => {
    expect(masteryBonusFor(at({ money: 999999 }), 'money')).toBe(0)
    expect(masteryBonusFor(at({}), 'stamina')).toBe(0)
  })
})

describe('실행 결과', () => {
  const study = findActivity('study')!

  it('같은 공부인데 지식 C인 사람이 F인 사람보다 더 오른다', () => {
    // 시작 지식이 0이 아니다 — 절대값이 아니라 **증분**끼리 견준다.
    const base = at({}).stats.knowledge
    const fresh = runActivity(at({}), study)
    const skilled = runActivity(at({ knowledge: 100 }), study)
    expect(skilled.stats.knowledge - 100).toBeGreaterThan(fresh.stats.knowledge - base)
  })

  it('⚠️ 손해는 커지지 않는다 — 보너스는 상승분에만 붙는다', () => {
    const game = findActivity('game')!
    const drop = game.effects.knowledge ?? 0
    expect(drop).toBeLessThan(0) // 전제: 게임은 지식을 깎는다
    const after = runActivity(at({ knowledge: 999 }), game)
    expect(after.stats.knowledge).toBe(999 + drop)
  })

  it('⚠️ 미리보기와 실행이 같은 숫자를 말한다', () => {
    const s = at({ knowledge: 300 }) // B
    const row = previewActivity(s, study).rows.find((r) => r.key === 'knowledge')!
    const after = runActivity(s, study)
    expect(after.stats.knowledge - 300).toBe(row.value)
    // 보너스가 실제로 붙어 있는 판이다 — 0끼리 같은 것을 "동기화"로 읽으면 안 된다.
    expect(row.value).toBeGreaterThan(study.effects.knowledge ?? 0)
  })
})
