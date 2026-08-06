import { describe, expect, it } from 'vitest'
import { SHOP_ITEMS, buyableFor, findItem, storeNameOf } from '../data/items'
import { canOrder, collect, order, recordEvent } from './delivery'
import { canRun, createInitialState, skipSlot } from './turn'
import { findActivity } from '../data/activities'
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

/**
 * 쇼핑 → 배송 → 인벤토리 고리가 **활동 잠금까지 이어지는지** 본다.
 *
 * 헬스장 회원권은 스탯이 아니라 활동을 여는 유일한 물건이라, 고리 중 한 칸만 끊겨도
 * "샀는데 여전히 못 간다"가 된다 — 화면에서는 이유가 보이지 않는 종류의 고장이다.
 */
describe('회원권 잠금 해제 고리', () => {
  const pass = findItem('gym-pass')!
  const gymMember = findActivity('gym-member')!

  it('사기 전에는 실행할 수 없다', () => {
    expect(canRun(rich(), gymMember)).toBe(false)
  })

  it('주문만 해서는 열리지 않는다 — 도착해야 열린다', () => {
    const ordered = order(rich(), pass)
    expect(ordered.stats.money).toBe(1_000_000 - pass.price)
    expect(canRun(ordered, gymMember)).toBe(false)
  })

  it('다음 날 도착하면 열린다', () => {
    // 하루를 보낸다(오전 → 오후 → 다음 날 오전). 도착 판정은 collect가 한다.
    let s = order(rich(), pass)
    s = skipSlot(skipSlot(s))
    const got = collect(s)
    expect(got.arrived.map((i) => i.id)).toContain('gym-pass')
    expect(canRun(got.state, gymMember)).toBe(true)
  })

  it('회원권은 두 번 살 수 없다 — 두 번째 결제는 아무 일도 하지 않는다', () => {
    let s = order(rich(), pass)
    s = collect(skipSlot(skipSlot(s))).state
    expect(canOrder(s, pass)).toBe(false)
    expect(order(s, pass)).toBe(s)
  })
})

/**
 * 하이마루(전자기기) 진열 분리 (2026-08-06).
 *
 * ⚠️ **이 묶음이 막는 것은 "물건이 조용히 사라지거나 두 가게에 동시에 뜨는" 사고다.**
 * `SHOP_ITEMS`는 여전히 물건 전체의 단일 출처이고(인벤토리·파일 탐색기가 여기서
 * 이름과 아이콘을 찾는다), 갈린 것은 **진열 축**(`ShopItem.store`)뿐이다.
 * 세이브의 인벤토리가 id를 들고 있으므로 목록에서 빼는 순간 남의 저장 파일에서
 * 물건 이름이 사라진다 — 그래서 양방향으로 지킨다.
 */
