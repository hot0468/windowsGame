import {
  MEETING_CALL_RATE,
  MEETING_CHANNEL,
  MEETING_JOIN_REWARD,
  MEETING_LEAD_DAYS,
  MEETING_MISS_PENALTY,
  MEETING_TOPICS,
  ZOOM_APP_ID,
} from '../data/meetings'
import { isWorkWeekday } from '../data/careers'
import { weekdayOf } from '../data/calendar'
import type { GameState, Meeting, Slot } from '../types/game'

/**
 * 화상회의.
 *
 * ## 의존 방향
 * ⚠️ `turn.ts`를 부르지 않는다(사내 드라이브와 같다). 만드는 것은 성과 게이지뿐이라
 * 턴 규칙이 이 시스템을 모르는 채로 있어야 밸런스 시뮬레이션이 그대로 성립한다.
 *
 * ## 결정성
 * 요청이 오는 날은 **날짜의 함수다**(`Math.random` 금지 — 굴리면 새로 고칠 때마다
 * 답이 달라져 세이브 스커밍이 열린다). 굴림은 주말 호출과 같은 방식이고 **상수만 다르다**:
 * 같은 상수를 쓰면 주말 호출이 뜨는 날마다 회의 요청도 함께 뜬다.
 */

/** 그 날짜의 굴림값(0~99). 회의용 소금을 섞어 주말 호출과 다른 날에 뜨게 한다. */
function roll(day: number): number {
  const x = Math.imul(day + 101, 2246822519) >>> 0
  return (x ^ (x >>> 15)) % 100
}

/** 그날 회의 요청이 오는가. **재직 중 + 근무일**에만 온다 — 쉬는 날에 잡는 회의는 없다. */
export function meetingCallOn(state: GameState, day: number): boolean {
  if (!state.employment) return false
  if (!isWorkWeekday(weekdayOf(day))) return false
  return roll(day) < MEETING_CALL_RATE
}

/** 그날 요청이 가리키는 회의. 날짜·시간대·주제가 전부 날짜에서 파생된다. */
export function proposedMeeting(day: number): Meeting {
  const at = day + MEETING_LEAD_DAYS
  return {
    day: at,
    /* 오전/오후는 날짜가 정한다 — 홀수 날은 오후로 가서 요청이 늘 오전에 몰리지 않는다. */
    slot: at % 2 === 0 ? 'morning' : 'afternoon',
    topic: MEETING_TOPICS[((at % MEETING_TOPICS.length) + MEETING_TOPICS.length) % MEETING_TOPICS.length],
  }
}

/** 이미 그 시간에 잡아 둔 회의가 있는가. 같은 회의를 두 번 넣지 않는 판정이다. */
export function hasMeetingAt(state: GameState, day: number, slot: Slot): boolean {
  return (state.meetings ?? []).some((m) => m.day === day && m.slot === slot)
}

/**
 * 지금 [확인]을 누를 수 있는 요청. 없으면 undefined.
 *
 * ⚠️ **이미 넣은 요청은 사라진다** — 같은 카드가 남아 있으면 누를 때마다 회의가 쌓인다.
 * ⚠️ **오늘 요청만 본다**: 어제 온 요청을 오늘 받아 주면 "그날 확인했어야 하는 일"이
 * 아니게 되고, 회의 날짜(`MEETING_LEAD_DAYS`)도 지난 날 기준이 되어 과거에 잡힌다.
 */
export function pendingRequest(state: GameState): Meeting | undefined {
  if (!meetingCallOn(state, state.day)) return undefined
  const proposed = proposedMeeting(state.day)
  return hasMeetingAt(state, proposed.day, proposed.slot) ? undefined : proposed
}

/**
 * 너아무튼온에 뜨는 회의 요청 메시지. 저장하지 않고 매번 만든다(주말 호출과 같은 규칙).
 *
 * ⚠️ **`pendingRequest`가 아니라 "그날 요청이 왔는가"를 본다.** 받아들이면 카드는
 * 사라져야 하지만 **말은 남아야 한다** — 확인을 누른 순간 팀장의 말까지 지워지면
 * 무엇을 약속했는지가 대화에서 통째로 사라진다(실측으로 잡았다).
 * 그래서 문구는 두 갈래다: 아직 안 넣었으면 [확인]을 가리키고, 넣었으면 그 사실을 받는다.
 */
