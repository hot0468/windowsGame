import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface MetaStore {
  /** 해금된 엔딩 id. 새 게임을 시작해도 유지된다. */
  unlockedEndings: string[]
  unlock: (endingId: string) => void
  isUnlocked: (endingId: string) => boolean
  /**
   * 본 적 있는 **관계 부가엔딩**의 인물 id. 판을 넘어 남는다.
   *
   * ⚠️ **`unlockedEndings`와 같은 집합에 넣지 않는다.** 부가엔딩은 본엔딩과 배타가 아니라
   * 곁에 붙는 것이라(`data/relations.ts`), 섞으면 도감의 "엔딩 n개 중 m개"가 관계를 세기
   * 시작해 개수가 거짓이 된다. 그래서 도감도 시트를 따로 둔다.
   */
  unlockedRelations: string[]
  unlockRelation: (personId: string) => void
}

export const useMetaStore = create<MetaStore>()(
  persist(
    (set, get) => ({
      unlockedEndings: [],
      unlockedRelations: [],

      unlock: (endingId) => {
        if (get().unlockedEndings.includes(endingId)) return
        set({ unlockedEndings: [...get().unlockedEndings, endingId] })
      },

      isUnlocked: (endingId) => get().unlockedEndings.includes(endingId),

      unlockRelation: (personId) => {
        if (get().unlockedRelations.includes(personId)) return
        set({ unlockedRelations: [...get().unlockedRelations, personId] })
      },
    }),
    { name: 'windows-game-meta', version: 1 },
  ),
)
