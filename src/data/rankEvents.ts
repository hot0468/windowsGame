import type { GrowthStatKey } from '../types/game'
/* ⚠️ **타입만 가져온다**(`import type`) — `StatRank`는 `systems/rank.ts`에 살고, data가
   systems를 런타임으로 부르면 계층이 뒤집힌다. 타입 전용 import는 번들에 남지 않으므로
   그 규칙을 깨지 않는다. 등급 이름을 여기서 다시 적지 않는 것이 더 중요하다. */
import type { StatRank } from '../systems/rank'

/**
 * 랭크 이벤트 — **스탯이 어느 등급에 닿으면 한 번 일어나는 일.**
 *
 * ## 왜 별도 축인가
 * 기존 잠금은 전부 **절대값**을 본다(`Activity.requires`·`Thread.requires`). 그런데 등급은
 * **상한 대비 비율**이라(`systems/rank.ts`) 절대값으로 옮겨 적으면 같은 기준이 두 곳에
 * 생기고, 상한이 바뀌는 순간 한쪽만 낡는다. 그래서 조건을 `{key, rank}`로 적고
 * 판정은 `rankOf` 하나에게 맡긴다.
 *
 * ## ⚠️ 한 번만 일어난다
 * 겪은 이벤트는 `GameState.rankEvents`에 남고 다시 뜨지 않는다. 등급은 내려갈 수도 있는데
 * (평판은 마감을 놓치면 깎인다) 그때 이벤트가 되살아나면 오르내리기를 반복해 **무한히
 * 반복 수령**할 수 있다 — 소원(스탯 +100)이 걸린 이벤트가 있으므로 이 규칙이 곧 밸런스다.
 *
 * ## ⚠️ 이벤트가 스스로 무엇을 하지는 않는다
 * 여기 있는 것은 **무엇이 열리는가**뿐이고 실행은 각자의 자리가 한다:
 * - `kind: 'thread'` → 그 대화방이 목록에 뜬다(`systems/messages.ts`의 `threadVisible`).
 *   수락·주간 예약은 **이미 있는 오픈채팅 제안 구조**(`Thread.offer`의 `weekly`)가 그대로 한다.
 * - `kind: 'window'` → 그 창이 열린다(`gameStore`의 밤 정산 자리).
 * 새 실행 통로를 만들지 않는 것이 이 파일의 규칙이다.
 */

export interface RankEvent {
  id: string
  /** 이 스탯이 */
  key: GrowthStatKey
  /** 이 등급에 닿으면 일어난다. */
  rank: StatRank
  /**
   * 무엇이 열리는가.
   * - `thread`: 대화방이 열린다(그 안의 제안이 나머지를 한다).
   * - `window`: 창이 하나 뜬다.
   */
  kind: 'thread' | 'window'
  /** `kind: 'thread'`면 `Thread.id`, `kind: 'window'`면 `WindowKind`. */
  target: string
}

/**
 * 랭크 이벤트 목록.
 *
 * ⚠️ **문턱을 고를 때 도달 가능성을 먼저 본다**(`rankEvents.test.ts`가 지킨다).
 * `C`는 상한의 10%이고 `A`는 50%다 — 상한 999인 스탯에서 A는 500이라 그 스탯에
 * 특화해야 겨우 닿는다. "아무도 볼 수 없는 이벤트"는 버그다.
 */
export const RANK_EVENTS: RankEvent[] = [
  {
    /*
     * 운동 C(=100). 러닝 한 번이 8이므로 13번쯤이면 닿는다 — 판 초중반이고, 그때
     * 러닝크루가 붙어 **주간 예약이 스스로 도는 첫 경험**이 된다(설계자 지시).
     */
    id: 'running-crew',
    key: 'athletics',
    rank: 'C',
    kind: 'thread',
    target: 'running-crew',
  },
  {
    /*
     * 감수성 A(=500). 주 공급원이 6~12/턴이라 특화해도 40턴 남짓 걸린다 — 판 후반이고,
     * 그만큼 갔을 때 **스탯 하나를 100 올려 주는** 보상이 붙는 것이 이 이벤트의 무게다.
     */
    id: 'shooting-star',
    key: 'sensitivity',
    rank: 'A',
    kind: 'window',
    target: 'wish',
  },
]

/**
 * 소원으로 오르는 수치. 설계자 지시로 **100**이다.
 *
 * ⚠️ **상한을 넘기지 않는다** — `clampStats`가 자르므로 평판·도덕·예의범절(상한 100)은
 * 사실상 만점이 된다. 그것을 막지 않는 이유는 감수성 A 자체가 판 후반의 문턱이고,
 * **한 번만** 쓸 수 있기 때문이다(`GameState.rankEvents`).
 */
export const WISH_AMOUNT = 100

export function findRankEvent(id: string): RankEvent | undefined {
  return RANK_EVENTS.find((e) => e.id === id)
}
