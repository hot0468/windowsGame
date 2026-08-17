import { describe, expect, it } from 'vitest'
import {
  CAT_FEEDS_TO_ADOPT,
  CAT_FEED_PRICE,
  CAT_FIRST_VISIT_MIN,
  CAT_FIRST_VISIT_SPAN,
  CAT_IGNORES_TO_LEAVE,
  CAT_NIGHT_FOOD_COST,
  CAT_NIGHT_MENTAL_BONUS,
  CAT_REVISIT_MIN,
  CAT_REVISIT_SPAN,
} from '../data/cat'
import {
  adoptCat,
  catCanAdopt,
  catEncounterDue,
  catNightDelta,
  catVisitsOn,
  feedCat,
  ignoreCat,
  petCat,
} from './cat'
import { createInitialState } from './turn'
import type { GameState, Stats } from '../types/game'

/**
 * 길고양이 — 지키는 것: ①만남일 결정성 + 첫 방문일 8~14 범위 ②세 번 먹이면 입양 가능,
 * 세 번 모른 척(fed 0)이면 다시 안 옴 ③사료비는 잔액 1원을 남긴다 + 못 낸 밤은 멘탈
 * 보너스가 없다(돈 불변식 — 뒤집어 증명) ④쓰다듬기는 하루 한 번 ⑤구세이브(cat·seed 없음) 안전.
 */

/** 그 시드의 첫 방문일. */
function firstVisit(seed: number): number {
  for (let day = 1; day <= 20; day++) if (catVisitsOn(seed, day)) return day
  throw new Error('첫 방문일을 못 찾음')
}

function at(seed: number, patch: Partial<Stats> = {}): GameState {
  const s = createInitialState('집사')
  return { ...s, seed, stats: { ...s.stats, ...patch } }
}

/** 만남이 진행 중인 상태(방문일에 서 있다). */
function meeting(seed: number, patch: Partial<Stats> = {}): GameState {
  return { ...at(seed, patch), day: firstVisit(seed) }
}

describe('만남일', () => {
  it('같은 시드는 언제나 같은 방문 달력이다', () => {
    const calendar = (seed: number) =>
      Array.from({ length: 60 }, (_, i) => (catVisitsOn(seed, i + 1) ? '1' : '0')).join('')
    for (const seed of [1, 7, 12345]) expect(calendar(seed)).toBe(calendar(seed))
    expect(calendar(1)).not.toBe(calendar(2))
  })

  it('첫 방문일은 시드가 무엇이든 8~14일차다', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const first = firstVisit(seed)
      expect(first).toBeGreaterThanOrEqual(CAT_FIRST_VISIT_MIN)
      expect(first).toBeLessThanOrEqual(CAT_FIRST_VISIT_MIN + CAT_FIRST_VISIT_SPAN - 1)
    }
  })

  it('재방문 간격은 3~5일이다', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const visits: number[] = []
      for (let day = 1; day <= 60; day++) if (catVisitsOn(seed, day)) visits.push(day)
      for (let i = 1; i < visits.length; i++) {
        const gap = visits[i] - visits[i - 1]
        expect(gap).toBeGreaterThanOrEqual(CAT_REVISIT_MIN)
        expect(gap).toBeLessThanOrEqual(CAT_REVISIT_MIN + CAT_REVISIT_SPAN - 1)
      }
    }
  })

  it('Recovery 중·시드 없음·이미 결정한 날에는 만남이 없다', () => {
    const s = meeting(1)
    expect(catEncounterDue(s)).toBe(true)
    expect(catEncounterDue({ ...s, recovery: { kind: 'burnout', startedDay: 1, daysLeft: 3 } })).toBe(false)
    expect(catEncounterDue({ ...s, seed: undefined })).toBe(false)
    expect(catEncounterDue(ignoreCat(s))).toBe(false)
  })
})

