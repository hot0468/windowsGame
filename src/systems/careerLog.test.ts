import { describe, expect, it } from 'vitest'
import { CAREERS, CAREER_LEVEL_DAYS, CAREER_MAX_LEVEL, isWorkWeekday } from '../data/careers'
import { weekdayOf } from '../data/calendar'
import { findActivity } from '../data/activities'
import {
  attendedCount,
  careerLevel,
  heldCareer,
  markAttended,
  markHired,
  toNextCareerLevel,
} from './careerLog'
import { createInitialState, runActivity } from './turn'
import type { GameState, Stats } from '../types/game'

function state(over: Omit<Partial<GameState>, 'stats'> & { stats?: Partial<Stats> } = {}): GameState {
  const s = createInitialState('테스터')
  return { ...s, ...over, stats: { ...s.stats, ...(over.stats ?? {}) } }
}

const CAREER_ID = CAREERS[0].id

describe('직업 이력 기록', () => {
  it('채용 전에는 다녀 본 적이 없고 레벨도 없다', () => {
    const s = state()
    expect(heldCareer(s, CAREER_ID)).toBe(false)
    expect(careerLevel(s, CAREER_ID)).toBeUndefined()
  })

  it('채용되면 출근 0회라도 Lv.1로 열린다', () => {
    const s = state({ careerLog: markHired(undefined, CAREER_ID) })
    expect(heldCareer(s, CAREER_ID)).toBe(true)
    expect(careerLevel(s, CAREER_ID)).toBe(1)
  })

  it('⚠️ 재입사가 근무 이력을 지우지 않는다', () => {
    const log = markAttended(markHired(undefined, CAREER_ID), CAREER_ID)
    expect(markHired(log, CAREER_ID)).toBe(log)
  })

  it(`출근 ${CAREER_LEVEL_DAYS}회마다 한 칸 오르고 상한에서 멈춘다`, () => {
    let log = markHired(undefined, CAREER_ID)
    for (let i = 0; i < CAREER_LEVEL_DAYS; i++) log = markAttended(log, CAREER_ID)
    expect(careerLevel(state({ careerLog: log }), CAREER_ID)).toBe(2)

    const maxed = { [CAREER_ID]: CAREER_LEVEL_DAYS * 100 }
    const s = state({ careerLog: maxed })
    expect(careerLevel(s, CAREER_ID)).toBe(CAREER_MAX_LEVEL)
    expect(toNextCareerLevel(s, CAREER_ID)).toBeUndefined()
  })

  it('다음 레벨까지 남은 출근 수를 센다', () => {
    const s = state({ careerLog: { [CAREER_ID]: 2 } })
    expect(toNextCareerLevel(s, CAREER_ID)).toBe(CAREER_LEVEL_DAYS - 2)
  })

  it('다녀 본 회사만 기록에 남는다 — 다른 회사는 여전히 회색이다', () => {
    const s = state({ careerLog: markHired(undefined, CAREER_ID) })
    for (const other of CAREERS.filter((c) => c.id !== CAREER_ID)) {
      expect(heldCareer(s, other.id)).toBe(false)
    }
  })
})

describe('출근이 누적을 올린다', () => {
  /** 출근(`commute`)은 재직 중이고 근무일일 때만 실행된다. */
  function employed(): GameState {
    const s = state({ stats: { stamina: 999 } })
    // 근무일(월~금)까지 날짜를 민다 — 판정은 게임과 같은 함수를 쓴다.
    let day = s.day
    while (!isWorkWeekday(weekdayOf(day))) day++
    return {
      ...s,
      day,
      careerLog: markHired(undefined, CAREER_ID),
      employment: {
        careerId: CAREER_ID,
        hiredDay: day,
        paydayDay: day + 15,
        attendedDays: [],
        absences: 0,
        checkedDay: day,
      },
    }
  }

  it('⚠️ 출근부(`attendedDays`)가 아니라 누적 기록이 레벨을 정한다', () => {
    const commute = findActivity('commute')!
    const before = employed()
    const after = runActivity(before, commute)
    expect(attendedCount(after, CAREER_ID)).toBe(1)
    // 급여일에 출근부는 비워지지만 누적은 남는다 — 그것이 이 기록이 따로 있는 이유다.
    const paid = { ...after, employment: { ...after.employment!, attendedDays: [] } }
    expect(attendedCount(paid, CAREER_ID)).toBe(1)
  })

  it('출근이 아닌 활동은 이력을 건드리지 않는다', () => {
    const rest = findActivity('sleep') ?? findActivity('reading')!
    const before = employed()
    expect(attendedCount(runActivity(before, rest), CAREER_ID)).toBe(0)
  })
})
