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
  recordPeakCareer,
  shortfalls,
  stageIndex,
} from './employment'
import {
  canRun,
  createInitialState,
  nightPayoutPending,
  runActivity,
  settleGameOver,
  skipSlot,
} from './turn'
import { livingCostForDay } from './economy'
import { weekendCallOn } from './drive'
import { STAT_NAMES } from '../types/game'
import type { GameState, Stats } from '../types/game'

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
    const missing = shortfalls(s, entry.paper)
    expect(missing.length).toBeGreaterThan(0)
    // ⚠️ 스탯 이름을 여기 적지 않고 **공고에서 파생**시킨다 — 적어 두면 첫 공고가 바뀔 때마다
    //    "사유를 말해 준다"가 아니라 "그 회사가 지식을 본다"를 재는 테스트가 된다.
    const [statKey, min] = Object.entries(entry.paper)[0] as [keyof Stats, number]
    expect(missing[0]).toContain(STAT_NAMES[statKey])
    expect(missing[0]).toContain(String(min))
    expect(passes(s, entry.paper)).toBe(false)
  })

  it('판정과 사유가 같은 표를 본다 — 통과면 사유가 비어 있다', () => {
    expect(shortfalls(qualified(), entry.paper)).toEqual([])
    expect(passes(qualified(), entry.paper)).toBe(true)
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
    const label = STAT_NAMES[Object.keys(entry.paper)[0] as keyof Stats]
    expect(fail!.reason).toContain(label)
    expect(noticeMail(fail!).text).toContain(label)
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
    // 파산 엔딩이 보는 값이다 — 채용되는 이 지점 말고는 올라가는 곳이 없다.
    expect(s.peakCareerId).toBe(entry.id)
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
    // 채용됐다는 것은 최고 경력이 찍혔다는 뜻이다(`advanceEmployment`가 함께 찍는다).
    peakCareerId: entry.id,
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
    /* ⚠️ **호출이 없는 주말**이라야 한다(2026-08-08 주말 호출). 회사에서 일이 넘어온
       주말에는 나갈 수 있고 그것이 야근이다 — 그쪽 증명은 `drive.test.ts`가 진다. */
    let day = 20
    while (isWorkWeekday(weekdayOf(day)) || weekendCallOn(day, entry.id)) day++
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
    // ⚠️ 다녔던 사실까지 없어지지는 않는다 — 파산 엔딩이 이 값을 본다.
    expect(s.peakCareerId).toBe(entry.id)
  })
})

/**
 * 최고 경력 (2026-08-05, 직업 엔딩).
 *
 * 읽는 곳은 파산 엔딩 하나다(`systems/ending.ts`). **해고가 이 기록을 지우면 안 된다** —
 * 해고는 이미 수입을 끊어 파산을 앞당기는데 비문까지 지우면 벌이 두 번이 된다.
 */
describe('최고 경력', () => {
  it('더 높은 자리에 가면 올라간다', () => {
    const base = createInitialState('테스터')
    const s = recordPeakCareer(recordPeakCareer(base, CAREERS[0].id), CAREERS[3].id)
    expect(s.peakCareerId).toBe(CAREERS[3].id)
  })

  it('낮은 자리로 옮겨도 내려가지 않는다', () => {
    const base = createInitialState('테스터')
    const s = recordPeakCareer(recordPeakCareer(base, CAREERS[3].id), CAREERS[0].id)
    expect(s.peakCareerId).toBe(CAREERS[3].id)
  })

  it('없는 공고로는 기록되지 않는다', () => {
    expect(recordPeakCareer(createInitialState('테스터'), '없는회사').peakCareerId).toBeUndefined()
  })
})

/**
 * 밤 정산의 순서 — **급여가 우선한다** (2026-08-05, 설계자 지시).
 *
 * ## 무엇이 잘못돼 있었나
 * 밤은 두 단계로 정산된다: `turn.ts`의 취침 정산이 **생활비를 빼고**, 그 뒤 `afterTurn`이
 * `advanceEmployment`를 불러 **급여를 넣는다**. 그런데 파산 판정이 그 **중간**에 있었다.
 * 그래서 급여일이 하필 잔고가 바닥나는 밤에 겹치면 **월급 167만 원을 손에 쥔 채
 * "파산했습니다"**가 떴다. 굶어 죽었다고 통보받는데 통장에는 급여가 들어와 있는 상태다.
 *
 * ## 고친 방식
 * 게임오버는 **밤이 다 정산된 뒤 딱 한 번** 결정된다. `runActivity`/`skipSlot`은 입금이
 * 남은 밤이면 판정을 미루고(`turn.ts`의 `nightPayoutPending`), 밤의 마지막 지점인
 * `advanceEmployment`가 `settleGameOver`로 결정한다. **죽였다가 되살리는 것이 아니라
 * 애초에 한 번만 판단한다** — 그래서 "파산" 화면이 한 프레임도 지나가지 않는다.
 *
 * ⚠️ 아래 두 테스트는 **짝이다.** 위만 있으면 파산을 통째로 못 걸게 만들어도 통과하므로,
 * 급여일이 아닌 밤에는 **여전히 파산한다**는 것을 함께 못 박는다.
 */