describe('정과 입양', () => {
  it(`${CAT_FEEDS_TO_ADOPT}번 먹이면 입양할 수 있고, 그 전에는 안 된다`, () => {
    let s = meeting(1)
    for (let i = 0; i < CAT_FEEDS_TO_ADOPT; i++) {
      expect(catCanAdopt(s)).toBe(false)
      expect(adoptCat(s, '나비')).toBe(s) // 문턱 전 입양은 화면이 아니라 규칙이 막는다
      s = feedCat(s)
      expect(s.cat?.fed).toBe(i + 1)
      /* 결정 커서가 찍혔으니 그날은 끝 — 다음 방문일로 간다(커서는 지난 날이라 다시 뜬다). */
      s = { ...s, day: firstVisitAfter(s) }
    }
    expect(catCanAdopt(s)).toBe(true)
    const adopted = adoptCat(s, '  ')
    expect(adopted.cat?.adoptedDay).toBe(adopted.day)
    expect(adopted.cat?.name).toBe('나비') // 빈 이름은 기본값
  })

  it(`한 번도 안 먹이고 ${CAT_IGNORES_TO_LEAVE}번 모른 척하면 다시 오지 않는다`, () => {
    let s = meeting(1)
    for (let i = 0; i < CAT_IGNORES_TO_LEAVE; i++) {
      s = ignoreCat({ ...s, day: firstVisitAfter(s) })
    }
    // 다음 방문일이 와도 만남이 없다
    expect(catEncounterDue({ ...s, day: firstVisitAfter(s) })).toBe(false)
  })

  it('한 번이라도 먹였으면 모른 척이 쌓여도 계속 온다', () => {
    let s = feedCat(meeting(1))
    for (let i = 0; i < CAT_IGNORES_TO_LEAVE + 1; i++) {
      s = ignoreCat({ ...s, day: firstVisitAfter(s) })
    }
    expect(catEncounterDue({ ...s, day: firstVisitAfter(s) })).toBe(true)
  })

  it('사료는 돈이 모자라면 못 주고(상태 그대로), 주면 값이 나간다', () => {
    const rich = meeting(1)
    expect(feedCat(rich).stats.money).toBe(rich.stats.money - CAT_FEED_PRICE)
    const poor = meeting(1, { money: CAT_FEED_PRICE - 1 })
    expect(feedCat(poor)).toBe(poor)
  })
})

describe('밤 정산(사료비 — 돈 불변식)', () => {
  const adopted = (money: number): GameState => {
    const s = at(1, { money })
    return { ...s, cat: { fed: 3, ignored: 0, adoptedDay: 1 } }
  }

  it('잔액이 넉넉하면 사료비 전액이 나가고 멘탈 +1이 붙는다', () => {
    const d = catNightDelta(adopted(100_000), 100_000)
    expect(d.money).toBe(-CAT_NIGHT_FOOD_COST)
    expect(d.mental).toBe(CAT_NIGHT_MENTAL_BONUS)
  })

  it('잔액이 모자라면 1원을 남기고만 빠지고, 그 밤은 멘탈 보너스가 없다', () => {
    const d = catNightDelta(adopted(1_000), 1_000)
    expect(d.money).toBe(-999) // 1원이 남는다
    expect(d.mental).toBe(0)
  })

  it('규칙을 뒤집으면(전액 청구) 잔액이 0 이하가 된다 — 고양이가 파산을 직접 만든다', () => {
    // 사료비를 그냥 빼면 1,000 - 1,500 = -500 ≤ 0 → 단발 지출이 파산 사유가 된다.
    expect(1_000 - CAT_NIGHT_FOOD_COST).toBeLessThanOrEqual(0)
    const d = catNightDelta(adopted(1_000), 1_000)
    expect(1_000 + d.money).toBeGreaterThan(0)
  })

  it('입양 전에는 아무것도 나가지 않는다', () => {
    expect(catNightDelta(meeting(1), 100_000)).toEqual({ money: 0, mental: 0 })
  })
})

describe('쓰다듬기', () => {
  const adopted = (): GameState => {
    const s = at(1, { mental: 50 })
    return { ...s, cat: { fed: 3, ignored: 0, adoptedDay: 1 } }
  }

  it('하루 한 번만 멘탈이 오른다', () => {
    const once = petCat(adopted())
    expect(once.stats.mental).toBe(51)
    expect(petCat(once)).toBe(once) // 같은 날 두 번째는 아무 일도 없다
    const nextDay = petCat({ ...once, day: once.day + 1 })
    expect(nextDay.stats.mental).toBe(52)
  })

  it('입양 전에는 쓰다듬을 수 없다', () => {
    const s = meeting(1)
    expect(petCat(s)).toBe(s)
  })
})

describe('구세이브 안전', () => {
  it('cat도 seed도 없는 상태에서 만남·정산·쓰다듬기가 전부 조용하다', () => {
    const s = createInitialState('구세이브') // seed 없음
    expect(catEncounterDue(s)).toBe(false)
    expect(catNightDelta(s, 100_000)).toEqual({ money: 0, mental: 0 })
    expect(petCat(s)).toBe(s)
    expect(feedCat(s)).toBe(s)
  })
})

/** 지금 날짜 **다음** 방문일. 테스트가 며칠을 건너뛸 때 쓴다. */
function firstVisitAfter(s: GameState): number {
  for (let day = s.day + 1; day <= s.day + 10; day++) {
    if (catVisitsOn(s.seed!, day)) return day
  }
  throw new Error('다음 방문일을 못 찾음')
}
