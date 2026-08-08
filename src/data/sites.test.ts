import { describe, it, expect } from 'vitest'
import {
  BOOKMARK_SITES,
  findSite,
  HOME_SITE_ID,
  PROMO_SITES,
  resolveUrl,
  SITES,
  STORE_SITES,
} from './sites'
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
    expect(PROMO_SITES.map((s) => s.id)).toEqual([
      'albamon',
      'flea',
      'expo',
      'contest',
      'comicon',
      'gmong',
      // ⚠️ **어도비는 여기 없다**(2026-08-08 설계자 지시로 소개 카드를 뺐다) —
      //    입구는 포털 검색창의 **검색어 추천**이고 `subscription.test.ts`가 지킨다.
      'onet',
      'bank',
      'stock',
      'realty',
    ])
    for (const s of PROMO_SITES) expect(s.bookmark).toBeUndefined()
  })

  it('쇼핑 띠에 걸리는 사이트는 하단 소개와 겹치지 않는다', () => {
    // 돈 쓰러 가는 곳은 뉴스 위 상단 띠가 그린다 — 하단에도 있으면 같은 것이 두 번 뜬다.
    // ⚠️ 배달의정석은 물건을 팔지 않지만 같은 줄에 선다(설계자 지시: 쇼핑에 배달 탭).
    // ⚠️ 두손마켓은 **돈을 받는 쪽**이지만 같은 줄에 선다(2026-08-08 중고마켓) —
    //    이 줄의 뜻은 "물건을 파는 곳"이 아니라 **물건을 다루는 곳**이다.
    expect(STORE_SITES.map((s) => s.id)).toEqual([
      'shopping',
      'himaru',
      'mujinjang',
      'baedal',
      'dusonmarket',
    ])
    for (const s of STORE_SITES) expect(PROMO_SITES).not.toContain(s)
    // 카드로도 뜨는 가게 셋은 소개 문구가 있어야 한다(없으면 빈 카드가 뜬다).
    for (const s of STORE_SITES.filter((x) => x.render !== 'food' && x.render !== 'resale')) {
      expect(s.promo, `${s.id}의 소개 문구`).toBeDefined()
    }
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

  it('은행은 활동을 실행하지 않는다 — 거래는 턴을 쓰지 않는다', () => {
    // ⚠️ `activityId`가 붙는 순간 확정 패널이 생기고 거래가 1턴을 먹기 시작한다.
    //    은행 거래는 쇼핑 주문과 같은 규칙(턴 없음)이므로 여기서 못 박는다.
    const bank = findSite('bank')!
    expect(bank.render).toBe('bank')
    expect(bank.activityId).toBeUndefined()
    expect(bank.notice).toBeUndefined()
  })

  it('부동산도 활동을 실행하지 않는다 — 이사는 턴을 쓰지 않는다', () => {
    // ⚠️ 은행과 같은 규칙이다. `activityId`가 붙는 순간 확정 패널이 생기고
    //    계약이 1턴을 먹기 시작한다 — 이사의 비용은 슬롯이 아니라 목돈이다.
    const realty = findSite('realty')!
    expect(realty.render).toBe('realty')
    expect(realty.activityId).toBeUndefined()
  })

  it('하이마루도 활동을 실행하지 않는다 — 주문은 턴을 쓰지 않는다', () => {
    // ⚠️ 쇼핑과 같은 규칙이다. `activityId`가 붙는 순간 확정 패널이 생기고 주문이
    //    1턴을 먹기 시작한다 — 전자기기의 비용은 슬롯이 아니라 **돈과 배송 하루**다.
    const himaru = findSite('himaru')!
    expect(himaru.render).toBe('tech')
    expect(himaru.activityId).toBeUndefined()
  })

  it('활동을 실행하는 render 종류는 activityId를 반드시 갖는다', () => {
    for (const site of SITES.filter((s) =>
      ['library', 'cinema', 'publish', 'jobs', 'career', 'campus', 'cert', 'twitter', 'tube'].includes(
        s.render,
      ),
    )) {
      expect(site.activityId).toBeDefined()
    }
  })

  it('활동을 실행하는 사이트들은 서로 다른 활동을 실행한다', () => {
    // 알바몬의 'work'·벼룩장터의 'job-apply'·O넷의 'exam'·슬로우캠퍼스의 'study'는
    // **아무것도 안 고른 상태의 기본값**이다 — 실제로 무엇을 실행할지는 알바몬은
    // `data/jobs.ts`의 공고가, 슬로우캠퍼스는 `data/courses.ts`의 강의가, O넷은
    // `data/certs.ts`의 종목이, 벼룩장터는 지금의 고용 상태가 정한다.
    // ⚠️ 트위터의 'sns'는 기본값이 아니라 **유일한 실행 활동이다** — 타임라인에는 고를 것이
    // 없다(미디북스·시집이·아점과 달리 목록에서 무엇을 고르든 실행되는 것은 이 하나다).
    const ids = SITES.map((s) => s.activityId).filter((id) => id !== undefined)
    // ⚠️ 노24·먼바다투어는 **포털 가로 띠의 이동용 배너**가 입구다(즐겨찾기·소개 카드에 없다).
    //    사이트 배열 순서대로 적는다 — 순서가 바뀌면 즐겨찾기 줄도 함께 바뀐다.
    expect(ids).toEqual([
      'work',
      'job-apply',
      // ⚠️ **코미콘은 여기 있다** — 부스에 앉아 있는 하루라 1턴을 쓴다.
      //    고르는 것은 "어느 회지를 파는가"뿐이고 매출은 그 회지가 정한다(배달 메뉴와 같다).
      //    ⚠️ **공모전(콘테스트하다)는 여기 없다** — 출품은 봉투를 부치는 일이라 턴을 안 쓴다.
      'comicon',
      // ⚠️ **그몽은 여기 없다**(2026-08-08 재설계) — 계약만 맺고 턴을 안 쓰므로
      //    `activityId`가 없다(은행·부동산·어도비와 같은 부류). 실제 작업은 도구 앱이 한다.
      'exam',
      'meal-junk',
      'concert',
      'travel',
      'study',
      // ⚠️ 너튜브의 'stream'은 기본값이 아니라 **유일한 실행 활동이다**(트위터와 같다) —
      //    [내 채널]의 방송 주제는 "무엇을 하며 두 시간을 보내는가"만 정하고 수치는 활동이 진다.
      'stream',
      'sns',
      'reading',
      'movie',
      'writing',
    ])
    // ⚠️ 이 검사가 본체다: 두 사이트가 조용히 같은 활동을 실행하면 안 된다.
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
