import { growthCap } from './turn'
import { RANK_ORDER, RANK_THRESHOLDS, rankOfRatio } from './rankScale'
import { GROWTH_STAT_KEYS } from '../types/game'
import type { StatRank } from './rankScale'
import type { Stats } from '../types/game'

/**
 * 생활 등급 — **이 게임이 무엇을 향해 가는가**에 대한 답(2026-08-14 신설).
 *
 * ## 왜 필요한가
 * 예전에는 판을 끝내는 것이 파산이었다. 플레이어에게 상시로 보이는 압력이 "언제까지 안
 * 죽나" 하나뿐이었고, 그래서 목표를 향해 달리는 게 아니라 **죽음에서 도망치는** 게임이었다.
 * 게임오버를 없앤 지금(`types/game.ts`의 `Recovery`) 그 자리를 대신할 것이 필요하다.
 *
 * 스탯 랭크(`rank.ts`)는 스탯 **하나**를 재므로 "나는 지금 어디쯤인가"에 답하지 못한다 —
 * 지식 A에 운동 F인 사람과 그 반대인 사람이 같은 곳에 있는지 알 수 없다. 생활 등급은
 * **성장 스탯 15종을 하나의 눈금으로 합쳐** 그 물음에 답한다.
 *
 * ## ⚠️ 끝이 없어야 한다
 * 카이로소프트의 랭크가 그렇듯 **천장에 닿아도 목표가 끊기면 안 된다**(설계자 지시:
 * "완전한 게임오버는 없었으면"). 그래서 SS에 닿은 뒤에는 `SS+1`·`SS+2`…로 이어간다 —
 * 실제로 SS는 전 스탯 평균 95%라 도달이 아득하지만, **닿았을 때 갈 데가 없는 것**과
 * **닿아도 계속 갈 수 있는 것**은 다른 게임이다.
 *
 * ## 규칙
 * - 판정은 **상한 대비 비율의 평균**이다. 절대값 합으로 재면 상한 999짜리 열두 개가
 *   상한 100짜리 셋(평판·도덕·예의범절)을 덮어 버려 그 셋을 올릴 이유가 사라진다.
 * - 눈금은 스탯 랭크와 **같은 것을 쓴다**(`RANK_THRESHOLDS`). 두 벌을 두면 "지식 A"와
 *   "생활 A"가 서로 다른 뜻이 되어 플레이어가 두 척도를 따로 외워야 한다.
 * - 소모 자원(체력·멘탈·소지금)은 **안 센다**. 매일 오르내리는 잔량이라 등급이 하루에도
 *   몇 번씩 흔들리고, 그러면 "쌓아 온 것"을 재는 눈금이 아니게 된다.
 */

/** 생활 등급. SS를 넘어선 뒤에는 `plus`가 1씩 는다(`SS+1`·`SS+2`…). */
export interface LifeRank {
  rank: StatRank
  /** SS 초과분. 0이면 그냥 그 등급이다. */
  plus: number
  /** 화면에 그대로 적는 이름. `'B'`·`'SS'`·`'SS+2'`. */
  label: string
}

/**
 * 성장 스탯 15종의 **상한 대비 평균 비율**(0~1).
 *
 * ⚠️ 상한은 `growthCap`에게 물어본다 — 스탯창 게이지·클램프·스탯 랭크와 **같은 함수**라
 * 표시와 규칙이 어긋날 수 없다(`rank.ts`와 같은 규칙. 여기서 상한을 다시 적으면
 * 평판·도덕·예의범절이 999 기준으로 계산돼 평균이 영원히 바닥에 붙는다).
 */
export function lifeRatio(stats: Stats): number {
  const sum = GROWTH_STAT_KEYS.reduce((acc, key) => acc + stats[key] / growthCap(key), 0)
  const ratio = sum / GROWTH_STAT_KEYS.length
  /* ⚠️ **문턱에 정확히 걸친 값을 문턱 아래로 떨어뜨리지 않는다.** 열다섯 번의
     나눗셈을 더한 값이라 상한의 딱 95%를 채워도 0.9499999…가 나오고, 그러면 화면이
     "SS인데 S라고 적는" 상태가 된다. 눈금 자체(`RANK_THRESHOLDS`)를 흔들지 않고
     **읽는 쪽에서 한 번만** 보정한다. */
  return Math.min(1, Math.round(ratio * 1e9) / 1e9)
}

/**
 * SS 문턱을 넘어선 뒤 한 칸을 더 오르는 데 필요한 비율.
 *
 * ⚠️ **남은 구간을 등분한 값이다**(0.95~1을 다섯 칸). 임의의 수를 박으면 SS+1이
 * SS보다 쉬워지거나 영영 불가능해진다.
 */
const PLUS_STEP = (1 - 0.95) / 5

/**
 * 지금 생활 등급.
 *
 * ⚠️ **SS 위로는 `plus`로 이어진다.** 비율이 1(전 스탯 만점)에 닿아도 등급이 멈추지
 * 않게 하려면 상한 자체가 없어야 하는데, 비율은 1을 넘지 못한다 — 그래서 만점에서
 * 최대 `SS+5`가 되고 그 위는 없다. **그 지점은 전 스탯 999를 채운 사람뿐이라
 * 사실상 도달하지 않는다**(도달하면 그때 눈금을 늘리면 된다).
 */
export function lifeRankOf(stats: Stats): LifeRank {
  const ratio = lifeRatio(stats)
  const rank = rankOfRatio(ratio)
  if (rank !== 'SS') return { rank, plus: 0, label: rank }
  const plus = Math.floor((ratio - 0.95) / PLUS_STEP)
  return { rank, plus, label: plus > 0 ? `SS+${plus}` : 'SS' }
}

/**
 * 다음 등급까지 남은 **비율**(0~1). 화면이 게이지를 그리는 값이다.
 *
 * ⚠️ **`toNextRank`와 달리 스탯 수치가 아니다.** 생활 등급은 열다섯 스탯의 평균이라
 * "얼마를 올리면 되는가"에 스탯 하나로 답할 수 없다 — 무엇을 올려도 되기 때문이다.
 * 그래서 화면은 수치 대신 **진행 게이지**를 그린다.
 */
export function lifeProgress(stats: Stats): number {
  const ratio = lifeRatio(stats)
  const i = RANK_ORDER.indexOf(rankOfRatio(ratio))
  const floor = RANK_THRESHOLDS.find((t) => t.rank === RANK_ORDER[i])!.min
  /* SS 안에서는 `PLUS_STEP` 한 칸이 곧 다음 목표다 — 아니면 SS에 닿는 순간
     게이지가 영영 100%로 굳어 "다음"이 사라진다. */
  if (RANK_ORDER[i] === 'SS') {
    const into = ratio - 0.95
    return Math.min(1, (into % PLUS_STEP) / PLUS_STEP)
  }
  const ceil = RANK_THRESHOLDS.find((t) => t.rank === RANK_ORDER[i + 1])!.min
  const p = (ratio - floor) / (ceil - floor)
  /* 부동소수 오차로 0에 아주 가까운 음수가 나오면 게이지가 100%로 감긴다. */
  return Math.min(1, Math.max(0, Math.round(p * 1e9) / 1e9))
}

/** 생활 등급이 **올랐는가**. 승급 축하를 띄우는 자리가 이 하나를 본다. */
export function lifeRankRose(before: LifeRank, now: LifeRank): boolean {
  const bi = RANK_ORDER.indexOf(before.rank)
  const ni = RANK_ORDER.indexOf(now.rank)
  return ni > bi || (ni === bi && now.plus > before.plus)
}
