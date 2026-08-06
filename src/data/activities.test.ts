import { describe, it, expect } from 'vitest'
import {
  ACTIVITIES,
  ACTIVITY_CATEGORIES,
  WORK_ACTIVITIES,
  activitiesOf,
  activitiesUnlockedBy,
  findActivity,
} from './activities'
import { SHOP_ITEMS, buyableFor, findItem } from './items'
import { burnoutKeyOf } from '../systems/burnout'
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

/**
 * 예매 사이트(시집이)가 생기면서 `movie`는 "집에서 보는 것"이 아니라
 * **극장에 다녀오는 것**으로 확정됐다(2026-08-04). 그 사실이 수치에 남아 있는지 지킨다 —
 * 수치를 되돌리면 사이트의 설명("극장 예매")과 게임 규칙이 조용히 어긋난다.
 */
describe('영화 감상은 극장 기준이다', () => {
  const movie = findActivity('movie')!

  it('외출 비용이 붙는다 — 행동력·돈이 소파에서 보는 값보다 크다', () => {
    expect(movie.effects.stamina).toBe(-15)
    expect(movie.effects.money).toBe(-15000)
  })

  it('큰 화면의 보상이 값을 정당화한다', () => {
    expect(movie.effects.mental).toBe(8)
  })

  it('requires가 effects와 어긋나지 않는다 — 못 낼 값을 낼 수 있다고 하면 안 된다', () => {
    // 조건이 비용보다 헐거우면 잔고가 모자란 채로 실행돼 마이너스가 난다.
    expect(movie.requires?.stamina).toBe(Math.abs(movie.effects.stamina!))
    expect(movie.requires?.money).toBe(Math.abs(movie.effects.money!))
  })

  it('그래도 게임보다 비싼 회복 수단으로 남는다 (선택지가 되려면 대안이 있어야 한다)', () => {
    const game = findActivity('game')!
    expect(movie.effects.mental!).toBeLessThan(game.effects.mental!)
  })
})

/**
 * 알바 4종 (2026-08-05, 알바몬 사이트와 함께 신설).
 *
 * 지키는 것 둘: ①**번아웃 우회 금지** — 종류를 바꿔 가며 일해도 연속 노동은 연속 노동이다.
 * ②**전환 압박** — 조건이 걸린 알바는 조건 없는 편의점보다 행동력당 수입이 높아야 한다.
 * 둘 중 하나가 깨지면 "스탯에 투자해 더 좋은 일자리로 간다"는 축이 사라진다.
 */
describe('알바', () => {
  /** 행동력 1당 버는 돈. 알바비 배율은 전부에 똑같이 곱해지므로 비교에서 뺀다. */
  const perStamina = (a: (typeof WORK_ACTIVITIES)[number]) =>
    a.effects.money! / Math.abs(a.effects.stamina!)

  it('알바는 넷이고 전부 생계 묶음이다', () => {
    expect(WORK_ACTIVITIES.map((a) => a.id)).toEqual([
      'work',
      'work-cafe',
      'work-logistics',
      'work-tutor',
    ])
    for (const a of WORK_ACTIVITIES) expect(a.category).toBe('living')
  })

  it('번아웃 키를 공유한다 — 종류를 돌려 가며 일해도 페널티를 피할 수 없다', () => {
    for (const a of WORK_ACTIVITIES) expect(burnoutKeyOf(a)).toBe('work')
  })

  it('전부 알바비 배율을 탄다 — 하나만 빠지면 물가가 올라도 그 일자리만 제자리다', () => {
    for (const a of WORK_ACTIVITIES) expect(a.scalesWithWage).toBe(true)
  })

  it('조건 없는 알바는 편의점 하나뿐이다 — 첫날에도 돈 벌 길은 있어야 한다', () => {
    const free = WORK_ACTIVITIES.filter((a) => !a.requires || Object.keys(a.requires).length <= 1)
    expect(free.map((a) => a.id)).toEqual(['work'])
  })

  it('조건이 걸린 알바는 편의점보다 행동력당 수입이 높다 (카페 제외)', () => {
    // 카페는 예외다 — 돈이 아니라 **매력과 낮은 멘탈 소모**를 사는 자리다.
    const convenience = findActivity('work')!
    for (const id of ['work-logistics', 'work-tutor']) {
      const job = findActivity(id)!
      expect(perStamina(job), `${id}가 편의점보다 벌이가 못하다`).toBeGreaterThan(
        perStamina(convenience),
      )
    }
  })

  it('카페는 돈 대신 다른 것을 준다 — 벌이만 못하면 고를 이유가 없다', () => {
    const cafe = findActivity('work-cafe')!
    expect(cafe.effects.charm).toBeGreaterThan(0)
    // 멘탈 소모가 편의점보다 적다(음수라 더 큰 값이 덜 깎이는 것이다).
    expect(cafe.effects.mental!).toBeGreaterThan(findActivity('work')!.effects.mental!)
  })

  it('requires가 effects의 행동력 소모와 어긋나지 않는다', () => {
    for (const a of WORK_ACTIVITIES) {
      expect(a.requires?.stamina, `${a.id}의 조건이 비용과 다르다`).toBe(
        Math.abs(a.effects.stamina!),
      )
    }
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

  /*
   * ── 하이마루 잠금 해제형 (2026-08-06) ──
   * `gym-pass` ← `gym-member`와 **같은 구조**이므로 같은 방식으로 지킨다.
   */
  it('개인방송은 방송 장비로 잠겨 있다', () => {
    expect(findActivity('stream')?.requiresItem).toBe('streamkit')
  })

  it('방송 장비가 여는 활동을 아이템 쪽에서도 찾을 수 있다', () => {
    expect(activitiesUnlockedBy('streamkit').map((a) => a.id)).toEqual(['stream'])
  })

  it('방송 장비는 실제로 하이마루에서 판다 (살 수 없으면 영영 잠긴 활동이다)', () => {
    expect(buyableFor('tech').some((i) => i.id === 'streamkit')).toBe(true)
  })

  it('잠금 해제형 기기는 스탯을 주지 않는다 — 값어치는 활동을 여는 것이다', () => {
    // ⚠️ 스탯까지 붙이면 "장비를 사면 방송을 잘하게 된다"는 이상한 말이 된다.
    //    `gym-pass`·수료증과 같은 규칙이다.
    expect(findItem('streamkit')!.effects).toEqual({})
  })

  it('개인방송은 알바·외주 어느 번아웃 축에도 섞이지 않는다', () => {
    // ⚠️ 'work'면 WORK_ACTIVITIES 불변식("알바는 넷")이 깨지고,
    //    'gig'·'cert-gig'면 다른 시스템의 연속 노동 페널티를 물려받는다.
    const stream = findActivity('stream')!
    expect(burnoutKeyOf(stream)).toBe('stream')
    expect(WORK_ACTIVITIES.map((a) => a.id)).not.toContain('stream')
  })
})
