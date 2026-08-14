import { describe, it, expect } from 'vitest'
import {
  healIllness,
  illnessEfficiency,
  isIll,
  nextIllness,
  reviveIllness,
} from './illness'
import {
  CLINIC_FEE,
  ILLNESS_DAYS,
  ILL_EFFICIENCY,
  ILL_RECOVERY_RATIO,
  ILL_STAMINA_FLOOR,
} from '../data/illness'
import { createInitialState, runActivity, skipSlot } from './turn'
import { findActivity } from '../data/activities'
import type { GameState } from '../types/game'

/**
 * ⚠️ **아픔이 깨뜨릴 수 있는 것만 덮는다.** 이 상태가 취침 회복(=행동력)과 활동 효율을
 * 건드리므로 발병·완치 경계와 "낫는 길이 막히지 않는다"에는 증명을 붙이고, 나머지는
 * 회귀 수준으로 둔다.
 */

function at(day: number, stamina: number, ill?: GameState['illness']): GameState {
  const base = createInitialState('환자')
  return {
    ...base,
    day,
    slot: 'afternoon',
    illness: ill,
    stats: { ...base.stats, stamina, mental: 80, money: 500_000 },
  }
}

describe('발병', () => {
  it(`행동력이 ${ILL_STAMINA_FLOOR} 이하로 하루를 끝내면 그 밤에 앓는다`, () => {
    const ill = nextIllness(undefined, ILL_STAMINA_FLOOR, 10)
    expect(ill).toEqual({ startedDay: 10, daysLeft: ILLNESS_DAYS })
  })

  it('임계보다 하나 위면 안 앓는다', () => {
    expect(nextIllness(undefined, ILL_STAMINA_FLOOR + 1, 10)).toBeUndefined()
  })

  it('오전에는 판정하지 않는다 — 발병 자리는 취침 하나뿐이다', () => {
    const morning: GameState = { ...at(10, 0), slot: 'morning' }
    expect(skipSlot(morning).illness).toBeUndefined()
  })
})

describe('완치', () => {
  it('취침마다 하루씩 줄고, 0이 되는 순간 필드가 사라진다', () => {
    let ill = { startedDay: 1, daysLeft: ILLNESS_DAYS }
    for (let i = 1; i < ILLNESS_DAYS; i++) {
      ill = nextIllness(ill, 100, 1 + i)!
      expect(ill.daysLeft).toBe(ILLNESS_DAYS - i)
    }
    // ⚠️ 0을 남기지 않는다 — "다 나았는데 아픔 기록이 있는" 상태를 만들지 않는다.
    expect(nextIllness(ill, 100, 99)).toBeUndefined()
  })

  it('⚠️ 앓는 중에는 발병 판정을 안 한다 — 하면 회복이 반이라 영원히 낫지 않는다', () => {
    // 행동력이 바닥인 채로 앓는 중이어도 남은 날이 **줄어든다**(늘거나 갱신되지 않는다).
    const ill = nextIllness({ startedDay: 1, daysLeft: 2 }, 0, 5)
    expect(ill).toEqual({ startedDay: 1, daysLeft: 1 })
  })

  it('병원에 가면 즉시 낫고, 안 아플 때는 상태를 그대로 돌려준다', () => {
    const sick = at(10, 50, { startedDay: 9, daysLeft: 3 })
    expect(isIll(healIllness(sick))).toBe(false)
    const well = at(10, 50)
    expect(healIllness(well)).toBe(well)
  })

  it('진료비가 활동과 데이터에서 어긋나지 않는다', () => {
    expect(findActivity('clinic')!.effects.money).toBe(-CLINIC_FEE)
    expect(findActivity('clinic')!.requires!.money).toBe(CLINIC_FEE)
  })
})

describe('앓는 동안', () => {
  it(`취침 회복이 ${ILL_RECOVERY_RATIO * 100}%로 줄어든다`, () => {
    /* ⚠️ **천장(`STAMINA_CAP`) 아래에서 재야 한다.** 50에서 재면 건강한 쪽 회복이 상한에
       닿아 잘려(50+60 → 100) 비가 60:30이 아니라 50:30으로 나온다 — 클램프가 규칙을 가린
       자리다. 20에서 시작하면 둘 다 상한에 안 닿는다. */
    const healthy = skipSlot(at(10, 20))
    const sick = skipSlot(at(10, 20, { startedDay: 9, daysLeft: 3 }))
    const gainHealthy = healthy.stats.stamina - 20
    const gainSick = sick.stats.stamina - 20
    /* ⚠️ 취침 회복률(`SLEEP_RECOVERY_RATIO`)은 `turn.ts`의 비공개 값이다 — 테스트를 위해
       export를 늘리지 않고 **둘의 비**만 잰다. 지켜야 하는 규칙이 절대량이 아니라
       "아픈 밤은 절반"이라는 관계이기도 하다. */
    expect(gainHealthy).toBeGreaterThan(0)
    expect(gainSick).toBeCloseTo(gainHealthy * ILL_RECOVERY_RATIO, 0)
  })

  it(`활동에서 얻는 것이 ${ILL_EFFICIENCY * 100}%로 줄고 소모량은 그대로다`, () => {
    const study = findActivity('study')!
    const before = at(10, 80)
    const wellRun = runActivity({ ...before, slot: 'morning' }, study)
    const sickRun = runActivity(
      { ...before, slot: 'morning', illness: { startedDay: 9, daysLeft: 3 } },
      study,
    )
    const wellGain = wellRun.stats.knowledge - before.stats.knowledge
    const sickGain = sickRun.stats.knowledge - before.stats.knowledge
    expect(sickGain).toBeLessThan(wellGain)
    // ⚠️ 소모는 안 깎인다 — 깎으면 아픈 것이 이득이 된다(번아웃 효율과 같은 규칙).
    expect(sickRun.stats.stamina).toBe(wellRun.stats.stamina)
  })

  it('⚠️ 게임오버를 만들지 않는다 — 판을 끝내는 것은 파산·번아웃 둘뿐이다', () => {
    const sick = skipSlot(at(10, 0, { startedDay: 9, daysLeft: 1 }))
    expect(sick.recovery).toBeNull()
  })
})

describe('세이브 보정', () => {
  it('못 믿을 값은 통째로 버린다 — NaN이 앉으면 영영 낫지 않는다', () => {
    expect(reviveIllness(undefined)).toBeUndefined()
    expect(reviveIllness({ startedDay: 1, daysLeft: NaN })).toBeUndefined()
    expect(reviveIllness({ startedDay: 1, daysLeft: 0 })).toBeUndefined()
    expect(reviveIllness({ daysLeft: 2 })).toBeUndefined()
    expect(reviveIllness({ startedDay: 3, daysLeft: 2 })).toEqual({ startedDay: 3, daysLeft: 2 })
    // 상한을 넘겨 적은 세이브는 상한으로 자른다.
    expect(reviveIllness({ startedDay: 3, daysLeft: 999 })!.daysLeft).toBe(ILLNESS_DAYS)
  })

  it('아프지 않으면 효율이 1이다', () => {
    expect(illnessEfficiency(at(10, 50))).toBe(1)
  })
})
