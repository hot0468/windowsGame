import { CERTIFICATE_SESSIONS, COURSES, COURSE_LEVELS, findCourse, levelRank } from '../data/courses'
import { findActivity } from '../data/activities'
import { findItem } from '../data/items'
import { canRun, owns, runActivity } from './turn'
import type { Course } from '../data/courses'
import type { GameState } from '../types/game'

/**
 * 슬로우캠퍼스 — 강의 수강과 수료증 발급.
 *
 * `turn.ts`를 부르지만 그 반대는 없다(스케줄러·배송·은행과 같은 규칙) — 턴 규칙이
 * 강의를 모르는 채로 있어야 밸런스 시뮬레이션이 강의 없이도 성립한다.
 *
 * ## 이 시스템이 지는 약속
 * ① 수강은 **1턴을 쓴다**(다른 활동 사이트와 같다).
 * ② 수강료는 **강의가 갖는다**(`Course.price`) — 활동 하나가 모든 강의를 대신 실행하므로
 *    금액을 활동에 적으면 강의마다 다른 값을 표현할 수 없다.
 * ③ 같은 강의를 `CERTIFICATE_SESSIONS`회 들으면 **수료증 아이템이 인벤토리에 들어온다.**
 */

/** 이 강의를 지금까지 몇 번 들었는가. 기록이 없으면 0이다. */
export function sessionsOf(state: GameState, courseId: string): number {
  return state.courses?.[courseId] ?? 0
}

/** 수료했는가(= 필요한 횟수를 다 채웠는가). */
export function isCompleted(state: GameState, courseId: string): boolean {
  return sessionsOf(state, courseId) >= CERTIFICATE_SESSIONS
}

/**
 * 이 난이도가 열려 있는가 — **진도 잠금**(2026-08-15, 설계자 지시:
 * "입문부터 횟수 채우면 차례대로 열리게").
 *
 * ⚠️ **앞 단계에서 아무거나 하나만 수료하면 열린다**(전부 수료가 아니다). 입문이 셋인데
 * 전부 요구하면 고급에 닿기까지 수강만 스물일곱 턴이라, 잠금이 진도가 아니라 통행세가 된다.
 * 한 단계당 `CERTIFICATE_SESSIONS`회 = 3턴 + 수강료 3번이 지금의 값이다.
 *
 * ⚠️ **수료(3회)를 기준으로 삼는 것이 규칙이다** — "한 번이라도 들었으면"으로 낮추면
 * 가장 싼 입문 하나를 한 번 듣고 고급까지 직행할 수 있어 순서가 뜻을 잃는다.
 *
 * ⚠️ **첫 단계는 언제나 열려 있다.** 시작하자마자 아무것도 못 듣는 판을 만들지 말 것.
 * ⚠️ 모르는 난이도(`levelRank`가 -1)는 **열어 준다** — 데이터가 어긋났을 때 잠기는 쪽으로
 * 넘어지면 강의가 통째로 사라진 것처럼 보인다(`courses.test.ts`가 그 어긋남을 잡는다).
 */
export function levelUnlocked(state: GameState, level: string): boolean {
  const rank = levelRank(level)
  if (rank <= 0) return true
  const previous = COURSE_LEVELS[rank - 1]
  return COURSES.some((c) => c.level === previous && isCompleted(state, c.id))
}

/**
 * 수강료를 포함해 이 강의를 지금 들을 수 있는가.
 *
 * ⚠️ **활동 조건은 `canRun`에게 묻는다** — 행동력·번아웃·게임오버 판정을 여기서 다시
 * 구현하면 두 번째 판정이 생긴다. 여기서 더 보는 것은 **수강료와 강의 자체의 조건**뿐이다.
 */
export function canTake(state: GameState, course: Course): boolean {
  return blockReason(state, course) === null
}

/**
 * 왜 못 듣는가. 화면은 이 문장을 **그대로** 쓴다(사유를 두 곳에서 만들지 않는다).
 * 들을 수 있으면 null.
 */
