import { describe, it, expect } from 'vitest'
import { TRIPS } from '../data/trips'
import { findActivity } from '../data/activities'
import { hasSouvenir, reviveSouvenirs, souvenirsOf, takeTrip, visitedDay } from './trips'
import { createInitialState } from './turn'
import type { GameState } from '../types/game'

/** 여행을 감당할 수 있는 상태. 가장 비싼 상품(장거리)도 갈 수 있게 넉넉히 준다. */
const rich = (over: Partial<GameState> = {}): GameState => ({
  ...createInitialState('테스트'),
  day: 20,
  stats: { ...createInitialState('테스트').stats, stamina: 100, mental: 50, money: 2_000_000 },
  ...over,
})

const longTrip = TRIPS.find((t) => t.activityId === 'travel')!
const nearTrip = TRIPS.find((t) => t.activityId === 'travel-near')!

describe('상품 데이터', () => {
  it('상품마다 기념품과 그 한 줄이 있다 — 없으면 도감에 빈 칸이 뜬다', () => {
    for (const t of TRIPS) {
      expect(t.souvenir.length, `${t.id}의 기념품 이름이 없다`).toBeGreaterThan(0)
      expect(t.souvenirNote.length, `${t.id}의 기념품 설명이 없다`).toBeGreaterThan(0)
    }
  })

  it('기념품이 서로 다르다 — 같으면 어디서 온 것인지 도감이 답을 못 한다', () => {
    expect(new Set(TRIPS.map((t) => t.souvenir)).size).toBe(TRIPS.length)
  })

  /**
   * ⚠️ **값은 활동이 갖는다**(상품은 가리키기만 한다) — 상품에 수치를 적기 시작하면
   * 밸런스 테스트가 못 보는 두 번째 출처가 생긴다. 그 규칙을 데이터에서 확인한다.
   */
  it('상품이 가리키는 활동이 실제로 있다', () => {
    for (const t of TRIPS) expect(findActivity(t.activityId), t.id).toBeDefined()
  })
})

describe('다녀오기', () => {
  it('활동이 실행되고 기념품이 남는다', () => {
    const before = rich()
    const after = takeTrip(before, longTrip)
    expect(after).not.toBe(before)
    expect(hasSouvenir(after, longTrip.id)).toBe(true)
    // 값은 활동이 갖는다 — 여행은 멘탈을 채우고 돈을 쓴다.
    expect(after.stats.money).toBeLessThan(before.stats.money)
  })

  /** ⚠️ 오후에 실행하면 날이 넘어간다 — 뒤 상태에서 읽으면 다음 날 다녀온 것이 된다. */
  it('다녀온 날은 턴이 넘어가기 전 날짜다', () => {
    const before = rich({ day: 20, slot: 'afternoon' })
    const after = takeTrip(before, longTrip)
    expect(after.day).toBeGreaterThan(20)
    expect(visitedDay(after, longTrip.id)).toBe(20)
  })

  /**
   * ⚠️ **반쪽 상태 금지.** 조건이 안 되는데 기념품만 남으면 "가지도 않았는데 다녀온 곳"이 된다.
   */
  it('돈이 모자라면 아무것도 하지 않는다', () => {
    const poor = rich({ stats: { ...rich().stats, money: 1000 } })
    expect(takeTrip(poor, longTrip)).toBe(poor)
  })

  it('행동력이 모자라면 아무것도 하지 않는다', () => {
    const tired = rich({ stats: { ...rich().stats, stamina: 5 } })
    expect(takeTrip(tired, longTrip)).toBe(tired)
  })

  /**
   * ⚠️ 늘어나면 도감이 **모으는 것이 아니라 방문 횟수 표시**가 된다.
   * 다만 여행 자체는 다시 되어야 한다 — 멘탈 회복처를 한 번씩만 쓰게 만들지 않는다.
   */
  it('같은 곳을 다시 가면 기념품은 안 늘지만 여행은 된다', () => {
    const once = takeTrip(rich(), longTrip)
    const twice = takeTrip({ ...once, stats: { ...once.stats, stamina: 100, mental: 30 } }, longTrip)
    expect(souvenirsOf(twice)).toHaveLength(1)
    expect(twice.stats.mental).toBeGreaterThan(30)
  })

  it('다른 곳을 가면 기념품이 하나 더 는다', () => {
    const first = takeTrip(rich(), longTrip)
    const second = takeTrip({ ...first, stats: { ...first.stats, stamina: 100 } }, nearTrip)
    expect(souvenirsOf(second).map((s) => s.tripId).sort()).toEqual(
      [longTrip.id, nearTrip.id].sort(),
    )
  })

  it('안 간 곳은 다녀온 날이 없다 — 도감이 미방문을 적는 근거다', () => {
    expect(visitedDay(rich(), longTrip.id)).toBeUndefined()
  })
})

describe('세이브 보정', () => {
  it('없는 상품을 가리키는 기록은 버린다', () => {
    expect(reviveSouvenirs([{ tripId: longTrip.id, day: 3 }, { tripId: '없는곳', day: 4 }])).toEqual(
      [{ tripId: longTrip.id, day: 3 }],
    )
  })

  /** ⚠️ 같은 곳이 둘이면 도감의 "몇 곳 중 몇 곳"이 실제보다 커진다. */
  it('같은 곳이 둘이면 처음 간 날만 남긴다', () => {
    const fixed = reviveSouvenirs([
      { tripId: longTrip.id, day: 3 },
      { tripId: longTrip.id, day: 9 },
    ])
    expect(fixed).toEqual([{ tripId: longTrip.id, day: 3 }])
  })

  it('날짜가 숫자가 아니면 버린다', () => {
    expect(reviveSouvenirs([{ tripId: longTrip.id, day: '셋' }])).toBeUndefined()
  })

  it('배열이 아니면 undefined', () => {
    expect(reviveSouvenirs('아니다')).toBeUndefined()
    expect(reviveSouvenirs([])).toBeUndefined()
  })
})
