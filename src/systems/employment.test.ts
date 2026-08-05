import { describe, it, expect } from 'vitest'
import { findActivity, plannableOf } from '../data/activities'
import { weekdayOf } from '../data/calendar'
import {
  ABSENCE_FIRE,
  ABSENCE_WARNING,
  CAREERS,
  FINAL_DAYS,
  INTERVIEW_LEAD_DAYS,
  INTERVIEW_WINDOW_DAYS,
  PAYDAY_INTERVAL,
  SCREENING_DAYS,
  isWorkWeekday,
} from '../data/careers'
import {
  advanceEmployment,
  applyBlockers,
  applyTo,
  attendedToday,
  canApply,
  noticeMail,
  noticeMessages,
  passes,
  shortfalls,
  stageIndex,
} from './employment'
import { canRun, createInitialState, runActivity, skipSlot } from './turn'
import type { GameState } from '../types/game'

const entry = CAREERS[0]
const jobApply = findActivity('job-apply')!
const jobInterview = findActivity('job-interview')!
const commute = findActivity('commute')!

/** 요건을 넉넉히 채운 상태. 판정만 보고 싶을 때 쓴다. */
function qualified(overrides: Partial<GameState> = {}): GameState {
  const base = createInitialState('테스터')
  return {
    ...base,
    stats: { ...base.stats, knowledge: 99, vocabulary: 99, charm: 99, sociability: 99 },
    ...overrides,
  }
}

/** 하루를 통째로 넘긴다(오전·오후 두 슬롯). 정산을 매 턴 돌린다. */
function passDays(state: GameState, days: number): GameState {
  let s = state
  for (let i = 0; i < days * 2; i++) {
    s = advanceEmployment(skipSlot(s)).state
  }
  return s
}

/** 첫 근무일까지 민다. 요일이 붙어 있어야 결근 테스트가 성립한다. */
function nextWorkday(day: number): number {
  let d = day
  while (!isWorkWeekday(weekdayOf(d))) d++
  return d
}

describe('요건 판정', () => {
  it('모자란 항목을 사람이 읽는 문장으로 돌려준다 — 사유 없는 탈락은 없다', () => {
    const s = createInitialState('테스터')
    const missing = shortfalls(s.stats, entry.paper)
    expect(missing.length).toBeGreaterThan(0)
    expect(missing[0]).toContain('지식')
    expect(missing[0]).toContain('40')
    expect(passes(s.stats, entry.paper)).toBe(false)
  })

  it('판정과 사유가 같은 표를 본다 — 통과면 사유가 비어 있다', () => {
    expect(shortfalls(qualified().stats, entry.paper)).toEqual([])
    expect(passes(qualified().stats, entry.paper)).toBe(true)
  })
})

describe('지원', () => {
  it('요건이 모자라도 지원할 수 있다 — 결과가 나올 때까지 채우는 것이 이 시스템의 도박이다', () => {
    const s = createInitialState('테스터')
    expect(canApply(s)).toBe(true)
    expect(applyTo(s, entry).application?.stage).toBe('screening')
  })

  it('한 번에 한 곳만 — 결과를 기다리는 중에는 못 넣는다', () => {
    const s = applyTo(createInitialState('테스터'), entry)
    expect(canApply(s)).toBe(false)
    expect(applyBlockers(s)[0]).toContain(entry.company)
    expect(applyTo(s, CAREERS[1])).toBe(s)
  })

  it('지원서 활동은 "지원할 수 있는 상태"를 묻는다 — 누르기 전에 답이 나와야 한다', () => {
    // ⚠️ CDP 실측으로 잡은 버그: 게이트가 "이미 지원했는가"였을 때 확정 버튼이 영영 비활성이었다.
    const s = createInitialState('테스터')
    expect(canRun(s, jobApply)).toBe(true)
    // 결과를 기다리는 중이면 닫힌다.
    expect(canRun(applyTo(s, entry), jobApply)).toBe(false)
  })

  it('지원서 제출은 예약·바로 가기로 실행할 수 없다 — 그때는 고른 공고가 없다', () => {
    expect(jobApply.requiresPick).toBe(true)
    expect(plannableOf('living').map((a) => a.id)).not.toContain('job-apply')
  })

  it('결과 예정일은 지원한 날 + 서류 심사 기간이다', () => {
    const s = applyTo({ ...createInitialState('테스터'), day: 10 }, entry)
    expect(s.application?.dueDay).toBe(10 + SCREENING_DAYS)
  })
})

