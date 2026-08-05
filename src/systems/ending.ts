import { ACHIEVEMENT_ENDINGS, FAILURE_ENDINGS, careerEnding } from '../data/endings'
import type { Ending } from '../data/endings'
import type { GameOverReason, GameState, Stats } from '../types/game'

/**
 * 현재 스탯으로 도달한 성취 엔딩을 반환한다.
 * ACHIEVEMENT_ENDINGS가 tier 내림차순이므로 앞에서부터 첫 매치가 최상위다.
 * 이미 본 엔딩(seenIds)은 팝업을 반복하지 않도록 건너뛴다.
 *
 * ⚠️ **직업 엔딩은 여기로 오지 않는다**(2026-08-05). 취직은 게임 도중의 사건이지 결말이
 * 아니므로 스탯 문턱으로 팝업을 띄우지 않는다 — 판정은 아래 `getFailureEnding` 하나뿐이다.
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

/**
 * ⚠️ **비문에 새길 경력을 고르는 단 하나의 지점이다. 뒤집으려면 이 함수의 반환값 한 줄만 고친다**
 * (`state.employment?.careerId` = 죽을 때 다니던 곳).
 *
 * ## 왜 "죽을 때의 직장"이 아니라 "도달한 최고 직장"인가
 * 해고는 이미 수입을 끊어 파산을 앞당긴다 — 거기에 비문까지 지우면 **한 사건에 벌을 두 번**
 * 주는 것이다. 그러면 60일차에 대기업에 들어가 80일차에 잘리고 85일차에 굶어 죽은 사람이
 * "무직으로 죽었다"로 기록되는데, 그 판에서 실제로 있었던 일은 그게 아니다.
 * 엔딩은 마지막 상태의 스냅샷이 아니라 **그 판이 어떤 이야기였는가**여야 한다.
 */
export function epitaphCareerId(state: GameState): string | undefined {
  return state.peakCareerId
}

/**
 * 죽었을 때 뜨는 엔딩.
 *
 * - **번아웃**은 경력과 무관하게 하나다. 돈이 떨어져 죽는 것과 마음이 떨어져 죽는 것은
 *   다른 죽음이고, 직업이 설명해 주는 쪽은 전자다.
 * - **파산**은 경력이 있으면 그 사람의 직업 엔딩, 없으면 그냥 `bankrupt`다.
 *
 * ⚠️ **`state`를 옵셔널로 두지 않는다.** 넘기지 않아도 되게 만들면 부르는 쪽이 언젠가
 * 빠뜨리고, 그 화면에서만 조용히 직업 엔딩이 안 뜬다.
 */
export function getFailureEnding(reason: GameOverReason, state: GameState): Ending {
  if (reason === 'bankrupt') {
    const career = careerEnding(epitaphCareerId(state))
    if (career) return career
  }
  return FAILURE_ENDINGS[reason]
}
