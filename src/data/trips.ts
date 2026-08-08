/**
 * 먼바다투어(여행 예약)에 걸리는 상품.
 *
 * ⚠️ **수치가 없다. 어느 활동을 실행하는지 가리키기만 한다**(알바몬 공고·배달 메뉴와
 * 같은 구조). 값·효과는 `data/activities.ts`의 `travel-near` / `travel`이 갖고,
 * 화면의 가격은 `previewActivity`가 돌려준 money 행에서 파생된다 — 상품마다 값을 적으면
 * 밸런스 테스트가 못 보는 두 번째 출처가 생긴다.
 *
 * ⚠️ **실존 여행사·지명을 쓰지 않는다.** 지명은 전부 지어냈고 광고 문구의 톤은
 * 호의적인 패러디에 둔다.
 *
 * ⚠️ **사진이 아니라 CSS 그라데이션이다**(오프라인 규칙). 여행 상품 사진은 이 게임에서
 * 가장 유혹적인 이미지가 될 텐데, 그것을 글자와 색만으로 만드는 것이 이 사이트의 과제다.
 *
 * ⚠️ **배열 순서가 곧 화면 편성이다**(`SHOWS`와 같은 규칙): 첫 항목이 히어로에 걸린다.
 */
export interface Trip {
  id: string
  title: string
  /** 목적지. 카드 위 작은 줄. */
  destination: string
  /** 지역. 네비 줄이 곧 이 축이다. */
  region: TripRegion
  /**
   * 이 상품이 실행하는 활동 id.
   * ⚠️ 같은 활동을 가리키는 상품들은 **값이 같다** — 알바몬에서 같은 직종 공고 둘이
   * 같은 일당인 것과 같은 이유다(화면이 파생시키는 값이 하나여야 표시가 참이 된다).
   */
  activityId: string
  /** 일정 표기(3박 5일 등). 표시 전용이다 — 게임의 턴은 하나다. */
  schedule: string
  /** 카드 배경. */
  cover: string
  /** 포함 사항. 실제 여행 상품 카드의 그 줄이다. */
  includes: string[]
  blurb: string
}

/** 지역. 배열 순서가 곧 네비 순서다. */
export const TRIP_REGIONS = ['국내', '근거리', '장거리'] as const
export type TripRegion = (typeof TRIP_REGIONS)[number]

