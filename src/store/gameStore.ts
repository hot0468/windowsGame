import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { canRun, createInitialState, runActivity, skipSlot } from '../systems/turn'
import type { Activity, GameState } from '../types/game'

interface GameStore {
  state: GameState | null
  startGame: (name: string) => void
  doActivity: (activity: Activity) => void
  doSkip: () => void
  markEndingSeen: (endingId: string) => void
  reset: () => void
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      state: null,

      startGame: (name) => set({ state: createInitialState(name) }),

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

      reset: () => set({ state: null }),
    }),
    {
      name: 'windows-game-save',
      version: 1,
      // 스탯이나 필드를 추가하면 여기서 구버전 세이브를 보정한다.
      // 지금은 v1이 최초 버전이라 그대로 통과시킨다.
      migrate: (persisted) => persisted as { state: GameState | null },
    },
  ),
)
