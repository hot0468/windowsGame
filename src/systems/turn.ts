import { getLivingCost, getWageMultiplier } from './economy'
import { burnoutKeyOf, getBurnoutPenalty, pushActivity } from './burnout'
import { weekdayOf } from '../data/calendar'
import { DEFAULT_HOUSING_ID, findHousing } from '../data/housing'
import { FINAL_DAYS, isWorkWeekday } from '../data/careers'
import { GROWTH_STAT_KEYS, INITIAL_STATS } from '../types/game'
import type {
  Activity,
  Application,
  Employment,
  EventLog,
  GameState,
  GrowthStatKey,
  JobStageGate,
  Slot,
  Stats,
} from '../types/game'

/** 취침 시 회복되는 체력 비율 (maxStamina 기준). */
const SLEEP_RECOVERY_RATIO = 0.6

/** 취침 시 회복되는 멘탈. */
const SLEEP_MENTAL_RECOVERY = 5

/**
 * 최대 체력 상한.
 * 철인 엔딩 조건(maxStamina 200)과 같은 값이다 — 상한에 닿는 순간이 곧 엔딩 획득 시점이 되어,
 * 그 너머로 무의미하게 성장하는 구간을 없앤다.
 * 상한이 없으면 취침 회복량(maxStamina * SLEEP_RECOVERY_RATIO)도 함께 무한히 커져
 * 체력이 자원으로서 기능하지 않게 된다.
 */
export const MAX_STAMINA_CAP = 200

/**
 * 성장 스탯(지식·매력·감수성 등 9종)의 상한.
 * maxStamina와 달리 엔딩 조건과 묶여 있지 않으므로, 장기 육성의 여유를 두고 999로 잡는다.
 */
export const GROWTH_STAT_CAP = 999

/**
 * 기본 상한을 따르지 않는 성장 스탯.
 *
 * 평판·도덕은 "얼마나 쌓았나"가 아니라 **평가 지표**라 0~100 척도가 더 자연스럽다
 * (설계자 지시). 스탯창에서도 멘탈과 같은 자원 줄에 놓이므로 척도가 같아야 읽힌다.
 * ⚠️ 어떤 엔딩 조건도 이 셋을 쓰지 않으므로 상한을 낮춰도 도달 불가능해지는 엔딩은 없다
 * (`data/endings.ts` 확인함). 나중에 이 셋을 쓰는 엔딩을 추가하면 100 이하로 잡을 것.
 *
 * **예의범절도 같은 부류다**(2026-08-05 신설). "얼마나 많이 아는가"가 아니라
 * **몸에 배어 있는가**를 재는 값이라 999까지 쌓는 척도가 뜻을 갖지 않는다 —
 * 인사와 말씨는 999번 한다고 999만큼 몸에 배지 않는다.
 */
const GROWTH_STAT_CAP_OVERRIDES: Partial<Record<GrowthStatKey, number>> = {
  reputation: 100,
  morality: 100,
  manners: 100,
}

/** 해당 성장 스탯의 상한. UI도 이 함수를 써야 표시와 클램프가 어긋나지 않는다. */
export function growthCap(key: GrowthStatKey): number {
  return GROWTH_STAT_CAP_OVERRIDES[key] ?? GROWTH_STAT_CAP
}

/** 멘탈 상한. 소모 자원이므로 성장 스탯과 성격이 달라 0~100을 유지한다. */
export const MENTAL_CAP = 100

export function createInitialState(playerName: string): GameState {
  return {
    playerName,
    day: 1,
    slot: 'morning',
    stats: { ...INITIAL_STATS },
    recentActivities: [],
    seenEndingIds: [],
    gameOver: null,
  }
}

