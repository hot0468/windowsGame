import type { IconName } from '../types/game'

/**
 * 사이트 본문을 그리는 컴포넌트 종류.
 * 'portal'은 네이놈 홈, 'construction'은 아직 열리지 않은 사이트의 공용 안내 페이지다.
 * 새 사이트를 추가하는 비용을 "데이터 한 줄 + 컴포넌트 하나"로 묶어 두기 위한 키다 —
 * BrowserApp이 사이트 id로 분기하는 순간 이 구조의 장점이 사라진다.
 */
export type SiteRender =
  | 'portal'
  | 'construction'
  | 'shop'
  | 'library'
  | 'cinema'
  | 'publish'
  | 'tube'
  | 'jobs'
  /**
   * 슬로우캠퍼스 — 온라인 강의. 알바몬('jobs')처럼 **고른 것이 실행 활동을 정한다**.
   * 수강료는 강의가 갖고(`Course.price`), 같은 강의를 여러 번 들으면 수료증이 나온다.
   */
  | 'campus'
  /** 벼룩장터 — 정규직 구인. 알바('jobs')와 달리 채용 절차와 재직 상태를 다룬다. */
  | 'career'
  /**
   * O넷 — 자격증 시험. 슬로우캠퍼스('campus')처럼 **고른 종목이 비용을 정한다**
   * (`Cert.fee`). 다만 결과가 즉시 나지 않는다: 응시는 1턴이고 **합격은 발표일에**
   * 확정되어 자격증이 인벤토리로 들어온다.
   */
  | 'cert'
  /**
   * 네이놈은행 — 예금·대출. ⚠️ **활동을 실행하지 않는 유일한 "기능 사이트"다**
   * (`activityId`가 없다). 거래는 턴을 쓰지 않으므로 확정 패널(`ActivityCommit`)도 없다.
   */
  | 'bank'
  /**
   * 방구석부동산 — 이사. 은행과 같은 성격의 "기능 사이트"다(`activityId` 없음,
   * 확정 패널 없음, 턴을 쓰지 않는다). 파는 것은 활동이 아니라 **영구히 낮아진 생활비**다.
   */
  | 'realty'
  /**
   * 트위터 — 3열 타임라인. 미디북스('library')와 같은 부류다: **고르는 것이 없고**
   * 사이트가 가리키는 활동(`sns`) 하나를 확정 패널이 그대로 실행한다.
   * 탭·검색·트렌드는 전부 목록을 거를 뿐 게임 상태를 **읽기만** 한다.
   */
  | 'twitter'

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
  /**
   * 이 사이트의 확정 버튼이 실행하는 활동 id(`data/activities.ts`).
   *
   * ⚠️ **브라우저가 활동 실행의 세 번째 통로다**(①카톡 [만나러 가기] ②스케줄러 예약 ③여기).
   * 활동을 여기에 다시 정의하지 않고 **id로만 가리킨다** — 수치를 사이트에 적으면
   * 밸런스 테스트가 보지 못하는 두 번째 출처가 생긴다(카톡 [만나러 가기]와 같은 규칙).
   * 실제로 있는 활동인지는 `sites.test.ts`가 목록을 순회하며 지킨다.
   */
  activityId?: string
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
    render: 'jobs',
    // 공고가 가리키는 활동은 `data/jobs.ts`가 각자 갖는다. 여기의 id는 **아무것도
    // 안 고른 상태의 기본값**(조건 없는 편의점)이라 확정 패널이 항상 무언가를 그린다.
    activityId: 'work',
    promo: {
      tag: '알바몬',
      title: '오늘 할 수 있는 일자리',
      desc: '비교해 보고 지원하세요',
      gradient: 'linear-gradient(135deg, #16324f 0%, #2f6ea8 100%)',
    },
  },
  {
    /*
     * 벼룩장터 — **정규직** 구인. 알바몬(일용직)과 나란히 두되 성격이 다르다:
     * 여기서는 한 번 채용되면 고용이 지속되고, 지원 → 서류 → 면접 → 최종 결과라는
     * 며칠짜리 절차를 지난다. 이름은 생활정보지(벼룩시장) 패러디이고 실존 상호가 아니다.
     */
    id: 'flea',
    url: 'https://www.byeorukjangteo.com',
    title: '벼룩장터',
    icon: 'fluent-color:building-multiple-24',
    render: 'career',
    // 아무 공고도 안 고른 상태의 확정 패널이 그릴 활동. 실제 실행은 화면 상태가 정한다
    // (지원 / 면접 / 출근). 알바몬의 기본값 규칙과 같다.
    activityId: 'job-apply',
    promo: {
      tag: '벼룩장터',
      title: '정규직 구인·구직',
      desc: '지원하고, 면접 보고, 월급 받으세요',
      gradient: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
    },
  },
  {
    /*
     * O넷 — **자격증 시험**. 벼룩장터 바로 옆에 두는 것이 자리의 뜻이다(설계자 지시):
     * 여기서 딴 것이 저기의 지원 자격이 된다. 이름은 자격 포털 패러디이고 실존 기관이 아니며,
     * 종목명도 전부 지어낸 일반명사형이다(`data/certs.ts`).
     */
    id: 'onet',
    url: 'https://www.o-net.or.kr',
    title: 'O넷',
    // ⚠️ 다른 사이트와 겹치지 않는 글리프여야 한다(`sites.test.ts`가 지킨다).
    icon: 'fluent-color:ribbon-star-24',
    render: 'cert',
    /*
     * ⚠️ **아무 종목도 안 고른 상태의 기본값이다**(알바몬·슬로우캠퍼스와 같은 구조).
     * 실행하는 활동은 종목이 넷이어도 이 하나뿐이고, 무엇을 응시하는지는 고른 종목이
     * 정한다. ⚠️ **응시료는 여기 적지 않는다** — 종목마다 다르므로 `Cert.fee`가 단일 출처다.
     */
    activityId: 'exam',
    /*
     * 퀵메뉴가 아니라 소개 카드로 뜬다(설계자 지시) — 쇼핑을 한 칸 뒤로 밀고 그 자리다.
     * 응시가 무엇을 여는지는 아이콘 하나로 전해지지 않는다: 바로 옆 벼룩장터 카드가
     * "지원하고, 면접 보고"라고 적혀 있어야 이 카드의 "지원 자격"이 읽힌다.
     * 그라데이션은 CertSite의 확정 보라(`--qn-strip` → `--qn-primary`)를 그대로 쓴다.
     */
    promo: {
      tag: 'O넷',
      title: '자격증 시험 접수',
      desc: '응시하고, 발표일에 결과를 받으세요',
      gradient: 'linear-gradient(135deg, #5b21b6 0%, #6d28d9 100%)',
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
    // ⚠️ 예전의 '강의'가 이 항목이다(설계자 지시로 슬로우캠퍼스로 통합).
    // id를 'lecture'로 남기지 않은 이유: 표시 이름과 완전히 갈라지면 코드에서 헷갈린다.
    // 별도로 있던 slowcampus 항목은 지웠다 — 같은 것이 두 개일 이유가 없다.
    id: 'slowcampus',
    url: 'https://www.slowcampus.com',
    title: '슬로우캠퍼스',
    icon: 'fluent-color:book-star-24',
    render: 'campus',
    notice: '듣고 싶은 강의를 고르세요.',
    bookmark: true,
    /*
     * ⚠️ **알바몬과 같은 구조다: 강의마다 실행 활동이 다르다.**
     * 여기 적은 것은 "아무것도 안 고른 상태의 기본값"이고, 실제로 실행되는 활동은
     * 고른 강의(`data/courses.ts`의 `Course.activityId`)가 정한다.
     * ⚠️ **수강료는 여기 적지 않는다** — 강의마다 다르므로 `Course.price`가 단일 출처다.
     */
    activityId: 'study',
  },
  {
    id: 'youtube',
    url: 'https://www.nutube.com',
    title: '너튜브',
    // ⚠️ 예전에는 'fluent-color:video-24'였다. 극장 사이트(시집이)가 필름 글리프를
    // 가져가면서 화면 글리프로 옮겼다 — 사이트 아이콘은 탭 파비콘·퀵메뉴·즐겨찾기
    // 세 자리에 흐르는 **정체성**이라 두 사이트가 같은 아이콘을 쓰면 구분이 사라진다.
    icon: 'fluent-color:content-view-24',
    render: 'tube',
    notice: '보고 싶은 영상을 고르세요.',
    bookmark: true,
  },
  {
    // ⚠️ 예전에 따로 있던 'sns' 사이트를 이 항목이 흡수했다(설계자 지시).
    // 슬로우캠퍼스가 '강의'를 흡수한 것과 같은 이유 — 같은 것이 둘이면 즐겨찾기 줄과
    // 퀵메뉴에서 어느 쪽을 눌러야 할지 알 수 없다. `activities.ts`의 'sns' 활동은
    // 그대로 남는다: 그건 사이트가 아니라 **행동**이고 스케줄러에서도 쓰인다.
    id: 'twitter',
    url: 'https://www.twiter.com',
    title: '트위터',
    icon: 'fluent-color:chat-multiple-24',
    render: 'twitter',
    /*
     * ⚠️ **고를 것이 없는 사이트다**(알바몬·슬로우캠퍼스와 다르다). 타임라인을 아무리
     * 넘겨도 실행되는 활동은 이 하나이고, 수치는 `data/activities.ts`의 'sns'가 갖는다 —
     * 여기 다시 적으면 밸런스 테스트가 못 보는 두 번째 출처가 생긴다.
     */
    activityId: 'sns',
    bookmark: true,
  },
  /*
   * ── 활동을 실행하는 사이트 3종 (2026-08-04 신설) ──
   * 셋 다 규칙이 같다: **둘러보기는 무료이고, 확정 버튼 하나만 1턴을 쓴다.**
   * 목록을 넘기고 고르는 동안에는 게임 상태를 읽기만 한다.
   */
  {
    id: 'midibooks',
    url: 'https://www.midibooks.com',
    title: '미디북스',
    icon: 'fluent-color:library-24',
    render: 'library',
    activityId: 'reading',
    bookmark: true,
  },
  {
    id: 'sizibi',
    url: 'https://www.sizibi.com',
    title: '시집이',
    // 극장 예매 사이트다. 필름 글리프는 여기가 가져간다(너튜브 항목 주석 참조).
    icon: 'fluent-color:video-24',
    render: 'cinema',
    activityId: 'movie',
    bookmark: true,
  },
  {
    id: 'ajeom',
    url: 'https://www.ajeom.com',
    title: '아점',
    icon: 'fluent-color:notebook-24',
    render: 'publish',
    activityId: 'writing',
    bookmark: true,
  },
  {
    id: 'bank',
    url: 'https://bank.neinom.com',
    title: '네이놈은행',
    icon: 'fluent-color:savings-24',
    render: 'bank',
    promo: {
      tag: '네이놈은행',
      title: '예금과 대출',
      desc: '맡기면 이자가 붙고, 빌리면 더 붙습니다',
      gradient: 'linear-gradient(135deg, #0b5c3b 0%, #2f9e6e 100%)',
    },
  },
  {
    /*
     * 방구석부동산 — **이사**. 은행과 같은 부류다(활동을 실행하지 않는 기능 사이트).
     * 여기서 사는 것은 물건도 활동도 아니라 **영구히 낮아진 생활비**이고, 그래서
     * 이 게임에서 죽음의 원인 자체를 건드리는 유일한 사이트다.
     * 이름은 "방을 구하는 곳"과 "방구석"의 말장난이고 실존 상호가 아니다.
     */
    id: 'realty',
    url: 'https://room.neinom.com',
    title: '방구석부동산',
    // ⚠️ 다른 사이트와 겹치지 않는 글리프여야 한다(`sites.test.ts`가 지킨다).
    icon: 'fluent-color:building-people-24',
    render: 'realty',
    promo: {
      tag: '방구석부동산',
      title: '생활비를 줄이는 방',
      desc: '보증금은 돌려받고, 매일 나가는 돈은 줄어듭니다',
      gradient: 'linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)',
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
