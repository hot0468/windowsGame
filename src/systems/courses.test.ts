import { describe, expect, it } from 'vitest'
import {
  COURSES,
  COURSE_LEVELS,
  CERTIFICATE_SESSIONS,
  courseForCertificate,
  findCourse,
  levelRank,
} from '../data/courses'
import { findActivity } from '../data/activities'
import { gigsRequiring } from '../data/gigs'
import { canTake as canTakeGig } from './gigs'
import { SHOP_ITEMS, BUYABLE_ITEMS, findItem } from '../data/items'
import {
  blockReason,
  canTake,
  isCompleted,
  levelUnlocked,
  sessionsOf,
  takeCourse,
} from './courses'
import { createInitialState, owns } from './turn'
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

  /* ⚠️ 난이도가 목록에 없으면 `levelRank`가 -1을 돌려주고 그 강의는 **잠금을 통째로
     빠져나간다**(모르는 값은 열어 주는 쪽으로 넘어지게 해 뒀다) — 진도 축이 조용히
     새는 자리라 데이터에서 막는다. */
  it('모든 강의의 난이도가 해금 순서 목록에 있다', () => {
    for (const c of COURSES) expect(levelRank(c.level), c.id).toBeGreaterThanOrEqual(0)
  })

  /* ⚠️ 첫 단계에 강의가 하나도 없으면 **아무것도 열리지 않아 판이 잠긴다**(다음 단계를
     여는 유일한 열쇠가 앞 단계 수료다). 난이도를 손볼 때 여기서 터진다. */
  it('첫 단계에 강의가 있다 — 아니면 아무도 시작할 수 없다', () => {
    expect(COURSES.some((c) => c.level === COURSE_LEVELS[0])).toBe(true)
  })

  it('가리키는 활동이 실제로 있다', () => {
    // 알바 공고(jobs.test.ts)와 같은 순회 검사. id가 어긋나면 확정 버튼이 조용히 죽는다.
    for (const c of COURSES) expect(findActivity(c.activityId), c.id).toBeTruthy()
  })

  it('수료증 아이템이 실제로 있고, 그 아이템이 활동을 연다', () => {
    for (const c of COURSES) {
      if (!c.certificateItemId) continue
      expect(findItem(c.certificateItemId), c.id).toBeTruthy()
      // ⚠️ 아무것도 열지 않는 수료증은 스탯도 없으므로 순수한 낭비가 된다.
      //    2026-08-08 그몽 재설계로 **여는 것이 활동에서 일감으로** 옮겨 왔다.
      expect(gigsRequiring(c.certificateItemId).length, c.id).toBeGreaterThan(0)
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

describe('진도 잠금 (입문 → 고급)', () => {
  const beginner = COURSES.find((c) => c.level === COURSE_LEVELS[0])!
  const second = COURSES.find((c) => c.level === COURSE_LEVELS[1])!

  it('첫 단계는 처음부터 열려 있다', () => {
    expect(levelUnlocked(state(), COURSE_LEVELS[0])).toBe(true)
  })

  it('앞 단계를 수료하기 전에는 다음 단계가 잠긴다', () => {
    expect(levelUnlocked(state(), COURSE_LEVELS[1])).toBe(false)
  })

  /* ⚠️ **한 번 들은 것으로는 안 열린다.** 여기가 느슨해지면 가장 싼 입문을 한 번 듣고
     고급까지 직행할 수 있어 "차례대로"가 뜻을 잃는다 — 규칙을 뒤집어 증명한다. */
  it('앞 단계를 수료해야(1회로는 안 된다) 다음 단계가 열린다', () => {
    let s = state({ courses: { [beginner.id]: 1 } })
    expect(levelUnlocked(s, COURSE_LEVELS[1])).toBe(false)

    s = state({ courses: { [beginner.id]: CERTIFICATE_SESSIONS } })
    expect(levelUnlocked(s, COURSE_LEVELS[1])).toBe(true)
  })

  it('잠긴 강의는 사유가 돈이 아니라 앞 단계를 가리킨다', () => {
    // 돈은 넉넉한 판이다 — 그런데도 "수강료 부족"이 나오면 순서가 뒤집힌 것이다.
    const reason = blockReason(state({ stats: { money: 9_000_000 } }), second)
    expect(reason).toContain(COURSE_LEVELS[0])
  })

  it('잠긴 강의는 실제로 수강되지 않는다', () => {
    const before = state({ stats: { money: 9_000_000 } })
    expect(takeCourse(before, second)).toBe(before)
  })
})

describe('수강 조건', () => {
  it('수강료가 모자라면 못 듣고, 사유에 금액이 적힌다', () => {
    const course = findCourse('ai-basic')!
    const poor = state({ stats: { money: 1000 } })
    expect(canTake(poor, course)).toBe(false)
    expect(blockReason(poor, course)).toContain('수강료')
  })

  /* ⚠️ **진도 잠금을 먼저 푼 판으로 잰다**(2026-08-15). 잠긴 강의는 스탯을 보기 전에
     "앞 단계를 먼저 수료하라"에서 걸리므로, 잠긴 채로 재면 이 테스트는 스탯 사유가
     사라져도 통과한다 — 그러면 지키는 것이 없어진다. */
  it('스탯 조건이 모자라면 사유에 필요 수치와 현재 수치가 함께 적힌다', () => {
    const course = COURSES.find((c) => c.level === COURSE_LEVELS[1] && c.requires?.knowledge)!
    const need = course.requires!.knowledge!
    const beginner = COURSES.find((c) => c.level === COURSE_LEVELS[0])!
    const dull = state({
      stats: { money: 500000, knowledge: need - 1 },
      courses: { [beginner.id]: CERTIFICATE_SESSIONS },
    })
    expect(canTake(dull, course)).toBe(false)
    const why = blockReason(dull, course)!
    expect(why).toContain(String(need))
    expect(why).toContain(String(need - 1))
  })

  it('행동력이 모자라면 못 듣는다', () => {
    const course = findCourse('ai-basic')!
    const tired = state({ stats: { money: 500000, stamina: 1 } })
    expect(canTake(tired, course)).toBe(false)
  })

  it('게임이 끝났으면 못 듣는다', () => {
    const course = findCourse('ai-basic')!
    expect(canTake(state({ recovery: { kind: 'bankrupt', startedDay: 1, daysLeft: 3 } }), course)).toBe(false)
  })
})

describe('수강', () => {
  it('수강료를 빼고 턴을 쓴다', () => {
    const course = findCourse('ai-basic')!
    const before = state()
    const after = takeCourse(before, course)
    // 활동 자체의 돈 효과가 없는 강의라 수강료만큼만 줄어야 한다.
    expect(after.stats.money).toBe(before.stats.money - course.price)
    expect(after.minute + after.day * 1440).toBeGreaterThan(before.minute + before.day * 1440)
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
      s = { ...s, stats: { ...s.stats, money: 500000, stamina: 100, mental: 100 }, recovery: null }
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

  it('수료증이 잠긴 일감을 실제로 연다', () => {
    const course = findCourse('ai-basic')!
    const gated = gigsRequiring(course.certificateItemId!)[0]
    const before = state({ stats: { money: 500000, stamina: 100 } })
    // 수료증이 없으면 못 받고, 받은 뒤에는 받을 수 있다 — 잠금이 실제로 작동하는지 본다.
    expect(canTakeGig(before, gated)).toBe(false)
    const done = takeTimes(course)
    const rested = { ...done, stats: { ...done.stats, stamina: 100, money: 500000 } }
    expect(canTakeGig(rested, gated)).toBe(true)
  })
})
