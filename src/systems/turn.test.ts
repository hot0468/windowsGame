import { describe, it, expect } from 'vitest'
import { createInitialState, canRun, runActivity, skipSlot, MAX_STAMINA_CAP } from './turn'
import { findActivity } from '../data/activities'
import { getLivingCost } from './economy'
import type { GameState } from '../types/game'

const study = findActivity('study')!
const work = findActivity('work')!
const exercise = findActivity('exercise')!

/** 테스트용 상태 생성 헬퍼. */
const stateWith = (overrides: Partial<GameState>): GameState => ({
  ...createInitialState('테스터'),
  ...overrides,
})

describe('createInitialState', () => {
  it('플레이어 이름을 설정한다', () => {
    expect(createInitialState('김철수').playerName).toBe('김철수')
  })

  it('1일차 오전에 시작한다', () => {
    const s = createInitialState('김철수')
    expect(s.day).toBe(1)
    expect(s.slot).toBe('morning')
  })

  it('게임오버 상태가 아니다', () => {
    expect(createInitialState('김철수').gameOver).toBeNull()
  })
})

describe('canRun', () => {
  it('요구 스탯을 충족하면 실행 가능하다', () => {
    expect(canRun(createInitialState('t'), study)).toBe(true)
  })

  it('체력이 부족하면 실행 불가하다', () => {
    const s = stateWith({ stats: { ...createInitialState('t').stats, stamina: 5 } })
    expect(canRun(s, study)).toBe(false)
  })

  it('돈이 부족하면 실행 불가하다', () => {
    const social = findActivity('social')!
    const s = stateWith({ stats: { ...createInitialState('t').stats, money: 100 } })
    expect(canRun(s, social)).toBe(false)
  })

  it('게임오버 상태에서는 실행 불가하다', () => {
    expect(canRun(stateWith({ gameOver: 'bankrupt' }), study)).toBe(false)
  })
})

describe('runActivity — 스탯 적용', () => {
  it('활동 효과를 스탯에 반영한다', () => {
    const before = createInitialState('t')
    const after = runActivity(before, study)
    expect(after.stats.intelligence).toBe(before.stats.intelligence + 6)
  })

  it('체력을 소모한다', () => {
    const before = createInitialState('t')
    const after = runActivity(before, study)
    expect(after.stats.stamina).toBe(before.stats.stamina - 15)
  })

  it('원본 상태를 변경하지 않는다', () => {
    const before = createInitialState('t')
    const snapshot = before.stats.intelligence
    runActivity(before, study)
    expect(before.stats.intelligence).toBe(snapshot)
  })

  it('체력은 0 아래로 내려가지 않는다', () => {
    const s = stateWith({ stats: { ...createInitialState('t').stats, stamina: 16 } })
    expect(runActivity(s, study).stats.stamina).toBe(1)
  })

  it('취침 회복으로도 체력은 maxStamina를 넘지 않는다', () => {
    // 오후에 활동하면 취침 회복(maxStamina * 0.6)이 붙는다.
    // 체력이 이미 높으면 상한을 넘겨야 하는데, 클램핑이 이를 막는지 확인한다.
    const s = stateWith({
      slot: 'afternoon',
      stats: { ...createInitialState('t').stats, stamina: 100, maxStamina: 100 },
    })
    const after = runActivity(s, findActivity('game')!)
    expect(after.stats.stamina).toBe(100)
  })

  it('최대 체력은 상한을 넘지 않는다', () => {
    const s = stateWith({
      stats: { ...createInitialState('t').stats, maxStamina: MAX_STAMINA_CAP, stamina: 100 },
    })
    expect(runActivity(s, exercise).stats.maxStamina).toBe(MAX_STAMINA_CAP)
  })

  it('상한을 넘긴 세이브 값도 상한으로 끌어내린다', () => {
    const s = stateWith({
      stats: { ...createInitialState('t').stats, maxStamina: 9999, stamina: 100 },
    })
    expect(runActivity(s, study).stats.maxStamina).toBe(MAX_STAMINA_CAP)
  })

  it('운동을 아무리 반복해도 최대 체력이 상한을 넘지 않는다', () => {
    let s = createInitialState('t')
    for (let i = 0; i < 300; i++) {
      s = canRun(s, exercise) ? runActivity(s, exercise) : skipSlot(s)
      if (s.gameOver) break
      expect(s.stats.maxStamina).toBeLessThanOrEqual(MAX_STAMINA_CAP)
    }
  })

  it('상한이 철인 엔딩 조건과 같아 상한 도달이 곧 엔딩이다', () => {
    expect(MAX_STAMINA_CAP).toBe(200)
  })

  it('체력은 상한을 넘긴 maxStamina가 아니라 클램핑된 값을 따른다', () => {
    // maxStamina가 상한 위로 저장돼 있으면 체력도 그만큼 회복되면 안 된다.
    const s = stateWith({
      slot: 'afternoon',
      stats: { ...createInitialState('t').stats, maxStamina: 9999, stamina: 9999 },
    })
    expect(runActivity(s, findActivity('game')!).stats.stamina).toBeLessThanOrEqual(MAX_STAMINA_CAP)
  })

  it('알바비에 물가 배율이 적용된다', () => {
    const early = runActivity(stateWith({ day: 1 }), work)
    const late = runActivity(stateWith({ day: 51 }), work)
    const earlyGain = early.stats.money - 300000
    const lateGain = late.stats.money - 300000
    expect(lateGain).toBeGreaterThan(earlyGain)
  })
})

