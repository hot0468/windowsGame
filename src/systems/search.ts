import { BLOG_POSTS } from '../data/blogs'
import { NEWS_POOL, SEARCH_SUGGESTIONS, TRENDING_TERMS } from '../data/news'
import { SITES } from '../data/sites'
import type { BlogPost } from '../data/blogs'
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
  /** 걸린 블로그 글. 눌러서 본문을 읽는다. */
  blogs: BlogPost[]
  /** 이어서 눌러 볼 만한 실시간 검색어. */
  related: string[]
  /** 셋을 합친 개수. 0이면 "결과 없음" 화면을 그린다. */
  total: number
}

/** 대소문자·앞뒤 공백만 무시한다. 형태소 분석 같은 건 이 게임에 과하다. */
function norm(s: string): string {
  return s.trim().toLowerCase()
}

/**
 * 추천·실검 목록이 들고 있는 **지름길**(라벨 → 사이트 id).
 *
 * ⚠️ **이게 없으면 검색이 자기 사이트를 못 찾는다.** 'O넷'을 '자격증 시험'으로,
 * '그몽'을 '부업 외주'로 찾는 사람이 정상인데, 판정은 사이트 제목·주소만 보므로 둘 다 0건이
 * 된다. 예전에는 추천을 누르면 그 사이트로 **바로 튀어서** 이 구멍이 안 보였다 —
 * 2026-08-22에 "추천도 검색을 지난다"로 바뀌면서 구멍이 드러났다.
 *
 * ⚠️ **키워드 목록을 새로 만들지 않는다**: 라벨과 사이트를 잇는 표가 이미 있고, 두 벌로
 * 적으면 한쪽만 고친다.
 */
const TERM_SHORTCUTS = [...SEARCH_SUGGESTIONS, ...TRENDING_TERMS]

export function search(query: string): SearchResult {
  const q = norm(query)
  if (!q) return { sites: [], news: [], blogs: [], related: [], total: 0 }

  /* 추천·실검 라벨이 걸리면 그 사이트도 결과다. 라벨 쪽을 부분 일치로 보는 이유는
     '자격증'만 쳐도 '자격증 시험'에 닿아야 하기 때문이다. */
  const shortcuts = TERM_SHORTCUTS.filter((t) => t.siteId && norm(t.label).includes(q)).map(
    (t) => t.siteId,
  )
  /* ⚠️ 걸러 내는 쪽이 `SITES`인 것이 중복 제거다 — 지름길과 제목이 함께 걸려도 한 번만 선다. */
  const sites = SITES.filter(
    (s) =>
      norm(s.title).includes(q) ||
      norm(s.url).includes(q) ||
      norm(s.notice ?? '').includes(q) ||
      shortcuts.includes(s.id),
  )
  const news = NEWS_POOL.filter(
    (n) => norm(n.headline).includes(q) || norm(n.source ?? '').includes(q),
  )
  /* ⚠️ 본문(`body`)까지 뒤지지 않는다 — 흔한 조사 한 글자에 열네 편이 전부 걸려
     "이 검색어와 상관 있는 글"이라는 뜻이 사라진다. 걸리게 하고 싶은 말은 `tags`에 적는다. */
  const blogs = BLOG_POSTS.filter(
    (b) =>
      norm(b.title).includes(q) ||
      norm(b.blog).includes(q) ||
      norm(b.lead).includes(q) ||
      /* 양쪽 방향으로 본다: '자격'으로 꼬리표 '자격증'에 닿고, '자격증 시험'으로도 닿는다.
         한 방향만 두면 검색어가 꼬리표보다 길어지는 순간(추천 라벨이 대부분 그렇다) 0건이 된다. */
      b.tags.some((t) => norm(t).includes(q) || q.includes(norm(t))),
  )
  const related = TRENDING_TERMS.filter((t) => norm(t.label).includes(q)).map((t) => t.label)

  return {
    sites,
    news,
    blogs,
    related,
    total: sites.length + news.length + blogs.length + related.length,
  }
}