describe('채용 절차', () => {
  it('서류에서 떨어지면 무엇이 모자랐는지 메일에 적힌다', () => {
    let s = applyTo(createInitialState('테스터'), entry)
    s = passDays(s, SCREENING_DAYS)
    expect(s.application).toBeUndefined()
    const fail = (s.jobNotices ?? []).find((n) => n.kind === 'screening-fail')
    expect(fail).toBeDefined()
    expect(fail!.reason).toContain('지식')
    expect(noticeMail(fail!).text).toContain('지식')
  })

  it('서류를 통과하면 면접 안내가 오고 면접일이 잡힌다', () => {
    let s = applyTo(qualified(), entry)
    s = passDays(s, SCREENING_DAYS)
    expect(s.application?.stage).toBe('interview')
    expect(stageIndex('interview')).toBe(2)
    expect((s.jobNotices ?? []).some((n) => n.kind === 'screening-pass')).toBe(true)
  })

  it('면접일 전에는 면접을 볼 수 없다', () => {
    let s = applyTo(qualified(), entry)
    s = passDays(s, SCREENING_DAYS)
    expect(canRun(s, jobInterview)).toBe(false)
    s = passDays(s, INTERVIEW_LEAD_DAYS)
    expect(canRun(s, jobInterview)).toBe(true)
  })

  it('기한 안에 면접을 안 보면 불참으로 탈락한다 — 지원이 영원히 남지 않는다', () => {
    let s = applyTo(qualified(), entry)
    s = passDays(s, SCREENING_DAYS + INTERVIEW_LEAD_DAYS + INTERVIEW_WINDOW_DAYS + 1)
    expect(s.application).toBeUndefined()
    expect((s.jobNotices ?? []).some((n) => n.kind === 'interview-miss')).toBe(true)
  })

  it('면접을 보면 최종 결과 단계로 넘어간다 — 어느 통로로 실행해도 같다', () => {
    let s = applyTo(qualified(), entry)
    s = passDays(s, SCREENING_DAYS + INTERVIEW_LEAD_DAYS)
    const day = s.day
    s = advanceEmployment(runActivity(s, jobInterview)).state
    expect(s.application?.stage).toBe('final')
    expect(s.application?.dueDay).toBe(day + FINAL_DAYS)
  })

  it('최종 결과가 나오면 채용되고 급여일이 잡힌다', () => {
    let s = applyTo(qualified(), entry)
    s = passDays(s, SCREENING_DAYS + INTERVIEW_LEAD_DAYS)
    s = advanceEmployment(runActivity(s, jobInterview)).state
    s = passDays(s, FINAL_DAYS)
    expect(s.application).toBeUndefined()
    expect(s.employment?.careerId).toBe(entry.id)
    expect(s.employment?.paydayDay).toBe(s.employment!.hiredDay + PAYDAY_INTERVAL)
    const hired = (s.jobNotices ?? []).find((n) => n.kind === 'hired')
    expect(hired?.amount).toBe(entry.salary)
  })

  it('면접에서 떨어지면 사람 스탯의 부족분이 사유로 적힌다', () => {
    // 서류는 통과하되 면접 스탯만 0으로 둔다.
    const base = createInitialState('테스터')
    let s = applyTo(
      { ...base, stats: { ...base.stats, knowledge: 99, vocabulary: 99, charm: 0, sociability: 0 } },
      entry,
    )
    s = passDays(s, SCREENING_DAYS + INTERVIEW_LEAD_DAYS)
    s = advanceEmployment(runActivity(s, jobInterview)).state
    s = passDays(s, FINAL_DAYS)
    expect(s.employment).toBeUndefined()
    const fail = (s.jobNotices ?? []).find((n) => n.kind === 'final-fail')
    expect(fail?.reason).toContain('매력')
  })
})

