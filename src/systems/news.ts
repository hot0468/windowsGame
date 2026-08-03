import { NEWS_POOL, NEWS_VISIBLE_COUNT } from '../data/news'
import type { NewsItem } from '../data/news'
import { getNextTier } from './economy'

/**
 * 뉴스 선택에 필요한 게임 상태.
 * GameState 전체를 받지 않는 이유: 뉴스는 읽기 전용 파생물이므로
 * 필요한 필드만 받아 두면 테스트가 스탯 전체를 만들지 않아도 된다.
 */
export interface NewsContext {
  day: number
}

/**
 * 다음 물가 인상 예고.
 * 스탯창도 같은 `getNextTier`를 쓰지만 문장 형태로 다시 전달한다 —
 * 설계 문서 3.4가 정한 대로 뉴스가 게임의 알림 창구이기 때문이다.
 */
export function buildPriceRiseNotice(day: number): NewsItem {
  const next = getNextTier(day)
  const inDays = next.day - day
  return {
    id: `price-rise-${next.day}`,
    kind: 'notice',
    headline: `${inDays}일 뒤 물가 인상 예고... 하루 생활비 ${next.living.toLocaleString('ko-KR')}원으로`,
  }
}

/**
 * 오늘 뉴스 영역에 띄울 항목.
 *
 * 맨 위는 항상 게임 상태에서 파생된 물가 인상 예고이고, 나머지는 풀을 날짜로 회전시킨다.
 * `Math.random`을 쓰지 않는 이유는 두 가지다:
 *  1) systems는 순수해야 하고 테스트가 결정적이어야 한다
 *  2) 같은 날 창을 닫았다 열면 뉴스가 바뀌는 것은 "탐색은 무료"라는 규칙과 어긋나 보인다
 *     — 무료로 다시 굴릴 수 있는 무작위는 정보가 아니라 소음이다
 */
export function selectNews(ctx: NewsContext): NewsItem[] {
  const notice = buildPriceRiseNotice(ctx.day)
  const poolCount = Math.min(NEWS_VISIBLE_COUNT - 1, NEWS_POOL.length)
  // 날짜를 시작 오프셋으로 삼아 풀을 순환한다. 하루가 지나면 목록이 한 칸 밀린다.
  const offset = ((ctx.day % NEWS_POOL.length) + NEWS_POOL.length) % NEWS_POOL.length
  const rotated: NewsItem[] = []
  for (let i = 0; i < poolCount; i++) {
    rotated.push(NEWS_POOL[(offset + i) % NEWS_POOL.length])
  }
  return [notice, ...rotated]
}
