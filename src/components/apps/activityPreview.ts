import { burnoutKeyOf, getBurnoutPenalty } from '../../systems/burnout'
import { getLivingCost, getWageMultiplier } from '../../systems/economy'
import { canRun, jobStageOpen, owns } from '../../systems/turn'
import { applyBlockers, attendedToday, isWorkday } from '../../systems/employment'
import { findItem } from '../../data/items'
import { STAT_NAMES } from '../../types/game'
import type { Activity, GameState, JobStageGate, Stats } from '../../types/game'

/**
 * 정규직 게이트가 닫혀 있는 이유.
 *
 * ⚠️ **두 번째 판정이 아니다** — 막을지 말지는 `jobStageOpen`이 정하고, 여기서는
 * 그것이 본 것과 같은 조건을 훑어 문장만 만든다(`blockReasons` 전체와 같은 규칙).
 */
function jobGateReason(state: GameState, gate: JobStageGate): string {
  if (gate === 'employed') {
    if (!state.employment) return '재직 중인 회사가 없습니다 — 벼룩장터에서 정규직에 지원하세요'
    if (!isWorkday(state.day)) return '오늘은 근무일이 아닙니다 (근무일: 월~금)'
    if (attendedToday(state)) return '오늘은 이미 출근했습니다'
    return '지금은 출근할 수 없습니다'
  }
  if (gate === 'interview') {
    const app = state.application
    if (!app) return '진행 중인 지원이 없습니다'
    if (app.stage === 'screening') return '아직 서류 심사 결과가 나오지 않았습니다'
    if (app.stage === 'final') return '이미 면접을 봤습니다 — 최종 결과를 기다리는 중입니다'
    return '면접일이 아직 되지 않았습니다'
  }
  // 'applying' — 사유는 `applyBlockers`가 만든다(두 번째 문구를 만들지 않는다).
  return applyBlockers(state)[0] ?? '지금은 지원할 수 없습니다'
}

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

/** 확정 전에 반드시 보여 줘야 하는 경고 한 줄. */
export interface ActivityWarning {
  /** 렌더 키. 같은 종류의 경고가 두 번 나오지 않는다. */
  id: 'burnout' | 'blocked' | 'living'
  text: string
}

/**
 * "이 버튼을 누르면 치르게 되는 대가" 중 **숫자 줄로는 안 보이는 것**들.
 *
 * ⚠️ **이 목록이 곧 이 게임의 정직성 약속이다.** 활동을 확정하는 화면은 이제 셋이고
 * (활동 창 · 사이트 확정 패널 · 바탕화면 바로 가기 확인창), 셋이 각자 경고를 적으면
 * **한 곳만 빠뜨린 화면**이 반드시 생긴다. 그 사고는 "누르기 전에 비용을 알 수 없다"는
 * 형태로 터진다 — 그래서 문구까지 여기 한 곳에 둔다.
 *
 * 판정은 만들지 않는다: 실행 가능 여부는 `canRun`, 효율은 `getBurnoutPenalty`,
 * 생활비는 `getLivingCost`가 정하고 여기서는 **문장으로 옮기기만** 한다.
 */
export function previewWarnings(state: GameState, activity: Activity): ActivityWarning[] {
  const { efficiency } = previewActivity(state, activity)
  const warnings: ActivityWarning[] = []

  if (efficiency < 1) {
    warnings.push({
      id: 'burnout',
      text: `같은 일을 반복하고 있습니다. 효율이 ${Math.round(efficiency * 100)}%입니다.`,
    })
  }

  if (!canRun(state, activity)) {
    // ⚠️ **왜 못 하는지까지 적는다**(ux `error-clarity`). 예전에는 "행동력이나 소지금이
    // 부족합니다" 한 문장뿐이었는데, 조건이 스탯·아이템·정규직 상태로 늘어나면서
    // 그 문장이 거짓이 되는 경우가 생겼다(재직 중이 아니라 출근을 못 하는 것 등).
    const reasons = blockReasons(state, activity)
    warnings.push({
      id: 'blocked',
      text: reasons.length
        ? `지금은 할 수 없습니다 — ${reasons.join(' · ')}`
        : '지금은 할 수 없습니다. 행동력이나 소지금이 부족합니다.',
    })
  }

  // ⚠️ 오후 행동은 하루를 끝내고 `sleep()`이 생활비를 빼 간다.
  // 이걸 안 적으면 "-15,000원"만 보고 눌렀다가 실제로는 그보다 훨씬 많이 빠져나간다.
  if (state.slot === 'afternoon') {
    warnings.push({
      id: 'living',
      // ⚠️ 상태를 넘긴다 — 생활비는 날짜뿐 아니라 **사는 집**이 정한다(2026-08-05 이사).
      text: `지금 확정하면 하루가 끝나고 잠자리에 듭니다. 생활비 ${getLivingCost(
        state,
      ).toLocaleString('ko-KR')}원이 차감됩니다. (행동력·멘탈은 회복됩니다)`,
    })
  }

  return warnings
}

/**
 * **왜 지금 할 수 없는가.** `canRun`이 false일 때만 의미가 있다.
 *
 * ⚠️ **두 번째 판정 규칙이 아니다.** 막을지 말지는 `canRun` 혼자 정하고, 여기서는
 * 그 판정이 본 것과 **같은 조건**을 훑어 사유만 글자로 만든다. 화면이 자기 기준으로
 * 다시 판정하면 "버튼은 살아 있는데 눌러도 안 되는" 어긋남이 생긴다.
 * (알바몬이 조건 미달 공고에 사유를 적는 것과 같은 방식이다.)
 */
export function blockReasons(state: GameState, activity: Activity): string[] {
  const reasons: string[] = []

  if (state.gameOver) {
    reasons.push('게임이 끝나 더 이상 활동할 수 없습니다.')
    // 게임이 끝났으면 나머지 조건은 따질 이유가 없다.
    return reasons
  }

  if (activity.requiresItem && !owns(state, activity.requiresItem)) {
    const item = findItem(activity.requiresItem)
    reasons.push(`${item?.name ?? activity.requiresItem}이(가) 있어야 합니다 — 쇼핑에서 구입`)
  }

  // 정규직 게이트. 판정은 `jobStageOpen`이 하고 여기서는 사유만 글자로 옮긴다.
  if (activity.requiresJobStage && !jobStageOpen(state, activity.requiresJobStage)) {
    reasons.push(jobGateReason(state, activity.requiresJobStage))
  }

  for (const [key, required] of Object.entries(activity.requires ?? {})) {
    const statKey = key as keyof Stats
    const current = state.stats[statKey]
    if (current >= required) continue
    reasons.push(
      `${STAT_NAMES[statKey]} ${required.toLocaleString('ko-KR')} 이상 필요 — 현재 ${current.toLocaleString('ko-KR')}`,
    )
  }

  return reasons
}
