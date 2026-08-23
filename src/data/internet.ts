/**
 * 인터넷 요금제 — **빠른 회선을 쓰면 하는 일이 빨리 끝난다**(2026-08-22 설계자 지시).
 *
 * ## 왜 이 게임에서 뜻이 있나
 * 시간이 분으로 흐르게 되면서(`data/clock.ts`) **하루 960분이 곧 자원**이 됐다. 요금제는
 * 이 게임에서 **돈으로 시간을 사는 유일한 자리**다 — 다른 지출은 스탯이나 물건을 사지만
 * 이것은 매일의 분을 산다.
 *
 * ## ⚠️ 기본 회선은 공짜다
 * 값이 0인 것은 인심이 아니라 **이미 생활비에 들어 있기 때문**이다(하루 30,000원에는
 * 방값과 함께 기본 회선이 들어 있다고 본다). 기본에도 값을 매기면 판을 시작하는 모든
 * 사람에게 숨은 고정비가 하나 더 생기고, 그 값은 생활비와 구분이 안 된다.
 *
 * ## ⚠️ 배율은 얕게 둔다
 * 0.9·0.8이면 하루에 활동 하나가 더 들어가는 정도다. 0.5까지 내리면 요금제가 곧 실력이
 * 되어 "돈이 있으면 두 배로 산다"가 된다 — 이 게임의 성장은 스탯이 지는 것이지
 * 결제가 지는 것이 아니다.
 */

export interface InternetPlan {
  id: string
  name: string
  /** 속도 표기. 화면에만 쓰는 문구다(수치가 아니다). */
  speed: string
  /** 한 달(30일) 요금. 기본 회선은 0이다 — 사유는 위 머리말. */
  monthly: number
  /**
   * 활동 소요 시간에 곱하는 배율. 1이 기본이고 낮을수록 빨리 끝난다.
   * ⚠️ **모든 활동에 붙는다**(설계자 지시: "행동에 드는 시간이 줄어듬") — 어느 활동은
   * 빨라지고 어느 활동은 아니게 나누면 그 목록이 곧 두 번째 밸런스 축이 된다.
   */
  timeFactor: number
  desc: string
}

export const INTERNET_PLANS: InternetPlan[] = [
  {
    id: 'basic',
    name: '기본 100M',
    speed: '100Mbps',
    monthly: 0,
    timeFactor: 1,
    desc: '방에 원래 들어와 있던 회선. 느리지만 값이 따로 안 나간다.',
  },
  {
    id: 'giga',
    name: '기가 라이트',
    speed: '1Gbps',
    monthly: 45_000,
    timeFactor: 0.9,
    desc: '내려받기가 기다림이 아니게 된다. 하루가 한 뼘 길어진다.',
  },
  {
    id: 'giga10',
    name: '10기가 프로',
    speed: '10Gbps',
    monthly: 90_000,
    timeFactor: 0.8,
    desc: '이 방에서 이 속도가 필요한 일이 있느냐고 묻지 않는 요금제.',
  },
]

/** 이사 오기 전부터 들어와 있던 회선. `state.internet`이 없으면 이 값으로 읽는다. */
export const DEFAULT_PLAN_ID = INTERNET_PLANS[0].id

export function findPlan(id: string): InternetPlan | undefined {
  return INTERNET_PLANS.find((p) => p.id === id)
}

/**
 * 그 상태의 요금제. **`data/`에 있는 이유는 `turn.ts`가 이것을 쓰기 때문이다** —
 * 규칙 쪽(`systems/internet.ts`)에 두면 `turn ↔ internet` 순환 import가 된다
 * (계절 `seasonOf`가 data에 사는 것과 같은 이유).
 */
export function planOf(state: { internet?: { planId: string } }): InternetPlan {
  return findPlan(state.internet?.planId ?? DEFAULT_PLAN_ID) ?? findPlan(DEFAULT_PLAN_ID)!
}

/** 활동 시간에 곱하는 배율. `turn.ts`의 `activityMinutes`가 이 값 하나만 본다. */
export function timeFactorOf(state: { internet?: { planId: string } }): number {
  return planOf(state).timeFactor
}
