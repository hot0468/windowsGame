import { ACHIEVEMENTS } from '../data/achievements'
import { CAREERS } from '../data/careers'
import { careerLevel } from './careerLog'
import { postcardsOf } from './cinema'
import { sellableItems } from './resale'
import { souvenirsOf } from './trips'
import { findTrip } from '../data/trips'
import type { Achievement, AchievementMetric } from '../data/achievements'
import type { GameState } from '../types/game'

/**
 * 업적 판정 — **전부 지금 상태에서 다시 센다**(저장하지 않는다).
 *
 * ⚠️ **세는 코드는 `metricValue` 하나다.** 업적마다 판정을 적으면 같은 것을 세는 코드가
 * 업적 수만큼 갈라지고, 세는 기준이 바뀔 때(예: 팔면 줄어든다) 한 곳만 고치게 된다.
 *
 * ⚠️ **엔딩만 인자를 하나 더 받는다** — 판을 넘어 남는 해금 기록(`metaStore`)이
 * `GameState` 밖에 있기 때문이다(도감의 엔딩 시트와 **같은 합집합**을 써야 두 시트가
 * 서로 다른 수를 말하지 않는다).
 */

/** 업적 한 줄의 진행 상황. 화면은 이 모양만 읽는다. */
export interface AchievementProgress {
  achievement: Achievement
  /** 지금 수. `goal`을 넘어도 자르지 않는다(화면이 `n/goal`로 잘라 적는다). */
  value: number
  done: boolean
}

function metricValue(state: GameState, seenEndings: Set<string>, metric: AchievementMetric): number {
  switch (metric) {
    case 'postcards':
      return postcardsOf(state).length
    case 'endings':
      return seenEndings.size
    case 'careers':
      // 없는 회사 id(구세이브)는 세지 않는다 — 전종 수집이 조용히 참이 되면 안 된다.
      return CAREERS.filter((c) => state.careerLog?.[c.id] !== undefined).length
    case 'careerLevel':
      return Math.max(0, ...CAREERS.map((c) => careerLevel(state, c.id) ?? 0))
    case 'artworks':
      return (state.artworks ?? []).length
    case 'streams':
      return state.channel?.streams ?? 0
    case 'items':
      // ⚠️ 인벤토리 전체가 아니라 **팔 수 있는 물건**만이다 — 수료증까지 세면
      //    "쇼핑에서 파는 물건 열 개"라는 문구가 거짓이 된다.
      return sellableItems(state).length
    case 'souvenirs':
      return souvenirsOf(state).length
    case 'souvenirsFar':
      /* ⚠️ 지역은 기록이 아니라 **상품이 갖는다** — `Souvenir`에 지역을 복사해 두면
         상품을 옮길 때 옛 기록만 낡는다(포스트카드가 영화를 id로 가리키는 것과 같은 규칙). */
      return souvenirsOf(state).filter((s) => findTrip(s.tripId)?.region === '장거리').length
  }
}

/** 업적 전부의 진행 상황. 목록 순서는 `ACHIEVEMENTS`가 정한다. */
export function achievementProgress(
  state: GameState,
  seenEndings: Set<string>,
): AchievementProgress[] {
  return ACHIEVEMENTS.map((achievement) => {
    const value = metricValue(state, seenEndings, achievement.metric)
    return { achievement, value, done: value >= achievement.goal }
  })
}
