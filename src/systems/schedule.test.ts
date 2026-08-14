import { describe, it, expect } from 'vitest'
import {
  clearPlan,
  findPlan,
  firstFreeSlot,
  planWeekly,
  prunePast,
  runPlans,
  setPlan,
} from './schedule'
import { createInitialState } from './turn'
import type { GameState, Plan } from '../types/game'

const base = (over: Partial<GameState> = {}): GameState => ({
  ...createInitialState('테스터'),
  ...over,
})

describe('예약 목록', () => {
  it('같은 슬롯에는 하나만 남는다', () => {
    let plans = setPlan([], 1, 'morning', 'study')
    plans = setPlan(plans, 1, 'morning', 'work')
    expect(plans).toHaveLength(1)
    expect(findPlan(plans, 1, 'morning')?.activityId).toBe('work')
  })

  /* 예매(노24)가 이 함수로 관람일을 잡는다. 남의 예약을 덮으면 달력을 믿을 수 없게 된다. */
  it('첫 빈 슬롯을 찾고 이미 찬 자리는 건너뛴다', () => {
    expect(firstFreeSlot([], 4)).toEqual({ day: 4, slot: 'morning' })

    let plans = setPlan([], 4, 'morning', 'study')
    plans = setPlan(plans, 4, 'afternoon', 'work')
    expect(firstFreeSlot(plans, 4)).toEqual({ day: 5, slot: 'morning' })
  })

  it('지운 슬롯은 비어 있다', () => {
    const plans = clearPlan(setPlan([], 2, 'afternoon', 'study'), 2, 'afternoon')
    expect(findPlan(plans, 2, 'afternoon')).toBeUndefined()
  })

  it('지나간 예약은 버린다 — 달력이 과거로 더러워지지 않게', () => {
    const plans = [
      { day: 1, slot: 'morning' as const, activityId: 'study' },
      { day: 1, slot: 'afternoon' as const, activityId: 'work' },
      { day: 3, slot: 'morning' as const, activityId: 'study' },
    ]
    expect(prunePast(plans, 1, 'afternoon').map((p) => p.day * 2 + (p.slot === 'afternoon' ? 1 : 0)))
      .toEqual([3, 6])
  })
})

describe('runPlans', () => {
  it('예약이 없으면 아무것도 하지 않는다', () => {
    const s = base()
    const r = runPlans(s)
    expect(r.state.day).toBe(s.day)
    expect(r.state.slot).toBe(s.slot)
    expect(r.skipped).toEqual([])
  })

  it('현재 슬롯의 예약을 실행하고 턴을 넘긴다', () => {
    const s = base({ plans: [{ day: 1, slot: 'morning', activityId: 'study' }] })
    const r = runPlans(s)
    expect(r.state.slot).toBe('afternoon')
    expect(r.state.stats.knowledge).toBeGreaterThan(s.stats.knowledge)
    // 쓴 예약은 남지 않는다.
    expect(r.state.plans).toEqual([])
  })

  it('이어지는 슬롯의 예약까지 연쇄 실행한다', () => {
    const s = base({
      plans: [
        { day: 1, slot: 'morning', activityId: 'study' },
        { day: 1, slot: 'afternoon', activityId: 'study' },
      ],
    })
    const r = runPlans(s)
    expect(r.state.day).toBe(2)
    // ⚠️ +12가 아니라 +11이다 — 같은 활동을 연달아 하면 번아웃 효율(90%)이 걸려
    // 두 번째 공부가 +6이 아니라 +5가 된다. 스케줄러가 번아웃을 우회하지 않는다는 뜻이고,
    // 이게 깨지면 달력을 한 활동으로 도배하는 것이 최적해가 된다.
    expect(r.state.stats.knowledge).toBe(s.stats.knowledge + 11)
  })

  it('조건이 안 되면 건너뛰고 사유를 돌려준다 — 조용히 사라지지 않는다', () => {
    const s = base({
      stats: { ...createInitialState('t').stats, stamina: 1 },
      plans: [{ day: 1, slot: 'morning', activityId: 'study' }],
    })
    const r = runPlans(s)
    expect(r.skipped).toHaveLength(1)
    expect(r.skipped[0].reason).toBe('조건 미달')
    // 슬롯은 흘러간다 — 여기서 멈추면 플레이어가 갇힌다.
    expect(r.state.slot).toBe('afternoon')
    // 못 지킨 예약은 남기지 않는다(다음 날에도 같은 자리에서 계속 실패한다).
    expect(r.state.plans).toEqual([])
  })

  it('없는 활동 id는 건너뛴다', () => {
    const s = base({ plans: [{ day: 1, slot: 'morning', activityId: '없는거' }] })
    const r = runPlans(s)
    expect(r.skipped[0].reason).toBe('없는 활동')
    expect(r.state.slot).toBe('morning')
  })

  it('게임오버 상태에서는 실행하지 않는다', () => {
    const s = base({ recovery: { kind: 'bankrupt', startedDay: 1, daysLeft: 3 }, plans: [{ day: 1, slot: 'morning', activityId: 'study' }] })
    expect(runPlans(s).state.day).toBe(1)
  })

  it('연쇄가 무한히 돌지 않는다', () => {
    // 40슬롯(20일)을 넘게 채워도 상한에서 멈춘다.
    const plans: Plan[] = Array.from({ length: 80 }, (_, i) => ({
      day: 1 + Math.floor(i / 2),
      slot: i % 2 === 0 ? 'morning' : 'afternoon',
      activityId: 'study',
    }))
    const r = runPlans(base({ plans }))
    expect(r.state.day).toBeLessThanOrEqual(22)
  })
})

describe('planWeekly (헬스장 월결제)', () => {
  it('다음 주 그 요일부터 weeks번 건다', () => {
    // 1일차 = 2026-03-01(일). 목요일(4)은 3/5 = 5일차.
    const plans = planWeekly([], 1, 4, 4, 'gym-member')
    expect(plans.map((p) => p.day)).toEqual([5, 12, 19, 26])
    expect(plans.every((p) => p.slot === 'afternoon')).toBe(true)
  })

  it('오늘이 그 요일이면 다음 주부터다 — 등록한 날 바로 가지 않는다', () => {
    // 5일차가 목요일이므로, 5일차에 목요일 예약을 걸면 12일차부터다.
    expect(planWeekly([], 5, 4, 2, 'gym-member').map((p) => p.day)).toEqual([12, 19])
  })

  it('기존 예약을 지우지 않는다', () => {
    const before = setPlan([], 2, 'morning', 'study')
    const after = planWeekly(before, 1, 4, 1, 'gym-member')
    expect(findPlan(after, 2, 'morning')?.activityId).toBe('study')
  })
})
