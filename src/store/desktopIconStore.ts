import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { GridCell } from '../types/game'

/**
 * 플레이어가 끌어다 옮긴 바탕화면 아이콘 위치.
 *
 * **왜 `gameStore`가 아닌가:** 아이콘을 어디 뒀는지는 **판(세이브)이 아니라 사람**에게
 * 속한 취향이다. `gameStore`는 `reset()`이 통째로 비우므로 거기 두면 새 게임을 시작하는
 * 순간 아이콘이 전부 제자리로 튄다 — 실제 윈도우에서 게임 하나 새로 깐다고 바탕화면이
 * 정렬되지 않는다. `browserStore`(즐겨찾기)와 같은 성격이라 같은 방식으로 별도 키에 담는다.
 *
 * **왜 `metaStore`가 아닌가:** metaStore는 엔딩 도감 전용이다(browserStore를 만들 때와
 * 같은 판단). 성격이 다른 상태를 밀어 넣으면 저장 키 하나에 무관한 것들이 쌓인다.
 *
 * **왜 `windowStore`가 아닌가:** windowStore는 휘발이다 — 새로고침하면 사라진다.
 *
 * ⚠️ **옮긴 아이콘만 담는다.** 기본 배치는 `data/desktopIcons.ts`가 갖고 있고,
 * 여기는 그 위에 덮는 차이분이다. 전부 저장해 버리면 나중에 설계자가 기본 배치를 바꿔도
 * 한 번이라도 게임을 켠 사람에게는 영영 반영되지 않는다.
 */
interface DesktopIconStore {
  /** 아이콘 id → 격자 칸. 사용자가 옮긴 것만 들어 있다. */
  cells: Record<string, GridCell>
  /** 아이콘 하나를 칸에 놓는다. 빈 칸 판정은 `systems/desktopGrid.ts`가 미리 끝낸다. */
  place: (id: string, cell: GridCell) => void
  /** 기본 배치로 되돌린다(옮긴 기록을 통째로 버린다). */
  resetLayout: () => void
}

export const useDesktopIconStore = create<DesktopIconStore>()(
  persist(
    (set) => ({
      cells: {},

      place: (id, cell) => set((s) => ({ cells: { ...s.cells, [id]: cell } })),

      resetLayout: () => set({ cells: {} }),
    }),
    {
      name: 'windows-game-desktop-icons',
      version: 1,
    },
  ),
)