export function meetingRequestMessages(
  state: GameState,
): { id: string; channel: string; from: string; text: string }[] {
  if (!meetingCallOn(state, state.day)) return []
  const req = proposedMeeting(state.day)
  const when = `${req.day}일차 ${req.slot === 'morning' ? '오전' : '오후'}`
  const accepted = hasMeetingAt(state, req.day, req.slot)
  return [
    {
      id: `meeting-call-${state.day}`,
      channel: MEETING_CHANNEL,
      from: '박 팀장',
      text: accepted
        ? `${when} 화상회의 일정 잡힌 거 확인했습니다. 그때 줌으로 뵐게요.`
        : `${when}에 화상회의 잡을게요. 주제는 "${req.topic}"입니다. 아래 [확인] 눌러서 일정에 넣어 두시고, 줌 없으면 검색해서 받아 두세요.`,
    },
  ]
}

/** 요청을 받아들여 일정에 넣는다. 넣을 것이 없으면 상태를 그대로 돌려준다. */
export function acceptMeeting(state: GameState): GameState {
  const req = pendingRequest(state)
  if (!req) return state
  return { ...state, meetings: [...(state.meetings ?? []), req] }
}

/** 줌을 내려받았는가. 화면 여러 곳이 이 술어 하나를 본다. */
export function zoomInstalled(state: GameState): boolean {
  return (state.installed ?? []).includes(ZOOM_APP_ID)
}

/** 프로그램을 설치한다. 이미 있으면 그대로다(두 번 받아도 목록이 늘지 않는다). */
export function installApp(state: GameState, appId: string): GameState {
  const installed = state.installed ?? []
  if (installed.includes(appId)) return state
  return { ...state, installed: [...installed, appId] }
}

/** 지금 시간대에 열려 있는 회의. 없으면 undefined — 줌은 이 값으로 화면을 가른다. */
export function meetingNow(state: GameState): Meeting | undefined {
  return (state.meetings ?? []).find((m) => m.day === state.day && m.slot === state.slot)
}

/** 아직 지나지 않은 회의(오늘 이후). 일정 화면이 앞으로의 일을 적을 때 쓴다. */
export function upcomingMeetings(state: GameState): Meeting[] {
  return (state.meetings ?? [])
    .filter((m) => m.day >= state.day)
    .sort((a, b) => a.day - b.day || (a.slot === b.slot ? 0 : a.slot === 'morning' ? -1 : 1))
}

/**
 * 회의실에 들어간다. **턴을 쓰지 않는다** — 회의는 활동이 아니라 자리다(읽는 것이
 * 무료인 것과 같은 판단). 대신 성과가 조금 오른다.
 */
export function joinMeeting(state: GameState): GameState {
  const now = meetingNow(state)
  if (!now || now.joined) return state
  const job = state.employment
  return {
    ...state,
    meetings: (state.meetings ?? []).map((m) =>
      m.day === now.day && m.slot === now.slot ? { ...m, joined: true, checked: true } : m,
    ),
    employment: job
      ? { ...job, performance: (job.performance ?? 0) + MEETING_JOIN_REWARD }
      : job,
  }
}

/**
 * 지나간 회의 감사. **빠진 회의 한 건당 성과를 한 번만** 깎는다(`checked`가 커서다).
 *
 * ⚠️ 성과는 0 아래로 내려가지 않는다 — 음수 게이지는 급여일 정산에서 야근비를 빼는
 * 쪽으로 새어 나가고, 그건 "회의에 빠져서 돈을 토해 낸다"는 이 게임에 없는 규칙이 된다.
 * ⚠️ 재직 중이 아니면 감사하지 않는다: 해고된 뒤의 회의는 깎을 성과 자체가 없다.
 */
export function advanceMeetings(state: GameState): GameState {
  const meetings = state.meetings ?? []
  const missed = meetings.filter((m) => !m.checked && !m.joined && isPast(m, state))
  if (missed.length === 0) return state
  const job = state.employment
  return {
    ...state,
    meetings: meetings.map((m) => (missed.includes(m) ? { ...m, checked: true } : m)),
    employment: job
      ? {
          ...job,
          performance: Math.max(0, (job.performance ?? 0) - MEETING_MISS_PENALTY * missed.length),
        }
      : job,
  }
}

/** 그 회의 시간이 지났는가. 같은 날이면 오전 회의만 오후에 지난 것이 된다. */
function isPast(m: Meeting, state: GameState): boolean {
  if (m.day < state.day) return true
  if (m.day > state.day) return false
  return m.slot === 'morning' && state.slot === 'afternoon'
}
