import { describe, expect, it } from 'vitest'
import { MINUTES_PER_SESSION, STEAM_GAMES, findSteamGame, playtimeLabel } from '../data/steam'
import { findActivity } from '../data/activities'
import { STEAM_ACTIVITY_ID, mostPlayed, playGame, sessionsOf, totalSessions } from './steam'
import { createInitialState } from './turn'
import type { GameState, Stats } from '../types/game'

/**
 * ⚠️ 상태를 손으로 짓지 않고 `createInitialState`를 쓴다(다른 시스템 테스트와 같은 이유 —
 * 필드를 빠뜨리면 이 파일에서만 통하는 가짜 상태가 된다).
 */
function state(over: Omit<Partial<GameState>, 'stats'> & { stats?: Partial<Stats> } = {}): GameState {
  const s = createInitialState('테스터')
  return { ...s, ...over, stats: { ...s.stats, ...(over.stats ?? {}) } }
}

describe('증기 라이브러리 데이터', () => {
  it('id가 겹치지 않는다', () => {
    expect(new Set(STEAM_GAMES.map((g) => g.id)).size).toBe(STEAM_GAMES.length)
  })

  it('⚠️ 게임은 수치를 갖지 않는다 — 실행하는 활동은 `game` 하나다', () => {
    // 게임마다 효과를 주면 "멘탈 회복처는 넷"이라는 불변식이 라이브러리 크기만큼 갈라진다.
    for (const g of STEAM_GAMES) {
      expect(Object.keys(g)).toEqual(
        expect.arrayContaining(['id', 'title', 'icon', 'cover', 'genre', 'tags', 'blurb']),
      )
      expect('effects' in g).toBe(false)
      expect('activityId' in g).toBe(false)
    }
    expect(findActivity(STEAM_ACTIVITY_ID)).toBeTruthy()
  })
})

describe('플레이 시간 표기', () => {
  it('켠 적 없으면 시간이 아니라 사실을 적는다', () => {
    expect(playtimeLabel(0)).toBe('플레이한 적 없음')
  })

  it('횟수에서 파생된다 — 저장된 분(minute)이 따로 없다', () => {
    expect(playtimeLabel(1)).toBe(`${(MINUTES_PER_SESSION / 60).toFixed(1)}시간`)
    expect(playtimeLabel(2)).toBe(`${((MINUTES_PER_SESSION * 2) / 60).toFixed(1)}시간`)
  })
})

describe('게임 켜기', () => {
  const game = STEAM_GAMES[0]

  it('1턴을 쓰고 플레이 횟수가 오른다', () => {
    const before = state()
    const after = playGame(before, game)
    expect(after.minute + after.day * 1440).toBeGreaterThan(before.minute + before.day * 1440) // 오전 → 오후
    expect(sessionsOf(after, game.id)).toBe(1)
    // 활동 `game`의 효과가 실제로 붙는다(수치는 활동 하나가 갖는다).
    expect(after.stats.gaming).toBeGreaterThan(before.stats.gaming)
  })

  it('여러 번 켜면 그 게임에만 쌓인다', () => {
    const twice = playGame(playGame(state(), game), game)
    expect(sessionsOf(twice, game.id)).toBe(2)
    expect(sessionsOf(twice, STEAM_GAMES[1].id)).toBe(0)
    expect(totalSessions(twice)).toBe(2)
    expect(mostPlayed(twice)).toBe(game.id)
  })

  it('⚠️ 조건을 못 넘기면 상태를 그대로 돌려준다 — 턴은 안 갔는데 기록만 늘면 안 된다', () => {
    // 행동력 0이면 `canRun`이 막는다. 반쪽 상태(기록만 증가)를 만들지 않는 것이 핵심이다.
    const broke = state({ stats: { stamina: 0 } })
    const after = playGame(broke, game)
    expect(after).toBe(broke)
    expect(sessionsOf(after, game.id)).toBe(0)
  })

  it('켠 적 없는 판은 steam 필드를 만들지 않는다 (구세이브와 같은 모양)', () => {
    expect(state().steam).toBeUndefined()
    expect(totalSessions(state())).toBe(0)
    expect(mostPlayed(state())).toBeUndefined()
    expect(findSteamGame('없는-게임')).toBeUndefined()
  })
})
