import { ALBUM_SKILL, LIVE_SKILL, SKILL_CAP, SKILL_PER_PRACTICE, albumPay, livePay } from '../data/band'
import type { Activity, BandState, GameState } from '../types/game'

/**
 * 밴드 숙련도 규칙.
 *
 * ## ⚠️ 아무 시스템도 부르지 않는다
 * `data/`만 읽는다. `turn.ts`가 활동을 실행하며 이걸 부르므로 반대로 부르면 순환이 된다
 * (`gear`·`careerLog`와 같은 자리·같은 이유).
 *
 * ## ⚠️ 보수는 활동이 아니라 여기서 정한다
 * 공연·앨범의 `effects.money`는 **0**이다 — 숙련도에 따라 달라지는 값을 활동 데이터에
 * 적을 수가 없다(그몽 일감이 보수를 갖고 도구 활동은 안 갖는 것과 같은 방향).
 */

/** 지금 숙련도. 밴드에 안 들어갔으면 0. */
export function skillOf(state: GameState): number {
  return state.band?.skill ?? 0
}

/** 밴드에 들어갔는가. 합주를 한 번이라도 했으면 참이다. */
export function inBand(state: GameState): boolean {
  return state.band !== undefined
}

/**
 * 그 활동이 요구하는 숙련도를 채웠는가. **판정은 `turn.ts`의 `canRun` 하나가 부른다** —
 * 화면에서만 막으면 스케줄러 예약이 그대로 통과한다(아이템·구독·슬롯 게이트와 같은 규칙).
 */
export function bandSkillOpen(state: GameState, activity: Activity): boolean {
  if (activity.requiresBandSkill === undefined) return true
  return skillOf(state) >= activity.requiresBandSkill
}

/**
 * 합주 한 번을 숙련도에 새긴다. **합주가 아니면 `undefined`**를 돌려준다 —
 * 빈 객체를 돌려주면 `runActivity`가 매번 새 밴드 상태를 만들어 안 든 사람도 밴드가 생긴다.
 */
export function practiceBand(state: GameState, activity: Activity): { band: BandState } | undefined {
  if (!activity.buildsBandSkill) return undefined
  const skill = Math.min(SKILL_CAP, skillOf(state) + SKILL_PER_PRACTICE)
  return { band: { skill } }
}

/** 이 활동으로 이번에 받는 보수. 밴드 활동이 아니면 0. */
export function bandPayFor(state: GameState, activity: Activity): number {
  const skill = skillOf(state)
  if (activity.requiresBandSkill === ALBUM_SKILL) return albumPay(skill)
  if (activity.requiresBandSkill === LIVE_SKILL) return livePay(skill)
  return 0
}

/** 세이브 보정. 모르는 값이면 밴드가 없던 것으로 친다. */
export function reviveBand(raw: unknown): BandState | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const skill = (raw as { skill?: unknown }).skill
  if (!Number.isFinite(skill) || Number(skill) < 0) return undefined
  return { skill: Math.min(SKILL_CAP, Math.round(Number(skill))) }
}

export { ALBUM_SKILL, LIVE_SKILL, SKILL_CAP, albumPay, livePay }
