import { describe, expect, it } from 'vitest'
import {
  BONUS_TIERS,
  CALLS,
  CALLS_PER_SHIFT,
  CALL_CENTER_CAREER_ID,
  MAX_CALL_BONUS,
  QNA,
  findQna,
} from '../data/callcenter'
import { CAREERS, PAYDAY_INTERVAL, findCareer } from '../data/careers'
import { bonusFor, callsForDay, creditCall, searchQna, worksAtCallCenter } from './callcenter'
import { advanceEmployment } from './employment'
import { createInitialState } from './turn'
import type { GameState } from '../types/game'

/**
 * 콜센터 미니게임.
 *
 * 덮는 것은 **이 변경이 깨뜨릴 수 있는 것**뿐이다: 콜 선택의 결정성, 검색이 실제로 정답에
 * 닿는가, 보너스 상한, 그리고 **급여일에 기본급과 함께 나가는가**. 마지막 항목만
 * 돈을 만드는 불변식이라 규칙을 뒤집어 실패를 확인한다.
 */

function employed(careerId: string): GameState {
  const base = createInitialState('상담원')
  return {
    ...base,
    day: 10,
    employment: {
      careerId,
      hiredDay: 10,
      paydayDay: 10 + PAYDAY_INTERVAL,
      attendedDays: [],
      absences: 0,
      checkedDay: 10,
    },
  }
}

describe('오늘의 콜', () => {
  it('같은 날은 언제 물어도 같은 세 건이다', () => {
    expect(callsForDay(7)).toEqual(callsForDay(7))
    expect(callsForDay(7)).toHaveLength(CALLS_PER_SHIFT)
  })

  it('날이 바뀌면 조합이 바뀐다 — 풀 길이가 콜 수의 배수가 아니어야 성립한다', () => {
    expect(CALLS.length % CALLS_PER_SHIFT).not.toBe(0)
    const ids = (day: number) => callsForDay(day).map((c) => c.id).join()
    expect(ids(1)).not.toBe(ids(2))
  })

  it('모든 콜의 정답 QnA가 실제로 있다 — 답할 수 없는 콜은 막다른 골목이다', () => {
    for (const call of CALLS) expect(findQna(call.qnaId), call.id).toBeDefined()
  })
})

describe('QnA 검색', () => {
  it('빈 검색어는 전체 목록이다', () => {
    expect(searchQna('')).toHaveLength(QNA.length)
    expect(searchQna('   ')).toHaveLength(QNA.length)
  })

  it('공백을 무시한다', () => {
    expect(searchQna('요금제')).toEqual(searchQna('요 금 제'))
  })

  /**
   * ⚠️ 이 테스트가 이 미니게임의 존재 이유를 지킨다. 고객이 쓰는 말("느려요")로 검색해서
   * 정답에 닿지 못하면 남는 길은 **문서 열 개를 외우는 것**뿐이고, 그건 게임이 아니다.
   */
  it('모든 콜은 고객이 쓴 말 중 하나로 검색해서 정답에 닿는다', () => {
    for (const call of CALLS) {
      const answer = findQna(call.qnaId)!
      const reachable = answer.keywords.some((k) => searchQna(k).some((q) => q.id === answer.id))
      expect(reachable, `${call.id}: 키워드로 정답에 닿지 못한다`).toBe(true)
    }
  })
})

