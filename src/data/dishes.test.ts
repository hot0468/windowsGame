import { describe, expect, it } from 'vitest'
import { DISHES, DISH_TABS, dishesOf, findDish } from './dishes'
import { findActivity } from './activities'
import type { Dish } from './dishes'

/**
 * 배달 메뉴 (2026-08-08 배달의정석).
 *
 * ⚠️ **알바몬 공고와 같은 부류다**: 메뉴는 활동을 가리키기만 하고 값은 활동이 갖는다.
 * 이 파일이 막는 사고 셋:
 *  ① 메뉴에 가격·효과가 슬그머니 생기는 것(두 번째 출처)
 *  ② 없는 활동을 가리키는 메뉴(눌러도 아무 일 없는 카드)
 *  ③ **정크푸드가 매력을 깎지 않게 되는 것** — 설계자가 명시한 이 게임의 규칙이다
 */
describe('배달 메뉴', () => {
  it('id가 겹치지 않는다', () => {
    const ids = DISHES.map((d) => d.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(findDish('없는-메뉴')).toBeUndefined()
  })

  it('가리키는 활동이 실제로 있다 (죽은 카드 방지)', () => {
    for (const d of DISHES) expect(findActivity(d.activityId), d.id).toBeDefined()
  })

  it('⚠️ 메뉴는 수치를 갖지 않는다 — 값은 활동이 갖는다', () => {
    for (const d of DISHES) {
      const keys = Object.keys(d) as (keyof Dish)[]
      expect(keys, d.id).not.toContain('price')
      expect(keys, d.id).not.toContain('effects')
    }
  })

  it('탭을 합치면 메뉴 전체가 된다 — 어떤 메뉴도 목록에서 사라지지 않는다', () => {
    const shown = DISH_TABS.flatMap((t) => dishesOf(t.activityId)).map((d) => d.id)
    expect(shown.sort()).toEqual(DISHES.map((d) => d.id).sort())
  })

  it('탭마다 메뉴가 둘 이상이다 (하나뿐이면 고르는 화면이 아니다)', () => {
    for (const t of DISH_TABS) {
      expect(dishesOf(t.activityId).length, t.label).toBeGreaterThanOrEqual(2)
    }
  })
})

describe('배달 음식이 지는 규칙', () => {
  const junk = findActivity('meal-junk')!
  const healthy = findActivity('meal-healthy')!

  it('⚠️ 정크푸드는 매력을 깎는다', () => {
    expect(junk.effects.charm).toBeLessThan(0)
    // "소량"이다 — 크게 깎으면 싼 회복 수단이 아니라 그냥 함정이 된다.
    expect(junk.effects.charm).toBeGreaterThanOrEqual(-3)
  })

  it('건강식은 아무것도 깎지 않는다 — 둘의 성격이 갈려야 고를 이유가 생긴다', () => {
    for (const [key, value] of Object.entries(healthy.effects)) {
      if (key === 'money' || key === 'stamina') continue // 비용은 당연히 음수다
      expect(value, `건강식의 ${key}`).toBeGreaterThan(0)
    }
  })

  it('정크푸드가 더 싸고 멘탈을 더 채운다 (싼 쪽이 아무 값도 없으면 고를 이유가 없다)', () => {
    expect(Math.abs(junk.effects.money!)).toBeLessThan(Math.abs(healthy.effects.money!))
    expect(junk.effects.mental!).toBeGreaterThan(healthy.effects.mental!)
  })

  it('⚠️ 행동력을 회복시키지 않는다 — 턴을 써서 행동력을 얻는 순환을 만들지 않는다', () => {
    for (const a of [junk, healthy]) {
      expect(a.effects.stamina, `${a.id}의 행동력`).toBeLessThan(0)
    }
  })

  it('requires가 effects의 비용과 어긋나지 않는다 (못 낼 값을 낼 수 있다고 하면 안 된다)', () => {
    for (const a of [junk, healthy]) {
      expect(a.requires?.money, a.id).toBe(Math.abs(a.effects.money!))
      expect(a.requires?.stamina, a.id).toBe(Math.abs(a.effects.stamina!))
    }
  })
})
