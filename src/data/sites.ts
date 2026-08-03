import type { IconName } from '../types/game'

/**
 * 사이트 본문을 그리는 컴포넌트 종류.
 * 'portal'은 네이놈 홈, 'construction'은 아직 열리지 않은 사이트의 공용 안내 페이지다.
 * 새 사이트를 추가하는 비용을 "데이터 한 줄 + 컴포넌트 하나"로 묶어 두기 위한 키다 —
 * BrowserApp이 사이트 id로 분기하는 순간 이 구조의 장점이 사라진다.
 */
export type SiteRender = 'portal' | 'construction' | 'shop'

/** 가짜 브라우저가 이동할 수 있는 사이트 하나. */
export interface Site {
  id: string
  /** 주소창에 표시할 가짜 URL. 1차 구현에서는 표시 전용이며 입력할 수 없다. */
  url: string
  /** 창 제목·주소창 툴팁에 쓰는 사이트 이름. */
  title: string
  icon: IconName
  render: SiteRender
  /** render가 'construction'일 때 안내할 문구. 사이트마다 이유가 다르므로 데이터로 둔다. */
  notice?: string
  /** 포털 홈 **퀵메뉴**(원형 아이콘 줄)에 노출할지 여부. 순서는 배열 순서를 따른다. */
  bookmark?: boolean
  /**
   * 있으면 퀵메뉴 대신 포털 홈 **하단 소개 섹션**에 카드로 뜬다(설계자 지시).
   *
   * 퀵메뉴는 "자주 가는 곳"이라 아이콘 하나로 충분하지만, 알바·쇼핑·은행처럼
   * 게임의 돈 흐름이 걸린 곳은 무엇을 하는 곳인지 한 줄 설명이 필요하다.
   * 둘 다 켜지 않는다 — 같은 사이트가 화면에 두 번 나오면 어느 쪽이 본체인지 모른다.
   */
  promo?: {
    /** 카드 위 회색 칩. 광고주·주체 이름 자리다. */
    tag: string
    title: string
    desc: string
    /** 썸네일 자리의 배경. 사진이 없으므로 그라데이션 + 사이트 아이콘으로 채운다. */
    gradient: string
  }
}

/**
 * 사이트 목록. 배열 순서가 곧 즐겨찾기 줄 순서다.
 * 설계 문서 3.4의 사이트 표를 그대로 옮긴 것이며, 은행은 1차 구현 제외 항목이라
 * 즐겨찾기에는 남기되 안내 문구에서 제외 사실을 밝힌다.
 */