describe('밤 정산의 순서 — 급여가 우선한다', () => {
  /** 잔고가 그날 생활비보다 적은, 급여일 전날 밤의 재직자. */
  function brokeOnPaydayEve(payday: number): GameState {
    // 급여일 **전날 오후**에 서 있게 만든다 — 오후를 넘기면 그날 밤 정산이 일어나고
    // 날이 급여일로 바뀐다. 감사 커서는 어제까지 옮겨 결근·해고가 끼어들지 않게 한다.
    const eve = payday - 1
    const base = employedAt(eve, eve)
    return {
      ...base,
      slot: 'afternoon',
      employment: { ...base.employment!, paydayDay: payday },
      // 생활비를 내고 나면 0 이하가 되는 잔고.
      stats: { ...base.stats, money: livingCostForDay(eve) - 1000 },
    }
  }

  it('급여일 밤에 잔고가 바닥나도 급여가 먼저 들어와 살아남는다', () => {
    const payday = mondayOnOrAfter(30) + PAYDAY_INTERVAL
    const before = brokeOnPaydayEve(payday)
    const living = livingCostForDay(before.day)
    expect(before.stats.money).toBeLessThan(living)

    // 오후를 넘긴다 = 취침 정산(생활비 차감)이 일어나고 날이 급여일로 바뀐다.
    const night = skipSlot(before)
    expect(night.day).toBe(payday)
    // 이 시점의 잔고는 0 이하다 — 옛 코드가 여기서 파산을 확정했다.
    expect(night.stats.money).toBeLessThanOrEqual(0)
    // ⚠️ **그러나 아직 판정하지 않는다.** 오늘 밤 들어올 급여가 남아 있다.
    expect(night.gameOver).toBeNull()

    const settled = advanceEmployment(night)
    expect(settled.notices.some((n) => n.kind === 'payday')).toBe(true)
    // 급여가 들어왔으니 살아 있어야 한다. 이것이 이 테스트의 전부다.
    expect(settled.state.gameOver).toBeNull()
    expect(settled.state.stats.money).toBe(night.stats.money + entry.salary)
    expect(settled.state.stats.money).toBeGreaterThan(0)
  })

  it('급여일이 아닌 밤에 바닥나면 그대로 파산한다 — 파산이 사라지면 안 된다', () => {
    // 같은 상황에서 급여일만 멀리 밀어 둔다.
    const payday = mondayOnOrAfter(30) + PAYDAY_INTERVAL
    const base = brokeOnPaydayEve(payday)
    const before: GameState = {
      ...base,
      employment: { ...base.employment!, paydayDay: payday + PAYDAY_INTERVAL },
    }

    const night = skipSlot(before)
    expect(night.stats.money).toBeLessThanOrEqual(0)
    // 들어올 돈이 없는 밤이므로 **그 자리에서** 파산이 확정된다(미루지 않는다).
    expect(night.gameOver).toBe('bankrupt')

    const settled = advanceEmployment(night)
    expect(settled.notices.some((n) => n.kind === 'payday')).toBe(false)
    expect(settled.state.gameOver).toBe('bankrupt')
  })

  it('무직이면 판정을 미루지 않는다 — 밸런스 시뮬레이션이 이 성질에 기대고 있다', () => {
    // `balance.verify.test.ts`는 `runActivity`/`skipSlot`만 불러 파산 시점을 잰다.
    // 미루기가 무직에게까지 번지면 그 시뮬레이션이 영원히 안 끝난다.
    const base = createInitialState('무직')
    const broke: GameState = {
      ...base,
      slot: 'afternoon',
      stats: { ...base.stats, money: livingCostForDay(base.day) - 1000 },
    }
    expect(nightPayoutPending(broke)).toBe(false)
    expect(skipSlot(broke).gameOver).toBe('bankrupt')
  })

  it('이미 확정된 게임오버를 되살리지 않는다', () => {
    const dead: GameState = { ...createInitialState('t'), gameOver: 'burnout' }
    // 소지금·멘탈이 멀쩡해도 확정된 사유는 그대로다(되살아나는 함수가 아니다).
    expect(settleGameOver(dead)).toBe(dead)
    expect(settleGameOver(dead).gameOver).toBe('burnout')
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