export function blockReason(state: GameState, course: Course): string | null {
  if (state.recovery) return '게임이 끝났습니다.'
  const activity = findActivity(course.activityId)
  if (!activity) return '강의 정보를 불러오지 못했습니다.'
  /* ⚠️ **진도 잠금이 돈·스탯보다 먼저다.** 돈이 없어서 못 듣는 것과 아직 열리지 않은 것은
     플레이어가 할 일이 다르다(벌어 오기 vs 앞 단계 수료하기) — 순서를 뒤집으면 잠긴 고급
     강의가 "수강료가 부족합니다"라고 말해 엉뚱한 곳으로 보낸다. */
  if (!levelUnlocked(state, course.level)) {
    const previous = COURSE_LEVELS[levelRank(course.level) - 1]
    return `${previous} 강의를 먼저 수료해야 합니다 — ${previous} 아무거나 ${CERTIFICATE_SESSIONS}회`
  }
  // 수강료를 본다 — 활동 자체의 돈 조건보다 이쪽이 항상 크고 구체적이다.
  if (state.stats.money < course.price) {
    return `수강료 ${course.price.toLocaleString()}원이 부족합니다 — 현재 ${state.stats.money.toLocaleString()}원`
  }
  for (const [key, need] of Object.entries(course.requires ?? {})) {
    const have = state.stats[key as 'knowledge' | 'creativity' | 'charm']
    if (have < need) {
      const label = { knowledge: '지식', creativity: '창의력', charm: '매력' }[key] ?? key
      return `${label} ${need} 이상 필요 — 현재 ${have}`
    }
  }
  // 수강료를 뺀 뒤의 상태로 물어야 활동의 돈 조건과 이중으로 걸리지 않는다.
  const paid = { ...state, stats: { ...state.stats, money: state.stats.money - course.price } }
  if (!canRun(paid, activity)) return '지금은 수강할 수 없습니다 — 행동력이 부족합니다.'
  return null
}

/**
 * 수강한다. 수강료를 내고 → 활동을 1턴 실행하고 → 수강 횟수를 올리고 →
 * 다 채웠으면 수료증을 발급한다.
 *
 * ⚠️ **턴을 넘기는 것은 `runActivity` 하나다**(자동 진행과 같은 규칙) — 여기서 날짜를
 * 직접 만지면 예약·택배·고용 정산이 통째로 빠진다.
 */
export function takeCourse(state: GameState, course: Course): GameState {
  if (!canTake(state, course)) return state

  // ① 수강료. 활동 실행 **전에** 뺀다 — 오후 슬롯이면 runActivity가 생활비까지
  //    정산하므로 순서가 뒤바뀌면 "낼 수 있었는데 파산"이 난다.
  const paid: GameState = {
    ...state,
    stats: { ...state.stats, money: state.stats.money - course.price },
  }

  // ② 활동 1턴. ⚠️ `runActivity`는 id가 아니라 **활동 객체**를 받는다.
  const activity = findActivity(course.activityId)
  if (!activity) return state
  const after = runActivity(paid, activity)

  // ③ 수강 기록. 게임이 끝났어도(파산) 들은 것은 들은 것이다.
  const count = sessionsOf(after, course.id) + 1
  const withCount: GameState = {
    ...after,
    courses: { ...(after.courses ?? {}), [course.id]: count },
  }

  // ④ 수료증 발급.
  return grantCertificate(withCount, course, count)
}

/**
 * 수료 횟수를 채웠으면 수료증을 인벤토리에 넣는다.
 *
 * ⚠️ **배송을 거치지 않는 유일한 아이템 획득 경로다.** 수료증은 주문한 물건이 아니라
 * 그 자리에서 받는 종이라 하루를 기다리게 하면 "다 들었는데 아무 일도 없는" 밤이 생긴다.
 * 이미 갖고 있으면 아무것도 하지 않는다(같은 강의를 4번째 들어도 두 장이 되지 않는다).
 */
function grantCertificate(state: GameState, course: Course, count: number): GameState {
  const itemId = course.certificateItemId
  if (!itemId || count < CERTIFICATE_SESSIONS) return state
  if (owns(state, itemId)) return state
  if (!findItem(itemId)) return state // 데이터가 어긋나면 조용히 넘어간다(테스트가 잡는다).
  return {
    ...state,
    inventory: [...(state.inventory ?? []), { id: itemId, day: state.day }],
  }
}

/**
 * 방금 수강으로 수료증이 새로 나왔는가. 화면이 "수료증을 받았습니다"를 띄울지 판단한다.
 * **상태를 비교해서 알아낸다** — 발급 자체는 `takeCourse` 안에서 끝나 있다.
 */
export function newCertificate(before: GameState, after: GameState, course: Course): string | null {
  const itemId = course.certificateItemId
  if (!itemId) return null
  if (owns(before, itemId) || !owns(after, itemId)) return null
  return findItem(itemId)?.name ?? null
}

export { CERTIFICATE_SESSIONS, findCourse }
