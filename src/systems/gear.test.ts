import { describe, it, expect } from 'vitest'
import { GEARS, GEAR_WARN_LEFT, findGear } from '../data/gear'
import { findActivity } from '../data/activities'
import { findItem } from '../data/items'
import { collect, order } from './delivery'
import { gearMessages, isWorn, usesLeft, usesOf, wearGear } from './gear'
import { createInitialState, canRun, runActivity } from './turn'
import type { GameState, Stats } from '../types/game'

function state(over: Omit<Partial<GameState>, 'stats'> & { stats?: Partial<Stats> } = {}): GameState {
  const s = createInitialState('테스터')
  return { ...s, ...over, stats: { ...s.stats, ...(over.stats ?? {}) } }
}

/** 팬 타블렛을 들고 그릴 수 있는 판. 그리기는 슬롯 제약이 없다. */
function drawer(): GameState {
  return state({ stats: { stamina: 999 }, inventory: [{ id: 'pen-tablet', day: 1 }] })
}

const draw = findActivity('draw')!

describe('장비 데이터', () => {
  it('가리키는 물건이 실재한다 (죽은 마모 대상 방지)', () => {
    for (const g of GEARS) expect(findItem(g.itemId), g.itemId).toBeDefined()
  })

  it('⚠️ 비싼 장비가 더 오래 간다 — 아니면 비싼 쪽을 살 이유가 등급 보너스뿐이 된다', () => {
    const pen = findGear('pen-tablet')!
    const lcd = findGear('lcd-tablet')!
    expect(findItem('lcd-tablet')!.price).toBeGreaterThan(findItem('pen-tablet')!.price)
    expect(lcd.uses).toBeGreaterThan(pen.uses)
  })

  it('⚠️ 회원권·자격증은 닳지 않는다 — 기간권과 종이는 이 축이 아니다', () => {
    for (const g of GEARS) {
      expect(g.itemId).not.toMatch(/pass$/)
      expect(g.itemId).not.toMatch(/^cert-/)
    }
  })
})

describe('마모와 고장', () => {
  it('쓸 때마다 한 번씩 닳고 남은 횟수를 셀 수 있다', () => {
    const before = drawer()
    expect(usesLeft(before, 'pen-tablet')).toBe(findGear('pen-tablet')!.uses)
    const after = runActivity(before, draw)
    expect(usesOf(after, 'pen-tablet')).toBe(1)
    expect(usesLeft(after, 'pen-tablet')).toBe(findGear('pen-tablet')!.uses - 1)
  })

  it('⚠️ 다 쓰면 인벤토리에서 빠지고 그 활동이 잠긴다', () => {
    const uses = findGear('pen-tablet')!.uses
    let s = drawer()
    for (let i = 0; i < uses; i++) s = wearGear(s, draw).state
    expect(s.inventory?.some((i) => i.id === 'pen-tablet')).toBe(false)
    expect(s.broken).toContain('pen-tablet')
    expect(canRun(s, draw)).toBe(false)
  })

  it('고장이 임박하면 미리 알 수 있다 — 손실이 사고가 아니라 대가가 된다', () => {
    const uses = findGear('pen-tablet')!.uses
    let s = drawer()
    for (let i = 0; i < uses - GEAR_WARN_LEFT; i++) s = wearGear(s, draw).state
    expect(isWorn(s, 'pen-tablet')).toBe(true)
  })

  it('⚠️ 무작위가 없다 — 같은 판을 같은 횟수 쓰면 늘 같은 시점에 고장 난다', () => {
    const uses = findGear('pen-tablet')!.uses
    const run = () => {
      let s = drawer()
      let brokeAt = 0
      for (let i = 1; i <= uses; i++) {
        const w = wearGear(s, draw)
        s = w.state
        if (w.broken && !brokeAt) brokeAt = i
      }
      return brokeAt
    }
    expect(run()).toBe(uses)
    expect(run()).toBe(run())
  })

  it('⚠️ 다시 사면 처음부터 센다 — 안 그러면 되사자마자 또 부서진다', () => {
    const uses = findGear('pen-tablet')!.uses
    let s = drawer()
    for (let i = 0; i < uses; i++) s = wearGear(s, draw).state
    expect(usesOf(s, 'pen-tablet')).toBe(0)
  })

  it('닳지 않는 활동은 상태를 그대로 돌려준다', () => {
    const s = state({ stats: { stamina: 999 } })
    const study = findActivity('study')!
    expect(wearGear(s, study).state).toBe(s)
  })
})

describe('⚠️ 되사기 구멍의 두 번째 입구', () => {
  it('부순 뒤 다시 사도 스탯 효과가 붙지 않는다', () => {
    const item = findItem('streamkit')!
    const effectKey = Object.keys(item.effects)[0] as keyof Stats | undefined
    // 효과가 없는 물건이면 이 증명이 성립하지 않는다 — 그때는 다른 장비로 재야 한다.
    if (!effectKey) return

    const broke = state({
      stats: { money: item.price * 5 },
      broken: ['streamkit'],
    })
    const ordered = order(broke, item)
    const got = collect({ ...ordered, day: ordered.day + 1 }).state
    expect(got.inventory?.some((i) => i.id === 'streamkit')).toBe(true)
    expect(got.stats[effectKey]).toBe(broke.stats[effectKey])
  })

  it('규칙을 뒤집으면 구멍이 열린다 — `broken` 기록이 없으면 효과가 또 붙는다', () => {
    const item = findItem('streamkit')!
    const effectKey = Object.keys(item.effects)[0] as keyof Stats | undefined
    if (!effectKey) return
    const clean = state({ stats: { money: item.price * 5 } })
    const ordered = order(clean, item)
    const got = collect({ ...ordered, day: ordered.day + 1 }).state
    expect(got.stats[effectKey]).not.toBe(clean.stats[effectKey])
  })
})

describe('고장 소식', () => {
  it('아웃룩으로 간다 — 새 알림 창구를 만들지 않는다', () => {
    const [msg] = gearMessages(state({ broken: ['pen-tablet'] }))
    expect(msg.channel).toBe('outlook')
    expect(msg.text).toContain(findItem('pen-tablet')!.name)
  })

  it('부순 적 없으면 아무 말도 없다', () => {
    expect(gearMessages(state())).toEqual([])
  })
})
