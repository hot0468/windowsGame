import { describe, it, expect } from 'vitest'
import { BOOKMARK_SITES, findSite, HOME_SITE_ID, PROMO_SITES, resolveUrl, SITES } from './sites'
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

  it('포털 홈 카테고리 줄은 포털(never)을 빼고 배열 순서를 따른다', () => {
    // ⚠️ 이 목록은 **브라우저 즐겨찾기가 아니다**(그쪽은 browserStore가 들고, 기본값이 없다).
    // 포털 홈의 바로가기 줄이며, 사이트가 늘면 여기도 함께 늘어난다.
    expect(BOOKMARK_SITES.map((s) => s.id)).toEqual(['sns', 'slowcampus', 'youtube', 'twitter'])
    expect(BOOKMARK_SITES.map((s) => s.id)).not.toContain(HOME_SITE_ID)
  })

  it('퀵메뉴와 하단 소개 섹션은 겹치지 않는다', () => {
    // 같은 사이트가 화면에 두 번 나오면 어느 쪽이 본체인지 알 수 없다.
    expect(PROMO_SITES.map((s) => s.id)).toEqual(['albamon', 'shopping', 'bank'])
    for (const s of PROMO_SITES) expect(s.bookmark).toBeUndefined()
  })

  it('실시간 검색어의 siteId는 실제 사이트를 가리킨다 (죽은 링크 방지)', () => {
    for (const term of TRENDING_TERMS) {
      if (term.siteId) expect(findSite(term.siteId)).toBeDefined()
    }
  })
})

describe('resolveUrl', () => {
  it('아는 주소는 사이트 id로 바꾼다', () => {
    expect(resolveUrl('https://alba.neinom.com')).toBe('albamon')
  })

  it('프로토콜·www·끝 슬래시·대소문자 차이를 무시한다', () => {
    expect(resolveUrl('  WWW.Neinom.com/  ')).toBe('never')
    expect(resolveUrl('http://shop.neinom.com')).toBe('shopping')
  })

  it('모르는 주소는 입력값을 그대로 돌려준다 (없는 id → 오류 페이지)', () => {
    expect(resolveUrl('https://google.com')).toBe('https://google.com')
    expect(findSite(resolveUrl('https://google.com'))).toBeUndefined()
  })

  it('빈 입력은 홈으로 보낸다', () => {
    expect(resolveUrl('   ')).toBe(HOME_SITE_ID)
  })
})
