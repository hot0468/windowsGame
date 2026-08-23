import { describe, it, expect } from 'vitest'
import { countConsecutive, getBurnoutPenalty, pushActivity, BURNOUT_WINDOW } from './burnout'

describe('countConsecutive', () => {
  it('이력이 비면 0을 반환한다', () => {
    expect(countConsecutive([], 'study')).toBe(0)
  })

  it('배열 끝에서부터 같은 활동이 이어진 횟수를 센다', () => {
    expect(countConsecutive(['work', 'study', 'study'], 'study')).toBe(2)
  })

  it('중간에 다른 활동이 끼면 연속이 끊긴다', () => {
    expect(countConsecutive(['study', 'work', 'study'], 'study')).toBe(1)
  })

  it('마지막 활동이 다르면 0을 반환한다', () => {
    expect(countConsecutive(['study', 'study', 'work'], 'study')).toBe(0)
  })
})

describe('getBurnoutPenalty', () => {
  /* ⚠️ **효율 감소는 2026-08-22에 폐지됐다**(설계자 지시) — 되살리지 말 것.
     반복해도 **얻는 것은 그대로**이고 대가는 멘탈 하나다. */
  it('처음 하는 활동은 추가 멘탈 소모가 없다', () => {
    expect(getBurnoutPenalty([], 'study')).toEqual({ mentalPenalty: 0 })
  })

  it('⚠️ 반복해도 효율은 안 깎인다 — 배율 자체가 없다', () => {
    expect('efficiency' in getBurnoutPenalty(Array(20).fill('study'), 'study')).toBe(false)
  })

  it('연속할수록 멘탈 추가 소모가 커진다', () => {
    const once = getBurnoutPenalty(['study'], 'study')
    const twice = getBurnoutPenalty(['study', 'study'], 'study')
    expect(twice.mentalPenalty).toBeGreaterThan(once.mentalPenalty)
  })

  it('연속이 길어져도 멘탈 소모는 계속 커진다 — 대가는 하나뿐이라 상한을 두지 않는다', () => {
    const many = getBurnoutPenalty(Array(20).fill('study'), 'study')
    const few = getBurnoutPenalty(Array(3).fill('study'), 'study')
    expect(many.mentalPenalty).toBeGreaterThan(few.mentalPenalty)
  })
})

describe('pushActivity', () => {
  it('활동을 이력 끝에 추가한다', () => {
    expect(pushActivity(['work'], 'study')).toEqual(['work', 'study'])
  })

  it('이력은 최대 길이를 넘지 않는다', () => {
    const full = Array(BURNOUT_WINDOW).fill('work')
    const result = pushActivity(full, 'study')
    expect(result).toHaveLength(BURNOUT_WINDOW)
    expect(result[result.length - 1]).toBe('study')
  })

  it('원본 배열을 변경하지 않는다', () => {
    const original = ['work']
    pushActivity(original, 'study')
    expect(original).toEqual(['work'])
  })
})
