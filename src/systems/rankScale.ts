/**
 * 등급 눈금 — `rank.ts`에서 갈라 낸 **상한을 모르는** 순수 부분(2026-08-14).
 *
 * ⚠️ **아무것도 import하지 않는 것이 존재 이유다.** 숙련 보너스(`turn.ts`의
 * `masteryBonusFor`)가 등급 눈금을 봐야 하는데, `rank.ts`는 `growthCap` 때문에 이미
 * `turn.ts`를 부르고 있다 — 눈금이 그쪽에만 있으면 순환이 된다(`careerLog.ts`가
 * 따로 사는 것과 같은 이유). 상한을 아는 판정(`rankOf`·`toNextRank`)은 여전히
 * `rank.ts`에 있고, 그쪽이 여기를 전부 재수출하므로 **가져다 쓰는 쪽은 `rank.ts`를
 * 계속 쓰면 된다**(`turn.ts`만 예외로 여기를 직접 본다).
 */

/**
 * 스탯 랭크. 설계자 지시가 F·C·B·A·S·SS 여섯 단계다. D·E를 넣지 않은 것은 **하위
 * 구간을 넓게 두기 위해서다** — 0에서 시작하는 스탯이 열 개라 판 초반에는 대부분이
 * 최하위인데, 거기서 등급이 촘촘하면 "F에서 E로 올랐다"가 성취처럼 보이지 않는다.
 * 대신 상위를 S·SS로 둘로 쪼개 **끝까지 올린 사람에게 마지막 한 칸**을 남겼다.
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
 * 등급이 **올랐는가**. 스탯창이 방금 넘어선 칸을 밝히는 데 쓴다.
 *
 * ⚠️ **내려간 것은 상승이 아니다** — 평판은 마감을 놓치면 깎이고 정크푸드는 매력을 깎으므로
 * 등급은 실제로 내려간다. 단순 비교(`!==`)로 두면 그 순간에도 "올랐다"고 빛난다.
 */
export function rankRose(before: StatRank, now: StatRank): boolean {
  return RANK_ORDER.indexOf(now) > RANK_ORDER.indexOf(before)
}

/**
 * 비율(0~1)에 해당하는 등급. 상한이 없는 값(소지금 등)을 다룰 때 쓰는 저수준 함수다.
 * 범위를 벗어난 값도 안전하게 클램프한다 — 상한을 넘긴 세이브가 들어와도 SS로 읽힌다.
 */
export function rankOfRatio(ratio: number): StatRank {
  if (!Number.isFinite(ratio)) return 'F'
  const r = Math.min(1, Math.max(0, ratio))
  return RANK_THRESHOLDS.find((t) => r >= t.min)!.rank
}
