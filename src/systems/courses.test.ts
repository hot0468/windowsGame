import { describe, expect, it } from 'vitest'
import { COURSES, CERTIFICATE_SESSIONS, courseForCertificate, findCourse } from '../data/courses'
import { activitiesUnlockedBy, findActivity } from '../data/activities'
import { SHOP_ITEMS, BUYABLE_ITEMS, findItem } from '../data/items'
import { blockReason, canTake, isCompleted, sessionsOf, takeCourse } from './courses'
import { canRun, createInitialState, owns } from './turn'
import type { GameState, Stats } from '../types/game'

/**
 * ⚠️ 상태를 손으로 짓지 않고 `createInitialState`를 쓴다 — 필드를 하나라도 빠뜨리면
 * (실제로 `recent`가 빠져 번아웃 계산이 터졌다) 이 파일에서만 통하는 가짜 상태가 된다.
 */
function state(over: Omit<Partial<GameState>, 'stats'> & { stats?: Partial<Stats> } = {}): GameState {
  const s = createInitialState('테스터')
  // stats는 **병합**한다 — 통째로 덮으면 부분 지정(`{ money: 1000 }`)이 나머지 스탯을 지운다.
  return { ...s, ...over, stats: { ...s.stats, money: 500000, ...(over.stats ?? {}) } }
}

describe('강의 데이터', () => {
  it('id가 겹치지 않는다', () => {
    expect(new Set(COURSES.map((c) => c.id)).size).toBe(COURSES.length)
  })

  it('가리키는 활동이 실제로 있다', () => {
    // 알바 공고(jobs.test.ts)와 같은 순회 검사. id가 어긋나면 확정 버튼이 조용히 죽는다.
    for (const c of COURSES) expect(findActivity(c.activityId), c.id).toBeTruthy()
  })

  it('수료증 아이템이 실제로 있고, 그 아이템이 활동을 연다', () => {
    for (const c of COURSES) {
      if (!c.certificateItemId) continue
      expect(findItem(c.certificateItemId), c.id).toBeTruthy()
      // ⚠️ 아무 활동도 열지 않는 수료증은 스탯도 없으므로 순수한 낭비가 된다.
      expect(activitiesUnlockedBy(c.certificateItemId).length, c.id).toBeGreaterThan(0)
    }
  })

  it('수료증은 쇼핑에서 살 수 없다', () => {
    // 돈으로 사면 강의를 들을 이유가 사라진다.
    for (const c of COURSES) {
      if (!c.certificateItemId) continue
      expect(BUYABLE_ITEMS.some((i) => i.id === c.certificateItemId), c.id).toBe(false)
      expect(SHOP_ITEMS.some((i) => i.id === c.certificateItemId), c.id).toBe(true)
    }
  })

  it('아이템에서 강의를 거꾸로 찾을 수 있다', () => {
    for (const c of COURSES) {
      if (!c.certificateItemId) continue
      expect(courseForCertificate(c.certificateItemId)?.id).toBe(c.id)
    }
  })
})

describe('수강 조건', () => {
  it('수강료가 모자라면 못 듣고, 사유에 금액이 적힌다', () => {
    const course = findCourse('ai-basic')!
    const poor = state({ stats: { money: 1000 } })
    expect(canTake(poor, course)).toBe(false)
    expect(blockReason(poor, course)).toContain('수강료')
  })

  it('스탯 조건이 모자라면 사유에 필요 수치와 현재 수치가 함께 적힌다', () => {
    const course = findCourse('money-advanced')! // 지식 45
    const dull = state({ stats: { money: 500000, knowledge: 10 } })
    expect(canTake(dull, course)).toBe(false)
    const why = blockReason(dull, course)!
    expect(why).toContain('45')
    expect(why).toContain('10')
  })

  it('행동력이 모자라면 못 듣는다', () => {
    const course = findCourse('ai-basic')!
    const tired = state({ stats: { money: 500000, stamina: 1 } })
    expect(canTake(tired, course)).toBe(false)
  })

  it('게임이 끝났으면 못 듣는다', () => {
    const course = findCourse('ai-basic')!
    expect(canTake(state({ gameOver: 'bankrupt' }), course)).toBe(false)
  })
})

describe('수강', () => {
  it('수강료를 빼고 턴을 쓴다', () => {
    const course = findCourse('ai-basic')!
    const before = state()
    const after = takeCourse(before, course)
    // 활동 자체의 돈 효과가 없는 강의라 수강료만큼만 줄어야 한다.
    expect(after.stats.money).toBe(before.stats.money - course.price)
    expect(after.slot).not.toBe(before.slot)
  })

  it('조건이 안 되면 상태를 그대로 돌려준다 — 반쪽 상태를 남기지 않는다', () => {
    const course = findCourse('ai-basic')!
    const poor = state({ stats: { money: 1000 } })
    expect(takeCourse(poor, course)).toBe(poor)
  })

  it('수강 횟수가 쌓인다', () => {
    const course = findCourse('ai-basic')!
    let s = state()
    expect(sessionsOf(s, course.id)).toBe(0)
    s = takeCourse(s, course)
    expect(sessionsOf(s, course.id)).toBe(1)
  })
})

describe('수료증', () => {
  /** 돈·행동력을 계속 채워 가며 N회 수강한다(다른 규칙에 걸리지 않게). */
  function takeTimes(course = findCourse('ai-basic')!, times = CERTIFICATE_SESSIONS) {
    let s = state()
    for (let i = 0; i < times; i++) {
      s = { ...s, stats: { ...s.stats, money: 500000, stamina: 100, mental: 100 }, gameOver: null }
      s = takeCourse(s, course)
    }
    return s
  }

  it(`${CERTIFICATE_SESSIONS}회를 채우면 수료증이 인벤토리에 들어온다`, () => {
    const course = findCourse('ai-basic')!
    const done = takeTimes(course)
    expect(isCompleted(done, course.id)).toBe(true)
    expect(owns(done, course.certificateItemId!)).toBe(true)
  })

  it('한 번 모자라면 안 나온다 — 규칙을 뒤집어 확인한다', () => {
    const course = findCourse('ai-basic')!
    const almost = takeTimes(course, CERTIFICATE_SESSIONS - 1)
    expect(isCompleted(almost, course.id)).toBe(false)
    expect(owns(almost, course.certificateItemId!)).toBe(false)
  })

  it('더 들어도 수료증이 두 장이 되지 않는다', () => {
    const course = findCourse('ai-basic')!
    const extra = takeTimes(course, CERTIFICATE_SESSIONS + 2)
    const count = (extra.inventory ?? []).filter((i) => i.id === course.certificateItemId).length
    expect(count).toBe(1)
  })

  it('수료증이 없는 강의는 다 들어도 아이템이 안 나온다', () => {
    const course = COURSES.find((c) => !c.certificateItemId)!
    const done = takeTimes(course)
    expect(done.inventory ?? []).toHaveLength(0)
  })

  it('수료증이 잠긴 활동을 실제로 연다', () => {
    const course = findCourse('ai-basic')!
    const gated = activitiesUnlockedBy(course.certificateItemId!)[0]
    const before = state({ stats: { money: 500000, stamina: 100 } })
    // 수료증이 없으면 못 하고, 받은 뒤에는 할 수 있다 — 잠금이 실제로 작동하는지 본다.
    expect(canRun(before, gated)).toBe(false)
    const done = takeTimes(course)
    const rested = { ...done, stats: { ...done.stats, stamina: 100, money: 500000 } }
    expect(canRun(rested, gated)).toBe(true)
  })
})
