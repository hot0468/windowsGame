import { findExpo, isOpen } from '../data/expos'
import { findActivity } from '../data/activities'
import { MIN_BOOK_PAGES } from '../data/contests'
import { sellableProjects } from './projects'
import { canRun, clampStats, runActivity } from './turn'
import type { Expo } from '../data/expos'
import { STAT_NAMES } from '../types/game'
import type { GameState, Stats } from '../types/game'

/**
 * 행사 — 참관과 참여.
 *
 * ## 두 갈래가 무엇이 다른가(설계자 지시: "참여 신청하거나 참관 신청")
 * - **참관**: 보러 간다. 1턴 + 입장료. 무엇을 보느냐에 따라 오르는 스탯이 갈린다
 *   (`Expo.visitActivityId` — 문화 행사냐 산업 행사냐).
 * - **참여**: 부스에 선다. 1턴 + 참가비. 얻는 것은 돈이 아니라 **평판·친화력**이다.
 *
 * ## ⚠️ 참여가 없는 행사가 있는 것이 정상이다
 * `Expo.join`이 없으면 참관만 받는다 — 만들어 낼 것이 없는 행사에 참여 버튼을 그리면
 * 동작 안 하는 컨트롤이 된다.
 *
 * ## ⚠️ 코미콘 참여는 여기서 처리하지 않는다
 * 고를 것("어느 회지를 파는가")이 있어서 **코미콘 사이트로 보낸다**(`ExpoJoin.siteId`).
 * 판매 통로를 여기 또 만들면 "한 권은 한 번만 쓴다"가 두 곳에서 갈린다 — 화면이
 * `windowStore.openSite`로 넘기고 실제 판매는 `systems/projects.ts` 하나가 한다.
 *
 * ## ⚠️ 개최 기간은 `canRun`이 모르는 잠금이다
 * 활동 자체는 언제든 실행할 수 있고(스케줄러가 예약할 수도 있다), "오늘 열려 있는가"는
 * **행사가 가진 사실**이다. 그래서 판정은 여기 있고 화면은 `ActivityConfirm`의 `blocked`
 * 프롭으로 넘긴다 — 확인창이 이미 갖고 있는 통로다(강의의 "이미 수료함"과 같은 자리).
 *
 * ## 의존 방향
 * `expos.ts` → `turn.ts`·`projects.ts` (반대는 없다).
 */

/**
 * 참관·참여를 막는 사유. **판정과 사유를 나란히 둔다** — 화면이 두 번째 판정을
 * 만들지 않는다(`takeBlockers`·`entryBlockers`와 같은 규칙).
 */
export function visitBlockers(state: GameState, expo: Expo): string[] {
  const out: string[] = []
  if (!isOpen(expo, state.day)) out.push('오늘은 열리지 않는 행사입니다')
  if (expo.fee > 0 && state.stats.money <= expo.fee) {
    out.push(`입장료 ${expo.fee.toLocaleString('ko-KR')}원이 부족합니다`)
  }
  return out
}

export function joinBlockers(state: GameState, expo: Expo): string[] {
  const join = expo.join
  if (!join) return ['참관만 받는 행사입니다']
  const out: string[] = []
  if (!isOpen(expo, state.day)) out.push('오늘은 열리지 않는 행사입니다')
  const fee = join.fee ?? 0
  if (fee > 0 && state.stats.money <= fee) {
    out.push(`참가비 ${fee.toLocaleString('ko-KR')}원이 부족합니다`)
  }
  /* 코미콘은 팔 회지가 있어야 부스가 뜻을 갖는다 — 없으면 하루를 버린다. */
  if (join.siteId === 'comicon' && sellableProjects(state).length === 0) {
    out.push(`${MIN_BOOK_PAGES}장 이상인 작품집이 있어야 합니다`)
  }
  return out
}

export function canVisit(state: GameState, expo: Expo): boolean {
  return visitBlockers(state, expo).length === 0
}

export function canJoin(state: GameState, expo: Expo): boolean {
  return joinBlockers(state, expo).length === 0
}