/**
 * 보유 아이템 목록.
 *
 * ⚠️ **`delivery.ts`가 아니라 여기 있다**(2026-08-04 이동). 활동 실행 조건(`canRun`)이
 * 보유 여부를 보게 되면서 `turn` → `delivery` 의존이 생기는데, `delivery`는 이미
 * `turn`을 부르고 있어 순환이 된다. 보유 판정은 `GameState`만 보는 순수 술어라
 * 배송 규칙보다 아래 계층에 있는 것이 맞다. `delivery.ts`가 그대로 재수출하므로
 * 기존 호출부는 손대지 않았다.
 */
export function inventoryOf(state: GameState): EventLog[] {
  return state.inventory ?? []
}

/** 이미 가진 물건인지. 보유 판정이 여러 곳에 흩어지지 않게 여기 하나만 둔다. */
export function owns(state: GameState, itemId: string): boolean {
  return inventoryOf(state).some((i) => i.id === itemId)
}

/**
 * 정규직 상태 게이트.
 *
 * ⚠️ **규칙이 아니라 판정만 여기 있다.** 채용 절차·급여·결근은 전부
 * `systems/employment.ts`가 갖고, 여기서는 `canRun`이 물어볼 수 있게 상태를 읽기만 한다
 * (`owns`가 `requiresItem`을 위해 여기 있는 것과 같은 이유 — 활동을 실행하는 통로가
 * 넷이라 판정이 `canRun` 밖에 있으면 그중 하나가 반드시 게이트를 통과한다).
 */
export function jobStageOpen(state: GameState, gate: JobStageGate): boolean {
  if (gate === 'employed') {
    const job = state.employment
    if (!job) return false
    // 근무일이 아닌 날의 출근은 슬롯만 먹고 아무 일도 일어나지 않는다(급여는 급여일에 온다).
    if (!isWorkWeekday(weekdayOf(state.day))) return false
    // 하루에 두 번 출근할 수는 없다 — 두 번 세면 결근 계산과 출근부가 어긋난다.
    return !job.attendedDays.includes(state.day)
  }
  if (gate === 'interview') {
    const app = state.application
    return !!app && app.stage === 'interview' && state.day >= app.dueDay
  }
  // 'applying': 지금 **새로 지원할 수 있는 상태인가**. 한 번에 한 곳만 넣을 수 있고,
  // 다니는 회사가 있으면 넣지 않는다. 사유 문구는 `systems/employment.ts`의 `applyBlockers`가
  // 만든다 — 여기서는 판정만 한다.
  //
  // ⚠️ "이미 지원했는가"가 아니라 "지원할 수 있는가"인 이유: 이 게이트는 **누르기 전에**
  // 물어보는 것이다. 실행된 뒤의 상태를 조건으로 걸면 확정 버튼이 영영 비활성이 된다
  // (CDP 실측으로 잡은 버그).
  return !state.employment && !state.application
}

/**
 * 요구 스탯과 요구 아이템을 모두 충족하고 게임오버가 아니어야 실행 가능하다.
 *
 * ⚠️ **아이템 조건도 여기서 본다.** 화면에서만 막으면 스케줄러에 미리 넣어 둔 예약이
 * 잠금을 그대로 통과한다 — 그 경로로 들어오면 회원권 없이 회원 요금(무료)으로 운동하게 된다.
 * 정규직 게이트(`requiresJobStage`)도 같은 이유로 여기 있다.
 */
export function canRun(state: GameState, activity: Activity): boolean {
  if (state.gameOver) return false
  if (activity.requiresItem && !owns(state, activity.requiresItem)) return false
  if (activity.requiresJobStage && !jobStageOpen(state, activity.requiresJobStage)) return false
  if (!activity.requires) return true
  return Object.entries(activity.requires).every(
    ([key, required]) => state.stats[key as keyof Stats] >= required,
  )
}

/**
 * 체력은 0~maxStamina, 멘탈은 0~MENTAL_CAP, maxStamina는 1~MAX_STAMINA_CAP,
 * 성장 스탯 9종은 0~GROWTH_STAT_CAP으로 제한한다.
 */
