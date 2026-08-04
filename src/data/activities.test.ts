import { describe, it, expect } from 'vitest'
import {
  ACTIVITIES,
  ACTIVITY_CATEGORIES,
  activitiesOf,
  activitiesUnlockedBy,
  findActivity,
} from './activities'
import { SHOP_ITEMS, findItem } from './items'
import { GROWTH_STAT_KEYS, STAT_NAMES } from '../types/game'
import type { GrowthStatKey } from '../types/game'

/**
 * ⚠️ **이 파일이 막는 것은 "스탯만 늘리고 활동을 안 만드는" 사고다.**
 *
 * 성장 스탯이 10종인데 올릴 방법이 있는 건 지식·매력 둘뿐이었고, 나머지 여덟 줄은
 * 스탯창에 영원히 0으로 박혀 있었다. 눈으로는 안 보이는 종류의 버그다 — 아무것도
 * 깨지지 않고 그냥 아무 일도 일어나지 않기 때문이다. 그래서 목록을 순회하는 형태로 쓴다:
 * `GROWTH_STAT_KEYS`에 스탯을 추가하고 활동을 안 만들면 **여기서 바로 실패한다.**
 */
describe('성장 스탯은 전부 육성 가능해야 한다', () => {
  /** 그 스탯을 올려 주는 활동. */
  const raisers = (key: GrowthStatKey) =>
    ACTIVITIES.filter((a) => (a.effects[key] ?? 0) > 0).map((a) => a.id)

  it.each(GROWTH_STAT_KEYS)('%s를 올리는 활동이 하나 이상 있다', (key) => {
    expect(raisers(key), `${STAT_NAMES[key]}(${key})를 올리는 활동이 없다`).not.toHaveLength(0)
  })

  it('스탯을 깎기만 하는 활동은 없다 — 모든 활동은 무언가를 준다', () => {
    for (const a of ACTIVITIES) {
      const gains = Object.values(a.effects).filter((v) => v > 0)
      expect(gains.length, `${a.id}에 얻는 것이 없다`).toBeGreaterThan(0)
    }
  })

  it('멘탈 회복처가 둘 이상이다 — 하나뿐이면 그 활동은 선택지가 아니라 통행세다', () => {
    const healers = ACTIVITIES.filter((a) => (a.effects.mental ?? 0) > 0)
    expect(healers.length).toBeGreaterThanOrEqual(2)
  })
})

describe('활동 분류', () => {
  it('모든 활동이 정의된 묶음에 속한다', () => {
    const ids = ACTIVITY_CATEGORIES.map((c) => c.id)
    for (const a of ACTIVITIES) expect(ids).toContain(a.category)
  })

  it('빈 묶음이 없다 — 라벨만 있고 항목이 없는 구역은 고르기 판에 빈 줄을 만든다', () => {
    for (const c of ACTIVITY_CATEGORIES) expect(activitiesOf(c.id).length).toBeGreaterThan(0)
  })

  it('묶음을 모두 합치면 활동 전체가 된다 — 어떤 활동도 고르기 판에서 사라지지 않는다', () => {
    const shown = ACTIVITY_CATEGORIES.flatMap((c) => activitiesOf(c.id)).map((a) => a.id)
    expect(shown.sort()).toEqual(ACTIVITIES.map((a) => a.id).sort())
  })

  it('활동 id가 중복되지 않는다', () => {
    const ids = ACTIVITIES.map((a) => a.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('아이템 잠금', () => {
  it('requiresItem은 실제로 파는 물건을 가리킨다', () => {
    for (const a of ACTIVITIES) {
      if (!a.requiresItem) continue
      expect(findItem(a.requiresItem), `${a.id}의 requiresItem이 없는 물건이다`).toBeDefined()
    }
  })

  it('헬스장 회원 활동은 회원권으로 잠겨 있다', () => {
    expect(findActivity('gym-member')?.requiresItem).toBe('gym-pass')
    // 1일권은 잠기지 않는다 — 잠그면 시작하자마자 헬스장 자체가 닫힌다.
    expect(findActivity('gym-day')?.requiresItem).toBeUndefined()
  })

  it('회원권 값은 1일권 6회분이다 — 7번째 방문부터 이득이라는 것이 이 물건의 존재 이유다', () => {
    const pass = findItem('gym-pass')!
    const dayPassCost = Math.abs(findActivity('gym-day')!.effects.money ?? 0)
    expect(dayPassCost).toBe(15000)
    expect(pass.price).toBe(90000)
    expect(Math.ceil(pass.price / dayPassCost)).toBe(6)
  })

  it('회원권이 여는 활동을 아이템 쪽에서도 찾을 수 있다', () => {
    expect(activitiesUnlockedBy('gym-pass').map((a) => a.id)).toEqual(['gym-member'])
  })

  it('회원 활동은 1일권보다 싸다 — 그렇지 않으면 회원권을 살 이유가 없다', () => {
    const day = findActivity('gym-day')!
    const member = findActivity('gym-member')!
    expect(member.effects.money ?? 0).toBeGreaterThan(day.effects.money ?? 0)
  })

  it('잠긴 활동이 있는 물건은 실제로 상점에 있다', () => {
    const locked = ACTIVITIES.filter((a) => a.requiresItem).map((a) => a.requiresItem)
    for (const id of locked) expect(SHOP_ITEMS.some((i) => i.id === id)).toBe(true)
  })
})
