import { DAY_END } from '../data/clock'
import { describe, expect, it } from 'vitest'
import { ACTIVITIES, findActivity } from '../data/activities'
import { ALBUM_SKILL, LIVE_SKILL, SKILL_CAP, SKILL_PER_PRACTICE, albumPay, livePay } from '../data/band'
import { BASE_LIVING_COST, INCOME_CAP_RATIO } from '../data/economy'
import { bandPayFor, bandSkillOpen, practiceBand, reviveBand, skillOf } from './band'
import { canRun, createInitialState, runActivity } from './turn'
import type { GameState } from '../types/game'

const PRACTICE = findActivity('band-practice')!
const LIVE = findActivity('band-live')!
const ALBUM = findActivity('band-album')!

/** 오후로 맞춘 판(밴드 셋은 전부 오후 전용이다). */
function afternoon(skill?: number): GameState {
  const base = createInitialState('밴드')
  return {
    ...base,
    minute: DAY_END - 60, slot: 'afternoon' as const,
    stats: { ...base.stats, stamina: 100, mental: 100 },
    band: skill === undefined ? undefined : { skill },
  }
}

describe('밴드 숙련도', () => {
  it('합주가 아니면 밴드가 생기지 않는다', () => {
    // ⚠️ 빈 객체를 돌려주면 아무 활동이나 한 사람에게 "숙련도 0인 밴드"가 붙는다.
    expect(practiceBand(afternoon(), LIVE)).toBeUndefined()
    expect(afternoon().band).toBeUndefined()
  })

  it('합주하면 숙련도가 오르고 상한에서 멈춘다', () => {
    const s = runActivity(afternoon(), PRACTICE)
    expect(skillOf(s)).toBe(SKILL_PER_PRACTICE)
    expect(practiceBand(afternoon(SKILL_CAP), PRACTICE)!.band.skill).toBe(SKILL_CAP)
  })

  it('공연은 숙련도가 모자라면 막히고, 채우면 열린다', () => {
    expect(canRun(afternoon(LIVE_SKILL - 1), LIVE)).toBe(false)
    expect(canRun(afternoon(LIVE_SKILL), LIVE)).toBe(true)
    expect(canRun(afternoon(ALBUM_SKILL - 1), ALBUM)).toBe(false)
    expect(canRun(afternoon(ALBUM_SKILL), ALBUM)).toBe(true)
  })

  it('숙련도 게이트가 없는 활동은 그냥 통과한다', () => {
    expect(bandSkillOpen(afternoon(), PRACTICE)).toBe(true)
  })

  it('보수는 활동이 아니라 숙련도가 정한다', () => {
    // ⚠️ 활동 데이터에 money가 없다 — 있으면 숙련도와 두 곳에서 갈린다.
    expect(LIVE.effects.money).toBeUndefined()
    expect(ALBUM.effects.money).toBeUndefined()
    /* ⚠️ 오후 행동은 날짜를 넘기므로 취침 정산(생활비)이 함께 지나간다 — 절대 금액을 재면
       생활비를 손볼 때마다 이 테스트가 깨진다. 보수가 0인 합주를 대조군으로 뺀다. */
    const start = afternoon(ALBUM_SKILL)
    const paid = runActivity(start, ALBUM).stats.money
    const control = runActivity(start, PRACTICE).stats.money
    expect(paid - control).toBe(albumPay(ALBUM_SKILL))
  })

  it('앨범이 공연보다 많이 준다 — 아니면 더 어려운 쪽을 열 이유가 없다', () => {
    for (const skill of [0, LIVE_SKILL, ALBUM_SKILL, SKILL_CAP]) {
      expect(albumPay(skill)).toBeGreaterThan(livePay(skill))
    }
  })

  it('밴드가 없으면 보수도 0이다', () => {
    expect(bandPayFor(afternoon(), LIVE)).toBe(livePay(0))
    expect(bandPayFor(afternoon(), PRACTICE)).toBe(0)
  })

  it('세이브 보정은 이상한 값을 버리고 상한을 넘지 않는다', () => {
    expect(reviveBand(undefined)).toBeUndefined()
    expect(reviveBand({ skill: -3 })).toBeUndefined()
    expect(reviveBand({ skill: 999 })).toEqual({ skill: SKILL_CAP })
  })
})

describe('⚠️ 불변식 — 밴드 수입만으로는 살 수 없다', () => {
  /*
   * 트위터 팔로워 상한·주식 보유 상한과 같은 장치다. 밴드 셋이 **전부 오후 전용**이라
   * 하루에 많아야 하나이므로, 그중 제일 큰 보수가 **가장 싼 집의 마지막 물가 생활비보다
   * 작아야** 판이 무한해지지 않는다.
   */
  const ceiling = BASE_LIVING_COST * INCOME_CAP_RATIO.session
  const maxDailyIncome = albumPay(SKILL_CAP)

  it('상한에서 벌어도 하루 수입이 생활비 1.5배를 넘지 않는다', () => {
    expect(maxDailyIncome).toBeLessThan(ceiling)
  })

  it('규칙을 뒤집으면 실패한다 — 보수를 두 배로 두면 생활비를 넘긴다', () => {
    expect(maxDailyIncome * 2).toBeGreaterThan(ceiling)
  })

  it('밴드 활동은 전부 오후 전용이다 — 이 부등식의 전제다', () => {
    for (const a of [PRACTICE, LIVE, ALBUM]) {
      expect(a.requiresSlot, `${a.id}의 슬롯 제약이 사라졌다`).toBe('afternoon')
    }
  })

  it('밴드 셋은 번아웃 키를 나눠 쓴다 — 갈라지면 돌려 가며 대가를 피한다', () => {
    const keys = new Set(
      ACTIVITIES.filter((a) => a.id.startsWith('band-')).map((a) => a.burnoutKey),
    )
    expect(keys).toEqual(new Set(['band']))
  })
})
