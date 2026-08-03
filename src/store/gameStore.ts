import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { canRun, createInitialState, runActivity, skipSlot } from '../systems/turn'
import type { Activity, GameState } from '../types/game'

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
      partialize: (s) => ({ state: s.state }),
      version: 1,
      // 스탯이나 필드를 추가하면 여기서 구버전 세이브를 보정한다.
      // 지금은 v1이 최초 버전이라 그대로 통과시킨다.
      migrate: (persisted) => persisted as { state: GameState | null },
    },
  ),
)
