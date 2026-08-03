import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { canRun, createInitialState, runActivity, skipSlot } from '../systems/turn'
import type { Activity, GameState, Stats } from '../types/game'

/** 세이브에 반드시 유한한 숫자로 들어 있어야 하는 스탯 키. */
const REQUIRED_STAT_KEYS: (keyof Stats)[] = [
  'stamina',
  'maxStamina',
  'intelligence',
  'charm',
  'mental',
  'money',
]

/**
 * 저장된 세이브를 검증해 안전한 GameState로 되돌린다.
 * 필드가 빠진 구버전 세이브를 그대로 통과시키면 clampStats가 NaN을 만들고,
 * NaN <= 0이 false라 게임오버 판정이 영영 걸리지 않아 조용히 망가진다.
 * 복구 불가능하면 null을 반환해 잠금화면에서 새 게임으로 시작하게 한다.
 */
function reviveState(raw: unknown): GameState | null {
  if (!raw || typeof raw !== 'object') return null
  const saved = raw as Partial<GameState>

  // 기본값 위에 저장값을 덮어써서, 새로 추가된 필드가 undefined로 남지 않게 한다.
  const defaults = createInitialState(
    typeof saved.playerName === 'string' && saved.playerName.trim() ? saved.playerName : '이름없음',
  )
  const stats: Stats = { ...defaults.stats, ...(saved.stats ?? {}) }

  // 스탯이 하나라도 유한한 숫자가 아니면 세이브를 신뢰할 수 없다.
  const statsValid = REQUIRED_STAT_KEYS.every((key) => Number.isFinite(stats[key]))
  if (!statsValid) return null

  const day = Number.isFinite(saved.day) ? Number(saved.day) : defaults.day
  if (day < 1) return null

  return {
    playerName: defaults.playerName,
    day,
    slot: saved.slot === 'afternoon' ? 'afternoon' : 'morning',
    stats,
    recentActivities: Array.isArray(saved.recentActivities)
      ? saved.recentActivities.filter((id): id is string => typeof id === 'string')
      : [],
    seenEndingIds: Array.isArray(saved.seenEndingIds)
      ? saved.seenEndingIds.filter((id): id is string => typeof id === 'string')
      : [],
    gameOver:
      saved.gameOver === 'bankrupt' || saved.gameOver === 'burnout' ? saved.gameOver : null,
  }
}

/**
 * 구버전/손상 세이브 보정. 절대 throw하지 않는다 —
 * 못 쓰는 세이브는 크래시가 아니라 새 게임으로 degrade시킨다.
 */
export function migrateSave(persisted: unknown): { state: GameState | null } {
  try {
    if (!persisted || typeof persisted !== 'object') return { state: null }
    return { state: reviveState((persisted as { state?: unknown }).state) }
  } catch {
    return { state: null }
  }
}

/**
 * localStorage에 실제로 저장할 부분을 고른다.
 * 끝난 게임(gameOver)은 저장하지 않는다 — 이어할 수 없는 세이브가 남으면
 * 잠금화면은 "세이브 없음"으로 취급하는데 데이터만 계속 남는 어긋난 상태가 된다.
 * 메모리의 state는 그대로 두므로 엔딩 화면과 "처음부터 다시" 흐름은 영향받지 않고,
 * 진행 중(gameOver === null) 세이브는 항상 보존된다.
 */
export function selectPersistedState(state: GameState | null): { state: GameState | null } {
  return { state: state?.gameOver ? null : state }
}

interface GameStore {
  state: GameState | null
  /** 잠금화면을 통과했는지. 저장하지 않아 새로고침 시 잠금화면부터 시작한다. */
  loggedIn: boolean
  startGame: (name: string) => void
  continueGame: () => void
  logout: () => void
  doActivity: (activity: Activity) => void
  doSkip: () => void
  markEndingSeen: (endingId: string) => void
  reset: () => void
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      state: null,
      loggedIn: false,

      /** 새 게임: 기존 세이브를 버리고 새로 만든다. */
      startGame: (name) => set({ state: createInitialState(name), loggedIn: true }),

      /** 이어하기: 기존 세이브를 그대로 두고 로그인만 처리한다. */
      continueGame: () => {
        if (!get().state) return
        set({ loggedIn: true })
      },

      /** 잠금화면으로 돌아간다. 세이브는 유지된다. */
      logout: () => set({ loggedIn: false }),

      doActivity: (activity) => {
        const current = get().state
        if (!current || !canRun(current, activity)) return
        set({ state: runActivity(current, activity) })
      },

      doSkip: () => {
        const current = get().state
        if (!current) return
        set({ state: skipSlot(current) })
      },

      markEndingSeen: (endingId) => {
        const current = get().state
        if (!current || current.seenEndingIds.includes(endingId)) return
        set({ state: { ...current, seenEndingIds: [...current.seenEndingIds, endingId] } })
      },

      /** 세이브를 지우고 잠금화면으로 돌아간다. */
      reset: () => set({ state: null, loggedIn: false }),
    }),
    {
      name: 'windows-game-save',
      partialize: (s) => selectPersistedState(s.state),
      version: 1,
      // 구버전/손상 세이브를 검증해 보정한다. 못 쓰면 새 게임으로 시작한다.
      migrate: migrateSave,
    },
  ),
)
