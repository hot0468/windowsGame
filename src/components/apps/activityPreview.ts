import { burnoutKeyOf, getBurnoutPenalty } from '../../systems/burnout'
import { chanceEfficiency, chanceMoneyBack } from '../../systems/chance'
import { meetMentalBonus } from '../../systems/affection'
import { illnessEfficiency, isIll } from '../../systems/illness'
import { ILLNESS_DAYS, ILL_EFFICIENCY, ILL_STAMINA_FLOOR } from '../../data/illness'
import { weatherEfficiency } from '../../systems/weather'
import { getLivingCost } from '../../systems/economy'
import { canRun, jobStageOpen, outfitFor, ownsRequired, statBonusFor, subscribed } from '../../systems/turn'
import { findSubscription } from '../../data/subscriptions'
import { applyBlockers, attendedToday, isWorkday } from '../../systems/employment'
import { OUTFIT_BONUS, requiredItemLabel, requiredItemStores } from '../../data/items'
import { skillOf } from '../../systems/band'
import { isWeekend } from '../../data/calendar'
import { WEEKEND_WAGE_BONUS } from '../../data/economy'
import { GROWTH_STAT_KEYS, STAT_NAMES, SLOT_NAMES } from '../../types/game'
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
 * 존재 이유: 활동을 확정하는 화면이 **둘**이다 — 활동 창(`ExeApp`)과
 * 실행 확인창(`ActivityConfirm`). 둘이 각자 계산하면
 * 한쪽만 고치는 사고가 나고, 그 사고는 "플레이어에게 거짓 숫자를 보여 준다"는 형태로 터진다.
 */
export interface ActivityPreview {
  /** 화면에 그릴 증감 줄. 순서는 `activity.effects`의 정의 순서를 그대로 따른다. */
  rows: { key: keyof Stats; value: number }[]
  /** 번아웃 효율(1 = 정상). */
  /** 번아웃 누적으로 추가로 깎이는 멘탈. 0이면 표시하지 않는다. */
  mentalPenalty: number
  /** 효율이 깎였는가 = 경고를 띄워야 하는가. */
  isBurnedOut: boolean
  /**
   * TPO가 맞아 상승분이 커졌다면 그 옷 이름. **없으면 undefined**.
   * ⚠️ 숫자(`rows`)에는 이미 반영돼 있다 — 이 값은 "왜 늘었는가"를 적기 위한 것이다.
   */
  outfit?: string
}

export function previewActivity(state: GameState, activity: Activity): ActivityPreview {
  // 키는 `burnoutKeyOf`가 정한다 — 실행(turn.ts)과 미리보기가 다른 키를 보면 거짓 숫자가 뜬다.
  const { mentalPenalty } = getBurnoutPenalty(state.recentActivities, burnoutKeyOf(activity))

  // ⚠️ TPO 옷 보너스도 **실행과 같은 함수**로 뽑는다(`runActivity` → `applyEffects`).
  //    여기서 비율을 다시 적으면 화면과 실제 결과가 갈린다.
  const outfit = outfitFor(state, activity.id)
  const bonus = outfit ? OUTFIT_BONUS : 0

  /* ⚠️ **날씨·아픔도 실행과 같은 함수로 뽑아 곱한다**(`runActivity`와 같은 자리).
     여기서 빠뜨리면 확인창이 "예술 +12"라고 적어 놓고 비 오는 날 실제로는 10만 오른다.
     "오늘만 기회"(`chanceEfficiency`)도 같은 자리·같은 규칙이다.
     ⚠️ **효율 배율(번아웃)은 2026-08-22에 폐지됐다** — 반복해도 얻는 것은 그대로다. */
  const applied =
    weatherEfficiency(state.day, activity.id) *
    illnessEfficiency(state) *
    chanceEfficiency(state, activity.id)

  const rows = Object.entries(activity.effects).map(([key, raw]) => {
    const statKey = key as keyof Stats
    let value = raw
    // 주말 알바는 할증이 붙는다. 정의된 값만 보여 주면 실제 입금액과 어긋난다.
    if (statKey === 'money' && value > 0 && activity.scalesWithWage) {
      // ⚠️ 실행(`applyEffects`)과 **같은 배율**을 곱한다.
      value *= isWeekend(state.day) ? WEEKEND_WAGE_BONUS : 1
    }
    // 효율은 **이득에만** 곱한다(손해까지 줄여 주면 번아웃이 이득이 된다).
    if (value <= 0) return { key: statKey, value: Math.round(value) }
    /* ⚠️ 휴대폰·랭크 숙련 보너스도 **실행과 같은 함수**(`statBonusFor`)로 더한다 —
       여기서 빠뜨리면 확인창이 실제보다 적게 적는다. */
    const total = bonus + statBonusFor(state, statKey)
    const boost =
      total > 0 && (GROWTH_STAT_KEYS as readonly string[]).concat('maxStamina').includes(statKey)
        ? Math.max(1, Math.round(value * total))
        : 0
    return { key: statKey, value: Math.round(value * applied + boost) }
  })

  /* ⚠️ **가까운 사람을 만나는 보너스도 여기서 적는다**(`turn.ts`와 같은 함수).
     빠뜨리면 확인창이 실제보다 적게 적고, 플레이어는 관계가 보상을 준다는 것을 모른다. */
  const meetBonus = meetMentalBonus(state, activity.id)
  if (meetBonus > 0) {
    const mental = rows.find((r) => r.key === 'mental')
    if (mental) mental.value += meetBonus
    else rows.push({ key: 'mental', value: meetBonus })
  }

  /* ⚠️ **"오늘만 기회"의 비용 할인도 실행과 같은 함수로 더한다**(`turn.ts`의
     `chanceMoneyBack`) — 빠뜨리면 확인창이 할인 전 금액을 적어 거짓이 된다. */
  const moneyBack = chanceMoneyBack(state, activity)
  if (moneyBack > 0) {
    const money = rows.find((r) => r.key === 'money')
    if (money) money.value += moneyBack
    else rows.push({ key: 'money', value: moneyBack })
  }

  return { rows, mentalPenalty, isBurnedOut: mentalPenalty > 0, outfit: outfit?.name }
}

