import { describe, expect, it } from 'vitest'
import { CAREERS, PAYDAY_INTERVAL, WEEKEND_CALL_RATE, isWorkWeekday } from '../data/careers'
import { weekdayOf } from '../data/calendar'
import { findActivity } from '../data/activities'
import {
  AUTO_PERFORMANCE,
  DRIVE_FILES,
  FILE_REQUESTS,
  OFFICE_CAREER_IDS,
  PERFORMANCE_QUOTA,
  PERFORMANCE_TIERS,
  REQUESTS_PER_SHIFT,
  WON_PER_PERCENT,
  findCoworker,
  findDriveFile,
} from '../data/drive'
import { CALL_CENTER_CAREER_ID } from '../data/callcenter'
import { livingCostForDay } from './economy'
import {
  creditPerformance,
  isWeekend,
  overtimePay,
  overtimePercent,
  performanceFor,
  performanceOf,
  requestsForDay,
  weekendCallMessages,
  weekendCallOn,
  worksAtOffice,
} from './drive'
import { canRun, createInitialState } from './turn'
import type { GameState, Stats } from '../types/game'

function state(over: Omit<Partial<GameState>, 'stats'> & { stats?: Partial<Stats> } = {}): GameState {
  const s = createInitialState('테스터')
  return { ...s, ...over, stats: { ...s.stats, ...(over.stats ?? {}) } }
}

const OFFICE_ID = OFFICE_CAREER_IDS[0]

function employed(careerId: string, day: number, over: Parameters<typeof state>[0] = {}): GameState {
  return state({
    day,
    stats: { stamina: 999 },
    ...over,
    employment: {
      careerId,
      hiredDay: 1,
      paydayDay: day + PAYDAY_INTERVAL,
      attendedDays: [],
      absences: 0,
      checkedDay: day,
    },
  })
}

describe('드라이브 데이터', () => {
  it('요청이 가리키는 파일과 사람이 실제로 있다 (죽은 요청 방지)', () => {
    for (const r of FILE_REQUESTS) {
      expect(findDriveFile(r.fileId), `${r.id}의 파일`).toBeDefined()
      expect(findCoworker(r.from), `${r.id}의 사람`).toBeDefined()
    }
  })

  it('파일 id와 요청 id가 각각 겹치지 않는다', () => {
    expect(new Set(DRIVE_FILES.map((f) => f.id)).size).toBe(DRIVE_FILES.length)
    expect(new Set(FILE_REQUESTS.map((r) => r.id)).size).toBe(FILE_REQUESTS.length)
  })

  it('⚠️ 요청 풀이 하루치의 배수가 아니다 — 배수면 며칠마다 같은 세 건이 그대로 돌아온다', () => {
    expect(FILE_REQUESTS.length % REQUESTS_PER_SHIFT).not.toBe(0)
  })

  it('⚠️ 콜센터는 이 미니게임을 열지 않는다 — 두 창이 함께 뜨면 안 된다', () => {
    expect(OFFICE_CAREER_IDS).not.toContain(CALL_CENTER_CAREER_ID)
  })

  it('사무직 목록이 실제 공고를 가리킨다 (없는 회사에 창을 열지 않는다)', () => {
    // ⚠️ **"콜센터가 아니다"는 "사무직이다"와 다르다** — 목록은 손으로 적고
    //    여기서 그 이름들이 실재하는지만 지킨다(파생으로 되돌리지 말 것).
    const ids = CAREERS.map((c) => c.id)
    for (const id of OFFICE_CAREER_IDS) expect(ids, id).toContain(id)
  })

  it('[자동 넘기기]가 가장 낮은 등급보다 적다 — 손을 쓰는 쪽이 늘 낫다', () => {
    const worst = Math.min(...PERFORMANCE_TIERS.map((t) => t.percent))
    expect(AUTO_PERFORMANCE).toBeLessThan(worst)
    expect(AUTO_PERFORMANCE).toBeGreaterThan(0)
  })
})

describe('오늘의 요청', () => {
  it('하루치를 돌려주고 날짜가 바뀌면 조합이 바뀐다', () => {
    expect(requestsForDay(3)).toHaveLength(REQUESTS_PER_SHIFT)
    expect(requestsForDay(3).map((r) => r.id)).not.toEqual(requestsForDay(4).map((r) => r.id))
  })

  it('같은 날은 늘 같다 (결정성)', () => {
    expect(requestsForDay(9)).toEqual(requestsForDay(9))
  })
})

describe('성과', () => {
  it('빠를수록 많이 오른다', () => {
    expect(performanceFor(1_000).percent).toBeGreaterThan(performanceFor(45_000).percent)
    expect(performanceFor(999_000).percent).toBe(
      PERFORMANCE_TIERS[PERFORMANCE_TIERS.length - 1].percent,
    )
  })

  it('사무직에게만 쌓인다 — 콜센터 근무자는 이 게이지를 안 쓴다', () => {
    const office = employed(OFFICE_ID, 1)
    expect(worksAtOffice(office)).toBe(true)
    expect(creditPerformance(office, 9).employment?.performance).toBe(9)

    const call = employed(CALL_CENTER_CAREER_ID, 1)
    expect(worksAtOffice(call)).toBe(false)
    expect(creditPerformance(call, 9)).toBe(call)
  })

  it('⚠️ 한 번에 들어오는 값은 최고 등급으로 잘린다 (화면이 고장 나도 폭주하지 않는다)', () => {
    const max = Math.max(...PERFORMANCE_TIERS.map((t) => t.percent))
    expect(creditPerformance(employed(OFFICE_ID, 1), 9_999).employment?.performance).toBe(max)
  })

  it('⚠️ 게이지 자체에는 상한이 없다 — 100%를 넘는 것이 존재 이유다', () => {
    let s = employed(OFFICE_ID, 1)
    for (let i = 0; i < 40; i++) s = creditPerformance(s, 9)
    expect(performanceOf(s)).toBeGreaterThan(PERFORMANCE_QUOTA)
  })
})

