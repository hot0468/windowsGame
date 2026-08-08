import {
  AUTO_PERFORMANCE,
  FILE_REQUESTS,
  OFFICE_CAREER_IDS,
  PERFORMANCE_QUOTA,
  PERFORMANCE_TIERS,
  REQUESTS_PER_SHIFT,
  WON_PER_PERCENT,
} from '../data/drive'
import { WEEKEND_CALL_RATE, findCareer, isWorkWeekday } from '../data/careers'
import { weekdayOf } from '../data/calendar'
import type { FileRequest } from '../data/drive'
import type { GameState } from '../types/game'

/** 주말 호출이 뜨는 채팅방(`data/messages.ts`의 `THREADS`). 팀장님 방이다. */
export const WEEKEND_CALL_CHANNEL = 'boss'

/**
 * 사내 드라이브 미니게임의 규칙.
 *
 * ## 의존 방향
 * ⚠️ `turn.ts`를 부르지 **않는다**(콜센터와 같다 — 이쪽은 더 엄격해서 아무 시스템도 안 부른다).
 * 만드는 것은 소지금이 아니라 **급여일에 정산될 성과 게이지**뿐이라, 턴 규칙이 이 미니게임을
 * 모르는 채로 있어야 밸런스 시뮬레이션이 그대로 성립한다.
 *
 * ## 결정성
 * 오늘 오는 요청은 **날짜의 함수**다(`Math.random` 금지). 실시간인 것은 **경과 시간 하나**이고
 * 그건 화면이 재서 밀리초로 넘겨준다 — 이 파일은 `Date`를 부르지 않는다.
 */

/* ── 오늘의 요청 ───────────────────────────────────────────────────────── */

/**
 * 그날 오는 요청 `REQUESTS_PER_SHIFT`건. 날짜를 오프셋 삼아 풀을 회전시킨다
 * (`callsForDay`·`selectNews`와 같은 방식). 풀 길이가 3의 배수가 아니라서 조합이
 * 날마다 어긋난다 — 배수였다면 며칠마다 같은 세 건이 같은 순서로 돌아온다.
 */
export function requestsForDay(day: number): FileRequest[] {
  const start = ((day % FILE_REQUESTS.length) + FILE_REQUESTS.length) % FILE_REQUESTS.length
  return Array.from(
    { length: REQUESTS_PER_SHIFT },
    (_, i) => FILE_REQUESTS[(start + i) % FILE_REQUESTS.length],
  )
}

/* ── 주말 호출 ─────────────────────────────────────────────────────────── */

/**
 * 그 날짜의 굴림값(0~99). **`Math.random`이 아니라 날짜의 순수 함수다** —
 * 굴리면 새로 고칠 때마다 답이 달라져 세이브 스커밍이 열린다(주식 시세·행사와 같은 규칙).
 *
 * 곱셈 상수는 Knuth의 것이고, 한 번 섞어(`x ^ x>>>13`) 인접한 날이 인접한 값이 되지 않게 한다.
 */
function roll(day: number): number {
  const x = Math.imul(day + 1, 2654435761) >>> 0
  return (x ^ (x >>> 13)) % 100
}

/** 오늘이 주말인가. 근무일 판정은 `data/careers.ts`의 것을 그대로 쓴다. */
export function isWeekend(day: number): boolean {
  return !isWorkWeekday(weekdayOf(day))
}

/**
 * 그 주말에 그 회사에서 일이 넘어오는가.
 *
 * ⚠️ **평일에는 늘 false다** — 평일 출근은 호출이 아니라 근무다.
 * ⚠️ **사무직에만 걸린다.** 주말 호출이 하는 일은 이 미니게임을 한 번 더 여는 것이므로,
 * 이 창이 없는 회사에 호출을 띄우면 "오늘 안에 처리해 달라"는 말만 오고 처리할 자리가 없다
 * (죽은 컨트롤 금지). 컨베이어 앞과 교실에 파일을 부탁할 수도 없다.
 * ⚠️ 확률은 회사 **규모**가 정한다(`WEEKEND_CALL_RATE`) — 급여가 높은 회사일수록
 * 주말을 더 많이 가져간다. 그것이 좋은 회사에 붙는 대가다.
 */
export function weekendCallOn(day: number, careerId: string | undefined): boolean {
  if (!careerId || !OFFICE_CAREER_IDS.includes(careerId) || !isWeekend(day)) return false
  const career = findCareer(careerId)
  if (!career) return false
  return roll(day) < WEEKEND_CALL_RATE[career.scale]
}

/**
 * 지금 주말 호출이 걸려 있는가. **출근(`commute`)의 주말 게이트가 이 값을 본다**
 * (`systems/turn.ts`의 `canRun`) — 화면에서만 열면 스케줄러 예약이 게이트를 통과한다.
 */
export function hasWeekendCall(state: GameState): boolean {
  return weekendCallOn(state.day, state.employment?.careerId)
}

