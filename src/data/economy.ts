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

/** 표 이후 구간의 주기(일). 표와 같은 10일 간격을 이어간다. */
export const TIER_INTERVAL = 10

/**
 * 표 이후 구간마다 곱해지는 생활비 상승률.
 * 알바비 상승률보다 훨씬 커서, 마지막 표 구간 이후 생활비가 기하급수적으로 벌어진다.
 */
export const LIVING_GROWTH_RATE = 1.3

/**
 * 표 이후 구간마다 곱해지는 알바비 상승률.
 * 생활비 상승률보다 낮게 두어 실질 소득이 반드시 역전되도록 한다.
 */
export const WAGE_GROWTH_RATE = 1.04
