import { CAREER_LEVEL_DAYS, CAREER_MAX_LEVEL } from '../data/careers'
import type { GameState } from '../types/game'

/**
 * 직업 이력 — **이번 판에서 어느 회사에 다녀 봤고 며칠 출근했는가.**
 *
 * ## 왜 별도 기록인가
 * `Employment`는 **지금 다니는 곳 하나**이고 해고되면 사라진다. `peakCareerId`는 가장 높이
 * 갔던 곳 **하나**뿐이다. 그러니 "다녀 본 곳 전부"를 물으면 둘 다 답할 수 없다.
 * `attendedDays`도 답이 못 된다 — 급여일마다 지난 주기를 버리기 때문이다(세이브 크기).
 * 그래서 **누적만 하는 기록**을 따로 둔다.
 *
 * ## 왜 이 파일이 따로 있나
 * ⚠️ 기록을 얹는 자리가 **둘로 갈린다**: 채용은 `employment.ts`, 출근은 `turn.ts`.
 * 그런데 `employment.ts` → `turn.ts` 방향으로 의존하고 있어 `turn.ts`가 반대로 부를 수
 * 없다. 두 파일이 같이 부를 수 있는 **아무것도 import하지 않는 자리**가 여기다.
 *
 * ⚠️ **판마다 리셋된다** — `GameState`에 사는 값이라 새 게임이면 그냥 없다(설계자 지시:
 * "직업은 게임마다 리셋"). 판을 넘어 남는 것은 엔딩 해금(`metaStore`)뿐이다.
 */

/** 그 회사에 다녀 본 적이 있는가. **키의 존재가 곧 채용된 적 있음이다**(값 0도 포함). */
export function heldCareer(state: GameState, careerId: string): boolean {
  return state.careerLog?.[careerId] !== undefined
}

/** 그 회사에 출근한 누적 횟수. 다녀 본 적 없으면 0. */
export function attendedCount(state: GameState, careerId: string): number {
  return state.careerLog?.[careerId] ?? 0
}

/**
 * 출근 횟수 → 레벨. **채용된 순간이 Lv.1**이고 `CAREER_LEVEL_DAYS`마다 한 칸 오른다.
 * 다녀 본 적 없으면 레벨이 **없다**(0을 돌려주는 것이 아니라 "없음"이다 — 화면이 `—`를 적는다).
 */
export function careerLevel(state: GameState, careerId: string): number | undefined {
  if (!heldCareer(state, careerId)) return undefined
  const level = 1 + Math.floor(attendedCount(state, careerId) / CAREER_LEVEL_DAYS)
  return Math.min(CAREER_MAX_LEVEL, level)
}

/** 다음 레벨까지 남은 출근 횟수. 상한이면 undefined. */
export function toNextCareerLevel(state: GameState, careerId: string): number | undefined {
  const level = careerLevel(state, careerId)
  if (level === undefined || level >= CAREER_MAX_LEVEL) return undefined
  return level * CAREER_LEVEL_DAYS - attendedCount(state, careerId)
}

/**
 * 채용된 사실을 남긴다. **이미 있으면 그대로 둔다** — 재입사가 근무 이력을 지우면
 * 레벨이 초기화되고, 그러면 "다녀 본 곳"이 아니라 "지금 다니는 곳"이 되어 버린다.
 */
export function markHired(log: GameState['careerLog'], careerId: string): GameState['careerLog'] {
  if (log?.[careerId] !== undefined) return log
  return { ...(log ?? {}), [careerId]: 0 }
}

/** 출근 한 번을 더한다. 채용 기록이 없어도 만들어 준다(구세이브 호환). */
export function markAttended(log: GameState['careerLog'], careerId: string): GameState['careerLog'] {
  return { ...(log ?? {}), [careerId]: (log?.[careerId] ?? 0) + 1 }
}
