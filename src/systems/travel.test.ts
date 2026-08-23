import { describe, it, expect } from 'vitest'
import { TRIPS, findTrip } from '../data/trips'
import { tripActivity, tripDays } from './travel'
import { findActivity } from '../data/activities'
import { createInitialState, runActivity, sleepNow } from './turn'
import type { GameState } from '../types/game'

/*
 * ⚠️ **여행은 일정만큼 진짜로 날짜를 태운다**(2026-08-22 설계자 지시). 예전에는
 * `schedule`이 표시 전용이라 "3박 5일"을 다녀와도 달력이 하루도 안 넘어갔다.
 */
describe('일정과 실제 일수', () => {
  it('⚠️ 표기와 실제 일수가 어긋나지 않는다 — 화면이 거짓말을 하면 안 된다', () => {
    for (const t of TRIPS) {
      const written = Number(t.schedule.match(/(\d+)일/)![1])
      expect(t.days, `${t.id}의 일정 표기와 days`).toBe(written)
    }
  })

  it('모든 상품이 하루 이상이다', () => {
    for (const t of TRIPS) expect(tripDays(t)).toBeGreaterThanOrEqual(1)
  })
})

describe('값과 효과는 일수를 곱한다', () => {
  const trip = TRIPS.find((t) => t.days >= 5)!
  const base = findActivity(trip.activityId)!

  it('⚠️ 활동은 하루치를 갖고 상품이 일수를 곱한다 — 상품에 가격을 적지 않는 이유다', () => {
    const scaled = tripActivity(trip)!
    expect(scaled.effects.money).toBe((base.effects.money ?? 0) * trip.days)
    expect(scaled.effects.mental).toBe((base.effects.mental ?? 0) * trip.days)
  })

  it('긴 일정이 짧은 일정보다 비싸고 그만큼 얻는다', () => {
    const short = TRIPS.filter((t) => t.activityId === trip.activityId).reduce((a, b) =>
      a.days <= b.days ? a : b,
    )
    const long = tripActivity(trip)!
    const brief = tripActivity(short)!
    expect(Math.abs(long.effects.money!)).toBeGreaterThan(Math.abs(brief.effects.money!))
    expect(long.effects.mental!).toBeGreaterThan(brief.effects.mental!)
  })

  it('없는 상품은 활동도 없다', () => {
    expect(findTrip('없음')).toBeUndefined()
  })
})

describe('실제로 날이 간다', () => {
  const rich = (): GameState => {
    const base = createInitialState('여행자')
    return { ...base, stats: { ...base.stats, money: 9_000_000, stamina: 100, mental: 60 } }
  }

  it('⚠️ 일정만큼 날짜가 지나간다 — 스토어가 첫날 뒤 남은 날을 밤으로 흘려보낸다', () => {
    const trip = TRIPS.find((t) => t.days === 5)!
    let s = runActivity(rich(), tripActivity(trip)!)
    for (let i = 0; i < tripDays(trip); i++) s = sleepNow(s)
    /* 떠난 날 + 일정 = 돌아와 눈뜨는 날. 5일 상품이면 1일차에 떠나 6일차 아침에 깬다. */
    expect(s.day).toBe(rich().day + trip.days)
  })

  it('여행 중에도 생활비가 하루씩 나간다 — 며칠을 비운 대가가 실제로 든다', () => {
    const trip = TRIPS.find((t) => t.days === 5)!
    const before = rich()
    let s = runActivity(before, tripActivity(trip)!)
    const afterFirst = s.stats.money
    for (let i = 0; i < tripDays(trip); i++) s = sleepNow(s)
    expect(s.stats.money).toBeLessThan(afterFirst)
  })
})
