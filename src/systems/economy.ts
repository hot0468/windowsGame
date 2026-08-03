import { ECONOMY_TIERS } from '../data/economy'
import type { EconomyTier } from '../types/game'

/** 해당 날짜에 적용되는 물가 구간. 뒤에서부터 탐색해 첫 매치를 쓴다. */
export function getEconomyTier(day: number): EconomyTier {
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

/** 아직 오지 않은 다음 인상 구간. 뉴스 예고에 사용한다. */
export function getNextTier(day: number): EconomyTier | null {
  return ECONOMY_TIERS.find((t) => t.day > day) ?? null
}
