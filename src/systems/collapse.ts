import { DAY_END, DAY_START } from '../data/clock'
import { RANSOM_MENTAL_FLOOR, RANSOM_RISK } from '../data/collapse'
import { infect, isInfected } from './malware'
import type { GameState } from '../types/game'

/**
 * **몸과 마음이 바닥났을 때 컴퓨터가 대신 앓는다**(2026-08-22 설계자 지시).
 *
 * 이 게임의 화면은 가짜 윈도우이고, 플레이어의 상태가 나빠지는 것을 **그 윈도우가 겪는
 * 일**로 옮긴다:
 *  - **체력 0 → 강제 종료.** 화면이 꺼졌다 다시 켜지고 **24시간이 지나 있다**(하루를 잃는다).
 *  - **멘탈 0 근처 → 랜섬웨어에 걸릴 확률이 높아진다.** 판단이 흐려진 사람이 이상한 것을
 *    누른다는 말을, 감염 확률로 옮긴 것이다.
 *
 * ## ⚠️ 게임오버가 아니다
 * 둘 다 판을 끝내지 않는다(설계 원칙: 완전한 게임오버는 없다). 뺏는 것은 **시간**과
 * **돈**이지 판이 아니다.
 *
 * ## ⚠️ 무작위가 아니다
 * 감염 굴림은 `seed`와 날짜의 순수 함수다(`systems/chance.ts`와 같은 규칙) — 새로 고칠
 * 때마다 다시 굴리면 세이브 스커밍이 열린다.
 */

/** 강제 종료가 걸리는 지점. 체력이 여기까지 떨어지면 그 자리에서 꺼진다. */
export const CRASH_STAMINA = 0

/** 강제 종료로 지나가는 시간(분). 설계자 지시대로 **꼬박 24시간**이다. */
export const CRASH_MINUTES = 24 * 60

export function shouldCrash(state: GameState): boolean {
  return state.stats.stamina <= CRASH_STAMINA && !state.recovery
}

/**
 * **강제 종료된다** — 24시간이 지나고 그 사이의 하루가 통째로 사라진다.
 *
 * ⚠️ **밤 정산을 건너뛰지 않는다**: 지나간 하루만큼 생활비도 나가야 "하루를 잃었다"가
 * 참이 된다. 그래서 여기서 직접 상태를 만들지 않고 **호출부가 `sleepNow`를 태운다**
 * (`gameStore`) — 이 파일은 판정과 몫만 갖는다(의존 방향: systems → data).
 *
 * 깨어난 뒤의 체력은 **절반까지만** 채워 준다. 가득 채우면 "쓰러질 때까지 굴리는 것"이
 * 최적해가 된다 — 잃은 하루가 대가이고, 남은 피로가 그 다음 날의 경고다.
 */
export const CRASH_WAKE_STAMINA = 50

/** 깨어난 시각. 하루가 지났으니 다시 아침이다. */
export const CRASH_WAKE_MINUTE = DAY_START

/**
 * 오늘 랜섬웨어에 걸릴 확률(0~1). **멘탈이 낮을수록 높다.**
 *
 * ⚠️ 멘탈이 성한 날에는 **0이다** — 아무 때나 걸리면 이 규칙이 "멘탈을 지켜라"가 아니라
 * 그냥 세금이 된다.
 */
export function ransomRisk(state: GameState): number {
  if (state.recovery || isInfected(state)) return 0
  const m = state.stats.mental
  if (m > RANSOM_MENTAL_FLOOR) return 0
  /* 바닥(0)에서 `RANSOM_RISK`, 문턱에서 0으로 선형으로 잇는다 — 계단으로 두면
     "문턱 1 위"와 "문턱 1 아래"가 딴 세상이 되어 플레이어가 값을 외우게 된다. */
  return RANSOM_RISK * (1 - m / RANSOM_MENTAL_FLOOR)
}

/** 그 날의 굴림값(0~1). ⚠️ `Math.random` 금지 — 씨앗과 날짜의 순수 함수다. */
function roll(seed: number, day: number): number {
  const x = (Math.imul(day + 7, 2654435761) ^ Math.imul(seed + 1, 40503)) >>> 0
  return ((x ^ (x >>> 13)) % 10000) / 10000
}

/**
 * 밤에 한 번 묻는다 — **오늘 랜섬웨어에 걸렸는가.**
 * 걸렸으면 감염 상태를 얹어 돌려주고, 아니면 그대로 돌려준다.
 */
export function advanceRansom(state: GameState): GameState {
  const risk = ransomRisk(state)
  if (risk <= 0 || state.seed === undefined) return state
  return roll(state.seed, state.day) < risk ? infect(state) : state
}

/** 하루가 끝나는 시각까지 남은 분. 강제 종료가 하루를 태울 때 쓴다. */
export function minutesToMidnight(state: GameState): number {
  return Math.max(1, DAY_END - state.minute)
}