/**
 * 채용된 상태를 바로 만든다. 절차를 매번 돌리면 테스트가 길어진다.
 * `checkedDay`를 옮길 수 있는 것은 급여 테스트 때문이다 — 감사 커서를 안 옮기고
 * 며칠을 건너뛰면 그 사이가 전부 결근이 되어 급여 대신 해고를 재게 된다.
 */
function employedAt(day: number, checkedDay = day): GameState {
  const base = qualified()
  return {
    ...base,
    day,
    slot: 'morning',
    employment: {
      careerId: entry.id,
      hiredDay: day,
      paydayDay: day + PAYDAY_INTERVAL,
      attendedDays: [],
      absences: 0,
      checkedDay,
    },
  }
}

/** 그 날 이후 첫 월요일. 월~금이 붙어 있어야 결근을 연달아 잴 수 있다. */
function mondayOnOrAfter(day: number): number {
  let d = day
  while (weekdayOf(d) !== 1) d++
  return d
}

describe('출근', () => {
  it('근무일에만 갈 수 있고, 하루에 한 번뿐이다', () => {
    const day = nextWorkday(20)
    const s = employedAt(day)
    expect(canRun(s, commute)).toBe(true)
    const after = runActivity(s, commute)
    expect(after.employment?.attendedDays).toEqual([day])
    expect(attendedToday(after)).toBe(true)
    // 같은 날 오후에 또 갈 수는 없다.
    expect(canRun(after, commute)).toBe(false)
  })

  it('근무일이 아니면 갈 수 없다 — 눌러도 아무 일 없는 버튼을 만들지 않는다', () => {
    let day = 20
    while (isWorkWeekday(weekdayOf(day))) day++
    expect(canRun(employedAt(day), commute)).toBe(false)
  })

  it('재직 중이 아니면 갈 수 없다', () => {
    expect(canRun(qualified(), commute)).toBe(false)
  })

  it('출근은 돈을 만지지 않는다 — 급여의 단일 출처는 공고다', () => {
    const s = employedAt(nextWorkday(20))
    const after = runActivity(s, commute)
    // 오전 행동이라 취침 정산(생활비)이 없으므로 소지금이 그대로여야 한다.
    expect(after.stats.money).toBe(s.stats.money)
  })
})

describe('급여', () => {
  it('급여일에 공고의 급여가 그대로 들어오고 다음 급여일이 잡힌다', () => {
    const s = employedAt(10, 10 + PAYDAY_INTERVAL - 1)
    const before = s.stats.money
    const after = advanceEmployment({ ...s, day: 10 + PAYDAY_INTERVAL })
    expect(after.state.stats.money).toBe(before + entry.salary)
    expect(after.state.employment?.paydayDay).toBe(10 + PAYDAY_INTERVAL * 2)
    const pay = after.notices.find((n) => n.kind === 'payday')
    expect(pay?.amount).toBe(entry.salary)
    expect(noticeMail(pay!).subject).toContain('급여')
  })

  it('며칠이 한 번에 지나가도 밀린 급여를 전부 받는다 (스케줄러 연쇄)', () => {
    const s = employedAt(10, 10 + PAYDAY_INTERVAL * 3 - 1)
    const after = advanceEmployment({ ...s, day: 10 + PAYDAY_INTERVAL * 3 })
    expect(after.notices.filter((n) => n.kind === 'payday')).toHaveLength(3)
  })

  it('급여는 해고보다 먼저 처리된다 — 이미 일한 주기의 대가는 받는다', () => {
    // 감사 커서를 그대로 두고 급여일까지 건너뛰면 그 사이가 전부 결근이라 해고된다.
    const s = employedAt(10)
    const after = advanceEmployment({ ...s, day: 10 + PAYDAY_INTERVAL })
    expect(after.notices.some((n) => n.kind === 'payday')).toBe(true)
    expect(after.notices.some((n) => n.kind === 'fired')).toBe(true)
    expect(after.state.stats.money).toBe(s.stats.money + entry.salary)
    expect(after.state.employment).toBeUndefined()
  })
})