/** 확정 전에 반드시 보여 줘야 하는 경고 한 줄. */
export interface ActivityWarning {
  /** 렌더 키. 같은 종류의 경고가 두 번 나오지 않는다. */
  id: 'burnout' | 'blocked' | 'living' | 'illness'
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
  const { mentalPenalty } = previewActivity(state, activity)
  const warnings: ActivityWarning[] = []

  if (mentalPenalty > 0) {
    warnings.push({
      id: 'burnout',
      text: `같은 일을 반복하고 있습니다. 멘탈이 ${mentalPenalty} 더 깎입니다.`,
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

  /* ⚠️ **아픔은 일어난 뒤에 알리면 사고다** — 그래서 경고를 여기 둔다(토스트도 알림창도
     만들지 않았다: 누르기 전에 읽히는 자리가 이 목록이고, HUD 배지가 앓는 동안 계속 남는다).
     판정 기준은 `nextIllness`와 같은 값(`ILL_STAMINA_FLOOR`)을 보되 **여기서 판정을 만들지
     않는다** — 오후에만 뜨는 것은 발병이 취침 정산 자리 하나에서만 일어나기 때문이다. */
  if (isIll(state)) {
    warnings.push({
      id: 'illness',
      text: `앓고 있습니다. 얻는 것이 ${Math.round(
        ILL_EFFICIENCY * 100,
      )}%로 줄고 취침 회복도 절반입니다. 병원에 가면 바로 낫습니다.`,
    })
  } else if (
    state.slot === 'afternoon' &&
    state.stats.stamina + (activity.effects.stamina ?? 0) <= ILL_STAMINA_FLOOR
  ) {
    warnings.push({
      id: 'illness',
      text: `이대로 하루를 끝내면 행동력이 바닥나 앓아눕습니다 (${ILLNESS_DAYS}일).`,
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

  if (state.recovery) {
    reasons.push('게임이 끝나 더 이상 활동할 수 없습니다.')
    // 게임이 끝났으면 나머지 조건은 따질 이유가 없다.
    return reasons
  }

  /* ⚠️ 슬롯 사유는 **언제 되는지**를 적는다 — "지금은 안 됩니다"만으로는 오후에 다시
     와야 하는지 내일 와야 하는지 알 수 없다. */
  if (activity.requiresSlot && state.slot !== activity.requiresSlot) {
    reasons.push(`${SLOT_NAMES[activity.requiresSlot]}에만 할 수 있습니다`)
  }

  /* ⚠️ 밴드 사유는 **지금 숙련도까지 적는다** — 문턱만 적으면 얼마나 더 합주해야 하는지
     알 수 없어 주간 예약을 걸어 둘 이유가 안 생긴다. */
  /* ⚠️ 요일 사유도 **언제 되는지**를 적는다(슬롯 사유와 같은 규칙). */
  if (activity.requiresWeek === 'weekend' && !isWeekend(state.day)) {
    reasons.push('주말에만 할 수 있습니다')
  }
  if (activity.requiresWeek === 'weekday' && isWeekend(state.day)) {
    reasons.push('평일에만 할 수 있습니다')
  }

  if (activity.requiresBandSkill !== undefined && skillOf(state) < activity.requiresBandSkill) {
    reasons.push(`밴드 숙련도 ${activity.requiresBandSkill} 필요 (지금 ${skillOf(state)})`)
  }

  if (activity.requiresItem && !ownsRequired(state, activity.requiresItem)) {
    // ⚠️ 가게 이름을 여기 적지 않는다 — 물건이 어느 사이트에 있는지는 `store`가 알고 있다.
    // 굳혀 두면 전자기기를 하이마루로 옮긴 순간 이 문장만 거짓이 된다.
    // ⚠️ 요구 아이템이 여럿이면 **"또는"**이다(타블렛 둘 → 클립스튜디오) —
    //    "둘 다 있어야 한다"로 읽히면 거짓말이 된다. 문구도 판정과 같은 함수에서 나온다.
    const where = requiredItemStores(activity.requiresItem)
    reasons.push(
      `${requiredItemLabel(activity.requiresItem)}이(가) 있어야 합니다${
        where ? ` — ${where}에서 구입` : ''
      }`,
    )
  }

  // ⚠️ 구독 잠금. 아이템과 달리 **끊기면 다시 잠기는** 조건이라 사유도 그렇게 적는다.
  if (activity.requiresSubscription && !subscribed(state, activity.requiresSubscription)) {
    const sub = findSubscription(activity.requiresSubscription)
    reasons.push(
      `${sub?.name ?? activity.requiresSubscription} 구독 중이어야 합니다${
        sub ? ` — 월 ${sub.monthlyFee.toLocaleString('ko-KR')}원` : ''
      }`,
    )
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
