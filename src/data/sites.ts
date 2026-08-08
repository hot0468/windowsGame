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
   * 그목 — **부업(외주) 중개**. 알바몬('jobs')과 구조가 같다(고른 일감이 실행 활동을
   * 정하고 `Site.activityId`는 기본값이다). 다른 점은 **잠금의 종류**다: 알바는 스탯이
   * 열고, 여기는 **수료증과 구독**이 열어 준다.
   */
  | 'gig'
  /**
   * 어도비 — **구독 결제**. 은행·부동산과 같은 "기능 사이트"다(`activityId` 없음,
   * 확정 패널 없음, 턴을 쓰지 않는다). ⚠️ 파는 것은 물건도 활동도 아니라
   * **매달 나가는 지출과 그것이 여는 둘**(포토샵 아이콘 + 그목 디자인 일감)이다.
   */
  | 'adobe'
  /**
   * O넷 — 자격증 시험. 슬로우캠퍼스('campus')처럼 **고른 종목이 비용을 정한다**
   * (`Cert.fee`). 다만 결과가 즉시 나지 않는다: 응시는 1턴이고 **합격은 발표일에**
   * 확정되어 자격증이 인벤토리로 들어온다.
   */
  | 'cert'
  /**
   * 네이놈은행 — 예금·대출. ⚠️ **활동을 실행하지 않는 유일한 "기능 사이트"다**
   * (`activityId`가 없다). 거래는 턴을 쓰지 않으므로 실행 확인창(`ActivityConfirm`)도 없다.
   */
  | 'bank'
  /**
   * 네이놈증권 — **주식**. 은행과 같은 부류의 "기능 사이트"다(`activityId` 없음,
   * 확정 패널 없음, 턴을 쓰지 않는다). ⚠️ **성격은 은행과 정반대로 갈라 뒀다**:
   * 은행은 참으면 확실히 조금 붙고, 증권은 맞히면 빨리 붙고 틀리면 줄어든다.
   * ⚠️ 시세는 세이브에 없다 — **날짜의 순수 함수**다(`systems/stocks.ts`).
   */
  | 'stock'
  /**
   * 방구석부동산 — 이사. 은행과 같은 성격의 "기능 사이트"다(`activityId` 없음,
   * 확정 패널 없음, 턴을 쓰지 않는다). 파는 것은 활동이 아니라 **영구히 낮아진 생활비**다.
   */
  | 'realty'
  /**
   * 하이마루 — 전자기기 양판점. **쇼핑('shop')과 같은 부류다**: 물건을 팔고, 주문은
   * 턴을 쓰지 않으며(`activityId` 없음), 효과는 다음 날 도착해야 난다
   * (`systems/delivery.ts`를 그대로 탄다 — 새 배송 경로를 만들지 않는다).
   * 컬리엔마트와 갈라 둔 것은 **진열 축**뿐이다(`ShopItem.store`).
   */
  | 'tech'
  /**
   * 무진장 — 의류 쇼핑몰. **하이마루와 같은 부류다**(물건을 팔고 턴을 쓰지 않는다).
   * 다른 것은 파는 물건의 성격뿐이다: 옷은 도착해도 스탯을 주지 않고,
   * **가지고 있는 동안 TPO가 맞는 활동의 성장 상승분을 키운다**(`ShopItem.outfit`).
   */
  | 'wear'
  /**
   * 트위터 — 3열 타임라인. 미디북스('library')와 같은 부류다: **고르는 것이 없고**
   * 사이트가 가리키는 활동(`sns`) 하나를 확정 패널이 그대로 실행한다.
   * 탭·검색·트렌드는 전부 목록을 거를 뿐 게임 상태를 **읽기만** 한다.
   */
  | 'twitter'
  /**
   * 노24 — **공연 예매**. 시집이('cinema')와 같은 부류다: 목록에서 고르는 것은 무엇을
   * 보러 가는가뿐이고, 실행되는 활동(`concert`)과 관람료는 활동 하나가 갖는다.
   */
  | 'ticket'
  /**
   * 먼바다투어 — **여행 예약**. 노24와 같은 구조이고 파는 것만 다르다(`travel`).
   * ⚠️ 둘 다 **포털 가로 띠의 이동용 배너**가 목적지다 — 배너와 사이트의 색을 맞춰 둔다.
   */
  | 'trip'
  /**
   * 배달의정석 — **배달 음식 주문**. 알바몬('jobs')과 같은 구조다: 고른 메뉴가
   * **어느 활동을 실행할지 정하고**(정크푸드 / 건강식) 값은 활동이 갖는다.
   *
   * ⚠️ **`systems/delivery.ts`(택배)와 다른 것이다.** 이름이 겹치지 않도록 render는
   * `'food'`이고, 음식은 인벤토리에 쌓이지도 다음 날 도착하지도 않는다 — 1턴을 쓰고 끝난다.
   */
  | 'food'

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
     * 그목 — **부업 중개**. 버룩장터 바로 옆이 자리의 뜻이다(설계자 지시):
     * 저기는 "들어가서 다니는 일", 여기는 "건별로 받는 일"이라 둘이 나란히 서야
     * 고를 것이 된다. 이름은 재능 거래 플랫폼 상호의 호의적 패러디이고 실존 상호가 아니다.
     */
    id: 'gmong',
    url: 'https://www.gmong.com',
    title: '그목',
    // ⚠️ 다른 사이트와 겹치지 않는 글리프여야 한다(`sites.test.ts`가 지킨다).
    icon: 'fluent-color:people-team-24',
    render: 'gig',
    /* ⚠️ **아무것도 안 고른 상태의 기본값**이다(알바몬·슬로우캐퍼스와 같은 구조).
       조건 없는 일감을 기본값으로 두어야 확정 창이 처음부터 무언가를 그린다. */
    activityId: 'gig-typing',
    promo: {
      tag: '그목',
      title: '건별로 받는 일',
      desc: '자격과 도구가 일감을 열어 줍니다',
      gradient: 'linear-gradient(135deg, #0b5163 0%, #1a9fb0 100%)',
    },
  },
  {
    /*
     * 어도비 — **구독**. 그목 바로 뒤에 두는 것이 자리의 뜻이다:
     * 저기서 받고 싶은 일감이 여기서 열린다.
     * ⚠️ **은행·부동산처럼 `activityId`가 없다** — 결제는 턴을 쓰지 않는다.
     * ⚠️ 이름은 바탕화면의 포토샵·VS 코드와 같은 **프로그램 이름 계열**이다
     * (지어낸 상호를 쓰는 광고·가게와는 축이 다르다).
     */
    id: 'adobe',
    url: 'https://www.adobe.com/kr',
    title: '어도비',
    icon: 'fluent-color:design-ideas-24',
    render: 'adobe',
    /* ⚠️ **소개 카드가 이 사이트의 유일한 입구다.** 그몽이 "어도비 구독 중이어야 합니다"라고
       막아 두는데 갈 길이 없으면 그 사유가 막다른 골목이 된다 — 갈 데 없는 링크를 만들지
       않는다는 규칙의 뒤집힌 형태다. 그몽 카드 바로 옆이라 "일감 → 도구"가 자리로 읽힌다. */
    promo: {
      tag: '어도비',
      title: '구독하면 열리는 것',
      desc: '포토샵이 설치되고 디자인 일감을 받을 수 있습니다',
      gradient: 'linear-gradient(135deg, #1a1a1a 0%, #e0483c 100%)',
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
    /*
     * 하이마루 — **전자기기 양판점**. 쇼핑(컬리엔마트) 바로 뒤에 두는 것이 자리의 뜻이다:
     * 같은 "물건을 사는 곳"이고 배송 규칙도 똑같다. 다른 것은 진열하는 물건뿐이다
     * (`ShopItem.store === 'tech'`).
     *
     * ⚠️ **은행·부동산과 같이 `activityId`가 없다** — 주문은 턴을 쓰지 않으므로 실행
     * 확인창(`ActivityConfirm`)도 없다(`sites.test.ts`가 지킨다). 비용은 슬롯이 아니라
     * **돈과 배송 하루**다.
     *
     * 이름은 가전 양판점 상호("하이마트")의 호의적 패러디이고 실존 상호가 아니다.
     * ⚠️ 아이콘은 다른 사이트 열셋과 겹치지 않아야 한다(`sites.test.ts`가 지킨다).
     */
    id: 'himaru',
    url: 'https://www.himaru.co.kr',
    title: '하이마루',
    icon: 'fluent-color:phone-laptop-24',
    render: 'tech',
    notice: '주문한 기기는 다음 날 도착합니다.',
    promo: {
      tag: '하이마루',
      title: '전자기기 전문관',
      desc: '장비를 갖추면 할 수 있는 일이 늘어납니다',
      gradient: 'linear-gradient(135deg, #9a3412 0%, #ea580c 100%)',
    },
  },
  {
    /*
     * 무진장 — 의류. 하이마루 뒤에 두는 것이 자리의 뜻이다(둘 다 "물건을 사는 곳").
     * ⚠️ **은행·부동산·하이마루와 같이 `activityId`가 없다** — 주문은 턴을 쓰지 않는다.
     * 이름은 실존 패션 플랫폼의 호의적 패러디이고 실존 상호가 아니다.
     */
    id: 'mujinjang',
    url: 'https://www.mujinjang.com',
    title: '무진장',
    // ⚠️ O넷이 `ribbon-star-24`를 쓴다 — 사이트 아이콘은 서로 겹치면 안 된다(`sites.test.ts`).
    icon: 'fluent-color:ribbon-24',
    render: 'wear',
    notice: '주문한 옷은 다음 날 도착합니다.',
    promo: {
      tag: '무진장',
      title: '때와 장소에 맞는 옷',
      desc: '갖춰 입으면 같은 일을 해도 조금 더 남습니다',
      gradient: 'linear-gradient(135deg, #831843 0%, #be185d 100%)',
    },
  },
  {
    /*
     * 배달의정석 — **배달 음식**. 가게 셋(쇼핑·하이마루·무진장) 뒤에 두는 것이 자리의
     * 뜻이다: 포털 상단 쇼핑 띠에 **배달 탭**으로 함께 걸린다(설계자 지시).
     *
     * ⚠️ 물건을 파는 가게들과 달리 **`activityId`가 있다** — 음식은 배송되는 물건이 아니라
     * 그 자리에서 먹는 것이라 1턴을 쓴다(`ShopItem`을 만들지 않는다).
     * 여기의 id는 **아무것도 안 고른 상태의 기본값**이고 실제 실행은 고른 메뉴가 정한다
     * (알바몬과 같은 규칙 — `data/dishes.ts`).
     * 이름은 배달 앱 상호의 호의적 패러디이고 실존 상호가 아니다.
     */
    id: 'baedal',
    url: 'https://www.baedal-jeongseok.com',
    title: '배달의정석',
    icon: 'fluent-color:food-24',
    render: 'food',
    activityId: 'meal-junk',
  },
  {
    /*
     * 노24 — **공연 예매**. 시집이(영화) 옆에 서는 자리이고 구조도 같다.
     * ⚠️ 즐겨찾기·소개 카드에 올리지 않는다 — **포털 가로 띠의 이동용 배너**가 이 사이트의
     * 입구다(설계자 지시). 입구를 셋으로 늘리면 배너가 "그냥 광고"로 읽힌다.
     * 이름은 티켓 예매 사이트 상호의 호의적 패러디이고 실존 상호가 아니다.
     */
    id: 'no24',
    url: 'https://ticket.no24.com',
    title: '노24',
    icon: 'fluent-color:megaphone-loud-24',
    render: 'ticket',
    activityId: 'concert',
  },
  {
    /*
     * 먼바다투어 — **여행 예약**. 노24와 같은 부류다(고르는 것은 목적지뿐, 값은 활동이 갖는다).
     * ⚠️ 이 사이트도 입구가 배너 하나다. 배너 그라데이션(심해 남색 → 바다 파랑 → 청록)을
     * 사이트 팔레트로 그대로 이어받아, 누르고 들어온 자리가 같은 색으로 이어지게 했다.
     */
    id: 'farsea',
    url: 'https://www.farsea-tour.com',
    title: '먼바다투어',
    icon: 'fluent-color:beach-24',
    render: 'trip',
    activityId: 'travel',
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
    // ⚠️ [내 채널]의 방송 시작이 실행하는 활동. 예전에는 `stream`이 정의만 있고
    // 브라우저에서 갈 데가 없었다(스케줄러·바로 가기로만 닿았다).
    activityId: 'stream',
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
     * 네이놈증권 — **주식**. 은행 바로 옆이다(설계자 지시). 배열 순서가 곧 포털 하단
     * 소개 격자의 순서라 여기 두면 은행 카드 옆에 선다.
     *
     * ⚠️ **은행·부동산과 같은 부류다**: 활동을 실행하지 않고 **턴을 쓰지 않는다**
     * (`activityId`가 없다 — `sites.test.ts`가 지킨다). 파는 것은 슬롯이 아니라 **위험**이다.
     * ⚠️ 은행과 성격을 갈라 뒀다: 은행은 **참으면 확실히 조금 붙는 곳**이고,
     * 증권은 **맞히면 빨리 붙고 틀리면 줄어드는 곳**이다. 둘이 같으면 하나가 남는다.
     */
    id: 'stock',
    url: 'https://stock.neinom.com',
    title: '네이놈증권',
    // ⚠️ 다른 사이트와 겹치지 않는 글리프여야 한다(`sites.test.ts`가 지킨다).
    icon: 'fluent-color:data-trending-24',
    render: 'stock',
    promo: {
      tag: '네이놈증권',
      title: '오르내리는 것에 걸기',
      desc: '맞히면 빨리 붙고, 틀리면 그만큼 줄어듭니다',
      // 슬레이트. ⚠️ 아직 아무 사이트도 안 쓴 계열이다(은행 남색·부동산 청록과 갈린다).
      gradient: 'linear-gradient(135deg, #1e293b 0%, #475569 100%)',
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

/**
 * 물건을 파는 사이트. 포털 홈에서 **상단 쇼핑 섹션**으로 올라간다(설계자 지시).
 *
 * ⚠️ **`Site`에 플래그를 더하지 않는다** — "물건을 파는 곳"은 `render`가 이미 아는 사실이고
 * (`'shop'`=네이놈쇼핑 / `'tech'`=하이마루), 플래그를 더하면 같은 사실이 두 곳에 적혀
 * 한쪽만 고치는 사고가 난다. 새 가게가 생기면 `render` 값 하나가 여기에 늘어난다.
 */
/**
 * 포털 **상단 쇼핑 띠**의 링크 줄에 걸리는 사이트.
 *
 * ⚠️ **"물건을 파는 곳"이 아니라 "쇼핑 띠에 거는 곳"이다**(2026-08-08 배달 탭 신설).
 * 배달의정석은 `ShopItem`을 팔지 않지만 같은 줄에 선다 — 플레이어에게는 둘 다
 * "돈 쓰러 가는 곳"이기 때문이다. 물건 → 가게를 찾는 쪽은 여전히 `ShopItem.store`와
 * `render`가 같은 글자라는 사실로 파생된다(`storeSiteIdOf`).
 */
export const STORE_SITES: Site[] = SITES.filter(
  (s) => s.render === 'shop' || s.render === 'tech' || s.render === 'wear' || s.render === 'food',
)

/**
 * 포털 홈 하단 소개 섹션에 그릴 사이트. 퀵메뉴와 겹치지 않는다.
 * ⚠️ **가게는 여기서 빠진다** — 위 `STORE_SITES`가 상단에서 이미 그린다(같은 카드가 둘이 된다).
 */
export const PROMO_SITES: Site[] = SITES.filter((s) => s.promo && !STORE_SITES.includes(s))

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
