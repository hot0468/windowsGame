/**
 * 밸런스 회귀 방지 테스트.
 * 실제 게임 모듈로 시뮬레이션을 돌려, 무한 플레이가 불가능하고
 * 엔딩이 의도한 구간에 도달하는지 검증한다.
 */
import { describe, it, expect } from 'vitest'
import { createInitialState, canRun, runActivity, skipSlot } from './turn'
import { findActivity } from '../data/activities'
import { countConsecutive } from './burnout'
import type { GameState } from '../types/game'

const work = findActivity('work')!
const game = findActivity('game')!

/** 알바와 멘탈 회복을 번갈아 하는 최적에 가까운 생존 플레이. */
function playOptimally(maxDays: number): { state: GameState; peakMoney: number } {
  let state = createInitialState('시뮬')
  let peakMoney = state.stats.money
  while (!state.gameOver && state.day <= maxDays) {
    const streak = countConsecutive(state.recentActivities, 'work')
    const mentalCost = 8 + streak * 4
    let next: GameState
    if (canRun(state, work) && state.stats.mental - mentalCost > 3) next = runActivity(state, work)
    else if (canRun(state, game) && state.stats.mental < 95) next = runActivity(state, game)
    else next = skipSlot(state)
    state = next
    if (state.stats.money > peakMoney) peakMoney = state.stats.money
  }
  return { state, peakMoney }
}

describe('무한 플레이 차단', () => {
  it('최적 플레이도 결국 파산한다', () => {
    const { state } = playOptimally(1000)
    expect(state.gameOver).toBe('bankrupt')
  })

  it('파산 시점이 의도한 60~120일 구간에 든다', () => {
    const { state } = playOptimally(1000)
    expect(state.day).toBeGreaterThanOrEqual(60)
    expect(state.day).toBeLessThanOrEqual(120)
  })

  it('아무것도 하지 않으면 생활비만으로 훨씬 빨리 파산한다', () => {
    let state = createInitialState('무행동')
    while (!state.gameOver && state.day <= 100) state = skipSlot(state)
    expect(state.gameOver).toBe('bankrupt')
    expect(state.day).toBeLessThan(20)
  })
})

describe('엔딩 도달 가능성', () => {
  it('현실주의자 기준은 실제 플레이로 도달 가능하다', () => {
    const { peakMoney } = playOptimally(1000)
    expect(peakMoney).toBeGreaterThan(1800000)
  })

  it('현실주의자 도달일이 25~40일 구간에 든다', () => {
    let state = createInitialState('시뮬')
    let reachedDay: number | null = null
    while (!state.gameOver && state.day <= 200) {
      if (reachedDay === null && state.stats.money >= 1800000) reachedDay = state.day
      const streak = countConsecutive(state.recentActivities, 'work')
      if (canRun(state, work) && state.stats.mental - (8 + streak * 4) > 3) {
        state = runActivity(state, work)
      } else if (canRun(state, game) && state.stats.mental < 95) state = runActivity(state, game)
      else state = skipSlot(state)
    }
    expect(reachedDay).not.toBeNull()
    expect(reachedDay!).toBeGreaterThanOrEqual(25)
    expect(reachedDay!).toBeLessThanOrEqual(40)
  })
})
