import { describe, expect, it } from 'vitest'
import { SHOP_ITEMS, findItem } from '../data/items'
import { canOrder, collect, order, recordEvent } from './delivery'
import { createInitialState, skipSlot } from './turn'
import type { GameState } from '../types/game'

const item = findItem('notebook')!

function rich(): GameState {
  const s = createInitialState('테스터')
  return { ...s, stats: { ...s.stats, money: 1_000_000 } }
}

describe('order', () => {
  it('돈만 쓰고 턴은 넘기지 않는다', () => {
    const before = rich()
    const after = order(before, item)
    expect(after.stats.money).toBe(before.stats.money - item.price)
    expect(after.day).toBe(before.day)
    expect(after.slot).toBe(before.slot)
  })

  it('효과는 결제 시점에 나지 않는다 — 도착해야 난다', () => {
    const after = order(rich(), item)
    expect(after.stats.sensitivity).toBe(rich().stats.sensitivity)
    expect(after.inventory ?? []).toEqual([])
    expect(after.deliveries).toEqual([{ itemId: item.id, day: 2 }])
  })

  it('잔액이 모자라면 아무 일도 없다', () => {
    const poor = { ...rich(), stats: { ...rich().stats, money: 100 } }
    expect(order(poor, item)).toBe(poor)
  })

  it('이미 배송 중이거나 보유한 물건은 다시 못 산다', () => {
    const once = order(rich(), item)
    expect(canOrder(once, item)).toBe(false)
    const owned = { ...rich(), inventory: [{ id: item.id, day: 1 }] }
    expect(canOrder(owned, item)).toBe(false)
  })
})

describe('collect', () => {
  it('도착일 전에는 오지 않는다', () => {
    const ordered = order(rich(), item)
    expect(collect(ordered).arrived).toEqual([])
  })

  it('다음 날 도착하며 그때 효과가 적용된다', () => {
    const ordered = order(rich(), item)
    // 오전 → 오후 → 다음 날 오전
    const next = skipSlot(skipSlot(ordered))
    const got = collect(next)
    expect(got.arrived.map((i) => i.id)).toEqual([item.id])
    expect(got.state.inventory).toEqual([{ id: item.id, day: 2 }])
    expect(got.state.deliveries).toEqual([])
    expect(got.state.stats.sensitivity).toBe(next.stats.sensitivity + item.effects.sensitivity!)
  })

  it('두 번 받아도 효과가 두 배가 되지 않는다', () => {
    const ordered = order(rich(), item)
    const next = skipSlot(skipSlot(ordered))
    const once = collect(next).state
    const twice = collect(once)
    expect(twice.arrived).toEqual([])
    expect(twice.state.stats.sensitivity).toBe(once.stats.sensitivity)
  })

  it('첫 택배가 도감에 남는다', () => {
    const next = skipSlot(skipSlot(order(rich(), item)))
    const got = collect(next).state
    expect(got.events?.map((e) => e.id)).toContain('first-delivery')
  })
})

describe('recordEvent', () => {
  it('같은 사건을 두 번 기록하지 않는다 — 처음 겪은 날이 기록이다', () => {
    const first = recordEvent({ ...rich(), day: 3 }, 'first-ad')
    const again = recordEvent({ ...first, day: 9 }, 'first-ad')
    expect(again.events).toEqual([{ id: 'first-ad', day: 3 }])
  })
})

describe('SHOP_ITEMS', () => {
  it('id가 중복되지 않는다 — 인벤토리가 id로 보유를 판정한다', () => {
    expect(new Set(SHOP_ITEMS.map((i) => i.id)).size).toBe(SHOP_ITEMS.length)
  })
})