export function clampStats(stats: Stats): Stats {
  const maxStamina = Math.min(MAX_STAMINA_CAP, Math.max(1, Math.round(stats.maxStamina)))
  const clamped: Stats = {
    ...stats,
    maxStamina,
    // 체력 상한은 클램핑된 maxStamina를 기준으로 한다 — 원본 값을 쓰면 상한을 넘길 수 있다.
    stamina: Math.round(Math.min(Math.max(0, stats.stamina), maxStamina)),
    mental: Math.round(Math.min(Math.max(0, stats.mental), MENTAL_CAP)),
    money: Math.round(stats.money),
  }
  // 성장 스탯은 키 목록을 돌며 일괄 처리한다. 상한만 스탯별로 다를 수 있으므로
  // growthCap()에 물어본다 — 스탯이 추가돼도 여기를 고칠 필요가 없다.
  for (const key of GROWTH_STAT_KEYS) {
    clamped[key] = Math.min(growthCap(key), Math.max(0, Math.round(stats[key])))
  }
  return clamped
}

/**
 * 활동 효과를 스탯에 적용한다.
 * 번아웃 효율은 긍정 효과에만 곱한다 — 소모량까지 줄어들면 페널티가 아니게 된다.
 * 알바비(scalesWithWage)에는 물가 배율을 적용한다.
 */
function applyEffects(stats: Stats, activity: Activity, day: number, efficiency: number): Stats {
  const next = { ...stats }
  for (const [key, rawValue] of Object.entries(activity.effects)) {
    const statKey = key as keyof Stats
    let value = rawValue
    if (statKey === 'money' && value > 0 && activity.scalesWithWage) {
      value *= getWageMultiplier(day)
    }
    next[statKey] += value > 0 ? value * efficiency : value
  }
  return next
}

/**
 * 그 집에 사는 대가로 밤마다 깎이는 멘탈.
 *
 * ⚠️ **`systems/housing.ts`를 import하지 않는다** — 그쪽이 이미 `turn.ts`를 부르고 있어
 * 순환이 된다(`owns`가 `delivery.ts`에서 여기로 옮겨 온 것과 같은 이유). 여기서 읽는
 * 것은 **데이터 한 줄**(`Housing.mentalPerNight`)뿐이고, 이사의 규칙(누가 어디로 옮길
 * 수 있고 얼마가 오가는가)은 전부 `housing.ts`가 갖는다. `housing.ts`가 같은 값을
 * `housingMentalCost`로 재수출하므로 화면은 그쪽을 본다.
 */
function housingMentalCost(state: GameState): number {
  const id = state.housing?.id ?? DEFAULT_HOUSING_ID
  return findHousing(id)?.mentalPerNight ?? 0
}

/**
 * 취침: 체력·멘탈 회복 후 생활비 차감.
 *
 * ⚠️ **생활비는 이제 날짜만의 함수가 아니다** — `getLivingCost(state)`가 물가 구간에
 * **집 배율**을 곱한다(2026-08-05 이사 신설). 여기서 `livingCostForDay`를 쓰면
 * 이사한 플레이어가 실제로는 안 낸 돈을 내게 된다.
 *
 * ⚠️ **집이 멘탈을 갉는 것도 여기서 일어난다**(`housingMentalCost`). 밤에 붙는 이유는
 * 회복과 같은 자리에서 상계돼야 "그 방에서 자는 대가"로 읽히기 때문이다.
 * `housing.ts`를 import하지 않고 `GameState.housing`의 배율/비용만 읽는 것은
 * `nightPayoutPending`이 `employment.ts`를 import하지 않는 것과 같은 규칙이다 —
 * 의존은 계속 한 방향이다(housing → turn).
 */
