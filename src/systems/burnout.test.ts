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
  it('처음 하는 활동은 효율 100%에 추가 멘탈 소모가 없다', () => {
    expect(getBurnoutPenalty([], 'study')).toEqual({ efficiency: 1, mentalPenalty: 0 })
  })

  it('연속할수록 효율이 떨어진다', () => {
    const once = getBurnoutPenalty(['study'], 'study')
    const twice = getBurnoutPenalty(['study', 'study'], 'study')
    expect(twice.efficiency).toBeLessThan(once.efficiency)
  })

  it('연속할수록 멘탈 추가 소모가 커진다', () => {
    const once = getBurnoutPenalty(['study'], 'study')
    const twice = getBurnoutPenalty(['study', 'study'], 'study')
    expect(twice.mentalPenalty).toBeGreaterThan(once.mentalPenalty)
  })

  it('효율은 하한 아래로 떨어지지 않는다', () => {
    const many = Array(20).fill('study')
    expect(getBurnoutPenalty(many, 'study').efficiency).toBeGreaterThanOrEqual(0.3)
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
