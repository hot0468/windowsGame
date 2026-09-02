import { growthCap } from './turn'
import { RANK_ORDER, RANK_THRESHOLDS, rankOfRatio } from './rankScale'
import type { StatRank } from './rankScale'
import type { GrowthStatKey } from '../types/game'

/**
 * 스탯 랭크 (2026-08-05 신설).
 *
 * ## 왜 필요한가
 * 성장 스탯의 상한은 999다. 숫자 `137`은 "많은 편인가"에 답하지 못한다 — 0에서 999까지의
 * 어디쯤인지 매번 암산해야 하고, 상한이 다른 스탯끼리(평판·도덕은 100) 비교도 안 된다.
 * 랭크는 **같은 척도로 환산한 한 글자**라서 서로 다른 상한의 스탯을 나란히 읽게 해 준다.
 *
 * ## 규칙
 * - 판정은 **절대값이 아니라 상한 대비 비율**이다. 그래서 상한이 100인 평판과 999인 지식이
 *   같은 등급 기준을 공유한다 — 상한이 다르다고 등급 기준을 따로 두면 "지식 A와 평판 A 중
 *   무엇이 더 대단한가"에 아무도 답할 수 없다.
 * - 상한의 단일 출처는 `growthCap()`이다(`clampStats`·스탯창 게이지와 같은 함수).
 *   ⚠️ **여기서 상한을 다시 적지 않는다** — 적는 순간 평판(100)이 999로 계산돼
 *   영원히 F에 머문다.
 * - 문턱은 **경계값을 포함한다**(`>=`). 정확히 50%면 B다.
 *
 * ⚠️ **눈금 자체(문턱·순서·`rankOfRatio`)는 `rankScale.ts`에 있다**(2026-08-14 분리) —
 * `turn.ts`의 숙련 보너스가 눈금을 봐야 하는데 이 파일은 `growthCap` 때문에 `turn.ts`를
 * 부르고 있어서다. 여기서 전부 재수출하므로 가져다 쓰는 쪽은 이 파일만 보면 된다.
 */
export { RANK_ORDER, RANK_THRESHOLDS, rankOfRatio, rankRose } from './rankScale'
export type { StatRank } from './rankScale'

/**
 * 그 성장 스탯의 지금 등급.
 *
 * 상한은 `growthCap(key)`에게 물어본다 — 스탯창 게이지·클램프와 **같은 함수**라
 * 표시와 규칙이 어긋날 수 없다(평판·도덕만 100, 나머지 999).
 */
export function rankOf(key: GrowthStatKey, value: number): StatRank {
  return rankOfRatio(value / growthCap(key))
}

/**
 * 다음 등급까지 남은 수치. 이미 최고 등급이면 `undefined`.
 *
 * 화면이 "SS까지 얼마 남았나"를 말할 수 있어야 랭크가 장식이 아니라 목표가 된다.
 * ⚠️ 반환값은 **올림한 정수**다 — 소수점 아래를 버리면 그 값을 채워도 등급이 안 오른다.
 */
export function toNextRank(key: GrowthStatKey, value: number): number | undefined {
  const cap = growthCap(key)
  const current = rankOf(key, value)
  const i = RANK_ORDER.indexOf(current)
  if (i === RANK_ORDER.length - 1) return undefined
  const next = RANK_ORDER[i + 1]
  const min = RANK_THRESHOLDS.find((t) => t.rank === next)!.min
  return Math.max(1, Math.ceil(min * cap - value))
}

/**
 * **지금 등급 안에서 얼마나 찼는가**(0~1). 스탯창 게이지가 그리는 값이다(2026-08-14).
 *
 * ## ⚠️ 상한 대비가 아니라 **등급 구간 대비**다
 * 예전에 스탯 칸에 게이지를 뒀다가 걷어낸 적이 있다 — 상한이 999라 대부분 빈 막대였고,
 * "137이 어디쯤인가"를 말해 주지 못했다(그 자리를 등급 글자 하나가 대신했다).
 * 이 값은 **지금 등급의 바닥에서 다음 등급 문턱까지**를 재므로 F에서도 막대가 움직이고,
 * **꽉 차는 순간이 곧 승급**이다 — 설계자 지시가 그 구조다.
 *
 * ⚠️ 최고 등급(SS)에서는 **1을 돌려준다.** 더 갈 데가 없으므로 꽉 찬 것이 맞고,
 * 여기서 0을 주면 만점인 사람의 막대가 빈 채로 남는다.
 */
export function rankProgress(key: GrowthStatKey, value: number): number {
  const cap = growthCap(key)
  const i = RANK_ORDER.indexOf(rankOf(key, value))
  if (i === RANK_ORDER.length - 1) return 1
  const floor = RANK_THRESHOLDS.find((t) => t.rank === RANK_ORDER[i])!.min * cap
  const ceil = RANK_THRESHOLDS.find((t) => t.rank === RANK_ORDER[i + 1])!.min * cap
  const p = (value - floor) / (ceil - floor)
  /* 부동소수 오차로 0에 가까운 음수가 나오면 막대가 100%로 감긴다(`lifeProgress`와 같은 보정). */
  return Math.min(1, Math.max(0, Math.round(p * 1e9) / 1e9))
}