function sleep(stats: Stats, state: GameState): Stats {
  return {
    ...stats,
    stamina: stats.stamina + stats.maxStamina * SLEEP_RECOVERY_RATIO,
    mental: stats.mental + SLEEP_MENTAL_RECOVERY - housingMentalCost(state),
    money: stats.money - getLivingCost(state),
  }
}

/** 슬롯을 넘기고, 오후였다면 취침 정산까지 처리한다. */
function advance(state: GameState, stats: Stats): { day: number; slot: Slot; stats: Stats } {
  if (state.slot === 'morning') {
    return { day: state.day, slot: 'afternoon', stats }
  }
  return { day: state.day + 1, slot: 'morning', stats: sleep(stats, state) }
}

function detectGameOver(stats: Stats): GameState['gameOver'] {
  if (stats.money <= 0) return 'bankrupt'
  if (stats.mental <= 0) return 'burnout'
  return null
}

/**
 * **그 밤에 아직 들어올 돈이 남아 있는가.**
 *
 * ⚠️ 이 술어 하나가 "급여가 우선한다"(설계자 지시)를 지탱한다. 밤 정산은 생활비를
 * 먼저 빼는데, 급여는 그 뒤에 `gameStore.afterTurn` → `advanceEmployment`가 넣는다.
 * 그 사이에서 파산을 확정해 버리면 **월급 167만 원을 손에 쥔 채 굶어 죽었다는 판정**이
 * 나온다(실제로 나던 버그다). 그러니 아직 입금이 남은 밤에는 **판단 자체를 미룬다**.
 *
 * ⚠️ **`employment.ts`를 import하지 않는다** — 의존은 계속 한 방향이다
 * (employment/schedule/delivery → turn, 반대는 없다). 여기서 보는 것은 세이브에 이미 있는
 * `GameState.employment`의 **날짜 하나**(`paydayDay`)뿐이고, 규칙(누구에게 얼마를 언제
 * 주는가)은 여전히 전부 `employment.ts`가 갖는다. `canRun`의 `jobStageOpen`이 같은 자리에
 * 같은 이유로 있는 것과 같다 — 활동 실행 통로가 넷이듯, 턴을 넘기는 통로도 여럿이라
 * 판단이 `turn.ts` 밖에 있으면 그중 하나가 반드시 샌다.
 *
 * `>=`인 이유: 급여 루프(`payWages`)도 `day >= paydayDay`로 밀린 주기를 따라잡는다
 * (스케줄러 연쇄로 며칠이 한 번에 흐를 수 있다). 판정 기준이 어긋나면 미루는 밤과
 * 실제 입금하는 밤이 달라진다.
 *
 * ⚠️ **밤에 돈이 들어오는 원천을 새로 만들면 그 조건을 여기에 함께 넣어야 한다**
 * (연말정산·이자·환급 등). 안 넣으면 정확히 같은 형태의 버그가 그 원천에서 재현된다 —
 * "받을 돈이 있는데 그 전에 죽었다"가 된다.
 *
 * **원천 2 — 은행 정기예금 만기**(2026-08-05 추가). 만기 원리금은 밤 정산 뒤
 * `afterTurn` → `advanceBank`가 **소지금으로** 넣는다. 급여와 똑같은 자리, 똑같은 이유다:
 * 12일을 참고 묶어 둔 돈이 만기 당일 밤에 손에 들어오는데 그 직전에 파산하면
 * 정기예금이라는 장치 자체가 거짓말이 된다. 판정 근거는 `GameState.bank.deposits`의
 * **날짜 하나**(`matureDay`)뿐이고, 규칙(얼마를 언제 주는가)은 전부 `systems/bank.ts`에 있다 —
 * 여기서 `bank.ts`를 import하지 않는 것도 `employment.ts`를 import하지 않는 것과 같다.
 *
 * **원천 3 — 복권 당첨금**(2026-08-05 추가). 오후에 산 표가 당첨되면 상금은
 * `GameState.lottery.pending`에 담겼다가 밤 정산 뒤 `advanceLottery`가 소지금에 넣는다.
 * 급여·만기와 **정확히 같은 자리, 같은 이유**다: 그 중간에서 판정하면
 * **당첨금을 손에 쥔 채 굶어 죽는다.** 여기서 보는 것도 숫자 하나(`pending`)뿐이고
 * 규칙(확률·상금·언제 굴리는가)은 전부 `systems/lottery.ts`에 있다.
 */
