/**
 * 먼바다투어(여행 예약)에 걸리는 상품.
 *
 * ⚠️ **수치가 없다.** 어디로 가든 실행되는 활동은 `travel` 하나이고 경비도 그 활동이
 * 갖는다(노24의 공연·시집이의 영화와 같은 규칙). 여기 있는 것은 **어디로 가는가**뿐이다.
 *
 * ⚠️ **실존 여행사·상품명을 쓰지 않는다.** 지명은 실제 지명 대신 지어낸 이름을 쓰고,
 * 광고 문구의 톤은 호의적인 패러디에 둔다.
 *
 * ⚠️ **사진이 아니라 CSS 그라데이션이다**(오프라인 규칙). 여행 상품 사진은 이 게임에서
 * 가장 유혹적인 이미지가 될 텐데, 그것을 글자와 색만으로 만드는 것이 이 사이트의 과제다.
 */
export interface Trip {
  id: string
  title: string
  /** 목적지. 카드 위 작은 줄. */
  destination: string
  /** 일정 표기(3박 5일 등). 표시 전용이다 — 게임의 턴은 하나다. */
  schedule: string
  /** 카드 배경. */
  cover: string
  /** 포함 사항. 실제 여행 상품 카드의 그 줄이다. */
  includes: string[]
  blurb: string
}

export const TRIPS: Trip[] = [
  {
    id: 'south-sea',
    title: '남태평양 리프 크루즈',
    destination: '먼바다 제도',
    schedule: '3박 5일',
    cover: 'linear-gradient(140deg, #0b3a53 0%, #14708c 55%, #0f6f6a 100%)',
    includes: ['왕복 항공', '수하물 20kg', '조식 4회', '스노클링 1회'],
    blurb: '배너에서 본 그 상품이다. 잔여 좌석은 늘 여섯 석이라고 적혀 있다.',
  },
  {
    id: 'north-onsen',
    title: '북쪽 마을 온천 3일',
    destination: '눈고개',
    schedule: '2박 3일',
    cover: 'linear-gradient(140deg, #24303f 0%, #4a6076 55%, #8aa2b8 100%)',
    includes: ['왕복 기차', '료칸 2박', '조·석식', '온천 무제한'],
    blurb: '눈 오는 노천탕 사진 한 장으로 다 팔린다는 상품.',
  },
  {
    id: 'desert-night',
    title: '사막의 밤 4일',
    destination: '붉은모래',
    schedule: '3박 4일',
    cover: 'linear-gradient(140deg, #4a2410 0%, #a1541f 55%, #d9903f 100%)',
    includes: ['왕복 항공', '사막 캠프 1박', '별 관측 가이드'],
    blurb: '낮에는 아무것도 없고 밤에는 전부 있다.',
  },
  {
    id: 'island-hop',
    title: '섬 세 곳 배낭 일주',
    destination: '가까운바다',
    schedule: '5박 6일',
    cover: 'linear-gradient(140deg, #14532d 0%, #2f7d4f 55%, #6bab7d 100%)',
    includes: ['배편 3구간', '게스트하우스 5박', '자유 일정'],
    blurb: '가장 싼 상품이지만 이 게임에서 싼 여행이란 없다.',
  },
]

export function findTrip(id: string): Trip | undefined {
  return TRIPS.find((t) => t.id === id)
}
