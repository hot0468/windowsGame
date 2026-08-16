import { describe, expect, it } from 'vitest'
import { ACHIEVEMENTS } from '../data/achievements'
import { CAREERS } from '../data/careers'
import { ENDINGS } from '../data/endings'
import { FILMS } from '../data/media'
import { TRIPS } from '../data/trips'
import { achievementProgress } from './achievements'
import { markHired } from './careerLog'
import { sellPostcard } from './resale'
import { createInitialState } from './turn'
import type { GameState, Stats } from '../types/game'

function state(over: Omit<Partial<GameState>, 'stats'> & { stats?: Partial<Stats> } = {}): GameState {
  const s = createInitialState('테스터')
  return { ...s, ...over, stats: { ...s.stats, ...(over.stats ?? {}) } }
}

function find(state: GameState, id: string, seen = new Set<string>()) {
  return achievementProgress(state, seen).find((p) => p.achievement.id === id)!
}

describe('업적 데이터', () => {
  it('id가 겹치지 않는다', () => {
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length)
  })

  it('⚠️ 목표 수를 손으로 적지 않는다 — 원본이 늘면 함께 늘어난다', () => {
    expect(find(state(), 'postcard-all').achievement.goal).toBe(FILMS.length)
    expect(find(state(), 'career-all').achievement.goal).toBe(CAREERS.length)
    expect(find(state(), 'ending-all').achievement.goal).toBe(ENDINGS.length)
    expect(find(state(), 'trip-all').achievement.goal).toBe(TRIPS.length)
    expect(find(state(), 'trip-far').achievement.goal).toBe(
      TRIPS.filter((t) => t.region === '장거리').length,
    )
  })

  it('목표가 0인 업적은 없다 — 시작하자마자 달성되면 목표가 아니다', () => {
    for (const a of ACHIEVEMENTS) expect(a.goal).toBeGreaterThan(0)
  })
})

describe('진행 판정', () => {
  it('새 판에서는 하나도 달성되지 않는다', () => {
    for (const p of achievementProgress(state(), new Set())) expect(p.done).toBe(false)
  })

  it('포스트카드 전종을 모으면 달성된다', () => {
    const all = state({ postcards: FILMS.map((f) => ({ filmId: f.id, day: 1 })) })
    expect(find(all, 'postcard-all').done).toBe(true)
  })

  it('⚠️ 중고마켓에 팔면 다시 미달성이 된다 — 도감은 저장이 아니라 지금의 거울이다', () => {
    const all = state({ postcards: FILMS.map((f) => ({ filmId: f.id, day: 1 })) })
    const sold = sellPostcard(all, FILMS[0].id)
    expect(find(sold, 'postcard-all').done).toBe(false)
    expect(find(sold, 'postcard-all').value).toBe(FILMS.length - 1)
  })

  it('직업은 다녀 본 회사 수를 센다', () => {
    let log: GameState['careerLog']
    for (const c of CAREERS) log = markHired(log, c.id)
    expect(find(state({ careerLog: log }), 'career-all').done).toBe(true)
  })

  it('⚠️ 없는 회사 id는 안 센다 — 구세이브가 전종 수집을 조용히 참으로 만들지 않는다', () => {
    const bogus = state({ careerLog: { 'gone-1': 9, 'gone-2': 9, 'gone-3': 9 } })
    expect(find(bogus, 'career-all').value).toBe(0)
  })

  it('엔딩은 도감 시트와 같은 합집합을 센다', () => {
    const seen = new Set(ENDINGS.map((e) => e.id))
    const p = achievementProgress(state(), seen).find((x) => x.achievement.id === 'ending-all')!
    expect(p.done).toBe(true)
  })

  it('진행 수는 목표를 넘어도 자르지 않는다(화면이 자른다)', () => {
    const many = state({ channel: { name: '테스터', streams: 99 } })
    expect(find(many, 'streamer').value).toBe(99)
    expect(find(many, 'streamer').done).toBe(true)
  })
})

describe('여행 업적', () => {
  const visited = (ids: string[]) => state({ souvenirs: ids.map((id) => ({ tripId: id, day: 5 })) })
  const far = TRIPS.filter((t) => t.region === '장거리')
  const near = TRIPS.filter((t) => t.region !== '장거리')

  it('세 곳을 다녀오면 첫 단계가 달성된다', () => {
    expect(find(visited(TRIPS.slice(0, 2).map((t) => t.id)), 'trip-start').done).toBe(false)
    expect(find(visited(TRIPS.slice(0, 3).map((t) => t.id)), 'trip-start').done).toBe(true)
  })

  it('전종을 다녀오면 달성된다', () => {
    expect(find(visited(TRIPS.map((t) => t.id)), 'trip-all').done).toBe(true)
  })

  /**
   * ⚠️ **개수가 아니라 종류를 센다.** 값싼 국내만 잔뜩 도는 것과 25만 원짜리를 네 번 가는
   * 것은 다른 일이라, 근거리·국내를 다 돌아도 이 업적은 열리면 안 된다.
   */
  it('장거리 업적은 근거리·국내를 아무리 돌아도 안 열린다', () => {
    const all = visited(near.map((t) => t.id))
    expect(find(all, 'trip-far').value).toBe(0)
    expect(find(all, 'trip-far').done).toBe(false)
  })

  it('장거리를 모두 다녀오면 달성된다', () => {
    expect(find(visited(far.map((t) => t.id)), 'trip-far').done).toBe(true)
  })

  /** ⚠️ 지역은 기록이 아니라 상품이 갖는다 — 없는 상품을 가리키는 기록은 안 세야 한다. */
  it('없는 상품을 가리키는 기록은 장거리로 안 센다', () => {
    expect(find(visited(['없는곳']), 'trip-far').value).toBe(0)
  })
})