/**
 * 너아무튼온에 뜨는 주말 호출 메시지. **저장하지 않고 매번 만든다**
 * (`examMessages`·`noticeMail`과 같은 판단 — 상태에서 파생되는 사실이라 편성표에 못 넣는다).
 *
 * ⚠️ 이미 그날 출근했으면 안 그린다 — 다 한 일을 다시 시키는 말이 남으면 거짓이 된다.
 */
export function weekendCallMessages(state: GameState): { id: string; channel: string; from: string; text: string }[] {
  const job = state.employment
  if (!job || !hasWeekendCall(state)) return []
  if (job.attendedDays.includes(state.day)) return []
  const career = findCareer(job.careerId)
  if (!career) return []
  return [
    {
      id: `weekend-call-${state.day}`,
      channel: WEEKEND_CALL_CHANNEL,
      from: '박 팀장',
      text: `쉬는 날 미안한데 ${career.company} 건으로 파일 몇 개만 부탁해요. 오늘 안에 처리해 주면 성과에 반영해 둘게요.`,
    },
  ]
}

/* ── 성과 ──────────────────────────────────────────────────────────────── */

/** 처리 시간에 따른 성과. 표의 **처음 맞는 칸**이 답이다(`bonusFor`와 같은 모양). */
export function performanceFor(elapsedMs: number): { percent: number; label: string } {
  const sec = Math.max(0, elapsedMs) / 1000
  const tier =
    PERFORMANCE_TIERS.find((t) => sec <= t.withinSec) ?? PERFORMANCE_TIERS[PERFORMANCE_TIERS.length - 1]
  return { percent: tier.percent, label: tier.label }
}

/** [자동 넘기기]로 하루를 넘겼을 때의 성과. 화면과 규칙이 같은 값을 본다. */
export function autoPerformance(): { percent: number; label: string } {
  return { percent: AUTO_PERFORMANCE, label: '자동' }
}

/** 이 판이 사무직 근무자인가. 창을 여는 쪽과 성과를 쌓는 쪽이 같은 판정을 본다. */
export function worksAtOffice(state: GameState): boolean {
  const id = state.employment?.careerId
  return !!id && OFFICE_CAREER_IDS.includes(id)
}

/** 지금 쌓인 성과(%). 기록이 없으면 0이다. */
export function performanceOf(state: GameState): number {
  return state.employment?.performance ?? 0
}

/**
 * 할당량을 넘은 분량(%). **야근비의 근거이고 화면이 미리 적는 값이기도 하다.**
 * 넘지 못했으면 0이다 — 100%까지는 기본급이 사는 몫이라 돈이 되지 않는다.
 */
export function overtimePercent(performance: number): number {
  return Math.max(0, performance - PERFORMANCE_QUOTA)
}

/**
 * 야근비(원). ⚠️ **단일 출처다** — 급여일 정산(`payWages`)과 화면이 같은 함수를 본다.
 * 한쪽이 따로 계산하면 명세서가 실제로 들어온 돈과 다른 숫자를 말한다.
 */
export function overtimePay(performance: number): number {
  return overtimePercent(performance) * WON_PER_PERCENT
}

/**
 * 성과를 적립한다. **소지금은 건드리지 않는다** — 이 값은 급여일에 야근비로 바뀐다
 * (`systems/employment.ts`의 `payWages`).
 *
 * ⚠️ **상한을 여기서 자르지 않는다.** 100%를 넘기는 것이 이 게이지의 존재 이유이고
 * (설계자 지시: "야근을 포함한 업무횟수에 따라 100% 넘을 수 있음"), 하루에 쌓이는 양은
 * 요청 수 × 최고 티어로 이미 막혀 있다. 대신 **한 번에 들어오는 값은 티어 최댓값으로 자른다**
 * — 화면이 시간을 재서 넘기므로 그쪽이 고장 나도 게이지가 폭주하지 않아야 한다.
 */
export function creditPerformance(state: GameState, percent: number): GameState {
  const job = state.employment
  if (!job || !worksAtOffice(state)) return state
  const max = Math.max(...PERFORMANCE_TIERS.map((t) => t.percent))
  const safe = Number.isFinite(percent) ? Math.min(Math.max(0, Math.round(percent)), max) : 0
  if (safe <= 0) return state
  return { ...state, employment: { ...job, performance: performanceOf(state) + safe } }
}

/**
 * 세이브 보정. **못 믿을 값이면 통째로 버린다**(`reviveBonus`와 같은 이유 — NaN이 야근비를
 * 거쳐 소지금에 흘러 들어가면 `NaN <= 0`이 false라 파산이 영영 안 걸린다).
 */
export function revivePerformance(raw: unknown): number | undefined {
  if (typeof raw !== 'number' || !Number.isFinite(raw) || raw < 0) return undefined
  return Math.round(raw)
}
