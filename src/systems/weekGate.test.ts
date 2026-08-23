import { DAY_END } from '../data/clock'
import { describe, expect, it } from 'vitest'
import { ACTIVITIES, findActivity } from '../data/activities'
import { isWeekend } from '../data/calendar'
import { WEEKEND_WAGE_BONUS } from '../data/economy'
import { canRun, createInitialState, runActivity } from './turn'
import type { GameState } from '../types/game'

/**
 * ⚠️ **요일이 깨뜨릴 수 있는 것만 덮는다.** 이 축은 잠금 하나와 배율 하나뿐이므로,
 * "어느 요일에도 살 길이 남는가"와 "돈 배율이 두 곳에서 갈리지 않는가"만 본다.
 * 실질 소득 역전(판이 끝나는가)은 `balance.verify.test.ts`가 이미 지킨다.
 */

/** 그 요일 성격의 첫 날. 1일차의 요일은 `data/calendar.ts`가 정한다. */
function dayOf(weekend: boolean): number {
  for (let d = 1; d < 40; d++) if (isWeekend(d) === weekend) return d
  throw new Error('그런 날이 없다')
}

function at(day: number): GameState {
  const base = createInitialState('요일')
  return { ...base, day, stats: { ...base.stats, stamina: 100, mental: 100, money: 300000 } }
}

describe('요일 잠금', () => {
  it('주말 전용은 평일에 막히고 주말에 열린다', () => {
    const volunteer = findActivity('volunteer')!
    expect(volunteer.requiresWeek).toBe('weekend')
    expect(canRun(at(dayOf(false)), volunteer)).toBe(false)
    expect(canRun(at(dayOf(true)), volunteer)).toBe(true)
  })

  it('평일 전용은 반대다', () => {
    const lecture = findActivity('lecture')!
    expect(lecture.requiresWeek).toBe('weekday')
    expect(canRun(at(dayOf(true)), lecture)).toBe(false)
    expect(canRun(at(dayOf(false)), lecture)).toBe(true)
  })

  /*
   * ⚠️ **어느 요일에도 살 길이 남아야 한다.** 슬롯 제약(`slotGate.test.ts`)과 같은 이유이고
   * 같은 함정이다 — 잠금을 늘리다 보면 어느 날에 아무것도 못 하는 판이 생긴다.
   */
  it('어느 요일에도 조건 없는 알바와 멘탈 회복처가 남는다', () => {
    for (const weekend of [true, false]) {
      const s = at(dayOf(weekend))
      const open = ACTIVITIES.filter((a) => canRun({ ...s, minute: DAY_END - 60, slot: 'afternoon' as const }, a))
      expect(open.some((a) => a.id === 'work'), `${weekend ? '주말' : '평일'}에 편의점이 막혔다`).toBe(true)
      expect(
        open.some((a) => (a.effects.mental ?? 0) > 0),
        `${weekend ? '주말' : '평일'}에 멘탈 회복처가 없다`,
      ).toBe(true)
    }
  })

  it('요일 잠금은 오후를 좁히지 않는다 — 주간 예약이 월~금 오후를 쓴다', () => {
    for (const a of ACTIVITIES) {
      if (!a.requiresWeek) continue
      expect(a.requiresSlot, `${a.id}가 요일과 슬롯을 함께 좁힌다`).toBeUndefined()
    }
  })
})

describe('주말 알바 할증', () => {
  it('같은 알바가 주말에 더 번다', () => {
    const work = findActivity('work')!
    const weekday = at(dayOf(false))
    const weekend = at(dayOf(true))
    const gainOn = (s: GameState) => runActivity(s, work).stats.money - s.stats.money
    // ⚠️ 물가 배율은 날짜마다 다르므로 절대 금액이 아니라 **비율**을 본다.
    expect(gainOn(weekend)).toBeGreaterThan(gainOn(weekday))
  })

  it('알바가 아닌 수입에는 안 붙는다 — 붙으면 상한 불변식이 두 곳에서 갈린다', () => {
    for (const a of ACTIVITIES) {
      if ((a.effects.money ?? 0) > 0 && !a.scalesWithWage) {
        // 물가 배율을 안 타는 수입은 주말에도 그대로여야 한다.
        const before = at(dayOf(true))
        const gain = runActivity(before, a).stats.money - before.stats.money
        if (canRun(before, a)) expect(gain).toBe(a.effects.money)
      }
    }
  })

  it('할증은 1보다 크고, 값을 올리려면 밸런스 시뮬레이션을 먼저 본다', () => {
    expect(WEEKEND_WAGE_BONUS).toBeGreaterThan(1)
  })
})