describe('무단결근', () => {
  /** 근무일을 통째로 흘려 보낸 상태를 만든다. */
  function afterAbsences(count: number): GameState {
    const start = nextWorkday(10)
    let s = employedAt(start)
    // 결근 감사는 '지나간 날'만 센다 — 하루씩 밀며 감사시킨다.
    let day = start
    let counted = 0
    while (counted < count && day < start + 60) {
      day++
      s = advanceEmployment({ ...s, day }).state
      // 해고되면 재직 상태가 사라지므로 그 자체가 목표 도달이다.
      counted = s.employment ? s.employment.absences : count
    }
    return s
  }

  it('지나간 근무일에 출근하지 않으면 결근으로 센다 — 오늘도 입사일도 세지 않는다', () => {
    const monday = mondayOnOrAfter(10)
    const s = employedAt(monday)
    // 오늘은 아직 안 끝났고, 입사한 날은 애초에 책임을 물을 수 없다.
    expect(advanceEmployment(s).state.employment?.absences).toBe(0)
    expect(advanceEmployment({ ...s, day: monday + 1 }).state.employment?.absences).toBe(0)
    // 화요일이 지나가면 그 하루가 결근이 된다.
    expect(advanceEmployment({ ...s, day: monday + 2 }).state.employment?.absences).toBe(1)
  })

  it('출근한 날은 결근이 아니다', () => {
    const monday = mondayOnOrAfter(10)
    // 화요일에 출근한 뒤 수요일로 넘어간다.
    const s = runActivity({ ...employedAt(monday), day: monday + 1 }, commute)
    expect(advanceEmployment({ ...s, day: monday + 2 }).state.employment?.absences).toBe(0)
  })

  it('경고 기준에 닿으면 경고가 오고, 같은 경고를 반복하지 않는다', () => {
    const s = afterAbsences(ABSENCE_WARNING)
    const warns = (s.jobNotices ?? []).filter((n) => n.kind === 'absence-warning')
    expect(warns.length).toBe(1)
    expect(warns[0].amount).toBe(ABSENCE_WARNING)
    expect(s.employment).toBeDefined()
  })

  it('해고 기준에 닿으면 재직 상태가 사라진다 — 되돌리는 길은 없다', () => {
    const s = afterAbsences(ABSENCE_FIRE)
    expect(s.employment).toBeUndefined()
    const fired = (s.jobNotices ?? []).find((n) => n.kind === 'fired')
    expect(fired?.amount).toBe(ABSENCE_FIRE)
    // 해고된 뒤에는 출근할 수 없고, 다시 지원할 수는 있다.
    expect(canRun(s, commute)).toBe(false)
    expect(canApply(s)).toBe(true)
  })
})

describe('소식은 사서함을 탄다', () => {
  it('새 창구를 만들지 않고 아웃룩 채널로 나간다', () => {
    let s = applyTo(qualified(), entry)
    s = passDays(s, SCREENING_DAYS)
    const mails = noticeMessages(s)
    expect(mails.length).toBeGreaterThan(0)
    expect(mails[0].channel).toBe('outlook')
    expect(mails[0].subject).toBeTruthy()
    // 정렬 키(턴 번호)가 붙어 있어야 편성표 메일과 시간순으로 합칠 수 있다.
    expect(Number.isFinite(mails[0].turn)).toBe(true)
  })
})
