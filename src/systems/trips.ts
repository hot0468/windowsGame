import { findActivity } from '../data/activities'
import { TRIPS, findTrip } from '../data/trips'
import { canRun, runActivity } from './turn'
import type { Trip } from '../data/trips'
import type { GameState, Souvenir } from '../types/game'

/**
 * 먼바다투어의 규칙 — **어디를 다녀왔는가.**
 *
 * ## 왜 규칙 파일이 이제야 생겼나
 * 여행은 오래 활동 둘(`travel`·`travel-near`)과 상품 목록만으로 돌아갔다. 상품이
 * 수치를 안 갖고 활동을 가리키기만 하니 규칙이 필요 없었기 때문이다 — **다녀온 곳을
 * 남기기 시작하면서** 활동이 모르는 사실이 하나 생겼고, 그것이 이 파일의 존재 이유다
 * (`systems/cinema.ts`의 포스트카드와 완전히 같은 자리·같은 이유).
 *
 * ## ⚠️ 기념품은 인벤토리에 안 들어간다
 * 도감 '여행' 시트에만 남는 기록이라 **팔 수 없다**. 포스트카드는 팔 수 있는데
 * (`sellPostcard`) 여기는 안 되는 것이 규칙이다 — 관람료는 15,000원이라 되팔이가
 * 밸런스를 못 흔들지만 여행은 **25만 원**이고, 기념품이 팔리면 이 게임에서 가장 비싼
 * 멘탈 회복처의 값이 부분 환불된다. **값이 다르면 규칙도 다르다.**
 */

export function souvenirsOf(state: GameState): Souvenir[] {
  return state.souvenirs ?? []
}

export function hasSouvenir(state: GameState, tripId: string): boolean {
  return souvenirsOf(state).some((s) => s.tripId === tripId)
}

/** 그 곳에 다녀온 날. 안 갔으면 `undefined` — 도감이 '미방문'을 적는 근거다. */
export function visitedDay(state: GameState, tripId: string): number | undefined {
  return souvenirsOf(state).find((s) => s.tripId === tripId)?.day
}

/**
 * 여행을 간다 — **활동(`travel`/`travel-near`) 실행 + 그 곳의 기념품**.
 *
 * ⚠️ **`doActivity`가 아니라 이 함수를 타는 이유**: 어느 상품을 골랐는지는 활동이 모르는
 * 사실이라 활동만 실행하면 사라진다(`watchFilm`과 정확히 같은 자리). 수치·턴은 여전히
 * 활동 하나가 갖는다 — 상품에 값을 적으면 밸런스 테스트가 못 보는 두 번째 출처가 생긴다.
 *
 * ⚠️ **날짜는 턴이 넘어가기 전 것을 박는다** — `runActivity`는 오후에 실행하면 날을
 * 넘기므로, 뒤의 상태에서 읽으면 **다음 날 다녀온 것으로 기록된다**(포스트카드와 같은 함정).
 *
 * ⚠️ **조건이 안 되면 아무것도 하지 않는다**(반쪽 상태 금지 — 기념품만 받고 여행은 못 간
 * 판을 만들지 않는다). 스케줄러·바로 가기로 지나간 `travel`에는 기념품이 없다 —
 * 그 통로에는 고른 상품이 없기 때문이다.
 *
 * ⚠️ **같은 곳은 한 번만 남는다.** 두 번 가면 여행 자체는 다시 되지만(멘탈은 또 찬다)
 * 기념품은 늘지 않는다 — 늘면 도감이 모으는 것이 아니라 방문 횟수 표시가 된다.
 */
export function takeTrip(state: GameState, trip: Trip): GameState {
  const activity = findActivity(trip.activityId)
  if (!activity || !canRun(state, activity)) return state

  const after = runActivity(state, activity)
  if (after === state) return state
  if (hasSouvenir(after, trip.id)) return after

  return { ...after, souvenirs: [...souvenirsOf(after), { tripId: trip.id, day: state.day }] }
}

/**
 * 세이브 보정. 없는 상품을 가리키는 기록은 버린다 — 상품을 지운 뒤에도 남아 있으면
 * 도감의 "몇 곳 중 몇 곳"이 흔들린다(`reviveRankEvents`와 같은 규칙).
 * ⚠️ **같은 곳이 둘이면 하나로 줄인다**(먼저 온 것을 남긴다 — 처음 간 날이 사실이다).
 */
export function reviveSouvenirs(raw: unknown): Souvenir[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const seen = new Set<string>()
  const list = raw.filter((v): v is Souvenir => {
    if (!v || typeof v !== 'object') return false
    const s = v as Partial<Souvenir>
    if (typeof s.tripId !== 'string' || !findTrip(s.tripId)) return false
    if (!Number.isFinite(s.day)) return false
    if (seen.has(s.tripId)) return false
    seen.add(s.tripId)
    return true
  })
  return list.length ? list : undefined
}

export { TRIPS, findTrip }
