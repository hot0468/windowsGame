/** 번아웃 판정에 참고하는 최근 활동 이력의 최대 길이. */
export const BURNOUT_WINDOW = 8

/** 연속 1회마다 떨어지는 효율. */
const EFFICIENCY_STEP = 0.18

/** 효율 하한. 이 아래로는 떨어지지 않는다. */
const EFFICIENCY_FLOOR = 0.3

/** 연속 1회마다 추가로 소모되는 멘탈. */
const MENTAL_PENALTY_STEP = 4

/**
 * 번아웃 이력에 남길 이름. `burnoutKey`가 있으면 그것이, 없으면 활동 id가 키다.
 *
 * 이 함수 하나만 쓰면 "이력에 넣는 키"와 "이력에서 세는 키"가 어긋날 수 없다 —
 * 둘이 갈라지면 페널티가 영원히 0이 되고, 아무것도 깨지지 않은 채 규칙만 사라진다.
 */
export function burnoutKeyOf(activity: { id: string; burnoutKey?: string }): string {
  return activity.burnoutKey ?? activity.id
}

/** 이력 끝에서부터 같은 활동이 몇 번 이어졌는지 센다. */
export function countConsecutive(recent: string[], id: string): number {
  let count = 0
  for (let i = recent.length - 1; i >= 0; i--) {
    if (recent[i] !== id) break
    count++
  }
  return count
}

/**
 * 연속 실행에 따른 효율 배율과 추가 멘탈 소모량.
 * efficiency는 긍정 효과에만 곱한다 (소모량은 줄어들면 안 되므로).
 */
export function getBurnoutPenalty(
  recent: string[],
  id: string,
): { efficiency: number; mentalPenalty: number } {
  const streak = countConsecutive(recent, id)
  const efficiency = Math.max(EFFICIENCY_FLOOR, 1 - streak * EFFICIENCY_STEP)
  return { efficiency, mentalPenalty: streak * MENTAL_PENALTY_STEP }
}

/** 이력에 활동을 추가한다. 최대 길이를 넘으면 오래된 것부터 버린다. */
export function pushActivity(recent: string[], id: string): string[] {
  return [...recent, id].slice(-BURNOUT_WINDOW)
}
