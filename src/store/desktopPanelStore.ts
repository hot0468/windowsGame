import { create } from 'zustand'
import { LAYERS } from '../data/layers'

/**
 * 바탕화면 상시 패널(스탯창·날짜칸)의 식별자.
 * 이들은 일부러 windowStore.windows에 넣지 않는다 —
 * 넣으면 작업 표시줄의 열린 창 목록에 섞이고, 엔딩 시 closeAll()에 지워진다.
 */
export type DesktopPanelId = 'stats' | 'calendar'

interface DesktopPanelStore {
  /**
   * 패널별 현재 z-index.
   * 평소에는 LAYERS.DESKTOP_PANEL(일반 창보다 아래)이고,
   * raise()를 부르면 LAYERS.DESKTOP_PANEL_RAISED 위로 올라간다.
   */
  z: Record<DesktopPanelId, number>
  /** 해당 패널을 모든 일반 창 위로 끌어올린다. 작업 표시줄 버튼이 호출한다. */
  raise: (id: DesktopPanelId) => void
  /** 두 패널 모두 바탕화면 레벨로 되돌린다. 새 게임 시작 시 초기화용. */
  resetAll: () => void
}

const BASE: Record<DesktopPanelId, number> = {
  stats: LAYERS.DESKTOP_PANEL,
  calendar: LAYERS.DESKTOP_PANEL,
}

export const useDesktopPanelStore = create<DesktopPanelStore>((set, get) => ({
  z: { ...BASE },

  /**
   * 두 패널이 서로 겹칠 수도 있으므로, 이미 올라온 다른 패널보다 확실히 위로 가도록
   * 현재 최고값 + 1을 준다. 단순히 상수를 대입하면 같은 z가 되어
   * 두 번째 클릭이 아무 효과도 내지 못한다.
   */
  raise: (id) => {
    const current = get().z
    const top = Math.max(LAYERS.DESKTOP_PANEL_RAISED, ...Object.values(current))
    set({ z: { ...current, [id]: top + 1 } })
  },

  resetAll: () => set({ z: { ...BASE } }),
}))
