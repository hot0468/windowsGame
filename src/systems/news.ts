import { NEWS_POOL, NEWS_VISIBLE_COUNT } from '../data/news'
import type { NewsCategory, NewsItem } from '../data/news'
import { activeShock, shockIncoming } from './economy'
import { isSeasonStart, seasonOf } from './season'

/**
 * 뉴스 선택에 필요한 게임 상태.
 * GameState 전체를 받지 않는 이유: 뉴스는 읽기 전용 파생물이므로
 * 필요한 필드만 받아 두면 테스트가 스탯 전체를 만들지 않아도 된다.
 */
export interface NewsContext {
  day: number
}

/**
 * 물가 소식 — **진행 중이면 그것, 곧 오면 예고, 평시면 없다**(2026-08-22).
 *
 * ⚠️ **평시에 null을 돌려주는 것이 핵심이다.** 예전에는 "N일 뒤 물가 인상"이 매일
 * 첫 줄에 박혀 있었는데, 그건 물가가 주기적으로 올랐기 때문이다. 지금은 흔들리지 않는
 * 날이 대부분이고 **그날은 뉴스가 물가 이야기를 하지 않는다** — 늘 경고가 떠 있으면
 * 진짜 사건이 왔을 때 그것도 배경이 된다.
 *
 * 스탯창·지갑도 같은 `activeShock`/`shockIncoming`을 보되 문장은 여기서 만든다 —
 * 설계 문서 3.4가 정한 대로 뉴스가 게임의 알림 창구이기 때문이다.
 */
export function buildPriceNotice(day: number): NewsItem | null {
  const now = activeShock(day)
  if (now) {
    return {
      id: `price-shock-${now.shock.id}-${now.start}`,
      kind: 'notice',
      headline: `${now.shock.headline} (${now.end - day + 1}일 남음)`,
      source: '네이놈 속보',
    }
  }
  const soon = shockIncoming(day)
  if (!soon) return null
  return {
    id: `price-warn-${soon.shock.id}-${soon.start}`,
    kind: 'notice',
    headline: `${soon.start - day}일 뒤 ${soon.shock.name} 예상... 생활비 일시 상승 전망`,
    source: '네이놈 속보',
  }
}

/**
 * 계절이 바뀌는 날의 소식. 그 외의 날은 null이다.
 *
 * ⚠️ **계절은 이 게임의 유일한 되돌아오는 리듬이다**(`data/season.ts`) — 바뀌는 순간을
 * 아무도 안 알려 주면 달력 격자에서만 조용히 지나간다. 물가 소식과 같은 자리를 쓰되
 * **둘이 겹치는 날에는 물가가 먼저다**(그날 돈이 더 급하다).
 */
export function buildSeasonNotice(day: number): NewsItem | null {
  if (!isSeasonStart(day)) return null
  const season = seasonOf(day)
  return {
    id: `season-${season.id}-${day}`,
    kind: 'notice',
    headline: `${season.label}이 시작됐습니다 — ${season.note}`,
    source: '네이놈 날씨',
  }
}

/**
 * 오늘 뉴스 영역에 띄울 항목.
 *
 * 물가 사건이 있는 날에만 그 소식이 맨 위에 오고, 나머지는 풀을 날짜로 회전시킨다.
 * `Math.random`을 쓰지 않는 이유는 두 가지다:
 *  1) systems는 순수해야 하고 테스트가 결정적이어야 한다
 *  2) 같은 날 창을 닫았다 열면 뉴스가 바뀌는 것은 "탐색은 무료"라는 규칙과 어긋나 보인다
 *     — 무료로 다시 굴릴 수 있는 무작위는 정보가 아니라 소음이다
 */
export function selectNews(ctx: NewsContext): NewsItem[] {
  const notice = buildPriceNotice(ctx.day) ?? buildSeasonNotice(ctx.day)
  /* 평시에는 물가 줄이 없으므로 그 한 칸을 기사에 돌려준다 — 빈 줄을 남기지 않는다. */
  const poolCount = Math.min(NEWS_VISIBLE_COUNT - (notice ? 1 : 0), NEWS_POOL.length)
  // 날짜를 시작 오프셋으로 삼아 풀을 순환한다. 하루가 지나면 목록이 한 칸 밀린다.
  const offset = ((ctx.day % NEWS_POOL.length) + NEWS_POOL.length) % NEWS_POOL.length
  const rotated: NewsItem[] = []
  for (let i = 0; i < poolCount; i++) {
    rotated.push(NEWS_POOL[(offset + i) % NEWS_POOL.length])
  }
  return notice ? [notice, ...rotated] : rotated
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
  /* 평시에는 물가 소식이 없다(`buildPriceNotice`가 null) — 그날은 '전체' 탭도 기사만 싣는다. */
  const priceNotice = ctx.category ? null : (buildPriceNotice(ctx.day) ?? buildSeasonNotice(ctx.day))
  const pool = ctx.category
    ? NEWS_POOL.filter((n) => n.category === ctx.category)
    : priceNotice
      ? [priceNotice, ...NEWS_POOL]
      : NEWS_POOL

  if (!pool.length) return { lead: [], rest: [], pageCount: 1, page: 0 }

  // 날짜만큼 회전시킨 뒤 페이지를 자른다.
  // 물가 소식이 있는 날에는 그것을 회전에서 빼내 항상 첫 자리에 고정한다 —
  // 게임의 알림이 페이지를 넘길 때마다 어디론가 사라지면 안 된다.
  const pinned = priceNotice ? pool[0] : null
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
