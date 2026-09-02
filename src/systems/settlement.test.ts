import { describe, expect, it } from 'vitest'
import { DEADLINE_DAY, daysUntilDeadline, isDeadlineReached } from '../data/calendar'
import {
  blockedBySettlement,
  canMoveAfterSettlement,
  isSettled,
  reviveSettlement,
  settleYear,
} from './settlement'
import { canRun, createInitialState } from './turn'
import { canMove } from './housing'
import { findActivity } from '../data/activities'
import { HOUSINGS } from '../data/housing'
import type { GameState } from '../types/game'

/**
 * 1년 결산.
 *
 * ⚠️ **불변식 증명은 셋만 쓴다**(CLAUDE.md 검증 분량 규칙 — 돈·턴·판을 만드는 것):
 * ①회복 중이어도 결산이 뜬다 ②결산 뒤 진로가 실제로 잠긴다 ③한 판에 한 번만 굳는다.
 * 나머지는 회귀 테스트 하나씩이다.
 */

const base = (): GameState => createInitialState('결산')
const atDeadline = (extra: Partial<GameState> = {}): GameState => ({
  ...base(),
  day: DEADLINE_DAY,
  ...extra,
})

describe('결산일', () => {
  it('1년 뒤가 결산일이다 — 시작이 3월 1일이라 이듬해 2월 말이다', () => {
    expect(DEADLINE_DAY).toBe(365)
  })

  it('아직이면 안 굳는다', () => {
    const s = { ...base(), day: DEADLINE_DAY - 1 }
    expect(settleYear(s)).toBe(s)
    expect(isSettled(settleYear(s))).toBe(false)
  })

  it('날이 되면 굳는다', () => {
    expect(isSettled(settleYear(atDeadline()))).toBe(true)
  })

  /* ⚠️ 자동 진행·여행으로 며칠이 한 번에 흐르면 정확히 365일차를 안 밟는다. */
  it('건너뛰어 지나가도 굳는다', () => {
    expect(isSettled(settleYear({ ...base(), day: DEADLINE_DAY + 30 }))).toBe(true)
    expect(isDeadlineReached(DEADLINE_DAY + 30)).toBe(true)
  })

  it('남은 날은 음수가 되지 않는다 — "-3일 남음"을 적으면 안 된다', () => {
    expect(daysUntilDeadline(DEADLINE_DAY + 10)).toBe(0)
    expect(daysUntilDeadline(1)).toBe(DEADLINE_DAY - 1)
  })
})

describe('⚠️ 회복 중이어도 결산은 뜬다', () => {
  /* 363일차에 파산하면 회복 3일이 결산일을 덮는다 — 그때 결산이 사라지면
     1년을 살았는데 돌아볼 자리가 없다. */
  it('주저앉은 채로 결산일이 와도 굳는다', () => {
    const down = atDeadline({ recovery: { kind: 'bankrupt', startedDay: 363, daysLeft: 2 } })
    expect(isSettled(settleYear(down))).toBe(true)
  })

  it('결산과 함께 회복이 풀린다 — 1년이 끝났는데 "3일 더"가 남을 이유가 없다', () => {
    const down = atDeadline({ recovery: { kind: 'burnout', startedDay: 364, daysLeft: 3 } })
    expect(settleYear(down).recovery).toBeNull()
  })
})

describe('⚠️ 결산 뒤에는 진로가 굳는다', () => {
  const settled = () => settleYear(atDeadline())

  it('새 직장 지원이 막힌다', () => {
    expect(blockedBySettlement(settled(), findActivity('job-apply')!)).toBe(true)
    expect(canRun(settled(), findActivity('job-apply')!)).toBe(false)
  })

  it('이사가 막힌다', () => {
    const s = { ...settled(), stats: { ...settled().stats, money: 99_000_000 } }
    expect(canMoveAfterSettlement(s)).toBe(false)
    expect(canMove(s, HOUSINGS[HOUSINGS.length - 1])).toBe(false)
  })

  /* ⚠️ **전부 막으면 이어하기가 무의미해진다**(설계자 결정: 직업·거주만 고정). */
  it('공부·운동은 그대로 된다 — 삶이 굳었지 생활이 끝난 것은 아니다', () => {
    const s = settled()
    expect(blockedBySettlement(s, findActivity('study')!)).toBe(false)
    expect(canRun(s, findActivity('study')!)).toBe(true)
  })

  it('굳기 전에는 아무것도 안 막는다', () => {
    const s = base()
    expect(blockedBySettlement(s, findActivity('job-apply')!)).toBe(false)
    expect(canMoveAfterSettlement(s)).toBe(true)
  })
})

describe('⚠️ 한 판에 한 번만 굳는다', () => {
  /* 매 밤 다시 찍으면 결산 날짜가 계속 갱신되고, 도감의 '지난 삶'에도 같은 판이
     여러 번 남는다(`recordLife`에 중복 검사가 없다). */
  it('이미 굳은 판은 그대로 돌려준다', () => {
    const once = settleYear(atDeadline())
    expect(settleYear(once)).toBe(once)
  })

  it('굳은 날짜가 나중에 바뀌지 않는다', () => {
    const once = settleYear(atDeadline())
    const later = settleYear({ ...once, day: DEADLINE_DAY + 50 })
    expect(later.settled!.day).toBe(DEADLINE_DAY)
  })
})

describe('⚠️ 새로고침으로 풀리지 않는다', () => {
  /* 안 되살리면 굳은 판을 다시 열 때 직업·이사 잠금이 통째로 사라진다 —
     1년이 없던 일이 된다. 실제로 그렇게 짤 뻔했다. */
  it('세이브를 왕복해도 결산이 살아남는다', () => {
    const once = settleYear(atDeadline({ housing: { id: 'gosiwon', movedDay: 20 } as never }))
    const back = reviveSettlement(JSON.parse(JSON.stringify(once.settled)))
    expect(back).toEqual(once.settled)
  })

  it('못 믿을 값은 버린다', () => {
    expect(reviveSettlement(null)).toBeUndefined()
    expect(reviveSettlement({ day: NaN })).toBeUndefined()
    expect(reviveSettlement({ day: 0 })).toBeUndefined()
  })
})

describe('결산이 그때의 삶을 적는다', () => {
  it('다니던 회사와 사는 집을 남긴다', () => {
    const s = settleYear(
      atDeadline({
        employment: { careerId: 'hanul-call', hiredDay: 10, checkedDay: 10, absences: 0 } as never,
        housing: { id: 'gosiwon', movedDay: 20 } as never,
      }),
    )
    expect(s.settled!.careerId).toBe('hanul-call')
    expect(s.settled!.housingId).toBe('gosiwon')
  })

  it('무직·기본 집이면 비워 둔다 — 없는 것을 지어내지 않는다', () => {
    const s = settleYear(atDeadline())
    expect(s.settled!.careerId).toBeUndefined()
  })
})
