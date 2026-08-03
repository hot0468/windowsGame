import type { EconomyTier } from '../types/game'

/**
 * 10일 주기 계단식 물가 인상.
 * 알바비(wageMultiplier)는 생활비보다 느리게 오른다 —
 * 후반으로 갈수록 저임금 알바의 실질 효율이 떨어지게 만드는 장치다.
 * day 내림차순이 아니라 오름차순으로 두고, 조회 시 역순 탐색한다.
 */
export const ECONOMY_TIERS: EconomyTier[] = [
  { day: 1, living: 30000, wageMultiplier: 1.0 },
  { day: 11, living: 38000, wageMultiplier: 1.15 },
  { day: 21, living: 48000, wageMultiplier: 1.28 },
  { day: 31, living: 60000, wageMultiplier: 1.39 },
  { day: 41, living: 75000, wageMultiplier: 1.48 },
  { day: 51, living: 95000, wageMultiplier: 1.55 },
]
