import { describe, it, expect } from 'vitest'
import { BOOKMARK_SITES, findSite, HOME_SITE_ID, PROMO_SITES, resolveUrl, SITES } from './sites'
import { TRENDING_TERMS } from './news'
import { findActivity } from './activities'
import { BOOKS, FILMS, findShowtime, WRITING_PROMPTS } from './media'

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
    expect(BOOKMARK_SITES.map((s) => s.id)).toEqual([
      'slowcampus',
      'youtube',
      'twitter',
      'midibooks',
      'sizibi',
      'ajeom',
    ])
    expect(BOOKMARK_SITES.map((s) => s.id)).not.toContain(HOME_SITE_ID)
  })

  it('사이트 아이콘은 서로 겹치지 않는다 (탭 파비콘 = 사이트 정체성)', () => {
    // 같은 아이콘을 쓰는 사이트가 둘이면 탭 줄·퀵메뉴·즐겨찾기 줄에서 구분이 사라진다.
    const icons = SITES.map((s) => s.icon)
    expect(new Set(icons).size).toBe(icons.length)
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

describe('활동을 실행하는 사이트', () => {
  it('사이트가 가리키는 activityId는 실제 활동이다 (죽은 버튼 방지)', () => {
    // ⚠️ 이 검사가 없으면 오타 하나가 "눌러도 아무 일이 없는 확정 버튼"이 된다.
    // 활동 id를 바꾸는 순간 여기서 잡힌다.
    for (const site of SITES) {
      if (site.activityId) expect(findActivity(site.activityId)).toBeDefined()
    }
  })

  it('활동을 실행하는 render 종류는 activityId를 반드시 갖는다', () => {
    for (const site of SITES.filter((s) => ['library', 'cinema', 'publish'].includes(s.render))) {
      expect(site.activityId).toBeDefined()
    }
  })

  it('세 사이트가 서로 다른 활동을 실행한다', () => {
    const ids = SITES.map((s) => s.activityId).filter((id) => id !== undefined)
    expect(ids).toEqual(['reading', 'movie', 'writing'])
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('문화 사이트 콘텐츠', () => {
  it('책·영화·글감 id가 각각 중복되지 않는다', () => {
    for (const ids of [
      BOOKS.map((b) => b.id),
      FILMS.map((f) => f.id),
      WRITING_PROMPTS.map((p) => p.id),
    ]) {
      expect(new Set(ids).size).toBe(ids.length)
    }
  })

  it('상영 회차 id는 전체에서 유일하다 (고른 회차를 되찾는 근거)', () => {
    const ids = FILMS.flatMap((f) => f.showtimes.map((s) => s.id))
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(findShowtime(id)).toBeDefined()
  })

  it('예매 가능한 영화에는 상영 회차가 있다 (고를 수 없는 영화 방지)', () => {
    // ⚠️ 개봉 예정작(soon)은 회차가 **없는 것이 정상**이다 — 아직 안 나온 영화다.
    // 대신 예정작에는 D-day가 반드시 있어야 한다. 없으면 화면에 빈 배지가 뜬다.
    for (const film of FILMS) {
      if (film.section === 'soon') {
        expect(film.showtimes).toEqual([])
        expect(film.dday).toBeGreaterThan(0)
        continue
      }
      expect(film.showtimes.length).toBeGreaterThan(0)
      for (const s of film.showtimes) expect(s.time).toMatch(/^\d{2}:\d{2}$/)
    }
  })

  it('없는 회차를 물으면 undefined다', () => {
    expect(findShowtime('없는-회차')).toBeUndefined()
  })

  it('고를 것이 충분히 있다 (목록이 하나면 고르는 화면이 아니다)', () => {
    expect(BOOKS.length).toBeGreaterThanOrEqual(3)
    expect(FILMS.length).toBeGreaterThanOrEqual(3)
    expect(WRITING_PROMPTS.length).toBeGreaterThanOrEqual(3)
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
