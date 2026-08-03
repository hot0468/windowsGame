import {
  ECONOMY_TIERS,
  LIVING_GROWTH_RATE,
  TIER_INTERVAL,
  WAGE_GROWTH_RATE,
} from '../data/economy'
import type { EconomyTier } from '../types/game'

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

export function getLivingCost(day: number): number {
  return getEconomyTier(day).living
}

export function getWageMultiplier(day: number): number {
  return getEconomyTier(day).wageMultiplier
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