describe('전자기기 진열 분리', () => {
  const MOVED = ['pad', 'headphones', 'laptop']

  it('옮긴 3종은 컬리엔마트 목록에서 빠진다', () => {
    const shop = buyableFor('shop').map((i) => i.id)
    for (const id of MOVED) expect(shop, `${id}가 아직 쇼핑에 있다`).not.toContain(id)
  })

  it('옮긴 3종은 하이마루 목록에 있다', () => {
    const tech = buyableFor('tech').map((i) => i.id)
    for (const id of MOVED) expect(tech, `${id}가 하이마루에 없다`).toContain(id)
  })

  it('옮긴 3종은 SHOP_ITEMS에 그대로 남아 있다 — 인벤토리가 이름을 찾는 곳이다', () => {
    // ⚠️ 여기서 빠지면 이미 그 물건을 산 세이브의 파일 탐색기가 조용히 비어 버린다.
    for (const id of MOVED) {
      const item = findItem(id)
      expect(item, `${id}가 SHOP_ITEMS에서 사라졌다`).toBeDefined()
      expect(item!.name.length).toBeGreaterThan(0)
    }
  })

  it('id·효과·확장자를 바꾸지 않았다 — 세이브가 들고 있는 값이다', () => {
    expect(findItem('pad')!.effects).toEqual({ gaming: 12, mental: 6 })
    expect(findItem('headphones')!.effects).toEqual({ knowledge: 8, mental: 5 })
    expect(findItem('laptop')!.effects).toEqual({ creativity: 10, gaming: 8, knowledge: 6 })
    expect([findItem('pad')!.ext, findItem('headphones')!.ext, findItem('laptop')!.ext]).toEqual([
      '.pad',
      '.hp',
      '.lap',
    ])
  })

  it('한 물건이 두 가게에 동시에 뜨지 않는다', () => {
    const shop = buyableFor('shop').map((i) => i.id)
    const tech = buyableFor('tech').map((i) => i.id)
    expect(shop.filter((id) => tech.includes(id))).toEqual([])
    // 두 가게를 합치면 살 수 있는 물건 전체가 된다 — 어떤 물건도 진열대에서 사라지지 않는다.
    expect([...shop, ...tech].sort()).toEqual(
      SHOP_ITEMS.filter((i) => i.buyable !== false)
        .map((i) => i.id)
        .sort(),
    )
  })

  it('살 수 없는 물건(수료증·자격증)은 어느 가게에도 안 뜬다', () => {
    const shown = [...buyableFor('shop'), ...buyableFor('tech')].map((i) => i.id)
    for (const id of ['cert-ai', 'cert-brand', 'cert-doc', 'cert-safety']) {
      expect(shown, `${id}를 돈으로 살 수 있다`).not.toContain(id)
    }
  })

  it('고가 기기도 밸런스 상한(200만) 안에 있다', () => {
    // ⚠️ 이 게임이 실제로 만드는 현금은 알바 최적 플레이 정점 약 265만이다.
    //    그보다 비싸면 살 수 있는 선택지가 아니라 그냥 없는 물건이 된다.
    for (const item of buyableFor('tech')) {
      expect(item.price, `${item.id}가 너무 비싸다`).toBeLessThanOrEqual(2_000_000)
    }
  })
  it('잠금 사유가 가리키는 가게가 실제로 그 물건을 파는 곳이다', () => {
    // ⚠️ 이 문구가 굳어 있으면 물건을 옮긴 순간 "쇼핑에 가도 없는 물건"을 안내한다.
    expect(storeNameOf('streamkit')).toBe('하이마루')
    expect(storeNameOf('gym-pass')).toBe('쇼핑')
    // 살 수 없는 물건은 가게가 없다 — 없는 가게로 보내지 않는다.
    expect(storeNameOf('cert-ai')).toBeUndefined()
  })
})

/**
 * 방송 장비 잠금 해제 고리. 회원권과 **같은 고리**이므로 같은 방식으로 지킨다 —
 * 사이트가 달라졌을 뿐 배송 경로(`systems/delivery.ts`)는 그대로 탄다.
 */
describe('방송 장비 잠금 해제 고리', () => {
  const kit = findItem('streamkit')!
  const stream = findActivity('stream')!

  it('사기 전에는 실행할 수 없다', () => {
    expect(canRun(rich(), stream)).toBe(false)
  })

  it('주문만 해서는 열리지 않는다 — 도착해야 열린다', () => {
    const ordered = order(rich(), kit)
    expect(ordered.stats.money).toBe(1_000_000 - kit.price)
    expect(canRun(ordered, stream)).toBe(false)
  })

  it('다음 날 도착하면 열린다', () => {
    let s = order(rich(), kit)
    s = skipSlot(skipSlot(s))
    const got = collect(s)
    expect(got.arrived.map((i) => i.id)).toContain('streamkit')
    expect(canRun(got.state, stream)).toBe(true)
  })
})

/*
 * ⚠️ **살 수 있는 물건은 서로 다른 그림이어야 한다.**
 * 진열 격자와 아이템 인벤토리에 나란히 뜨는데 아이콘이 같으면 어느 쪽이 더 비싼
 * 물건인지 그림으로 구분되지 않는다 — 사이트 아이콘 중복을 `sites.test.ts`가 막는 것과
 * 같은 이유다(실제로 듀얼 모니터가 중고 노트북과 같은 `laptop-24`를 쓰고 있었다).
 *
 * ⚠️ **자격증·수료증은 이 규칙에서 뺀다.** 여섯이 `certificate-24`를 공유하는 것은
 * "같은 종류의 서류"라는 뜻이라 의도된 묶음이고, 애초에 `buyable: false`라 진열되지 않는다.
 */
describe('아이템 아이콘 — 진열되는 물건끼리 겹치지 않는다', () => {
  it('살 수 있는 물건의 아이콘은 전부 다르다', () => {
    const buyable = [...buyableFor('shop'), ...buyableFor('tech')]
    const byIcon = new Map<string, string[]>()
    for (const i of buyable) {
      byIcon.set(i.icon, [...(byIcon.get(i.icon) ?? []), i.id])
    }
    const dupes = [...byIcon.entries()].filter(([, ids]) => ids.length > 1)
    expect(dupes).toEqual([])
  })
})