describe('runActivity — 슬롯과 날짜 전환', () => {
  it('오전 활동 후 오후로 넘어가고 날짜는 그대로다', () => {
    const after = runActivity(createInitialState('t'), study)
    expect(after.slot).toBe('afternoon')
    expect(after.day).toBe(1)
  })

  it('오후 활동 후 다음 날 오전이 된다', () => {
    const after = runActivity(stateWith({ slot: 'afternoon' }), study)
    expect(after.slot).toBe('morning')
    expect(after.day).toBe(2)
  })
})

describe('runActivity — 취침 정산', () => {
  it('하루가 끝나면 생활비가 차감된다', () => {
    const before = stateWith({ slot: 'afternoon' })
    const after = runActivity(before, study)
    const activityMoney = 0
    expect(after.stats.money).toBe(before.stats.money + activityMoney - getLivingCost(1))
  })

  it('하루가 끝나면 체력이 회복된다', () => {
    const before = stateWith({
      slot: 'afternoon',
      stats: { ...createInitialState('t').stats, stamina: 50 },
    })
    const after = runActivity(before, study)
    expect(after.stats.stamina).toBeGreaterThan(50 - 15)
  })

  it('오전 활동에는 생활비가 차감되지 않는다', () => {
    const before = createInitialState('t')
    const after = runActivity(before, study)
    expect(after.stats.money).toBe(before.stats.money)
  })
})

describe('runActivity — 번아웃', () => {
  it('활동 이력에 기록된다', () => {
    expect(runActivity(createInitialState('t'), study).recentActivities).toEqual(['study'])
  })

  it('연속 실행하면 효율이 떨어져 스탯 상승폭이 줄어든다', () => {
    const fresh = createInitialState('t')
    const firstGain = runActivity(fresh, study).stats.intelligence - fresh.stats.intelligence

    const repeated = stateWith({ recentActivities: ['study', 'study', 'study'] })
    const repeatedGain =
      runActivity(repeated, study).stats.intelligence - repeated.stats.intelligence

    expect(repeatedGain).toBeLessThan(firstGain)
  })

  it('연속 실행하면 멘탈이 추가로 소모된다', () => {
    const fresh = createInitialState('t')
    const freshLoss = fresh.stats.mental - runActivity(fresh, study).stats.mental

    const repeated = stateWith({ recentActivities: ['study', 'study', 'study'] })
    const repeatedLoss = repeated.stats.mental - runActivity(repeated, study).stats.mental

    expect(repeatedLoss).toBeGreaterThan(freshLoss)
  })
})

describe('runActivity — 게임오버 판정', () => {
  it('소지금이 0 이하가 되면 파산이다', () => {
    const before = stateWith({
      slot: 'afternoon',
      stats: { ...createInitialState('t').stats, money: 1000 },
    })
    expect(runActivity(before, study).gameOver).toBe('bankrupt')
  })

  it('멘탈이 0 이하가 되면 번아웃이다', () => {
    const before = stateWith({ stats: { ...createInitialState('t').stats, mental: 3 } })
    expect(runActivity(before, study).gameOver).toBe('burnout')
  })

  it('진행 가능한 상태에서는 게임오버가 아니다', () => {
    expect(runActivity(createInitialState('t'), study).gameOver).toBeNull()
  })

  it('게임오버 상태에서 활동해도 상태가 바뀌지 않는다', () => {
    const over = stateWith({ gameOver: 'bankrupt' })
    expect(runActivity(over, study)).toBe(over)
  })
})

describe('skipSlot', () => {
  it('스탯 변화 없이 슬롯만 넘긴다', () => {
    const before = createInitialState('t')
    const after = skipSlot(before)
    expect(after.slot).toBe('afternoon')
    expect(after.stats.intelligence).toBe(before.stats.intelligence)
  })

  it('활동 이력에 기록되지 않아 번아웃 연속이 끊긴다', () => {
    const before = stateWith({ recentActivities: ['study'] })
    expect(skipSlot(before).recentActivities).toEqual(['study', 'rest'])
  })

  it('오후에 넘기면 취침 정산이 일어난다', () => {
    const before = stateWith({ slot: 'afternoon' })
    const after = skipSlot(before)
    expect(after.day).toBe(2)
    expect(after.stats.money).toBe(before.stats.money - getLivingCost(1))
  })
})
