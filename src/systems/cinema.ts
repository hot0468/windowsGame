import { findActivity } from '../data/activities'
import { FILMS, SHOWN_PER_SECTION } from '../data/media'
import { canRun, runActivity } from './turn'
import type { Film, FilmSection } from '../data/media'
import type { GameState, Postcard } from '../types/game'

/**
 * 시집이(극장)의 규칙 둘: **이번 주 편성**과 **포스트카드**.
 *
 * 수치는 `data/media.ts`(영화 15편·`SHOWN_PER_SECTION`)에 있고 여기는 규칙만 갖는다
 * (뉴스가 풀은 `data/news.ts`, 고르는 규칙은 `systems/news.ts`에 있는 것과 같은 갈래).
 */

/** 시집이가 실행하는 활동. `Site.activityId`와 같은 값이어야 한다. */
const MOVIE_ACTIVITY_ID = 'movie'

/** 며칠이 한 주인가. 편성이 바뀌는 주기다. */
const WEEK_DAYS = 7

/** 그 날짜의 주차(1~7일차 = 0주차). */
export function weekIndex(day: number): number {
  return Math.floor((day - 1) / WEEK_DAYS)
}

/**
 * 이번 주 편성.
 *
 * ⚠️ **구역마다 풀을 주차만큼 돌려 앞에서부터 자른다** — 5편 중 4편을 걸므로 **매주 정확히
 * 한 편이 내려가고 한 편이 올라온다.** 극장이 그렇게 돌기 때문이고, 목록이 통째로 바뀌면
 * 지난주에 봐 둔 영화를 다시 찾지 못한다.
 *
 * ⚠️ **`Math.random`을 쓰지 않는다**(systems 전역 규칙) — 편성은 **날짜의 순수 함수**다.
 * 저장하면 새로 고칠 때마다 다시 굴러 세이브 스커밍이 열린다(주식 시세와 같은 판단).
 *
 * ⚠️ **개봉 예정작(`soon`)이 상영 중으로 승격되지 않는다** — 그쪽 영화들은 회차
 * (`showtimes`)가 아예 없어서, 승격시키면 **예매할 수 없는 상영작**이 생긴다.
 */
export function filmsForWeek(day: number, section: FilmSection): Film[] {
  const pool = FILMS.filter((f) => f.section === section)
  if (pool.length === 0) return []
  const start = weekIndex(day) % pool.length
  return [...pool.slice(start), ...pool.slice(0, start)].slice(0, SHOWN_PER_SECTION)
}

/** 이번 주 히어로 배너에 걸리는 영화 = **이번 주 개봉 예정작의 첫 편**. */
export function heroFilm(day: number): Film | undefined {
  return filmsForWeek(day, 'soon')[0]
}

export function postcardsOf(state: GameState): Postcard[] {
  return state.postcards ?? []
}

export function hasPostcard(state: GameState, filmId: string): boolean {
  return postcardsOf(state).some((p) => p.filmId === filmId)
}

/**
 * 영화를 본다 — **활동(`movie`) 실행 + 그 영화의 포스트카드**.
 *
 * ⚠️ **`doActivity`가 아니라 이 함수를 타는 이유**: 어떤 영화를 봤는지는 활동이 모르는
 * 사실이라 활동만 실행하면 사라진다(너튜브 방송 주제와 정확히 같은 자리 —
 * `systems/channel.ts`의 `startStream`). 수치·턴은 여전히 `movie` 활동 하나가 갖는다.
 *
 * ⚠️ **날짜는 턴이 넘어가기 전 것을 박는다** — `runActivity`는 오후에 실행하면 날을
 * 넘기므로, 뒤의 상태에서 읽으면 **다음 날 본 것으로 기록된다.**
 *
 * ⚠️ **조건이 안 되면 아무것도 하지 않는다**(반쪽 상태 금지 — 포스트카드만 받고 영화는
 * 못 본 판을 만들지 않는다). 스케줄러·바로 가기로 지나간 `movie`에는 포스트카드가 없다 —
 * 그 통로에는 고른 영화가 없기 때문이다.
 */
export function watchFilm(state: GameState, film: Film): GameState {
  const activity = findActivity(MOVIE_ACTIVITY_ID)
  if (!activity || !canRun(state, activity)) return state

  const after = runActivity(state, activity)
  if (after === state) return state
  if (hasPostcard(after, film.id)) return after

  return { ...after, postcards: [...postcardsOf(after), { filmId: film.id, day: state.day }] }
}
