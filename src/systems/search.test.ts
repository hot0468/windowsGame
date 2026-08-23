import { describe, it, expect } from 'vitest'
import { search } from './search'
import { findSite } from '../data/sites'
import { SEARCH_SUGGESTIONS, TRENDING_TERMS } from '../data/news'

describe('search', () => {
  it('사이트 제목으로 찾는다', () => {
    const r = search('알바몬')
    expect(r.sites.map((s) => s.id)).toContain('albamon')
  })

  it('주소 일부로도 찾는다', () => {
    expect(search('nutube').sites.map((s) => s.id)).toContain('youtube')
  })

  it('대소문자·앞뒤 공백을 무시한다', () => {
    expect(search('  NUTUBE  ').total).toBe(search('nutube').total)
  })

  it('기사 제목으로 찾는다', () => {
    expect(search('번아웃').news.length).toBeGreaterThan(0)
  })

  it('블로그 글을 찾는다', () => {
    expect(search('맛집').blogs.length).toBeGreaterThan(0)
  })

  it('제목에 없는 말도 꼬리표로 닿는다 (그게 tags가 있는 이유다)', () => {
    const hit = search('혼밥').blogs
    expect(hit.length).toBeGreaterThan(0)
    expect(hit.every((b) => b.title.includes('혼밥'))).toBe(false)
  })

  it('블로그 결과는 전부 읽을 본문이 있다 (빈 글 방지)', () => {
    for (const b of search('맛집').blogs) expect(b.body.length).toBeGreaterThan(0)
  })

  it('본문에만 있는 말로는 걸리지 않는다 — 흔한 말에 전편이 쏟아지는 것을 막는다', () => {
    expect(search('그런데').blogs).toHaveLength(0)
  })

  it('빈 검색어는 결과가 없다 — 전체 목록을 쏟지 않는다', () => {
    expect(search('   ').total).toBe(0)
  })

  it('없는 말은 0건이다', () => {
    expect(search('존재하지않는단어xyz').total).toBe(0)
  })

  it('결과의 사이트는 전부 실제로 이동할 수 있다 (죽은 링크 방지)', () => {
    for (const s of search('네이놈').sites) expect(findSite(s.id)).toBeDefined()
  })
})

/*
 * ⚠️ **줌은 즐겨찾기에도 소개 카드에도 없다** — 검색이 유일한 입구라, 사람들이 실제로 칠
 * 세 마디가 여기 닿지 못하면 프로그램을 받을 길이 통째로 사라진다(그리고 회의에 빠진다).
 */
describe('줌 — 검색이 유일한 입구다', () => {
  for (const q of ['화상회의', '줌', 'zoom', 'ZOOM']) {
    it(`"${q}"로 찾으면 나온다`, () => {
      expect(search(q).sites.map((s) => s.id)).toContain('zoom')
    })
  }
})

/*
 * **검색어 추천을 눌러도 사이트로 바로 튀지 않는다**(2026-08-22 설계자 지시) — 검색 결과
 * 첫 줄이 그 사이트고 그 밑이 쓰는 법이다. 그래서 예전에 클릭 핸들러가 지던 책임이
 * 통째로 검색으로 넘어왔고, **여기가 그 책임을 지키는 자리**다.
 *
 * ⚠️ 이 둘이 깨지면 화면은 멀쩡한데 **갈 길이 사라진다**: 어도비·줌·O넷은 즐겨찾기도
 * 소개 카드도 없어서 검색이 유일한 입구다(`subscription.test.ts`의 순회와 짝이다).
 */
describe('검색어 추천 — 누르면 검색을 지난다', () => {
  for (const term of SEARCH_SUGGESTIONS.filter((t) => t.siteId)) {
    it(`"${term.label}" 결과에 ${term.siteId} 사이트가 선다`, () => {
      expect(search(term.label).sites.map((s) => s.id)).toContain(term.siteId)
    })
  }

  it('추천·실검은 읽을 글도 함께 데려온다 — 링크 하나만 남으면 팁이 없는 것이다', () => {
    for (const term of [...SEARCH_SUGGESTIONS, ...TRENDING_TERMS]) {
      expect(search(term.label).blogs.length, `"${term.label}"에 딸린 글이 없다`).toBeGreaterThan(0)
    }
  })
})

describe('카페 글', () => {
  it('검색으로 걸린다', () => {
    expect(search('어도비').blogs.some((b) => b.kind === 'cafe')).toBe(true)
  })

  it('주소가 cafe 도메인이다 — 카페라고 적고 blog로 보내지 않는다', () => {
    const cafe = search('어도비').blogs.find((b) => b.kind === 'cafe')!
    expect(findSite(`blog:${cafe.id}`)!.url).toContain('cafe.neinom.com')
  })
})
