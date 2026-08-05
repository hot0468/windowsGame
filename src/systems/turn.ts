import { getLivingCost, getWageMultiplier } from './economy'
import { burnoutKeyOf, getBurnoutPenalty, pushActivity } from './burnout'
import { weekdayOf } from '../data/calendar'
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
 * ⚠️ 어떤 엔딩 조건도 이 둘을 쓰지 않으므로 상한을 낮춰도 도달 불가능해지는 엔딩은 없다
 * (`data/endings.ts` 확인함). 나중에 이 둘을 쓰는 엔딩을 추가하면 100 이하로 잡을 것.
 */
const GROWTH_STAT_CAP_OVERRIDES: Partial<Record<GrowthStatKey, number>> = {
  reputation: 100,
  morality: 100,
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

/** 취침: 체력·멘탈 회복 후 생활비 차감. */
function sleep(stats: Stats, day: number): Stats {
  return {
    ...stats,
    stamina: stats.stamina + stats.maxStamina * SLEEP_RECOVERY_RATIO,
    mental: stats.mental + SLEEP_MENTAL_RECOVERY,
    money: stats.money - getLivingCost(day),
  }
}

/** 슬롯을 넘기고, 오후였다면 취침 정산까지 처리한다. */
function advance(state: GameState, stats: Stats): { day: number; slot: Slot; stats: Stats } {
  if (state.slot === 'morning') {
    return { day: state.day, slot: 'afternoon', stats }
  }
  return { day: state.day + 1, slot: 'morning', stats: sleep(stats, state.day) }
}

function detectGameOver(stats: Stats): GameState['gameOver'] {
  if (stats.money <= 0) return 'bankrupt'
  if (stats.mental <= 0) return 'burnout'
  return null
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

  return {
    ...state,
    ...stamped,
    day: advanced.day,
    slot: advanced.slot,
    stats,
    recentActivities: pushActivity(state.recentActivities, key),
    gameOver: detectGameOver(stats),
  }
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

  return {
    ...state,
    day: advanced.day,
    slot: advanced.slot,
    stats,
    recentActivities: pushActivity(state.recentActivities, 'rest'),
    gameOver: detectGameOver(stats),
  }
}
