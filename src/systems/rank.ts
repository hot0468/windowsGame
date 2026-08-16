import { growthCap } from './turn'
import { GROWTH_STAT_KEYS } from '../types/game'
import type { GrowthStatKey, Stats } from '../types/game'

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
 * - 문턱은 **경계값을 포함한다**(`>=`). 정확히 40%면 A다.
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
 * ## 구간이 **앞으로 갈수록 촘촘한** 이유 (2026-08-16 재분배)
 * 간격이 5 → 15 → 20 → 30 → 25다. 예전에는 10/20/20/25/20으로 거의 고른 간격이었는데,
 * 그러면 **판 초반 서른 날이 통째로 "아무 등급도 안 오르는 구간"**이 된다: 상한 999짜리
 * 스탯에서 첫 등급이 10%면 100점이고, 공부(+6)로는 열일곱 번이다. 등급이 이 게임에서
 * 쌓아 올린 것의 유일한 척도인데 그 척도가 한 달 동안 안 움직인다.
 *
 * 앞을 좁히면 **초반 한두 주에 첫 승급이 오고**, 뒤를 넓혀 상위 등급의 무게는 지킨다.
 * ⚠️ **SS(95%)는 건드리지 않았다** — 거의 만점이라야 마지막 한 칸이 뜻을 갖는다(원래 결정).
 *
 * ⚠️ **이 표를 손보면 게임의 문이 함께 움직인다**(장식이 아니다): 랭크 이벤트·스탯 마스터·
 * 밴드 모집·주식 예보·너튜브 채널·그림 등급이 전부 `rankOf` 하나를 본다. 특히
 * **`below: true` 이벤트(낮은 스탯의 대가) 4종은 전부 `rank: 'F'`라, C를 낮추면 F를 더 빨리
 * 벗어나 그 대가가 덜 터진다** — 앞을 좁히는 값에는 그 반대급부가 딸려 온다.
 */
export const RANK_THRESHOLDS: { rank: StatRank; min: number }[] = [
  { rank: 'SS', min: 0.95 },
  { rank: 'S', min: 0.7 },
  { rank: 'A', min: 0.4 },
  { rank: 'B', min: 0.2 },
  { rank: 'C', min: 0.05 },
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

/** 그 등급에 들어가는 최소 비율. 표에 없는 등급은 없으므로 항상 찾힌다. */
function minRatioOf(rank: StatRank): number {
  return RANK_THRESHOLDS.find((t) => t.rank === rank)!.min
}

/**
 * **지금 등급 구간을 얼마나 채웠나**(0~1).
 *
 * ## 왜 상한 대비가 아닌가
 * 성장 스탯 칸에는 오랫동안 게이지가 없었다 — 상한이 999라 막대가 늘 비어 보여
 * 정보가 되지 않았기 때문이다. 그런데 그 탓에 **활동을 해도 화면이 안 변했다**:
 * 지식 137이 4 올라도 999분의 4는 눈에 안 보이는 폭이라, 스탯을 올리는 일에
 * 되돌아오는 것이 숫자 한 칸뿐이었다.
 *
 * 구간 기준으로 재면 같은 4가 **다음 등급까지 남은 거리 안에서** 읽힌다.
 * 그래서 이 막대는 등급이 오를 때마다 0으로 돌아가고 **활동 한 번에도 눈에 띄게 움직인다** —
 * 999짜리 절대 막대가 못 하던 일이다.
 *
 * ⚠️ **최고 등급(SS)은 1을 돌려준다.** 다음 구간이 없어 나눌 것이 없고, 다 찬 막대가
 * "여기가 끝"이라는 뜻을 그대로 진다(`toNextRank`가 `undefined`를 주는 것과 짝이다).
 */
export function rankProgress(key: GrowthStatKey, value: number): number {
  const cap = growthCap(key)
  const current = rankOf(key, value)
  const i = RANK_ORDER.indexOf(current)
  if (i === RANK_ORDER.length - 1) return 1
  const from = minRatioOf(current)
  const to = minRatioOf(RANK_ORDER[i + 1])
  const ratio = (value / cap - from) / (to - from)
  return Math.min(1, Math.max(0, ratio))
}

/** 등급이 오른 스탯 하나. 어디서 어디로 갔는지를 함께 든다 — 화면이 "C → B"를 적는다. */
export type RankUp = { key: GrowthStatKey; from: StatRank; to: StatRank }

/**
 * 두 스탯 뭉치 사이에 **등급이 오른** 것들.
 *
 * ⚠️ **오른 것만 돌려준다.** 스탯은 내려가기도 하고(낮은 스탯의 대가 `below` 랭크 이벤트,
 * 밤 정산의 음수 효과) 그때는 알릴 것이 없다 — 축하는 올라간 순간의 몫이다.
 * 내려간 뒤 다시 오르면 그때 또 알린다(호출부가 비교 기준을 매번 갱신하므로 저절로 그렇다).
 *
 * ⚠️ **순서는 `GROWTH_STAT_KEYS`가 정한다** — 한 턴에 여럿이 오르면 화면이 그 순서대로
 * 줄을 세우는데, 정렬을 따로 하면 스탯창 그리드 순서와 어긋나 같은 것이 두 순서로 읽힌다.
 */
export function rankUps(before: Stats, after: Stats): RankUp[] {
  const ups: RankUp[] = []
  for (const key of GROWTH_STAT_KEYS) {
    const from = rankOf(key, before[key])
    const to = rankOf(key, after[key])
    if (RANK_ORDER.indexOf(to) > RANK_ORDER.indexOf(from)) ups.push({ key, from, to })
  }
  return ups
}
