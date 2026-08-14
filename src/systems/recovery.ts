import {
  BANKRUPT_RELIEF_DAYS,
  BURNOUT_RELIEF,
  RECOVERY_DAYS,
  RECOVERY_EXIT_FEE,
} from '../data/recovery'
import { getLivingCost } from './economy'
import type { GameState, Recovery, RecoveryKind, Stats } from '../types/game'

/**
 * 강제 회복 기간의 규칙. 수치는 전부 `data/recovery.ts`에 있고 여기 있는 것은 판정뿐이다.
 *
 * ## 의존 방향
 * ⚠️ `turn.ts`를 부르지 **않는다**(`illness.ts`와 같다). 판정해서 새 `Recovery`를 돌려주기만
 * 하고, 상태에 앉히는 것은 `turn.ts`다.
 *
 * ## ⚠️ 걸리는 순간 자원을 되돌려 준다
 * 이 파일에서 가장 중요한 규칙이다. 소지금 0인 채로 회복이 끝나면 그날 밤 생활비가 다시
 * 0을 만들어 **즉시 재진입**하고, 그것은 이름만 다른 게임오버다. `enterRecovery`가
 * 걸리는 그 자리에서 최소 자원을 얹는 이유이고, `recovery.test.ts`가 지키는 불변식이다.
 */

/**
 * 파산으로 주저앉을 때 쥐여 주는 돈. **지금 내는 생활비의 배수**다.
 *
 * ⚠️ `getLivingCost`를 쓰는 것이 규칙이다(`livingCostForDay`가 아니라) — 이사한
 * 사람은 실제로 내는 돈이 다르고, 구제금은 **그 사람이 며칠을 버티는가**로 정해져야 한다.
 */
export function bankruptRelief(state: GameState): number {
  return getLivingCost(state) * BANKRUPT_RELIEF_DAYS
}

/** 지금 주저앉아 있는가. 화면·가드 전부가 이 하나를 본다. */
export function isRecovering(state: GameState): boolean {
  return (state.recovery?.daysLeft ?? 0) > 0
}

/**
 * 자원이 바닥났는가. **판정은 여기 한 줄뿐이다**(옛 `detectGameOver`의 자리).
 *
 * ⚠️ 순서가 규칙이다 — 돈과 멘탈이 같은 밤에 함께 바닥나면 **파산이 이긴다**.
 * 번아웃은 며칠 쉬면 풀리지만 파산은 돈을 만들어야 풀리므로, 더 무거운 쪽을 먼저 건다.
 */
export function detectRecovery(stats: Stats): RecoveryKind | null {
  if (stats.money <= 0) return 'bankrupt'
  if (stats.mental <= 0) return 'burnout'
  return null
}

/**
 * 주저앉힌다. **자원을 되돌려 주는 것이 이 함수의 본체다**(위 ⚠️ 참고).
 *
 * ⚠️ **이미 회복 중이면 아무것도 하지 않는다.** 안 그러면 회복 중 매 슬롯마다 날짜가
 * 초기화되고 구제금이 다시 들어와, 주저앉은 채로 돈이 계속 생긴다.
 */
export function enterRecovery(state: GameState, kind: RecoveryKind): GameState {
  if (isRecovering(state)) return state
  const stats = { ...state.stats }
  /* 걸린 사유만 되돌린다 — 둘 다 채워 주면 한 번의 실패가 두 자원을 회복시켜
     일부러 쓰러지는 것이 이득이 된다. */
  /* ⚠️ **지금 물가 기준으로 계산한다**(정액이 아니다) — 후반에 구제금이 하루치
     생활비에 못 미치면 파산→회복→파산이 영원히 돈다. `bankruptRelief` 참고. */
  if (kind === 'bankrupt') stats.money = Math.max(stats.money, bankruptRelief(state))
  else stats.mental = Math.max(stats.mental, BURNOUT_RELIEF)
  return {
    ...state,
    stats,
    recovery: { kind, startedDay: state.day, daysLeft: RECOVERY_DAYS },
  }
}

/**
 * 그 밤의 회복 상태를 정한다. **취침 정산이 딱 한 번 부른다.**
 *
 * ⚠️ `nextIllness`와 달리 **발병 판정을 하지 않는다.** 주저앉히는 것은 자원이 0에 닿는
 * 순간이지 밤이 아니고(`settleRecovery`가 슬롯마다 본다), 여기가 하는 일은 하루를
 * 깎는 것뿐이다. 0이 되면 필드를 지운다 — 흔적을 남기면 "다 나았는데 기록이 있는"
 * 상태가 되어 화면이 무엇을 믿을지 갈린다(`Illness`와 같은 규칙).
 */
export function tickRecovery(recovery: Recovery | null): Recovery | null {
  if ((recovery?.daysLeft ?? 0) <= 0) return null
  const daysLeft = recovery!.daysLeft - 1
  return daysLeft > 0 ? { ...recovery!, daysLeft } : null
}

/**
 * 지금 상태로 회복 여부를 판단해 앉힌다. **턴을 넘기는 모든 통로의 종점이다**
 * (옛 `settleGameOver`의 자리).
 *
 * ⚠️ **이미 주저앉은 판은 그대로 둔다.** 회복 중에는 돈이 0 근처를 오가는데 매번 다시
 * 걸면 `daysLeft`가 영원히 안 준다.
 */
export function settleRecovery(state: GameState): GameState {
  if (isRecovering(state)) return state
  const kind = detectRecovery(state.stats)
  return kind ? enterRecovery(state, kind) : state
}

/**
 * 돈을 내고 즉시 털고 일어난다.
 *
 * ⚠️ **번아웃에만 쓴다.** 파산은 돈이 없어서 걸린 상태라 돈으로 빠져나오는 길이
 * 성립하지 않는다 — 그쪽 탈출구는 `bankruptRelief`가 쥐여 준 구제금으로 다시 버는 것이다.
 * ⚠️ 못 낼 돈이면 상태를 그대로 돌려준다(반쪽 상태 금지). 죽은 컨트롤을 막는 것은
 * 화면 쪽이고 여기서는 사실만 지킨다(`healIllness`와 같은 규칙).
 */
export function canBuyOutRecovery(state: GameState): boolean {
  return state.recovery?.kind === 'burnout' && state.stats.money >= RECOVERY_EXIT_FEE
}

export function buyOutRecovery(state: GameState): GameState {
  if (!canBuyOutRecovery(state)) return state
  return {
    ...state,
    stats: { ...state.stats, money: state.stats.money - RECOVERY_EXIT_FEE },
    recovery: null,
  }
}

/**
 * 세이브 보정. **못 믿을 값이면 통째로 버린다**(`reviveIllness`와 같은 이유 — NaN이
 * `daysLeft`에 앉으면 비교가 전부 false가 되어 영영 못 일어난다).
 */
export function reviveRecovery(raw: unknown): Recovery | null {
  if (!raw || typeof raw !== 'object') return null
  const { kind, startedDay, daysLeft } = raw as Partial<Recovery>
  if (kind !== 'bankrupt' && kind !== 'burnout') return null
  if (typeof daysLeft !== 'number' || !Number.isFinite(daysLeft) || daysLeft <= 0) return null
  if (typeof startedDay !== 'number' || !Number.isFinite(startedDay)) return null
  return { kind, startedDay, daysLeft: Math.min(RECOVERY_DAYS, Math.round(daysLeft)) }
}
