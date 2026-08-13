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
