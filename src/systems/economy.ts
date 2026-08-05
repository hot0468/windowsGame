import {
  ECONOMY_TIERS,
  LIVING_GROWTH_RATE,
  TIER_INTERVAL,
  WAGE_GROWTH_RATE,
} from '../data/economy'
import { DEFAULT_HOUSING_ID, findHousing } from '../data/housing'
import type { EconomyTier, GameState } from '../types/game'

/** 표의 마지막 구간. 이 날짜 이후는 외삽으로 계산한다. */
const LAST_TIER = ECONOMY_TIERS[ECONOMY_TIERS.length - 1]

/**
 * 마지막 표 구간에서 steps번 인상된 구간을 만든다.
 * 생활비는 LIVING_GROWTH_RATE, 알바비는 그보다 낮은 WAGE_GROWTH_RATE로 오르므로
 * 구간이 지날수록 생활비가 알바비를 영구히 앞지른다 — 무한 플레이를 막는 장치다.
 */
function extrapolate(steps: number): EconomyTier {
  return {
    day: LAST_TIER.day + steps * TIER_INTERVAL,
    living: Math.round(LAST_TIER.living * Math.pow(LIVING_GROWTH_RATE, steps)),
    wageMultiplier:
      Math.round(LAST_TIER.wageMultiplier * Math.pow(WAGE_GROWTH_RATE, steps) * 100) / 100,
  }
}

/** 해당 날짜에 적용되는 물가 구간. 표 범위는 역순 탐색, 그 이후는 외삽한다. */
export function getEconomyTier(day: number): EconomyTier {
  if (day >= LAST_TIER.day) {
    return extrapolate(Math.floor((day - LAST_TIER.day) / TIER_INTERVAL))
  }
  for (let i = ECONOMY_TIERS.length - 1; i >= 0; i--) {
    if (day >= ECONOMY_TIERS[i].day) return ECONOMY_TIERS[i]
  }
  return ECONOMY_TIERS[0]
}

/**
 * **집 배율을 곱하지 않은** 그 날의 기준 생활비.
 *
 * ⚠️ **화면에도 정산에도 이 값을 쓰지 않는다.** 플레이어가 실제로 내는 돈은
 * `getLivingCost(state)`이고, 이 함수는 **물가 곡선 자체를 재는 자리**(뉴스 예고,
 * 물가 테스트)에만 쓴다. 이름에 `ForDay`가 붙어 있는 것이 그 경고다 —
 * 정산 경로에서 이 함수를 보면 그 화면은 이사한 플레이어에게 거짓말을 하는 것이다.
 */
export function livingCostForDay(day: number): number {
  return getEconomyTier(day).living
}

/**
 * 지금 사는 집의 생활비 배율. 이사한 적이 없으면 1이다.
 *
 * 모르는 매물 id가 저장돼 있으면(데이터에서 매물을 지운 경우) 기본 집으로 읽는다 —
 * 배율을 못 찾아 NaN이 되면 생활비가 NaN이 되고 `NaN <= 0`이 false라
 * **파산이 영영 안 걸린다**(`reviveBank`가 막는 것과 같은 사고 형태).
 */
export function housingRate(state: GameState): number {
  const id = state.housing?.id ?? DEFAULT_HOUSING_ID
  return findHousing(id)?.rate ?? findHousing(DEFAULT_HOUSING_ID)?.rate ?? 1
}

/**
 * **오늘 밤 실제로 빠져나가는 생활비.** = 물가 구간 × 집 배율.
 *
 * ⚠️ **생활비를 읽는 모든 곳이 이 함수를 지나야 한다** — 밤 정산, 스탯창 안내,
 * 자동 진행 위험선, 확정 패널 경고, 작업 관리자, 포털, 은행, 밸런스 시뮬레이션.
 * 하나라도 `livingCostForDay`에 남으면 **그 화면만 조용히 이사 전 금액을 보여 준다**
 * (숫자가 틀린 UI는 규칙이 틀린 것보다 알아채기 어렵다).
 *
 * ⚠️ **곱하는 순서가 규칙이다: 물가가 먼저, 집이 나중.** 그래야 물가 곡선이 그대로
 * 위에 얹힌다 — **싼 방에 사는 사람도 인플레를 똑같은 비율로 맞는다.** 이사는 곡선의
 * 기울기를 바꾸는 것이 아니라 **상수를 줄이는 것**이고, 그래서 이사해도 판은 끝난다.
 */
export function getLivingCost(state: GameState): number {
  return Math.round(livingCostForDay(state.day) * housingRate(state))
}

export function getWageMultiplier(day: number): number {
  return getEconomyTier(day).wageMultiplier
}

/**
 * **다음 인상 구간이 오면 내가 낼 생활비.** = 그 구간의 기준값 × 지금 집 배율.
 *
 * ⚠️ 예고 줄이 `EconomyTier.living`을 그대로 적으면 **이사한 플레이어에게만 거짓말**을
 * 한다("오늘 21,600원 → 5일 후 60,000원"처럼 이사 전 금액으로 튀어 보인다).
 * 오늘 금액과 예고 금액이 **같은 배율 위에** 있어야 두 숫자를 나란히 읽을 수 있다.
 */
export function tierCostFor(state: GameState, tier: EconomyTier): number {
  return Math.round(tier.living * housingRate(state))
}

/**
 * 아직 오지 않은 다음 인상 구간. 뉴스 예고에 사용한다.
 * 표를 넘어선 날짜에서도 외삽으로 다음 구간을 만들어 항상 값을 반환한다 —
 * null을 반환하면 후반에 인상 경고가 사라져 플레이어가 압박을 못 느낀다.
 */
export function getNextTier(day: number): EconomyTier {
  const fromTable = ECONOMY_TIERS.find((t) => t.day > day)
  if (fromTable) return fromTable
  return extrapolate(Math.floor((day - LAST_TIER.day) / TIER_INTERVAL) + 1)
}
