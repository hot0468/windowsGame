import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface MetaStore {
  /** 해금된 엔딩 id. 새 게임을 시작해도 유지된다. */
  unlockedEndings: string[]
  unlock: (endingId: string) => void
  isUnlocked: (endingId: string) => boolean
}

export const useMetaStore = create<MetaStore>()(
  persist(
    (set, get) => ({
      unlockedEndings: [],

      unlock: (endingId) => {
        if (get().unlockedEndings.includes(endingId)) return
        set({ unlockedEndings: [...get().unlockedEndings, endingId] })
      },

      isUnlocked: (endingId) => get().unlockedEndings.includes(endingId),
    }),
    { name: 'windows-game-meta', version: 1 },
  ),
)