/**
 * 행사를 보러 간다. **1턴 + 입장료.**
 *
 * ⚠️ **`takeCourse`와 같은 모양이다**: 조건을 다 보고 하나라도 안 되면 상태를 **그대로**
 * 돌려준다(반쪽 상태 금지 — 돈만 나가고 턴은 안 간, 또는 그 반대).
 * ⚠️ **입장료는 활동을 실행하기 전에 뺀다.** 실행 뒤에 빼면 그 슬롯이 밤이었을 때
 * 취침 정산(생활비)이 먼저 지나가 파산 판정이 한 프레임 어긋난다.
 */
export function visitExpo(state: GameState, expoId: string): GameState {
  if (state.recovery) return state
  const expo = findExpo(expoId)
  if (!expo || !canVisit(state, expo)) return state
  const activity = findActivity(expo.visitActivityId)
  if (!activity || !canRun(state, activity)) return state

  const paid: GameState = {
    ...state,
    stats: clampStats({ ...state.stats, money: state.stats.money - expo.fee }),
  }
  const next = runActivity(paid, activity)
  return next === paid ? state : next
}

/**
 * **수상에 모자란 것.** 빈 배열이면 상을 받는다. 상이 없는 참여는 늘 빈 배열이다.
 *
 * ⚠️ **판정의 단일 출처다** — 화면은 이 목록을 글자로 옮기기만 한다(두 번째 판정 금지).
 * ⚠️ **무작위가 없다**(공모전과 같은 규칙): 못 받았으면 무엇이 모자랐는지 말해야 하고,
 * 주사위가 섞이면 그 설명이 거짓이 된다.
 */
export function awardShortfalls(state: GameState, expo: Expo): string[] {
  const award = expo.join?.award
  if (!award) return []
  return Object.entries(award.requires)
    .filter(([key, min]) => state.stats[key as keyof Stats] < (min ?? 0))
    .map(([key, min]) => `${STAT_NAMES[key as keyof typeof STAT_NAMES]} ${min}`)
}

/** 지금 참여하면 상을 받는가. 화면이 **누르기 전에** 이 값을 적는다. */
export function willAward(state: GameState, expo: Expo): boolean {
  return !!expo.join?.award && awardShortfalls(state, expo).length === 0
}

/**
 * 부스를 열어 참여한다. **1턴 + 참가비.**
 *
 * ⚠️ **`siteId`로 가는 참여는 여기 오지 않는다**(코미콘) — 그 경우 화면이 사이트를 열고
 * 실제 실행은 그쪽 규칙이 한다. 여기서 처리하면 판매 통로가 둘이 된다.
 */
export function joinExpo(state: GameState, expoId: string): GameState {
  if (state.recovery) return state
  const expo = findExpo(expoId)
  if (!expo?.join?.activityId || !canJoin(state, expo)) return state
  const activity = findActivity(expo.join.activityId)
  if (!activity || !canRun(state, activity)) return state

  const fee = expo.join.fee ?? 0
  /* ⚠️ **수상 판정은 참가비를 내기 전, 활동을 실행하기 전 상태로 한다.** 실행 뒤 상태로
     재면 활동이 올려 준 운동(+3)이 판정에 섞여 "확인창에서는 미달이라 했는데 받았다"가
     된다 — 화면이 미리 적은 문장과 결과가 갈리지 않아야 한다. */
  const won = willAward(state, expo)
  const paid: GameState = {
    ...state,
    stats: clampStats({ ...state.stats, money: state.stats.money - fee }),
  }
  const next = runActivity(paid, activity)
  if (next === paid) return state
  if (!won) return next
  /* 상은 평판만 준다(돈 없음 — `ExpoJoin.award` 주석). 상한 100은 `clampStats`가 잡는다. */
  return {
    ...next,
    stats: clampStats({
      ...next.stats,
      reputation: next.stats.reputation + expo.join.award!.reputation,
    }),
  }
}

export { EXPOS, findExpo, isOpen, daysUntilOpen, openDayOf, openExpos } from '../data/expos'