export const TRIPS: Trip[] = [
  {
    id: 'south-sea',
    title: '남태평양 리프 크루즈',
    destination: '먼바다 제도',
    region: '장거리',
    activityId: 'travel',
    schedule: '3박 5일',
    cover: 'linear-gradient(140deg, #0b3a53 0%, #14708c 55%, #0f6f6a 100%)',
    includes: ['왕복 항공', '수하물 20kg', '조식 4회', '스노클링 1회'],
    blurb: '배너에서 본 그 상품이다. 잔여 좌석은 늘 여섯 석이라고 적혀 있다.',
  },
  {
    id: 'desert-night',
    title: '사막의 밤 4일',
    destination: '붉은모래',
    region: '장거리',
    activityId: 'travel',
    schedule: '3박 4일',
    cover: 'linear-gradient(140deg, #4a2410 0%, #a1541f 55%, #d9903f 100%)',
    includes: ['왕복 항공', '사막 캠프 1박', '별 관측 가이드'],
    blurb: '낮에는 아무것도 없고 밤에는 전부 있다.',
  },
  {
    id: 'old-town',
    title: '옛 도시 골목 일주',
    destination: '돌담마을',
    region: '장거리',
    activityId: 'travel',
    schedule: '5박 7일',
    cover: 'linear-gradient(140deg, #3a2a4a 0%, #6b4a7a 55%, #b088c4 100%)',
    includes: ['왕복 항공', '시내 호텔 5박', '도보 투어 3회'],
    blurb: '골목마다 같은 간판이 걸려 있다. 그래도 하나도 안 지겹다.',
  },
  {
    id: 'aurora-north',
    title: '북극권 오로라 관측',
    destination: '흰밤 고원',
    region: '장거리',
    activityId: 'travel',
    schedule: '4박 6일',
    cover: 'linear-gradient(140deg, #0d1b3a 0%, #1f4a7a 55%, #4fc3a1 100%)',
    includes: ['왕복 항공', '방한복 대여', '오로라 알림 서비스'],
    blurb: '못 볼 수도 있다고 세 번쯤 적혀 있다.',
  },
  {
    id: 'north-onsen',
    title: '북쪽 마을 온천 3일',
    destination: '눈고개',
    region: '근거리',
    activityId: 'travel-near',
    schedule: '2박 3일',
    cover: 'linear-gradient(140deg, #24303f 0%, #4a6076 55%, #8aa2b8 100%)',
    includes: ['왕복 기차', '료칸 2박', '조·석식', '온천 무제한'],
    blurb: '눈 오는 노천탕 사진 한 장으로 다 팔린다는 상품.',
  },
  {
    id: 'island-hop',
    title: '섬 세 곳 배낭 일주',
    destination: '가까운바다',
    region: '근거리',
    activityId: 'travel-near',
    schedule: '3박 4일',
    cover: 'linear-gradient(140deg, #14532d 0%, #2f7d4f 55%, #6bab7d 100%)',
    includes: ['배편 3구간', '게스트하우스 3박', '자유 일정'],
    blurb: '가장 싼 축이지만 이 게임에서 싼 여행이란 없다.',
  },
  {
    id: 'lantern-city',
    title: '등불 축제 야경 투어',
    destination: '남포',
    region: '근거리',
    activityId: 'travel-near',
    schedule: '2박 3일',
    cover: 'linear-gradient(140deg, #4a1a10 0%, #a8451f 55%, #e8a35a 100%)',
    includes: ['왕복 항공', '시내 호텔 2박', '야시장 가이드'],
    blurb: '축제 기간에만 뜨는 상품. 사람이 정말 많다.',
  },
  {
    id: 'harbor-walk',
    title: '항구 도시 미식 2일',
    destination: '바닷말',
    region: '국내',
    activityId: 'travel-near',
    schedule: '1박 2일',
    cover: 'linear-gradient(140deg, #123a4a 0%, #2a7a8c 55%, #7ec4cc 100%)',
    includes: ['KTX 왕복', '항구 호텔 1박', '회센터 식사권'],
    blurb: '기차에서 내리면 바로 바다다. 그게 전부이자 장점이다.',
  },
  {
    id: 'temple-stay',
    title: '산사에서 이틀',
    destination: '깊은골',
    region: '국내',
    activityId: 'travel-near',
    schedule: '1박 2일',
    cover: 'linear-gradient(140deg, #1e3a24 0%, #3f6b42 55%, #8ab08a 100%)',
    includes: ['템플스테이 1박', '공양 3식', '새벽 예불'],
    blurb: '새벽 네 시에 깨운다는 말이 굵게 적혀 있다.',
  },
  {
    id: 'olle-walk',
    title: '해안 둘레길 3일',
    destination: '바람섬',
    region: '국내',
    activityId: 'travel-near',
    schedule: '2박 3일',
    cover: 'linear-gradient(140deg, #2a3a1e 0%, #5e7a34 55%, #a8c471 100%)',
    includes: ['왕복 항공', '게스트하우스 2박', '코스 지도'],
    blurb: '하루에 15km씩 걷는다. 다녀오면 다리가 굵어져 있다.',
  },
]

export function findTrip(id: string): Trip | undefined {
  return TRIPS.find((t) => t.id === id)
}

/** 그 지역의 상품. 컴포넌트가 id를 나열하지 않는다(`showsOf`와 같은 규칙). */
export function tripsOf(region: TripRegion): Trip[] {
  return TRIPS.filter((t) => t.region === region)
}

/** 히어로에 걸리는 상품. 편성은 배열 순서가 정한다. */
export const HERO_TRIP: Trip = TRIPS[0]
