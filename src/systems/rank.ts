import { growthCap } from './turn'
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
 * ## 왜 F 다음이 D가 아니라 C인가
 * 설계자 지시가 F·C·B·A·S·SS 여섯 단계다. D·E를 넣지 않은 것은 **하위 구간을 넓게 두기
 * 위해서다** — 0에서 시작하는 스탯이 열 개라 판 초반에는 대부분이 최하위인데, 거기서
 * 등급이 촘촘하면 "F에서 E로 올랐다"가 성취처럼 보이지 않는다. 대신 상위를 S·SS로
 * 둘로 쪼개 **끝까지 올린 사람에게 마지막 한 칸**을 남겼다.
 */
export type StatRank = 'F' | 'C' | 'B' | 'A' | 'S' | 'SS'

/**
 * 등급과 그 등급에 들어가는 **최소 비율**(상한 대비).
 *
 * ⚠️ **높은 등급이 먼저 온다** — `find`가 위에서부터 처음 맞는 것을 고르므로
 * 순서가 곧 판정이다. 오름차순으로 뒤집으면 모든 스탯이 F가 된다.
 *
 * 구간을 이렇게 잡은 이유: SS는 **거의 만점**(95%)이라야 마지막 칸이 뜻을 갖는다.
 * 반대로 C의 문턱을 10%로 낮게 둔 것은 판 초반 한두 번의 활동이 곧바로 눈에 보이는
 * 변화를 만들게 하기 위해서다 — 상한 999짜리 스탯에서 첫 등급이 25%면
 * 활동 마흔 번을 F로 보내게 된다.
 */
export const RANK_THRESHOLDS: { rank: StatRank; min: number }[] = [
  { rank: 'SS', min: 0.95 },
  { rank: 'S', min: 0.75 },
  { rank: 'A', min: 0.5 },
  { rank: 'B', min: 0.3 },
  { rank: 'C', min: 0.1 },
  { rank: 'F', min: 0 },
]

/** 낮은 등급부터의 순서. 도감·정렬처럼 "얼마나 높은가"를 수로 다뤄야 하는 곳이 쓴다. */
export const RANK_ORDER: StatRank[] = ['F', 'C', 'B', 'A', 'S', 'SS']

/**
 * 비율(0~1)에 해당하는 등급. 상한이 없는 값(소지금 등)을 다룰 때 쓰는 저수준 함수다.
 * 범위를 벗어난 값도 안전하게 클램프한다 — 상한을 넘긴 세이브가 들어와도 SS로 읽힌다.
 */
export function rankOfRatio(ratio: number): StatRank {
  if (!Number.isFinite(ratio)) return 'F'
  const r = Math.min(1, Math.max(0, ratio))
  return RANK_THRESHOLDS.find((t) => r >= t.min)!.rank
}

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
