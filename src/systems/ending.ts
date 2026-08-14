import { ACHIEVEMENT_ENDINGS } from '../data/endings'
import type { Ending } from '../data/endings'
import type { Stats } from '../types/game'

/**
 * 현재 스탯으로 도달한 성취 엔딩을 반환한다.
 * ACHIEVEMENT_ENDINGS가 tier 내림차순이므로 앞에서부터 첫 매치가 최상위다.
 * 이미 본 엔딩(seenIds)은 팝업을 반복하지 않도록 건너뛴다.
 *
 * ⚠️ **이 파일에 남은 판정은 이것 하나다**(2026-08-14 육성물 전환). 예전에는
 * `getFailureEnding`·`epitaphCareerId`·`careerEnding`이 함께 있어 **파산한 판에
 * 직업 엔딩을 새겨** 주었는데, 게임오버가 없어져 부를 자리가 사라졌다. 취직 기록은
 * 도감의 직업 시트가 받는다(`store/metaStore.ts`의 `unlockedCareers`).
 */
export function checkAchievementEnding(stats: Stats, seenIds: string[]): Ending | null {
  for (const ending of ACHIEVEMENT_ENDINGS) {
    if (seenIds.includes(ending.id)) continue
    if (!ending.condition) continue
    const met = Object.entries(ending.condition).every(
      ([key, required]) => stats[key as keyof Stats] >= required,
    )
    if (met) return ending
  }
  return null
}

/** 이 엔딩보다 높은 티어가 존재하는지. "더 높은 곳이 있을지도?" 암시에 사용. */
export function hasHigherTier(ending: Ending): boolean {
  return ACHIEVEMENT_ENDINGS.some((e) => e.tier > ending.tier)
}
