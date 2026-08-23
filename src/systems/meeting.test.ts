import { describe, expect, it } from 'vitest'
import { CAREERS, isWorkWeekday } from '../data/careers'
import { weekdayOf } from '../data/calendar'
import { MEETING_JOIN_REWARD, MEETING_MISS_PENALTY, ZOOM_APP_ID } from '../data/meetings'
import {
  acceptMeeting,
  advanceMeetings,
  installApp,
  joinMeeting,
  meetingCallOn,
  meetingNow,
  meetingRequestMessages,
  pendingRequest,
  proposedMeeting,
  zoomInstalled,
} from './meeting'
import { createInitialState } from './turn'
import type { Employment, GameState } from '../types/game'

function state(over: Partial<GameState> = {}): GameState {
  return { ...createInitialState('테스터'), ...over }
}

const job = (over: Partial<Employment> = {}): Employment => ({
  careerId: CAREERS[0].id,
  hiredDay: 1,
  paydayDay: 30,
  attendedDays: [],
  absences: 0,
  checkedDay: 1,
  ...over,
})

/** 요청이 실제로 오는 첫 근무일. 굴림이 결정적이라 테스트도 굴리지 않고 찾는다. */
function callDay(s: GameState): number {
  for (let day = 1; day < 200; day++) if (meetingCallOn(s, day)) return day
  throw new Error('요청이 오는 날이 없다 — 확률 상수를 확인하라')
}

describe('화상회의 요청', () => {
  it('재직 중이 아니면 오지 않는다 — 회사가 없으면 회의도 없다', () => {
    const employed = state({ employment: job() })
    const day = callDay(employed)
    expect(meetingCallOn(state(), day)).toBe(false)
  })

  it('쉬는 날에는 오지 않는다', () => {
    const s = state({ employment: job() })
    for (let day = 1; day < 60; day++) {
      if (meetingCallOn(s, day)) expect(isWorkWeekday(weekdayOf(day))).toBe(true)
    }
  })

  /* ⚠️ 굴림이 날짜의 순수 함수라는 것이 세이브 스커밍을 막는 유일한 장치다. */
  it('같은 날은 언제 물어도 같은 답이다 — 새로 고쳐도 다시 구르지 않는다', () => {
    const s = state({ employment: job() })
    const day = callDay(s)
    expect(meetingCallOn(s, day)).toBe(meetingCallOn(s, day))
    expect(proposedMeeting(day)).toEqual(proposedMeeting(day))
  })

  /* ⚠️ 받아들인 뒤 카드는 사라지지만 **말은 남아야 한다** — 지워지면 무엇을 약속했는지가
     대화에서 통째로 없어진다(그 실수를 한 번 했다). */
  it('확인해도 팀장의 말은 대화에 남는다 — 사라지는 것은 [확인] 카드뿐이다', () => {
    const day = callDay(state({ employment: job() }))
    const s = state({ employment: job(), day })
    expect(meetingRequestMessages(s)).toHaveLength(1)
    const after = acceptMeeting(s)
    expect(meetingRequestMessages(after)).toHaveLength(1)
    expect(pendingRequest(after)).toBeUndefined()
  })

  it('확인하면 일정에 들어가고, 같은 요청은 두 번 들어가지 않는다', () => {
    const day = callDay(state({ employment: job() }))
    const s = state({ employment: job(), day })
    const once = acceptMeeting(s)
    expect(once.meetings).toHaveLength(1)
    expect(once.meetings![0].day).toBeGreaterThan(day)
    // 이미 넣었으면 카드가 사라지고, 다시 눌러도 늘지 않는다.
    expect(pendingRequest(once)).toBeUndefined()
    expect(acceptMeeting(once).meetings).toHaveLength(1)
  })
})

describe('회의 참석과 결석', () => {
  const meeting = { day: 5, slot: 'morning' as const, topic: '주간 업무 공유' }

  it('회의 시간에만 방이 열린다', () => {
    const s = state({ employment: job(), day: 5, slot: 'morning', meetings: [meeting] })
    expect(meetingNow(s)).toEqual(meeting)
    expect(meetingNow({ ...s, slot: 'afternoon' as const })).toBeUndefined()
    expect(meetingNow({ ...s, day: 4 })).toBeUndefined()
  })

  it('들어가면 성과가 오르고, 밤 감사가 깎지 않는다', () => {
    const s = state({
      employment: job({ performance: 30 }),
      day: 5,
      slot: 'morning',
      meetings: [meeting],
    })
    const joined = joinMeeting(s)
    expect(joined.employment!.performance).toBe(30 + MEETING_JOIN_REWARD)
    const next = advanceMeetings({ ...joined, slot: 'afternoon' as const })
    expect(next.employment!.performance).toBe(30 + MEETING_JOIN_REWARD)
  })

  /*
   * ⚠️ **커서가 없으면 같은 회의가 매 턴 성과를 깎는다.** 밤 정산은 며칠이 한 번에
   * 흐를 수 있어(자동 진행·예약 연쇄) 이 단언이 곧 그 안전장치다.
   */
  it('빠진 회의는 성과를 한 번만 깎는다', () => {
    const s = state({
      employment: job({ performance: 50 }),
      day: 6,
      slot: 'morning',
      meetings: [meeting],
    })
    const once = advanceMeetings(s)
    expect(once.employment!.performance).toBe(50 - MEETING_MISS_PENALTY)
    const twice = advanceMeetings(advanceMeetings(once))
    expect(twice.employment!.performance).toBe(50 - MEETING_MISS_PENALTY)
  })

  it('성과는 0 아래로 내려가지 않는다', () => {
    const s = state({
      employment: job({ performance: 5 }),
      day: 9,
      slot: 'morning',
      meetings: [meeting, { day: 6, slot: 'afternoon' as const, topic: '운영 이슈 대응 회의' }],
    })
    expect(advanceMeetings(s).employment!.performance).toBe(0)
  })

  it('아직 오지 않은 회의는 건드리지 않는다', () => {
    const s = state({ employment: job({ performance: 40 }), day: 4, meetings: [meeting] })
    expect(advanceMeetings(s)).toBe(s)
  })
})

describe('줌 설치', () => {
  it('받기 전에는 없고, 두 번 받아도 하나다', () => {
    const s = state()
    expect(zoomInstalled(s)).toBe(false)
    const once = installApp(s, ZOOM_APP_ID)
    expect(zoomInstalled(once)).toBe(true)
    expect(installApp(once, ZOOM_APP_ID).installed).toEqual([ZOOM_APP_ID])
  })
})
