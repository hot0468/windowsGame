import { findActivity } from '../data/activities'
import { canRun, runActivity } from './turn'
import type { SteamGame } from '../data/steam'
import type { GameState } from '../types/game'

/**
 * 증기(가짜 스팀) — 게임을 켜서 시간을 보낸다.
 *
 * ⚠️ **실행하는 활동은 `game` 하나다.** 라이브러리의 게임은 무엇을 하며 시간을 보내는가만
 * 정하고 수치는 갖지 않는다(미디북스·시집이와 같은 규칙) — 게임마다 효과를 다르게 주면
 * "멘탈 회복처는 넷"이라는 불변식이 라이브러리 크기만큼 갈라진다.
 *
 * ⚠️ **턴을 넘기는 것은 `runActivity` 하나다**(`takeCourse`와 같은 규칙). 여기서 날짜를
 * 직접 만지면 예약·택배·고용 정산이 통째로 빠진다.
 */

/** 증기가 실행하는 활동. 컴포넌트가 id를 적지 않도록 여기서 한 번만 적는다. */
export const STEAM_ACTIVITY_ID = 'game'

export function steamActivity() {
  return findActivity(STEAM_ACTIVITY_ID)
}

/** 그 게임을 몇 번 켰는가. 기록이 없으면 0이다(`sessionsOf`와 같은 모양). */
export function sessionsOf(state: GameState, gameId: string): number {
  return state.steam?.[gameId] ?? 0
}

/** 라이브러리 전체 플레이 횟수. 상태 표시줄이 쓴다. */
export function totalSessions(state: GameState): number {
  return Object.values(state.steam ?? {}).reduce((sum, n) => sum + n, 0)
}

/** 가장 최근에 켠 게임이 아니라 **가장 많이 켠 게임**. 정렬에만 쓴다. */
export function mostPlayed(state: GameState): string | undefined {
  const entries = Object.entries(state.steam ?? {})
  if (!entries.length) return undefined
  return entries.reduce((best, e) => (e[1] > best[1] ? e : best))[0]
}

/**
 * 게임을 켠다. 1턴을 쓰고 그 게임의 플레이 횟수를 올린다.
 *
 * ⚠️ 조건(`canRun`)을 못 넘기면 **상태를 그대로 돌려준다** — 반쪽 상태(턴은 안 갔는데
 * 플레이 기록만 늘어남)를 만들지 않는다(`takeCourse`와 같은 규칙).
 */
export function playGame(state: GameState, game: SteamGame): GameState {
  const activity = steamActivity()
  if (!activity || !canRun(state, activity)) return state

  const after = runActivity(state, activity)
  return {
    ...after,
    steam: { ...(after.steam ?? {}), [game.id]: sessionsOf(after, game.id) + 1 },
  }
}
