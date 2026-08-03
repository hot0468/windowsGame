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
  /** 패널별 표시 여부. 작업 표시줄 버튼이 토글한다. */
  visible: Record<DesktopPanelId, boolean>
  /** 해당 패널을 모든 일반 창 위로 끌어올린다. 패널 본문을 눌렀을 때 호출한다. */
  raise: (id: DesktopPanelId) => void
  /**
   * 작업 표시줄 버튼의 동작. **숨김 ↔ 표시를 오간다.**
   *
   * 예전에는 raise만 했는데, 한 번 누르면 이미 맨 앞이라 두 번째 클릭이 아무 일도 하지
   * 않았고 되돌릴 방법도 없었다. 지금은 숨길 수 있고, 다시 켜면 맨 앞으로 온다 —
   * 켜는 동작이 raise를 겸해야 "창에 가려 안 보여서 눌렀다"는 경우도 한 번에 해결된다.
   */
  toggle: (id: DesktopPanelId) => void
  /** 두 패널을 초기 상태(바탕화면 레벨·표시)로 되돌린다. 새 게임 시작 시 초기화용. */
  resetAll: () => void
}

const BASE: Record<DesktopPanelId, number> = {
  stats: LAYERS.DESKTOP_PANEL,
  calendar: LAYERS.DESKTOP_PANEL,
}

const ALL_VISIBLE: Record<DesktopPanelId, boolean> = { stats: true, calendar: true }

export const useDesktopPanelStore = create<DesktopPanelStore>((set, get) => ({
  z: { ...BASE },
  visible: { ...ALL_VISIBLE },

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

  toggle: (id) => {
    const { visible } = get()
    if (visible[id]) {
      set({ visible: { ...visible, [id]: false } })
      return
    }
    set({ visible: { ...visible, [id]: true } })
    get().raise(id)
  },

  resetAll: () => set({ z: { ...BASE }, visible: { ...ALL_VISIBLE } }),
}))
