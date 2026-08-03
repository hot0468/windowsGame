import { describe, it, expect } from 'vitest'
import { BOOKMARK_SITES, findSite, HOME_SITE_ID, SITES } from './sites'
import { TRENDING_TERMS } from './news'

describe('사이트 목록', () => {
  it('id가 중복되지 않는다', () => {
    const ids = SITES.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('홈 사이트가 존재하고 포털이다', () => {
    const home = findSite(HOME_SITE_ID)
    expect(home).toBeDefined()
    expect(home!.render).toBe('portal')
  })

  it('포털은 하나뿐이다 — 나머지는 공용 준비 중 페이지를 공유한다', () => {
    expect(SITES.filter((s) => s.render === 'portal')).toHaveLength(1)
  })

  it('준비 중 사이트는 안내 문구를 갖는다 (빈 페이지 방지)', () => {
    for (const site of SITES.filter((s) => s.render === 'construction')) {
      expect(site.notice && site.notice.length).toBeGreaterThan(0)
    }
  })

  it('모든 사이트가 URL과 아이콘 이름을 갖는다', () => {
    for (const site of SITES) {
      expect(site.url).toMatch(/^https:\/\//)
      expect(site.icon).toMatch(/^[a-z0-9-]+:[a-z0-9-]+$/)
    }
  })

  it('즐겨찾기는 설계 문서 3.4의 5개 사이트다', () => {
    expect(BOOKMARK_SITES.map((s) => s.id)).toEqual([
      'albamon',
      'shopping',
      'sns',
      'lecture',
      'bank',
    ])
  })

  it('실시간 검색어의 siteId는 실제 사이트를 가리킨다 (죽은 링크 방지)', () => {
    for (const term of TRENDING_TERMS) {
      if (term.siteId) expect(findSite(term.siteId)).toBeDefined()
    }
  })
})
