import { burnoutKeyOf, getBurnoutPenalty } from '../../systems/burnout'
import { getWageMultiplier } from '../../systems/economy'
import type { Activity, GameState, Stats } from '../../types/game'

/**
 * "이 버튼을 누르면 무슨 일이 일어나는가"를 계산하는 **표시 전용** 어댑터.
 *
 * ⚠️ 여기서 게임 규칙을 새로 만들지 않는다. 번아웃 효율과 알바비 배율은
 * `systems/`의 순수 함수가 정하고, 이 파일은 그것을 **화면에 쓸 모양으로 묶기만** 한다.
 * (`systems/`는 React를 모르는 채로 두고, 컴포넌트는 같은 계산을 두 번 적지 않게 한다.)
 *
 * 존재 이유: 활동을 확정하는 화면이 **둘**이 됐다 — 활동 창(`ExeApp`)과
 * 브라우저 사이트의 확정 패널(`sites/ActivityCommit`). 둘이 각자 계산하면
 * 한쪽만 고치는 사고가 나고, 그 사고는 "플레이어에게 거짓 숫자를 보여 준다"는 형태로 터진다.
 */
export interface ActivityPreview {
  /** 화면에 그릴 증감 줄. 순서는 `activity.effects`의 정의 순서를 그대로 따른다. */
  rows: { key: keyof Stats; value: number }[]
  /** 번아웃 효율(1 = 정상). */
  efficiency: number
  /** 번아웃 누적으로 추가로 깎이는 멘탈. 0이면 표시하지 않는다. */
  mentalPenalty: number
  /** 효율이 깎였는가 = 경고를 띄워야 하는가. */
  isBurnedOut: boolean
}

export function previewActivity(state: GameState, activity: Activity): ActivityPreview {
  // 키는 `burnoutKeyOf`가 정한다 — 실행(turn.ts)과 미리보기가 다른 키를 보면 거짓 숫자가 뜬다.
  const { efficiency, mentalPenalty } = getBurnoutPenalty(
    state.recentActivities,
    burnoutKeyOf(activity),
  )

  const rows = Object.entries(activity.effects).map(([key, raw]) => {
    const statKey = key as keyof Stats
    let value = raw
    // 알바비는 물가와 함께 오른다. 정의된 값만 보여 주면 실제 입금액과 어긋난다.
    if (statKey === 'money' && value > 0 && activity.scalesWithWage) {
      value *= getWageMultiplier(state.day)
    }
    // 효율은 **이득에만** 곱한다(손해까지 줄여 주면 번아웃이 이득이 된다).
    return { key: statKey, value: Math.round(value > 0 ? value * efficiency : value) }
  })

  return { rows, efficiency, mentalPenalty, isBurnedOut: efficiency < 1 }
}
