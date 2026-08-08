import { describe, expect, it } from 'vitest'
import { HERO_TRIP, TRIPS, TRIP_REGIONS, findTrip, tripsOf } from './trips'
import { findActivity } from './activities'
import type { Trip } from './trips'

/**
 * 여행 상품 (2026-08-08 판형 개편에서 4 → 10종).
 *
 * ⚠️ **알바몬 공고·배달 메뉴와 같은 부류다**: 상품은 활동을 가리키기만 하고 값은 활동이
 * 갖는다. 이 파일이 막는 사고 셋:
 *  ① 상품에 가격·효과가 슬그머니 생기는 것(두 번째 출처)
 *  ② 없는 활동을 가리키는 상품(눌러도 아무 일 없는 카드)
 *  ③ **근거리와 장거리가 같은 성격이 되는 것** — 값만 다르면 하나가 늘 정답이 된다
 */
describe('여행 상품', () => {
  it('id가 겹치지 않는다', () => {
    const ids = TRIPS.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(findTrip('없는-상품')).toBeUndefined()
  })

  it('가리키는 활동이 실제로 있다 (죽은 카드 방지)', () => {
    for (const t of TRIPS) expect(findActivity(t.activityId), t.id).toBeDefined()
  })

  it('⚠️ 상품은 수치를 갖지 않는다 — 값은 활동이 갖는다', () => {
    for (const t of TRIPS) {
      const keys = Object.keys(t) as (keyof Trip)[]
      expect(keys, t.id).not.toContain('price')
      expect(keys, t.id).not.toContain('effects')
    }
  })

  it('지역을 합치면 상품 전체가 된다 — 어떤 상품도 목록에서 사라지지 않는다', () => {
    const shown = TRIP_REGIONS.flatMap((r) => tripsOf(r)).map((t) => t.id)
    expect(shown.sort()).toEqual(TRIPS.map((t) => t.id).sort())
  })

  it('지역마다 상품이 둘 이상이다 (하나뿐이면 고르는 화면이 아니다)', () => {
    for (const r of TRIP_REGIONS) expect(tripsOf(r).length, r).toBeGreaterThanOrEqual(2)
  })

  it('히어로는 배열 첫 항목이다 — 편성은 데이터가 정한다', () => {
    expect(HERO_TRIP).toBe(TRIPS[0])
  })

  it('국내·근거리는 근거리 활동을, 장거리는 장거리 활동을 가리킨다', () => {
    for (const t of TRIPS) {
      const expected = t.region === '장거리' ? 'travel' : 'travel-near'
      expect(t.activityId, `${t.id}(${t.region})`).toBe(expected)
    }
  })
})

describe('여행 두 종류의 성격', () => {
  const near = findActivity('travel-near')!
  const far = findActivity('travel')!

  it('장거리가 더 비싸고 더 크게 회복한다', () => {
    expect(Math.abs(far.effects.money!)).toBeGreaterThan(Math.abs(near.effects.money!))
    expect(far.effects.mental!).toBeGreaterThan(near.effects.mental!)
  })

  it('⚠️ 근거리는 행동력을 덜 먹는다 — 값만 싼 하위 호환이면 고를 이유가 없다', () => {
    // 음수라 "더 큰 값"이 덜 먹는 것이다.
    expect(near.effects.stamina!).toBeGreaterThan(far.effects.stamina!)
  })

  it('둘 다 이 게임에서 가장 큰 멘탈 회복 축이다 (게임보다 크다)', () => {
    const game = findActivity('game')!
    expect(far.effects.mental!).toBeGreaterThan(game.effects.mental!)
  })

  it('requires가 effects의 비용과 어긋나지 않는다', () => {
    for (const a of [near, far]) {
      expect(a.requires?.money, a.id).toBe(Math.abs(a.effects.money!))
      expect(a.requires?.stamina, a.id).toBe(Math.abs(a.effects.stamina!))
    }
  })
})
