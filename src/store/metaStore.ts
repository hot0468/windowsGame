import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * 접은 판 하나의 기록. 도감의 '지난 삶' 시트가 그대로 그린다(2026-08-17).
 *
 * ## 왜 필요한가
 * 판이 끝나지 않는 게임에서 도감(회차 수집)은 **판을 접는 행위가 기록이 되어야** 성립한다.
 * [새 게임]이 순수한 손실이면 아무도 안 누르고, 회차가 안 돌면 직업·엔딩 콜렉션을 채울
 * 길도 없다 — 무한 판과 도감 메타가 서로를 반박하던 자리를 이 기록이 잇는다.
 */
export interface PastLife {
  name: string
  /** 며칠을 살았나(접은 날의 day). */
  days: number
  /** 접을 때의 생활 등급 라벨(`'B'`·`'SS+2'`). */
  lifeRank: string
  /** 도달한 최고 직장. 비문과 같은 규칙이다 — 접을 때의 직함이 아니라 정점(`peakCareerId`). */
  peakCareerId?: string
}

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
  /**
   * 다녀 본 적 있는 **회사** id. 판을 넘어 남는다.
   *
   * ⚠️ **`unlockedEndings`와 같은 집합에 넣지 않는다**(`unlockedRelations`와 같은 규칙).
   * 취직은 엔딩이 아니라 콜렉션이므로, 섞으면 도감의 "엔딩 n개 중 m개"가 회사를 세기
   * 시작해 개수가 거짓이 된다.
   *
   * ⚠️ **판을 넘어 남겨야 하는 이유**(2026-08-14): 도감의 직업 시트는 원래 지금 세이브의
   * `careerLog`만 봤는데, 그러면 **새 게임을 시작하는 순간 다녀 본 회사가 전부 사라진다.**
   * 콜렉션은 판이 아니라 플레이어에게 쌓이는 것이라 여기 남는다.
   */
  unlockedCareers: string[]
  unlockCareer: (careerId: string) => void
  /** 접은 판들의 기록. 순서가 곧 회차다(맨 앞이 1번째 삶). */
  pastLives: PastLife[]
  recordLife: (life: PastLife) => void
  /**
   * 효과음 켬/끔(2026-08-17). **판이 아니라 플레이어의 설정**이라 세이브가 아닌 여기 산다 —
   * 새 게임을 시작했다고 꺼 둔 소리가 다시 켜지면 안 된다. 소리 자체는 `src/sound.ts`.
   */
  soundOn: boolean
  toggleSound: () => void
}

export const useMetaStore = create<MetaStore>()(
  persist(
    (set, get) => ({
      unlockedEndings: [],
      unlockedRelations: [],
      unlockedCareers: [],
      pastLives: [],

      unlock: (endingId) => {
        if (get().unlockedEndings.includes(endingId)) return
        set({ unlockedEndings: [...get().unlockedEndings, endingId] })
      },

      isUnlocked: (endingId) => get().unlockedEndings.includes(endingId),

      unlockRelation: (personId) => {
        if (get().unlockedRelations.includes(personId)) return
        set({ unlockedRelations: [...get().unlockedRelations, personId] })
      },

      unlockCareer: (careerId) => {
        if (get().unlockedCareers.includes(careerId)) return
        set({ unlockedCareers: [...get().unlockedCareers, careerId] })
      },

      /* 중복 검사가 없다 — 같은 이름으로 여러 판을 살 수 있고, 한 판은 한 번만 접힌다
         (`startGame`이 접는 순간 그 세이브를 버리므로 같은 판이 두 번 올 통로가 없다). */
      recordLife: (life) => {
        set({ pastLives: [...get().pastLives, life] })
      },

      soundOn: true,
      toggleSound: () => set({ soundOn: !get().soundOn }),
    }),
    { name: 'windows-game-meta', version: 1 },
  ),
)
