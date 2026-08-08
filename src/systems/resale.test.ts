import { describe, expect, it } from 'vitest'
import { BUYABLE_ITEMS, SHOP_ITEMS } from '../data/items'
import { FILMS } from '../data/media'
import { POSTCARD_LIST_PRICE, RESALE_RATE } from '../data/resale'
import { collect, order } from './delivery'
import {
  POSTCARD_SELL_PRICE,
  sellItem,
  sellPostcard,
  sellPriceOf,
  sellableItems,
  sellablePostcards,
  wasSold,
} from './resale'
import { createInitialState } from './turn'
import type { GameState, Stats } from '../types/game'

function state(over: Omit<Partial<GameState>, 'stats'> & { stats?: Partial<Stats> } = {}): GameState {
  const s = createInitialState('테스터')
  return { ...s, ...over, stats: { ...s.stats, ...(over.stats ?? {}) } }
}

const ITEM = BUYABLE_ITEMS[0]
const FILM = FILMS[0]

/** 가진 상태를 만든다. 도착 경로를 그대로 타야 효과까지 실제와 같다. */
function owning(item = ITEM, over: Parameters<typeof state>[0] = {}): GameState {
  const before = state({ stats: { money: item.price * 10 }, ...over })
  const ordered = order(before, item)
  return collect({ ...ordered, day: ordered.day + 1 }).state
}

describe('매입가', () => {
  it('정가의 반값이다', () => {
    expect(sellPriceOf(10_000)).toBe(5_000)
    expect(sellPriceOf(ITEM.price)).toBe(Math.floor(ITEM.price * RESALE_RATE))
  })

  it('⚠️ 매입가가 정가를 넘지 않는다 — 사서 되파는 것이 이득이면 무한 수입이 된다', () => {
    for (const item of BUYABLE_ITEMS) expect(sellPriceOf(item.price)).toBeLessThan(item.price)
  })

  it('⚠️ 포스트카드 매입가가 관람료보다 싸다 — 극장이 현금 인출기가 되지 않는다', () => {
    expect(POSTCARD_SELL_PRICE).toBe(Math.floor(POSTCARD_LIST_PRICE * RESALE_RATE))
    expect(POSTCARD_SELL_PRICE).toBeLessThan(15_000)
  })
})

describe('팔 수 있는 것', () => {
  it('가진 물건만 목록에 오른다', () => {
    expect(sellableItems(state())).toEqual([])
    expect(sellableItems(owning()).map((i) => i.id)).toEqual([ITEM.id])
  })

  it('⚠️ 수료증처럼 시중에 없는 물건(`buyable: false`)은 못 판다', () => {
    const locked = SHOP_ITEMS.find((i) => i.buyable === false)
    expect(locked, '`buyable: false` 물건이 하나는 있어야 이 규칙이 뜻을 갖는다').toBeDefined()
    const held = state({ inventory: [{ id: locked!.id, day: 1 }] })
    expect(sellableItems(held)).toEqual([])
    expect(sellItem(held, locked!.id)).toBe(held)
  })

  it('안 가진 물건을 팔면 아무 일도 없다', () => {
    const s = state()
    expect(sellItem(s, ITEM.id)).toBe(s)
  })
})

describe('물건 팔기', () => {
  it('인벤토리에서 빠지고 반값이 들어온다 — 턴은 안 흐른다', () => {
    const before = owning()
    const after = sellItem(before, ITEM.id)
    expect(after.stats.money).toBe(before.stats.money + sellPriceOf(ITEM.price))
    expect(after.inventory?.some((i) => i.id === ITEM.id)).toBe(false)
    expect(after.day).toBe(before.day)
    expect(after.slot).toBe(before.slot)
  })

  it('⚠️ 팔고 되사도 효과는 다시 붙지 않는다 — 반값에 스탯을 무한히 사는 구멍', () => {
    const effectKey = Object.keys(ITEM.effects)[0] as keyof Stats
    expect(effectKey, '효과 있는 물건이라야 이 증명이 성립한다').toBeDefined()

    const owned = owning()
    const sold = sellItem(owned, ITEM.id)
    expect(wasSold(sold, ITEM.id)).toBe(true)

    // 다시 주문해서 받는다. 물건은 돌아오지만 스탯은 그대로여야 한다.
    const reordered = order({ ...sold, stats: { ...sold.stats, money: ITEM.price * 10 } }, ITEM)
    const again = collect({ ...reordered, day: reordered.day + 1 }).state
    expect(again.inventory?.some((i) => i.id === ITEM.id)).toBe(true)
    expect(again.stats[effectKey]).toBe(sold.stats[effectKey])
  })

  it('⚠️ 규칙을 뒤집으면 구멍이 다시 열린다 — `sold` 기록이 없으면 효과가 또 붙는다', () => {
    const effectKey = Object.keys(ITEM.effects)[0] as keyof Stats
    const owned = owning()
    // `sold`를 지운 상태(= 되사기 방지를 끈 상태)로 같은 흐름을 태운다.
    const sold = { ...sellItem(owned, ITEM.id), sold: undefined }
    const reordered = order({ ...sold, stats: { ...sold.stats, money: ITEM.price * 10 } }, ITEM)
    const again = collect({ ...reordered, day: reordered.day + 1 }).state
    expect(again.stats[effectKey]).not.toBe(sold.stats[effectKey])
  })
})

describe('포스트카드 팔기', () => {
  const held = state({ postcards: [{ filmId: FILM.id, day: 1 }] })

  it('목록에서 빠지고 매입가가 들어온다', () => {
    const after = sellPostcard(held, FILM.id)
    expect(after.stats.money).toBe(held.stats.money + POSTCARD_SELL_PRICE)
    expect(after.postcards).toEqual([])
  })

  it('⚠️ `sold`에 남기지 않는다 — 다시 보려면 1턴과 관람료를 또 내므로 구멍이 없다', () => {
    expect(sellPostcard(held, FILM.id).sold).toBeUndefined()
  })

  it('없는 장을 팔면 아무 일도 없다', () => {
    expect(sellPostcard(held, 'no-such-film')).toBe(held)
  })

  it('없는 영화를 가리키는 장은 목록에 안 뜬다(구세이브)', () => {
    const broken = state({ postcards: [{ filmId: 'gone', day: 1 }] })
    expect(sellablePostcards(broken)).toEqual([])
  })
})
