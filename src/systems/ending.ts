import { ACHIEVEMENT_ENDINGS, FAILURE_ENDINGS } from '../data/endings'
import type { Ending } from '../data/endings'
import type { GameOverReason, Stats } from '../types/game'

/**
 * 현재 스탯으로 도달한 성취 엔딩을 반환한다.
 * ACHIEVEMENT_ENDINGS가 tier 내림차순이므로 앞에서부터 첫 매치가 최상위다.
 * 이미 본 엔딩(seenIds)은 팝업을 반복하지 않도록 건너뛴다.
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

export function getFailureEnding(reason: GameOverReason): Ending {
  return FAILURE_ENDINGS[reason]
}