export function nightPayoutPending(state: GameState): boolean {
  const job = state.employment
  if (job && state.day >= job.paydayDay) return true
  if ((state.lottery?.pending ?? 0) > 0) return true
  return (state.bank?.deposits ?? []).some((d) => state.day >= d.matureDay)
}

/**
 * **밤이 다 정산된 뒤 딱 한 번** 게임오버를 확정한다.
 *
 * 생활비가 나가고 급여가 들어오고 그 밖에 그날 밤 돈을 움직이는 것이 전부 끝난 다음이
 * 유일하게 옳은 판정 시점이다. 부르는 곳은 **밤의 마지막 지점 하나**뿐이다 —
 * `employment.ts`의 `advanceEmployment` 말미(그리고 그것을 부르는 `gameStore.afterTurn`이
 * 턴을 넘기는 모든 통로의 종점이다).
 *
 * ⚠️ **되살아나게 하는 함수가 아니다.** 이미 확정된 게임오버는 그대로 두고(초기화하지
 * 않는다), 아직 null인 판만 지금 상태로 판단한다. 그래야 "죽었다가 살아나는" 상태가
 * 화면에 한 프레임도 나타나지 않는다.
 */
export function settleGameOver(state: GameState): GameState {
  if (state.gameOver) return state
  const gameOver = detectGameOver(state.stats)
  return gameOver ? { ...state, gameOver } : state
}

/**
 * 슬롯을 넘긴 결과에 게임오버 판정을 붙인다.
 *
 * ⚠️ **입금이 남은 밤에는 판단을 미룬다**(`nightPayoutPending`). 미룬 판은
 * `advanceEmployment` 말미의 `settleGameOver`가 급여까지 끝난 뒤에 결정한다. `runActivity`·`skipSlot`을
 * 직접 부르는 곳(밸런스 시뮬레이션)에서도 **무직이면 지금 그대로 판정된다** —
 * 미뤄지는 것은 오직 "오늘 밤 월급이 들어오는 재직자"뿐이다.
 */
function withGameOver(next: GameState): GameState {
  if (nightPayoutPending(next)) return next
  return { ...next, gameOver: detectGameOver(next.stats) }
}

/**
 * 정규직 활동이 남기는 **사실**을 기록한다.
 *
 * ⚠️ **여기 있어야 하는 이유는 `canRun`과 같다.** 활동을 실행하는 통로가 넷이고
 * (사이트 확정 버튼 · 스케줄러 예약 · 바탕화면 바로 가기 · 카톡 제안) 그중 어느 하나라도
 * 이 기록을 빠뜨리면 "출근했는데 결근으로 세는" 또는 "면접을 봤는데 절차가 안 넘어가는"
 * 형태로 조용히 터진다. `runActivity`는 그 넷이 모두 지나는 유일한 지점이다.
 *
 * 판단은 활동 id가 아니라 **게이트**로 한다 — id로 분기하면 활동을 하나 더 만들 때 샌다.
 * 그 밖의 규칙(결근 감사·급여·해고)은 전부 `systems/employment.ts`에 있다.
 */
function stampJob(
  state: GameState,
  activity: Activity,
): { employment?: Employment; application?: Application } {
  const { employment, application } = state
  if (activity.requiresJobStage === 'employed' && employment) {
    return {
      application,
      employment: { ...employment, attendedDays: [...employment.attendedDays, state.day] },
    }
  }
  if (activity.requiresJobStage === 'interview' && application) {
    // 면접을 봤으면 최종 결과를 기다리는 단계로 넘어간다.
    return {
      employment,
      application: { ...application, stage: 'final', dueDay: state.day + FINAL_DAYS },
    }
  }
  return { employment, application }
}

