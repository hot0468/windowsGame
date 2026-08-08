/**
 * 배달의정석(배달 음식 주문)에 걸리는 메뉴.
 *
 * ⚠️ **수치가 없다. 어느 활동을 실행하는지 가리키기만 한다**(알바몬 공고 → 알바 4종과
 * 정확히 같은 구조). 값·효과는 `data/activities.ts`의 `meal-junk` / `meal-healthy`가
 * 갖고, 화면의 가격은 `previewActivity`가 돌려준 money 행에서 파생된다 —
 * 여기에 가격을 다시 적으면 밸런스 테스트가 못 보는 두 번째 출처가 생긴다.
 *
 * ⚠️ **실존 프랜차이즈를 쓰지 않는다**(배너·사이트와 같은 규칙). 가게 이름은 전부 지어냈다.
 *
 * ⚠️ **사진이 아니라 CSS 그라데이션이다**(오프라인 규칙 — 외부 이미지 금지).
 */
export interface Dish {
  id: string
  name: string
  /** 가게 이름. 카드 위 작은 줄. */
  shop: string
  /**
   * 이 메뉴가 실행하는 활동 id.
   * ⚠️ 같은 활동을 가리키는 메뉴들은 **값이 같다** — 알바몬에서 같은 직종 공고 둘이
   * 같은 일당인 것과 같은 이유다(화면이 파생시키는 값이 하나여야 표시가 참이 된다).
   */
  activityId: string
  /** 사진 자리의 배경. */
  cover: string
  /** 배달 예상 시간. 표시 전용이다 — 게임의 턴과 잇지 않는다. */
  eta: string
  /** 별점. ⚠️ 정적 값이다(`Math.random` 금지 — 뉴스·시집이와 같은 결정성 규칙). */
  rating: number
  desc: string
}

/** 메뉴 분류. 실행 활동과 1:1이라 목록을 두 벌로 만들지 않는다. */
export const DISH_TABS = [
  { activityId: 'meal-junk', label: '정크푸드' },
  { activityId: 'meal-healthy', label: '건강식' },
] as const

export const DISHES: Dish[] = [
  {
    id: 'fried-chicken',
    name: '후라이드 한 마리 + 콜라',
    shop: '왕관치킨',
    activityId: 'meal-junk',
    cover: 'linear-gradient(140deg, #7a2e0c 0%, #c2551f 55%, #e8974a 100%)',
    eta: '35~45분',
    rating: 4.8,
    desc: '튀김옷이 두껍다. 다 먹고 나면 늘 후회하지만 다음에도 시킨다.',
  },
  {
    id: 'double-burger',
    name: '더블패티 버거 세트',
    shop: '버거하우스',
    activityId: 'meal-junk',
    cover: 'linear-gradient(140deg, #5a2410 0%, #a04a20 55%, #d98850 100%)',
    eta: '25~35분',
    rating: 4.5,
    desc: '패티가 둘이라 한 손으로는 안 잡힌다.',
  },
  {
    id: 'cheese-pizza',
    name: '치즈 폭탄 피자 L',
    shop: '동네피자',
    activityId: 'meal-junk',
    cover: 'linear-gradient(140deg, #7a1f1f 0%, #c23a2f 55%, #e88a5a 100%)',
    eta: '30~40분',
    rating: 4.6,
    desc: '한 판을 혼자 다 먹을 수 있는지 매번 시험하게 된다.',
  },
  {
    id: 'night-tteok',
    name: '엽기 떡볶이 + 튀김',
    shop: '분식창고',
    activityId: 'meal-junk',
    cover: 'linear-gradient(140deg, #8a1030 0%, #cc2b4a 55%, #ee7a8a 100%)',
    eta: '20~30분',
    rating: 4.7,
    desc: '맵다는 걸 알면서 시킨다. 다음 날 아침에 후회한다.',
  },
  {
    id: 'salad-bowl',
    name: '닭가슴살 샐러드볼',
    shop: '초록그릇',
    activityId: 'meal-healthy',
    cover: 'linear-gradient(140deg, #14532d 0%, #2f7d4f 55%, #7cc79b 100%)',
    eta: '25~35분',
    rating: 4.4,
    desc: '드레싱을 다 부으면 의미가 없어진다는 걸 알면서도 다 붓는다.',
  },
  {
    id: 'korean-set',
    name: '집밥 백반 정식',
    shop: '엄마손식당',
    activityId: 'meal-healthy',
    cover: 'linear-gradient(140deg, #3d3416 0%, #7a6a2e 55%, #c4b370 100%)',
    eta: '30~40분',
    rating: 4.9,
    desc: '반찬이 다섯 가지다. 국이 아직 뜨겁다.',
  },
  {
    id: 'poke-bowl',
    name: '연어 포케볼',
    shop: '초록그릇',
    activityId: 'meal-healthy',
    cover: 'linear-gradient(140deg, #0f3b4a 0%, #1f7a8c 55%, #6ec0cc 100%)',
    eta: '30~40분',
    rating: 4.3,
    desc: '사진이 제일 잘 나오는 메뉴. 맛도 그럭저럭 따라온다.',
  },
  {
    id: 'soup-set',
    name: '삼계탕 1인 세트',
    shop: '엄마손식당',
    activityId: 'meal-healthy',
    cover: 'linear-gradient(140deg, #4a3a12 0%, #8a6f24 55%, #c8ab5e 100%)',
    eta: '40~50분',
    rating: 4.6,
    desc: '뚝배기째 온다. 그릇을 돌려줘야 하는지 매번 헷갈린다.',
  },
]

export function findDish(id: string): Dish | undefined {
  return DISHES.find((d) => d.id === id)
}

/** 그 활동을 실행하는 메뉴. 컴포넌트가 id를 나열하지 않는다(`jobsOf`와 같은 규칙). */
export function dishesOf(activityId: string): Dish[] {
  return DISHES.filter((d) => d.activityId === activityId)
}
