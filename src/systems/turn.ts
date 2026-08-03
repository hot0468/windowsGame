import { getLivingCost, getWageMultiplier } from './economy'
import { getBurnoutPenalty, pushActivity } from './burnout'
import { GROWTH_STAT_KEYS, INITIAL_STATS } from '../types/game'
import type { Activity, GameState, Slot, Stats } from '../types/game'

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

/** 요구 스탯을 모두 충족하고 게임오버가 아니어야 실행 가능하다. */
export function canRun(state: GameState, activity: Activity): boolean {
  if (state.gameOver) return false
  if (!activity.requires) return true
  return Object.entries(activity.requires).every(
    ([key, required]) => state.stats[key as keyof Stats] >= required,
  )
}

/**
 * 체력은 0~maxStamina, 멘탈은 0~MENTAL_CAP, maxStamina는 1~MAX_STAMINA_CAP,
 * 성장 스탯 9종은 0~GROWTH_STAT_CAP으로 제한한다.
 */
function clampStats(stats: Stats): Stats {
  const maxStamina = Math.min(MAX_STAMINA_CAP, Math.max(1, Math.round(stats.maxStamina)))
  const clamped: Stats = {
    ...stats,
    maxStamina,
    // 체력 상한은 클램핑된 maxStamina를 기준으로 한다 — 원본 값을 쓰면 상한을 넘길 수 있다.
    stamina: Math.round(Math.min(Math.max(0, stats.stamina), maxStamina)),
    mental: Math.round(Math.min(Math.max(0, stats.mental), MENTAL_CAP)),
    money: Math.round(stats.money),
  }
  // 성장 스탯은 상한 규칙이 같으므로 키 목록을 돌며 일괄 처리한다.
  // 스탯이 추가돼도 여기를 고칠 필요가 없다.
  for (const key of GROWTH_STAT_KEYS) {
    clamped[key] = Math.min(GROWTH_STAT_CAP, Math.max(0, Math.round(stats[key])))
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

/** 활동을 실행하고 다음 슬롯 상태를 반환한다. 원본은 변경하지 않는다. */
export function runActivity(state: GameState, activity: Activity): GameState {
  if (state.gameOver) return state

  const { efficiency, mentalPenalty } = getBurnoutPenalty(state.recentActivities, activity.id)
  const withEffects = applyEffects(state.stats, activity, state.day, efficiency)
  withEffects.mental -= mentalPenalty

  const advanced = advance(state, withEffects)
  const stats = clampStats(advanced.stats)

  return {
    ...state,
    day: advanced.day,
    slot: advanced.slot,
    stats,
    recentActivities: pushActivity(state.recentActivities, activity.id),
    gameOver: detectGameOver(stats),
  }
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
