import {
  ILLNESS_DAYS,
  ILL_EFFICIENCY,
  ILL_RECOVERY_RATIO,
  ILL_STAMINA_FLOOR,
} from '../data/illness'
import type { GameState, Illness } from '../types/game'

/**
 * 아픔 규칙. 수치는 전부 `data/illness.ts`에 있고 여기 있는 것은 판정뿐이다.
 *
 * ## 의존 방향
 * ⚠️ `turn.ts`를 부르지 **않는다**(`weather.ts`와 같다). 발병·완치를 판정해 새 `Illness`를
 * 돌려주기만 하고, 그것을 상태에 앉히는 것은 `turn.ts`의 취침 정산이다.
 *
 * ## ⚠️ 판정 시점은 취침 하나뿐이다
 * 오전에도 오후에도 앓기 시작하지 않는다 — 슬롯마다 판정하면 같은 하루에 발병하고 낫는
 * 일이 생기고, 무엇보다 "무리해서 하루를 끝냈다"가 아픔의 근거이므로 그 하루가 끝나는
 * 자리에서만 물어야 뜻이 맞다.
 */

/** 지금 앓고 있는가. 화면·회복·효율이 이 하나를 본다. */
export function isIll(state: GameState): boolean {
  return (state.illness?.daysLeft ?? 0) > 0
}

/** 앓는 동안 활동의 긍정 효과에 곱할 값. 아프지 않으면 1이다. */
export function illnessEfficiency(state: GameState): number {
  return isIll(state) ? ILL_EFFICIENCY : 1
}

/** 앓는 동안 취침 회복에 곱할 값. 아프지 않으면 1이다. */
export function illnessRecoveryRatio(ill: Illness | undefined): number {
  return (ill?.daysLeft ?? 0) > 0 ? ILL_RECOVERY_RATIO : 1
}

/**
 * 그 밤의 아픔 상태를 정한다. **취침 정산이 딱 한 번 부른다.**
 *
 * 순서가 규칙이다:
 * 1. **앓는 중이면 하루를 준다.** 0이 되면 낫는다(필드를 지운다 — 세이브에 흔적을 남기면
 *    "다 나았는데 아픔 기록이 있는" 상태가 되어 화면이 무엇을 믿을지 갈린다).
 * 2. **앓지 않는데 행동력이 바닥이면 그 밤에 앓는다.** 이미 앓는 중이면 판정하지 않는다 —
 *    안 그러면 앓는 동안 회복이 반이라 매일 임계 아래에 걸려 **영원히 낫지 않는다.**
 *
 * @param staminaAtNight 자기 전 행동력(취침 회복을 얹기 **전** 값)
 */
export function nextIllness(
  ill: Illness | undefined,
  staminaAtNight: number,
  day: number,
): Illness | undefined {
  if ((ill?.daysLeft ?? 0) > 0) {
    const daysLeft = ill!.daysLeft - 1
    return daysLeft > 0 ? { ...ill!, daysLeft } : undefined
  }
  if (staminaAtNight <= ILL_STAMINA_FLOOR) {
    return { startedDay: day, daysLeft: ILLNESS_DAYS }
  }
  return undefined
}

/**
 * 진료로 즉시 낫는다. **돈과 턴은 `clinic` 활동이 가져간다** — 여기서 돈을 만지면
 * 같은 비용이 두 곳에 생긴다(급여의 단일 출처와 같은 규칙).
 *
 * ⚠️ 안 아플 때 불러도 상태를 그대로 돌려준다(반쪽 상태 금지). 죽은 컨트롤을 막는 것은
 * 화면 쪽이고(`canRun`이 아니라 버튼 표시), 여기서는 사실만 지킨다.
 */
export function healIllness(state: GameState): GameState {
  if (!isIll(state)) return state
  return { ...state, illness: undefined }
}

/**
 * 세이브 보정. **못 믿을 값이면 통째로 버린다**(`revivePerformance`와 같은 이유 —
 * NaN이 `daysLeft`에 앉으면 비교가 전부 false가 되어 영영 낫지 않는다).
 */
export function reviveIllness(raw: unknown): Illness | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const { startedDay, daysLeft } = raw as Partial<Illness>
  if (typeof daysLeft !== 'number' || !Number.isFinite(daysLeft) || daysLeft <= 0) return undefined
  if (typeof startedDay !== 'number' || !Number.isFinite(startedDay)) return undefined
  return { startedDay, daysLeft: Math.min(ILLNESS_DAYS, Math.round(daysLeft)) }
}
