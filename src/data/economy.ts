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

/**
 * 주말(토·일) 알바 시급 할증.
 *
 * ⚠️ **요일이 처음으로 돈에 붙는 자리다**(2026-08-09). 여태 요일은 주간 예약과 정규직
 * 주말 호출에만 쓰여, 하루를 고를 때 요일을 볼 이유가 없었다.
 *
 * ⚠️ **`WAGE_GROWTH_RATE`와 곱해지되 그 관계는 안 흔든다.** 주 2일이라 평균 +8.6%인데,
 * 생활비는 구간마다 1.3배로 벌어지므로 이 정도로는 실질 소득 역전이 밀리지 않는다 —
 * 그래도 **감이 아니라 시뮬레이션이 지킨다**(`balance.verify.test.ts`). 값을 올리려면
 * 그 테스트를 먼저 보라.
 * ⚠️ **알바에만 붙는다**(`scalesWithWage`). 월급·그몽 보수·밴드 보수는 물가 배율 자체를
 * 안 타므로 여기도 안 탄다.
 */
export const WEEKEND_WAGE_BONUS = 1.3
