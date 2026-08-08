import { describe, it, expect } from 'vitest'
import { FILMS, SHOWN_PER_SECTION } from '../data/media'
import { filmsForWeek, hasPostcard, heroFilm, postcardsOf, watchFilm } from './cinema'
import { createInitialState } from './turn'
import type { GameState } from '../types/game'

/** 관람료·행동력이 넉넉한 판. `movie`는 행동력 15 · 15,000원을 요구한다. */
const rich = (over: Partial<GameState> = {}): GameState => {
  const base = createInitialState('관객')
  return { ...base, stats: { ...base.stats, money: 500_000, stamina: 100 }, ...over }
}

const NOW_POOL = FILMS.filter((f) => f.section === 'now')

describe('이번 주 편성', () => {
  it('한 구역에 SHOWN_PER_SECTION편만 걸린다', () => {
    expect(filmsForWeek(1, 'now')).toHaveLength(SHOWN_PER_SECTION)
  })

  it('같은 주 안에서는 목록이 그대로다 — 날마다 바뀌면 예매하러 다시 못 온다', () => {
    const ids = (day: number) => filmsForWeek(day, 'now').map((f) => f.id)
    expect(ids(1)).toEqual(ids(7))
  })

  it('⚠️ 이레마다 정확히 한 편이 갈린다 — 통째로 바뀌면 봐 둔 영화를 못 찾는다', () => {
    const week0 = filmsForWeek(1, 'now').map((f) => f.id)
    const week1 = filmsForWeek(8, 'now').map((f) => f.id)
    expect(week1).not.toEqual(week0)
    expect(week1.filter((id) => week0.includes(id))).toHaveLength(SHOWN_PER_SECTION - 1)
  })

  it('풀을 한 바퀴 돌면 모든 영화가 한 번은 걸린다 — 영영 안 걸리는 영화가 없어야 한다', () => {
    const seen = new Set<string>()
    for (let w = 0; w < NOW_POOL.length; w++) {
      filmsForWeek(w * 7 + 1, 'now').forEach((f) => seen.add(f.id))
    }
    expect(seen.size).toBe(NOW_POOL.length)
  })

  it('히어로는 이번 주 편성 안의 영화다 — 화면에 없는 영화를 배너에 걸지 않는다', () => {
    for (const day of [1, 8, 22, 50]) {
      const ids = filmsForWeek(day, 'soon').map((f) => f.id)
      expect(ids).toContain(heroFilm(day)!.id)
    }
  })
})

describe('포스트카드', () => {
  const film = NOW_POOL[0]

  it('영화를 보면 그 영화의 포스트카드가 남고 턴이 넘어간다', () => {
    const before = rich()
    const after = watchFilm(before, film)

    expect(postcardsOf(after)).toHaveLength(1)
    expect(postcardsOf(after)[0].filmId).toBe(film.id)
    // 날짜는 **턴이 넘어가기 전** 것이어야 한다(오후에 보면 날이 바뀐다).
    expect(postcardsOf(after)[0].day).toBe(before.day)
    expect(after.slot).not.toBe(before.slot)
    expect(after.stats.money).toBeLessThan(before.stats.money)
  })

  it('⚠️ 같은 영화는 한 장뿐이다 — 두 장이 되면 모으는 것이 아니라 관람 횟수가 된다', () => {
    const twice = watchFilm(watchFilm(rich(), film), film)
    expect(postcardsOf(twice)).toHaveLength(1)
  })

  it('다른 영화는 따로 쌓인다', () => {
    /* ⚠️ 한 편 보면 턴이 넘어가 오후가 된다 — 영화는 **조조라 오전 전용**이므로
       (2026-08-08 슬롯 제약) 다시 오전으로 옮겨 두 번째를 본다. */
    const first = watchFilm(rich(), film)
    const two = watchFilm({ ...first, slot: 'morning' }, NOW_POOL[1])
    expect(postcardsOf(two).map((p) => p.filmId)).toEqual([film.id, NOW_POOL[1].id])
    expect(hasPostcard(two, NOW_POOL[1].id)).toBe(true)
  })

  it('⚠️ 조건이 안 되면 아무것도 하지 않는다 — 표값 없이 포스트카드만 받는 판 금지', () => {
    const broke = rich()
    const poor = { ...broke, stats: { ...broke.stats, money: 0 } }
    expect(watchFilm(poor, film)).toBe(poor)
    expect(postcardsOf(watchFilm(poor, film))).toHaveLength(0)
  })
})
