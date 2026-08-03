import { NEWS_POOL, TRENDING_TERMS } from '../data/news'
import { SITES } from '../data/sites'
import type { NewsItem } from '../data/news'
import type { Site } from '../data/sites'

/**
 * 포털 검색.
 *
 * ⚠️ **가짜 결과를 지어내지 않는다.** 이미 게임 안에 있는 것만 찾는다 —
 * 사이트(`SITES`), 기사(`NEWS_POOL`), 실시간 검색어(`TRENDING_TERMS`).
 * 없는 걸 만들어 내면 눌러도 갈 데가 없는 링크가 생긴다.
 *
 * 순수 함수인 이유는 뉴스 선택자와 같다: 컴포넌트가 배열을 자르기 시작하면
 * 빈 결과·부분 일치 같은 자잘한 규칙이 화면 코드에 흩어진다.
 */
export interface SearchResult {
  /** 이동할 수 있는 사이트. */
  sites: Site[]
  /** 제목이 걸린 기사. 이동은 못 하고 읽기만 한다. */
  news: NewsItem[]
  /** 이어서 눌러 볼 만한 실시간 검색어. */
  related: string[]
  /** 셋을 합친 개수. 0이면 "결과 없음" 화면을 그린다. */
  total: number
}

/** 대소문자·앞뒤 공백만 무시한다. 형태소 분석 같은 건 이 게임에 과하다. */
function norm(s: string): string {
  return s.trim().toLowerCase()
}

export function search(query: string): SearchResult {
  const q = norm(query)
  if (!q) return { sites: [], news: [], related: [], total: 0 }

  const sites = SITES.filter(
    (s) => norm(s.title).includes(q) || norm(s.url).includes(q) || norm(s.notice ?? '').includes(q),
  )
  const news = NEWS_POOL.filter(
    (n) => norm(n.headline).includes(q) || norm(n.source ?? '').includes(q),
  )
  const related = TRENDING_TERMS.filter((t) => norm(t.label).includes(q)).map((t) => t.label)

  return { sites, news, related, total: sites.length + news.length + related.length }
}
