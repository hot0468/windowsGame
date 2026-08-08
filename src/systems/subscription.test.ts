import { describe, it, expect } from 'vitest'
import {
  advanceSubscriptions,
  daysToBilling,
  subscribe,
  subscriptionsOf,
  unsubscribe,
} from './subscription'
import { canRun, createInitialState, subscribed } from './turn'
import { BILLING_INTERVAL_DAYS, SUBSCRIPTIONS, findSubscription } from '../data/subscriptions'
import { ACTIVITIES, findActivity } from '../data/activities'
import { DESKTOP_ITEMS, desktopEntries } from '../data/desktopItems'
import { SITES } from '../data/sites'
import { SEARCH_SUGGESTIONS } from '../data/news'
import type { GameState } from '../types/game'

/**
 * ⚠️ **이 파일은 구독이 깨뜨릴 수 있는 것만 덮는다.** 구독은 이 게임에서 **밤에 나가는
 * 유일한 돈**이라(생활비를 빼면) 청구 루프와 해지 규칙에 증명을 붙이고, 나머지는
 * 회귀 테스트 수준으로 둔다.
 */

const ADOBE = 'adobe'
const FEE = findSubscription(ADOBE)!.monthlyFee

function rich(money = 500_000, day = 1): GameState {
  const base = createInitialState('구독자')
  return { ...base, day, stats: { ...base.stats, money } }
}

describe('가입·해지', () => {
  it('가입하면 첫 달치를 그 자리에서 낸다', () => {
    const before = rich()
    const after = subscribe(before, ADOBE)
    expect(subscribed(after, ADOBE)).toBe(true)
    expect(before.stats.money - after.stats.money).toBe(FEE)
    expect(subscriptionsOf(after).paid).toBe(FEE)
  })

  it('⚠️ 소지금을 0으로 만드는 가입은 막는다 — 그날 밤 파산이다', () => {
    const broke = rich(FEE)
    expect(subscribe(broke, ADOBE)).toBe(broke)
    expect(subscribe(rich(FEE + 1), ADOBE)).not.toBe(rich(FEE + 1))
  })

  it('두 번 가입되지 않고, 없는 상품은 아무 일도 아니다', () => {
    const once = subscribe(rich(), ADOBE)
    expect(subscribe(once, ADOBE)).toBe(once)
    expect(subscribe(rich(), 'nope')).not.toBe(undefined)
    expect(subscribed(subscribe(rich(), 'nope'), 'nope')).toBe(false)
  })

  it('해지하면 키가 사라지고 낸 돈은 안 돌아온다', () => {
    const on = subscribe(rich(), ADOBE)
    const off = unsubscribe(on, ADOBE)
    expect(subscribed(off, ADOBE)).toBe(false)
    // 환불이 있으면 "쓰기 직전에 끊는" 것이 언제나 이득이 되어 구독이 비용이 아니게 된다.
    expect(off.stats.money).toBe(on.stats.money)
    expect(unsubscribe(off, ADOBE)).toBe(off)
  })
})

describe('월 청구', () => {
  it('주기가 차기 전에는 한 푼도 안 나간다', () => {
    const on = subscribe(rich(), ADOBE)
    const before = { ...on, day: on.day + BILLING_INTERVAL_DAYS - 1 }
    expect(advanceSubscriptions(before)).toBe(before)
    expect(daysToBilling(before, ADOBE)).toBe(1)
  })

  it('주기가 차면 요금이 빠지고 커서가 밀린다 (같은 달을 두 번 청구하지 않는다)', () => {
    const on = subscribe(rich(), ADOBE)
    const due = { ...on, day: on.day + BILLING_INTERVAL_DAYS }
    const billed = advanceSubscriptions(due)
    expect(due.stats.money - billed.stats.money).toBe(FEE)
    expect(advanceSubscriptions(billed)).toBe(billed)
  })

  it('며칠이 한 번에 흘러도 밀린 달을 전부 따라잡는다', () => {
    const on = subscribe(rich(), ADOBE)
    const due = { ...on, day: on.day + BILLING_INTERVAL_DAYS * 3 }
    const billed = advanceSubscriptions(due)
    expect(due.stats.money - billed.stats.money).toBe(FEE * 3)
  })

  it('⚠️ 못 내면 외상이 아니라 해지된다 — 소지금은 음수가 되지 않는다', () => {
    const on = subscribe(rich(FEE * 2), ADOBE) // 낸 뒤 잔액 = FEE
    const due = { ...on, day: on.day + BILLING_INTERVAL_DAYS }
    const after = advanceSubscriptions(due)
    expect(subscribed(after, ADOBE)).toBe(false)
    // 음수 잔액을 만들면 파산 판정(`money <= 0`)이 흐려진다.
    expect(after.stats.money).toBe(due.stats.money)
    expect(after.stats.money).toBeGreaterThan(0)
  })

  it('구독한 적 없는 세이브는 부풀리지 않는다', () => {
    const s = rich()
    expect(s.subscriptions).toBeUndefined()
    const later = { ...s, day: 200 }
    expect(advanceSubscriptions(later)).toBe(later)
  })
})

describe('구독이 여는 것', () => {
  const design = findActivity('tool-photoshop')!

  it('포토샵 작업은 구독 중일 때만 실행된다', () => {
    const rested = { ...rich(), stats: { ...rich().stats, stamina: 100 } }
    expect(canRun(rested, design)).toBe(false)
    const on = subscribe(rested, ADOBE)
    expect(canRun(on, design)).toBe(true)
    // ⚠️ **아이템과 다른 점**: 끊으면 다시 잠긴다.
    expect(canRun(unsubscribe(on, ADOBE), design)).toBe(false)
  })

  it('포토샵 아이콘은 구독해야 나타나고 끊으면 사라진다', () => {
    const has = (ids: string[]) =>
      desktopEntries([], [], false, ids).some((e) => e.id === 'photoshop')
    expect(has([])).toBe(false)
    expect(has([ADOBE])).toBe(true)
    // `DESKTOP_ITEMS`에서는 빠지지 않는다 — 기본 격자 좌표가 거기서 파생된다.
    expect(DESKTOP_ITEMS.some((i) => i.id === 'photoshop')).toBe(true)
  })

  it('구독을 요구하는 것은 실제로 있는 상품을 가리킨다', () => {
    const ids = [
      ...ACTIVITIES.map((a) => a.requiresSubscription),
      ...DESKTOP_ITEMS.map((i) => i.requiresSubscription),
    ].filter((id): id is string => !!id)
    expect(ids.length).toBeGreaterThan(0)
    for (const id of ids) expect(findSubscription(id), `${id} 상품이 없다`).toBeDefined()
  })

  it('⚠️ 결제 화면으로 가는 길이 있다 — 잠금 사유가 막다른 골목이면 안 된다', () => {
    for (const sub of SUBSCRIPTIONS) {
      const site = SITES.find((s) => s.id === sub.siteId)
      expect(site, `${sub.id}의 사이트가 없다`).toBeDefined()
      // 즐겨찾기·소개 카드·**검색어 추천** 중 하나는 있어야 한다(주소창만으로는 못 찾는다).
      // ⚠️ 어도비는 2026-08-08 설계자 지시로 소개 카드를 뺐고 **검색 추천이 유일한 입구**다.
      const reachable =
        Boolean(site!.bookmark || site!.promo) ||
        SEARCH_SUGGESTIONS.some((t) => t.siteId === site!.id)
      expect(reachable, `${sub.id}로 가는 입구가 없다`).toBe(true)
    }
  })
})
