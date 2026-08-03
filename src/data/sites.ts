import type { IconName } from '../types/game'

/**
 * 사이트 본문을 그리는 컴포넌트 종류.
 * 'portal'은 NEVER 홈, 'construction'은 아직 열리지 않은 사이트의 공용 안내 페이지다.
 * 새 사이트를 추가하는 비용을 "데이터 한 줄 + 컴포넌트 하나"로 묶어 두기 위한 키다 —
 * BrowserApp이 사이트 id로 분기하는 순간 이 구조의 장점이 사라진다.
 */
export type SiteRender = 'portal' | 'construction'

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
  /** 포털 홈의 즐겨찾기 줄에 노출할지 여부. 순서는 배열 순서를 따른다. */
  bookmark?: boolean
}

/**
 * 사이트 목록. 배열 순서가 곧 즐겨찾기 줄 순서다.
 * 설계 문서 3.4의 사이트 표를 그대로 옮긴 것이며, 은행은 1차 구현 제외 항목이라
 * 즐겨찾기에는 남기되 안내 문구에서 제외 사실을 밝힌다.
 */
export const SITES: Site[] = [
  {
    id: 'never',
    url: 'https://www.never.com',
    title: 'NEVER',
    icon: 'fluent-emoji-flat:globe-with-meridians',
    render: 'portal',
  },
  {
    id: 'albamon',
    url: 'https://alba.never.com',
    title: '알바몬',
    icon: 'fluent-emoji-flat:briefcase',
    render: 'construction',
    notice: '알바 목록 비교와 지원 기능은 아직 열리지 않았습니다. 지금은 바탕화면의 알바 아이콘으로 일할 수 있습니다.',
    bookmark: true,
  },
  {
    id: 'shopping',
    url: 'https://shop.never.com',
    title: '쇼핑',
    icon: 'fluent-emoji-flat:shopping-cart',
    render: 'construction',
    notice: '스탯 부스터와 회복 아이템 상점은 준비 중입니다.',
    bookmark: true,
  },
  {
    id: 'sns',
    url: 'https://sns.never.com',
    title: 'SNS',
    icon: 'fluent-emoji-flat:speech-balloon',
    render: 'construction',
    notice: '인간관계 활동과 랜덤 이벤트는 준비 중입니다.',
    bookmark: true,
  },
  {
    id: 'lecture',
    url: 'https://class.never.com',
    title: '강의',
    icon: 'fluent-emoji-flat:graduation-cap',
    render: 'construction',
    notice: '유료 고효율 강의는 준비 중입니다.',
    bookmark: true,
  },
  {
    id: 'bank',
    url: 'https://bank.never.com',
    title: '은행',
    icon: 'fluent-emoji-flat:bank',
    render: 'construction',
    notice: '은행과 대출은 1차 구현 대상이 아닙니다. 당분간은 소지금만으로 버텨야 합니다.',
    bookmark: true,
  },
]

/** 브라우저를 열었을 때 처음 뜨는 사이트. */
export const HOME_SITE_ID = 'never'

/** 포털 홈의 즐겨찾기 줄에 그릴 사이트. 컴포넌트가 id를 나열하지 않는다. */
export const BOOKMARK_SITES: Site[] = SITES.filter((s) => s.bookmark)

export function findSite(id: string): Site | undefined {
  return SITES.find((s) => s.id === id)
}
