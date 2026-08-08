import {
  AFFECTION_CAP,
  AFFECTION_FOR_ENDING,
  AFFECTION_PER_MEET,
  PEOPLE,
  personOfActivity,
} from '../data/relations'
import type { Person } from '../data/relations'
import type { GameState } from '../types/game'

/**
 * 호감도 규칙.
 *
 * ## 의존 방향
 * ⚠️ `turn.ts`를 부르지 **않는다**(`weather.ts`·`illness.ts`와 같다). 만남의 비용(턴·돈)은
 * 전부 활동이 갖고 여기서 하는 일은 숫자 하나를 올리는 것뿐이다 — 그래서 밸런스
 * 시뮬레이션이 관계를 몰라도 그대로 성립한다.
 *
 * ## ⚠️ 스탯이 아니다
 * `Stats`에 넣지 않은 이유: 성장 스탯은 **하나의 값**이고 호감도는 **사람마다 다른 값**이다.
 * `Stats`에 `affectionMinji`처럼 넣기 시작하면 `STAT_NAMES`·`STAT_META`·`growthCap`·랭크가
 * 인물 수만큼 늘어나고, 스탯창이 관계 명단이 된다.
 */

/** 그 사람의 호감도. 만난 적 없으면 0. */
export function affectionOf(state: GameState, personId: string): number {
  return state.affection?.[personId] ?? 0
}

/**
 * 그 활동을 실행한 결과로 호감도를 올린다. **관계와 무관한 활동이면 상태를 그대로 돌려준다.**
 *
 * ⚠️ **통로를 가리지 않는다** — 대화방 [만나러 가기]든 스케줄러 예약이든 같다
 * (`Person.activityId` 주석). 대화방에만 걸면 예약으로 나간 모임이 관계를 안 만든다.
 * ⚠️ 상한에서 멈추되 **상태 객체를 새로 만들지 않는다**(이미 100이면 같은 객체를 돌려준다) —
 * 그래야 호출부가 `!==`로 "실제로 올랐는가"를 물을 수 있다.
 */
export function creditAffection(state: GameState, activityId: string): GameState {
  const person = personOfActivity(activityId)
  if (!person) return state
  const now = affectionOf(state, person.id)
  const next = Math.min(AFFECTION_CAP, now + AFFECTION_PER_MEET)
  if (next === now) return state
  return { ...state, affection: { ...(state.affection ?? {}), [person.id]: next } }
}

/** 부가엔딩이 붙을 만큼 가까운가. */
export function hasRelationEnding(state: GameState, personId: string): boolean {
  return affectionOf(state, personId) >= AFFECTION_FOR_ENDING
}

/**
 * 본엔딩에 얹을 **부가엔딩 하나**. 아무도 문턱을 못 넘었으면 없다.
 *
 * ⚠️ **가장 높은 한 사람만이다**(`data/relations.ts`의 규칙). 동점이면 `PEOPLE` 순서가
 * 가른다 — 무작위로 고르면 같은 세이브가 새로 고칠 때마다 다른 사람을 말한다.
 */
export function relationEndingFor(state: GameState): Person | undefined {
  return PEOPLE.filter((p) => hasRelationEnding(state, p.id)).sort(
    (a, b) => affectionOf(state, b.id) - affectionOf(state, a.id),
  )[0]
}

/**
 * 세이브 보정. **못 믿을 값은 그 사람만 버린다**(전체를 버리지 않는다 — 호감도는 돈을
 * 만들지 않으므로 한 칸이 깨졌다고 관계 전부를 지울 이유가 없다).
 * ⚠️ 모르는 인물 id는 버린다: 사람을 지우거나 이름을 바꾼 뒤에도 세이브에 남아 도감의
 * 개수를 흔들면 "몇 명 중 몇 명"이 거짓이 된다.
 */
export function reviveAffection(raw: unknown): GameState['affection'] | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const out: Record<string, number> = {}
  for (const person of PEOPLE) {
    const value = (raw as Record<string, unknown>)[person.id]
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) continue
    out[person.id] = Math.min(AFFECTION_CAP, Math.round(value))
  }
  return Object.keys(out).length ? out : undefined
}