describe('보너스', () => {
  it('빠를수록 많이 받고 늦어도 0은 아니다 — 자동 넘기기와 구분되어야 한다', () => {
    expect(bonusFor(0).won).toBe(MAX_CALL_BONUS)
    expect(bonusFor(10 * 60 * 1000).won).toBeGreaterThan(0)
  })

  it('표는 내림차순이다 — 순서가 뒤집히면 늦게 처리한 쪽이 더 받는다', () => {
    for (let i = 1; i < BONUS_TIERS.length; i++) {
      expect(BONUS_TIERS[i].won).toBeLessThan(BONUS_TIERS[i - 1].won)
      expect(BONUS_TIERS[i].withinSec).toBeGreaterThan(BONUS_TIERS[i - 1].withinSec)
    }
  })

  it('한 건당 상한을 넘겨 적립할 수 없다', () => {
    const s = creditCall(employed(CALL_CENTER_CAREER_ID), 9_999_999)
    expect(s.employment!.bonus).toBe(MAX_CALL_BONUS)
  })

  it('음수·NaN은 적립되지 않는다', () => {
    const base = employed(CALL_CENTER_CAREER_ID)
    expect(creditCall(base, -5000)).toBe(base)
    expect(creditCall(base, Number.NaN)).toBe(base)
  })

  it('콜센터가 아닌 회사에는 쌓이지 않는다', () => {
    const other = employed('dasom-office')
    expect(worksAtCallCenter(other)).toBe(false)
    expect(creditCall(other, 5000)).toBe(other)
  })
})

describe('보너스는 급여일에 기본급과 함께 들어온다', () => {
  const career = findCareer(CALL_CENTER_CAREER_ID)!

  /**
   * 급여일 당일로 민다. **결근 커서도 함께 민다** — 안 그러면 그 사이 근무일을 통째로
   * 빠진 것이 되어 급여를 받기 전에 해고당한다(여기서 재려는 것은 근태가 아니라 지급이다).
   */
  function atPayday(state: GameState): GameState {
    const day = state.employment!.paydayDay
    return { ...state, day, employment: { ...state.employment!, checkedDay: day - 1 } }
  }

  it('급여일 전에는 소지금이 한 푼도 안 움직인다', () => {
    const base = employed(CALL_CENTER_CAREER_ID)
    const credited = creditCall(base, MAX_CALL_BONUS)
    expect(credited.stats.money).toBe(base.stats.money)
    expect(credited.employment!.bonus).toBe(MAX_CALL_BONUS)
  })

  it('급여일에 기본급 + 적립액이 한 번에 들어오고 적립액은 비워진다', () => {
    const payday = atPayday(creditCall(employed(CALL_CENTER_CAREER_ID), MAX_CALL_BONUS))
    const { state, notices } = advanceEmployment(payday)

    expect(state.stats.money).toBe(payday.stats.money + career.salary + MAX_CALL_BONUS)
    expect(state.employment!.bonus).toBe(0)
    const paid = notices.find((n) => n.kind === 'payday')!
    expect(paid.amount).toBe(career.salary + MAX_CALL_BONUS)
    expect(paid.bonus).toBe(MAX_CALL_BONUS)
  })

  it('보너스를 한 번도 안 쌓았으면 기본급만 들어온다 — 자동 넘기기의 결과다', () => {
    const payday = atPayday(employed(CALL_CENTER_CAREER_ID))
    const { state, notices } = advanceEmployment(payday)
    expect(state.stats.money).toBe(payday.stats.money + career.salary)
    expect(notices.find((n) => n.kind === 'payday')!.bonus).toBeFalsy()
  })
})

describe('공고와의 연결', () => {
  it('미니게임이 가리키는 공고가 실제로 있고 가장 싸다', () => {
    expect(findCareer(CALL_CENTER_CAREER_ID)).toBeDefined()
    // 손을 써야 메워지는 자리라 기본급이 가장 낮다. 배열 순서 = 급여 오름차순 규칙과 맞물린다.
    expect(CAREERS[0].id).toBe(CALL_CENTER_CAREER_ID)
  })

  /* ⚠️ 예전에는 "그 회사에도 자기 엔딩이 있다"였다 — 직업 엔딩 9종이 도감 콜렉션으로
     옮겨 가면서(2026-08-14) 확인할 대상이 엔딩에서 공고로 바뀌었다. */
  it('도감이 셀 수 있게 공고에 이름과 직함이 있다', () => {
    const career = findCareer(CALL_CENTER_CAREER_ID)!
    expect(career.company).toBeTruthy()
    expect(career.title).toBeTruthy()
  })
})