/** 활동을 실행하고 다음 슬롯 상태를 반환한다. 원본은 변경하지 않는다. */
export function runActivity(state: GameState, activity: Activity): GameState {
  if (state.gameOver) return state

  // 알바 4종은 같은 키를 공유한다 — 종류를 바꿔 가며 일해도 연속 노동은 연속 노동이다.
  const key = burnoutKeyOf(activity)
  const { efficiency, mentalPenalty } = getBurnoutPenalty(state.recentActivities, key)
  const withEffects = applyEffects(state.stats, activity, state.day, efficiency)
  withEffects.mental -= mentalPenalty

  // ⚠️ 기록은 **턴을 넘기기 전**에 뽑는다 — 오후 행동은 날짜를 바꾸므로
  //    넘긴 뒤에 찍으면 "다음 날 출근한 것"이 된다.
  const stamped = stampJob(state, activity)
  const advanced = advance(state, withEffects)
  const stats = clampStats(advanced.stats)

  return withGameOver({
    ...state,
    ...stamped,
    day: advanced.day,
    slot: advanced.slot,
    stats,
    recentActivities: pushActivity(state.recentActivities, key),
  })
}

/**
 * 광고 배너 클릭 보상. 하루 한 번, 100원.
 *
 * ⚠️ **턴을 소모하지 않는다.** "탐색은 무료"라는 규칙(설계 문서 2.3)은 그대로다 —
 * 브라우저를 여는 것도, 배너를 누르는 것도 슬롯을 쓰지 않는다.
 * 금액이 생활비(3만원~)의 0.3% 수준인 것도 의도다: 클릭이 생계 수단이 되면
 * "일해서 번다"는 게임의 축이 무너진다. 소소한 습관 정도로만 둔다.
 */
export const AD_BONUS_MONEY = 100

/** 오늘 아직 광고 보상을 받지 않았고 게임이 진행 중이면 true. */
export function canClaimAdBonus(state: GameState): boolean {
  return !state.gameOver && state.adBonusDay !== state.day
}

/** 보상을 받는다. 이미 받았거나 게임오버면 상태를 그대로 돌려준다(호출부에서 막지 않아도 안전). */
export function claimAdBonus(state: GameState): GameState {
  if (!canClaimAdBonus(state)) return state
  return {
    ...state,
    stats: clampStats({ ...state.stats, money: state.stats.money + AD_BONUS_MONEY }),
    adBonusDay: state.day,
  }
}

/**
 * 돈만 쓴다. **턴을 소모하지 않는다.**
 *
 * 헬스장 월결제처럼 "대화 중에 결제만 하는" 행동용이다. 활동(`runActivity`)으로 만들면
 * 반드시 한 슬롯을 먹는데, 등록은 시간을 쓰는 일이 아니다.
 * 잔액이 모자라면 아무것도 하지 않는다 — 마이너스 잔액은 파산 판정을 흐린다.
 */
export function spendMoney(state: GameState, amount: number): GameState {
  if (state.gameOver || amount <= 0 || state.stats.money < amount) return state
  return { ...state, stats: clampStats({ ...state.stats, money: state.stats.money - amount }) }
}

/** 아무 활동 없이 슬롯만 넘긴다. 'rest' 기록으로 번아웃 연속이 끊긴다. */
export function skipSlot(state: GameState): GameState {
  if (state.gameOver) return state

  const advanced = advance(state, { ...state.stats })
  const stats = clampStats(advanced.stats)

  return withGameOver({
    ...state,
    day: advanced.day,
    slot: advanced.slot,
    stats,
    recentActivities: pushActivity(state.recentActivities, 'rest'),
  })
}
