import { NEWS_POOL, NEWS_VISIBLE_COUNT } from '../data/news'
import type { NewsCategory, NewsItem } from '../data/news'
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
    source: '네이놈 속보',
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

/** 뉴스 카드 한 페이지에 세우는 기사 수(레퍼런스의 왼쪽 2건). */
export const NEWS_PAGE_SIZE = 2

export interface NewsPageContext extends NewsContext {
  /** null이면 '전체' 탭 — 분야로 거르지 않고 물가 예고를 맨 앞에 고정한다. */
  category: NewsCategory | null
  /** 0부터. 범위를 넘으면 순환한다(마지막에서 다음을 눌러도 막히지 않게). */
  page: number
}

export interface NewsPage {
  /** 왼쪽 큰 기사 칸. */
  lead: NewsItem[]
  /** 오른쪽 헤드라인 목록(제목만). */
  rest: NewsItem[]
  pageCount: number
  /** 순환 보정된 실제 페이지 번호(0부터). */
  page: number
}

/**
 * 탭·페이지가 적용된 뉴스 한 판.
 *
 * 컴포넌트가 배열을 자르지 않게 여기서 다 계산한다 — 페이지 순환과 빈 목록 처리는
 * off-by-one이 나기 쉬운 자리라 순수 함수로 두고 테스트한다.
 *
 * 날짜 오프셋은 그대로 살린다: 같은 탭·같은 페이지라도 날이 바뀌면 목록이 한 칸 밀려
 * "세상이 흐른다"는 인상이 유지된다.
 */
export function selectNewsPage(ctx: NewsPageContext): NewsPage {
  const pool = ctx.category
    ? NEWS_POOL.filter((n) => n.category === ctx.category)
    : [buildPriceRiseNotice(ctx.day), ...NEWS_POOL]

  if (!pool.length) return { lead: [], rest: [], pageCount: 1, page: 0 }

  // 날짜만큼 회전시킨 뒤 페이지를 자른다.
  // '전체' 탭에서는 맨 앞의 물가 예고를 회전에서 빼내 항상 첫 자리에 고정한다 —
  // 게임의 알림이 페이지를 넘길 때마다 어디론가 사라지면 안 된다.
  const pinned = ctx.category ? null : pool[0]
  const rotatable = pinned ? pool.slice(1) : pool
  const offset =
    rotatable.length > 0 ? ((ctx.day % rotatable.length) + rotatable.length) % rotatable.length : 0
  const rotated = rotatable.map((_, i) => rotatable[(offset + i) % rotatable.length])
  const ordered = pinned ? [pinned, ...rotated] : rotated

  const pageCount = Math.max(1, Math.ceil(ordered.length / NEWS_PAGE_SIZE))
  const page = ((ctx.page % pageCount) + pageCount) % pageCount
  const start = page * NEWS_PAGE_SIZE

  return {
    lead: ordered.slice(start, start + NEWS_PAGE_SIZE),
    // 오른쪽 목록은 이 페이지에 안 실린 나머지에서 앞쪽 몇 건만 보여 준다.
    rest: ordered.filter((_, i) => i < start || i >= start + NEWS_PAGE_SIZE).slice(0, 4),
    pageCount,
    page,
  }
}
