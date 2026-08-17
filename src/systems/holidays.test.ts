import { describe, it, expect } from 'vitest'
import { HOLIDAYS, dayOfHoliday, holidayOn } from '../data/holidays'
import { THREADS, MAILBOX } from '../data/messages'
import { advanceHolidays, holidayMessages } from './holidays'
import { createInitialState } from './turn'
import type { GameState } from '../types/game'

const at = (day: number, over: Partial<GameState> = {}): GameState => {
  const base = createInitialState('테스터')
  /* ⚠️ 시작 멘탈이 상한(100)이라 그대로 재면 `clampStats`가 상승분을 잘라 검사가 헛돈다. */
  return { ...base, day, stats: { ...base.stats, mental: 50 }, ...over }
}

/** 판에서 실제로 만날 첫 기념일(화이트데이 14일차). 날짜를 손으로 안 적고 데이터에서 뽑는다. */
const FIRST = HOLIDAYS.map((h) => ({ h, day: dayOfHoliday(h) })).sort((a, b) => a.day - b.day)[0]

describe('기념일 데이터', () => {
  it('달력 환산이 맞다 — 1일차가 3월 1일이므로 화이트데이(3/14)는 14일차다', () => {
    const white = HOLIDAYS.find((h) => h.id === 'white-day')!
    expect(dayOfHoliday(white)).toBe(14)
    // 달을 넘는 환산(3월 31일 + 4월 1일 = 32일차)이 어긋나면 여기서 잡힌다.
    expect(dayOfHoliday(HOLIDAYS.find((h) => h.id === 'april-fools')!)).toBe(32)
  })

  it('날이 서로 겹치지 않는다 — 겹치면 한 날의 메시지 하나가 조용히 사라진다', () => {
    const days = HOLIDAYS.map(dayOfHoliday)
    expect(new Set(days).size).toBe(days.length)
  })

  /** ⚠️ 넘으면 명절이 멘탈 관리 수단이 된다(취침 회복 5 — 마스터 선물과 같은 상한). */
  it('멘탈은 1~5다', () => {
    for (const h of HOLIDAYS) {
      expect(h.mental, h.id).toBeGreaterThanOrEqual(1)
      expect(h.mental, h.id).toBeLessThanOrEqual(5)
    }
  })

  it('메시지 채널이 실재한다 — 사서함이거나 실제 채팅방이다', () => {
    for (const h of HOLIDAYS) {
      const ok = h.message.channel === MAILBOX.id || THREADS.some((t) => t.id === h.message.channel)
      expect(ok, `${h.id}의 채널 ${h.message.channel}이 없다`).toBe(true)
    }
  })

  it('전부 판 안에 있다 — 시뮬레이션 상한(240일)을 넘는 날은 아무도 못 본다', () => {
    for (const h of HOLIDAYS) expect(dayOfHoliday(h), h.id).toBeLessThanOrEqual(240)
  })
})

describe('밤 정산', () => {
  it('기념일을 지나면 멘탈이 오르고, 같은 날을 두 번 정산하지 않는다', () => {
    const before = at(FIRST.day, { holidayDay: FIRST.day - 1 })
    const once = advanceHolidays(before)
    expect(once.stats.mental).toBe(before.stats.mental + FIRST.h.mental)
    expect(once.holidayDay).toBe(FIRST.day)
    expect(advanceHolidays(once)).toEqual(once)
  })

  /** ⚠️ 스케줄러·자동 진행이 며칠을 한 번에 흘려도 그 사이 기념일이 새지 않는다(커서). */
  it('며칠을 한 번에 건너뛰어도 사이의 기념일이 전부 정산된다', () => {
    const [a, b] = HOLIDAYS.map((h) => ({ h, day: dayOfHoliday(h) })).sort((x, y) => x.day - y.day)
    const jumped = advanceHolidays(at(b.day, { holidayDay: a.day - 1 }))
    expect(jumped.stats.mental).toBe(50 + a.h.mental + b.h.mental)
  })

  /**
   * ⚠️ **구세이브는 소급하지 않는다.** 커서가 없으면 어제부터 센다 — 1일차부터 다시 세면
   * 지나간 명절 몇 달치 멘탈이 한 번에 들어온다. 기분은 그날의 것이라 소급하면 뜻이 없다.
   */
  it('커서가 없으면(구세이브) 지나간 기념일을 소급하지 않는다', () => {
    const old = at(FIRST.day + 10)
    const after = advanceHolidays(old)
    expect(after.stats.mental).toBe(old.stats.mental)
    expect(after.holidayDay).toBe(old.day)
  })

  it('평일에도 커서는 오늘로 민다', () => {
    const plain = advanceHolidays(at(5, { holidayDay: 4 }))
    expect(plain.holidayDay).toBe(5)
    expect(plain.stats.mental).toBe(50)
  })
})

describe('기념일 메시지', () => {
  it('그날에만 뜬다 — 전날도 다음날도 아니다', () => {
    expect(holidayMessages(at(FIRST.day))).toHaveLength(1)
    expect(holidayMessages(at(FIRST.day - 1))).toEqual([])
    expect(holidayMessages(at(FIRST.day + 1))).toEqual([])
  })

  it('오늘의 기념일 판정이 메시지와 같은 날을 본다', () => {
    expect(holidayOn(FIRST.day)?.id).toBe(FIRST.h.id)
    expect(holidayOn(FIRST.day + 1)).toBeUndefined()
  })

  it('게임이 끝났으면 안 온다 — 그때 읽혀야 하는 것은 엔딩이다', () => {
    expect(holidayMessages(at(FIRST.day, { gameOver: 'bankrupt' }))).toEqual([])
  })
})