export const SITES: Site[] = [
  {
    // ⚠️ id는 'never'로 둔다. 브랜드 이름만 바꾼 것이고, id는 즐겨찾기(browserStore)에
    // 저장되는 값이라 바꾸면 이미 저장된 즐겨찾기가 끊어진다. 표시 이름과 다른 것이 정상이다.
    id: 'never',
    url: 'https://www.neinom.com',
    title: '네이놈',
    icon: 'fluent-color:globe-24',
    render: 'portal',
  },
  {
    id: 'albamon',
    url: 'https://alba.neinom.com',
    title: '알바몬',
    icon: 'fluent-color:briefcase-24',
    render: 'construction',
    notice: '알바 목록 비교와 지원 기능은 아직 열리지 않았습니다. 지금은 바탕화면의 알바 아이콘으로 일할 수 있습니다.',
    promo: {
      tag: '알바몬',
      title: '오늘 할 수 있는 일자리',
      desc: '비교해 보고 지원하세요',
      gradient: 'linear-gradient(135deg, #16324f 0%, #2f6ea8 100%)',
    },
  },
  {
    id: 'shopping',
    url: 'https://shop.neinom.com',
    title: '쇼핑',
    icon: 'fluent-color:building-store-24',
    render: 'shop',
    notice: '주문한 물건은 다음 날 도착합니다.',
    promo: {
      tag: '네이놈쇼핑',
      title: '필요한 건 여기서',
      desc: '아이템을 한자리에서',
      gradient: 'linear-gradient(135deg, #6a2f8a 0%, #c2529a 100%)',
    },
  },
  {
    id: 'sns',
    url: 'https://sns.neinom.com',
    title: 'SNS',
    icon: 'fluent-color:people-chat-24',
    render: 'construction',
    notice: '인간관계 활동과 랜덤 이벤트는 준비 중입니다.',
    bookmark: true,
  },
  {
    // ⚠️ 예전의 '강의'가 이 항목이다(설계자 지시로 슬로우캠퍼스로 통합).
    // id를 'lecture'로 남기지 않은 이유: 표시 이름과 완전히 갈라지면 코드에서 헷갈린다.
    // 별도로 있던 slowcampus 항목은 지웠다 — 같은 것이 두 개일 이유가 없다.
    id: 'slowcampus',
    url: 'https://www.slowcampus.com',
    title: '슬로우캠퍼스',
    icon: 'fluent-color:book-star-24',
    render: 'construction',
    notice: '유료 고효율 강의 수강과 수료증은 준비 중입니다.',
    bookmark: true,
  },
  {
    id: 'youtube',
    url: 'https://www.nutube.com',
    title: '너튜브',
    icon: 'fluent-color:video-24',
    render: 'construction',
    notice: '영상 시청으로 멘탈을 회복하는 기능은 준비 중입니다.',
    bookmark: true,
  },
  {
    id: 'twitter',
    url: 'https://www.twiter.com',
    title: '트위터',
    icon: 'fluent-color:chat-multiple-24',
    render: 'construction',
    notice: '타임라인과 평판 시스템은 준비 중입니다.',
    bookmark: true,
  },
  {
    id: 'bank',
    url: 'https://bank.neinom.com',
    title: '은행',
    icon: 'fluent-color:savings-24',
    render: 'construction',
    notice: '은행과 대출은 1차 구현 대상이 아닙니다. 당분간은 소지금만으로 버텨야 합니다.',
    promo: {
      tag: '네이놈은행',
      title: '잔액을 지키는 방법',
      desc: '당신의 돈을 지켜드립니다',
      gradient: 'linear-gradient(135deg, #0b5c3b 0%, #2f9e6e 100%)',
    },
  },
]

/** 브라우저를 열었을 때 처음 뜨는 사이트. */
export const HOME_SITE_ID = 'never'

/** 포털 홈 퀵메뉴에 그릴 사이트. 컴포넌트가 id를 나열하지 않는다. */
export const BOOKMARK_SITES: Site[] = SITES.filter((s) => s.bookmark)

/** 포털 홈 하단 소개 섹션에 그릴 사이트. 퀵메뉴와 겹치지 않는다. */
export const PROMO_SITES: Site[] = SITES.filter((s) => s.promo)

export function findSite(id: string): Site | undefined {
  return SITES.find((s) => s.id === id)
}

/** 주소 비교용 정규화: 대소문자·프로토콜·www.·끝 슬래시·공백 차이를 없앤다. */
function normalizeUrl(url: string): string {
  return url
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/+$/, '')
}

/**
 * 주소창에 입력한 문자열을 이동할 사이트 id로 바꾼다.
 *
 * 아는 주소면 그 사이트의 id를, 모르는 주소면 **입력값을 그대로** 돌려준다.
 * 없는 id는 `findSite`가 undefined를 주고 `BrowserApp`이 "페이지를 찾을 수 없습니다"를
 * 그리므로, 실패 경로를 위한 별도의 상태가 필요 없다 — 실제 브라우저도 모르는 주소로
 * "이동한 뒤" 오류 페이지를 보여주고, 그 주소는 뒤로 가기 이력에 남는다.
 */
export function resolveUrl(input: string): string {
  const normalized = normalizeUrl(input)
  if (!normalized) return HOME_SITE_ID
  return SITES.find((s) => normalizeUrl(s.url) === normalized)?.id ?? input.trim()
}
