/** 번아웃 판정에 참고하는 최근 활동 이력의 최대 길이. */
export const BURNOUT_WINDOW = 8

/**
 * 연속 1회마다 추가로 소모되는 멘탈.
 *
 * ⚠️ **효율 감소는 2026-08-22에 폐지됐다**(설계자 지시: "같은 행동 반복에 따른 효율 감소
 * 없애줘"). 되살리지 말 것 — 같은 일을 반복해도 **결과물은 그대로**이고, 반복의 대가는
 * **멘탈 하나로만** 치른다. 예전에는 긍정 효과에 배율(최저 30%)이 곱해져서, 잘하는 일을
 * 이어서 하는 것이 언제나 손해였다.
 */
const MENTAL_PENALTY_STEP = 4

/**
 * 이 횟수만큼 이어서 하면 화면이 한 번 경고한다(`BlueScreen`).
 *
 * ⚠️ **효율이 아니라 멘탈이 근거다** — 임계를 화면에 적어 두면 이 값을 손볼 때 한쪽만
 * 낡으므로 여기 하나만 둔다.
 */
export const BURNOUT_WARN_STREAK = 4

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
 * 연속 실행의 대가 — **추가로 깎이는 멘탈뿐이다**(2026-08-22).
 * ⚠️ 효율 배율은 없다. 얻는 것은 줄지 않고 **버티는 힘만 준다**.
 */
export function getBurnoutPenalty(recent: string[], id: string): { mentalPenalty: number } {
  return { mentalPenalty: countConsecutive(recent, id) * MENTAL_PENALTY_STEP }
}

/** 이력에 활동을 추가한다. 최대 길이를 넘으면 오래된 것부터 버린다. */
export function pushActivity(recent: string[], id: string): string[] {
  return [...recent, id].slice(-BURNOUT_WINDOW)
}