describe('야근비', () => {
  it('할당량까지는 한 푼도 없다', () => {
    expect(overtimePercent(PERFORMANCE_QUOTA)).toBe(0)
    expect(overtimePay(PERFORMANCE_QUOTA)).toBe(0)
    expect(overtimePay(0)).toBe(0)
  })

  it('초과분만 돈이 된다', () => {
    expect(overtimePercent(PERFORMANCE_QUOTA + 20)).toBe(20)
    expect(overtimePay(PERFORMANCE_QUOTA + 20)).toBe(20 * WON_PER_PERCENT)
  })

  it('⚠️ 한 주기 야근비 상한이 마지막 물가 생활비를 못 넘는다 — "판은 반드시 끝난다"', () => {
    // 주기 15일의 근무일은 최대 11일이고 하루 최대 성과는 요청 수 × 최고 등급이다.
    const best = Math.max(...PERFORMANCE_TIERS.map((t) => t.percent))
    const perDay = REQUESTS_PER_SHIFT * best
    // 주말 호출까지 전부 받았다고 보고 15일을 통째로 일한 경우로 잡는다(최악의 상한).
    const maxPercent = perDay * PAYDAY_INTERVAL
    const maxPerDay = overtimePay(maxPercent) / PAYDAY_INTERVAL
    // 마지막 물가 구간의 하루 생활비. 이 선을 넘으면 야근만으로 생존이 가능해진다.
    const lateCost = livingCostForDay(200)
    expect(maxPerDay).toBeLessThan(lateCost)
  })
})

describe('주말 호출', () => {
  /** 주말인 첫 날. 요일 척도는 게임과 같은 함수를 쓴다. */
  const weekend = (() => {
    let d = 1
    while (isWorkWeekday(weekdayOf(d))) d++
    return d
  })()

  it('평일에는 호출이 없다', () => {
    let weekday = 1
    while (!isWorkWeekday(weekdayOf(weekday))) weekday++
    expect(isWeekend(weekday)).toBe(false)
    for (const c of CAREERS) expect(weekendCallOn(weekday, c.id)).toBe(false)
  })

  it('무직에게는 호출이 없다', () => {
    expect(weekendCallOn(weekend, undefined)).toBe(false)
    expect(weekendCallMessages(state({ day: weekend }))).toEqual([])
  })

  it('같은 날은 늘 같은 답이다 (결정성 — `Math.random` 금지)', () => {
    for (let d = 1; d < 60; d++) {
      expect(weekendCallOn(d, OFFICE_ID)).toBe(weekendCallOn(d, OFFICE_ID))
    }
  })

  it('⚠️ 규모가 클수록 주말을 더 많이 가져간다 — 확률표가 오름차순이다', () => {
    expect(WEEKEND_CALL_RATE.극소).toBeLessThan(WEEKEND_CALL_RATE.중소)
    expect(WEEKEND_CALL_RATE.중소).toBeLessThan(WEEKEND_CALL_RATE.중견)
    expect(WEEKEND_CALL_RATE.중견).toBeLessThan(WEEKEND_CALL_RATE.대)
  })

  it('⚠️ 규모가 클수록 실제로 더 자주 불린다 (100일 표본)', () => {
    const count = (careerId: string) => {
      let n = 0
      for (let d = 1; d <= 400; d++) if (weekendCallOn(d, careerId)) n++
      return n
    }
    const small = CAREERS.find((c) => c.scale === '극소')!
    const big = CAREERS.find((c) => c.scale === '대')!
    expect(count(big.id)).toBeGreaterThan(count(small.id))
  })

  it('⚠️ 공고의 규모가 급여 서열과 어긋나지 않는다', () => {
    const order = ['극소', '중소', '중견', '대']
    const ranks = CAREERS.map((c) => order.indexOf(c.scale))
    for (let i = 1; i < ranks.length; i++) expect(ranks[i]).toBeGreaterThanOrEqual(ranks[i - 1])
  })

  it('호출이 걸린 주말에는 출근할 수 있고, 안 걸린 주말에는 못 한다', () => {
    const commute = findActivity('commute')!
    const target = CAREERS.find((c) => c.scale === '대')!.id
    let called = -1
    let quiet = -1
    for (let d = 1; d <= 120 && (called < 0 || quiet < 0); d++) {
      if (!isWeekend(d)) continue
      if (weekendCallOn(d, target)) called = called < 0 ? d : called
      else quiet = quiet < 0 ? d : quiet
    }
    expect(called, '호출이 걸리는 주말이 하나는 있어야 한다').toBeGreaterThan(0)
    expect(quiet, '조용한 주말도 하나는 있어야 한다').toBeGreaterThan(0)
    expect(canRun(employed(target, called), commute)).toBe(true)
    expect(canRun(employed(target, quiet), commute)).toBe(false)
  })

  it('⚠️ 이미 그날 출근했으면 호출 메시지가 사라진다 — 다 한 일을 다시 시키지 않는다', () => {
    const target = CAREERS.find((c) => c.scale === '대')!.id
    let called = 0
    for (let d = 1; d <= 120 && !called; d++) if (weekendCallOn(d, target)) called = d
    const before = employed(target, called)
    expect(weekendCallMessages(before)).toHaveLength(1)
    const after = { ...before, employment: { ...before.employment!, attendedDays: [called] } }
    expect(weekendCallMessages(after)).toEqual([])
  })
})
