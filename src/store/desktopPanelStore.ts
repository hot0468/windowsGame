import { create } from 'zustand'
import { LAYERS } from '../data/layers'

/**
 * 바탕화면 상시 패널(스탯창·날짜칸)의 식별자.
 * 이들은 일부러 windowStore.windows에 넣지 않는다 —
 * 넣으면 작업 표시줄의 열린 창 목록에 섞이고, 엔딩 시 closeAll()에 지워진다.
 */
export type DesktopPanelId = 'stats' | 'calendar' | 'wallet'

interface DesktopPanelStore {
  /**
   * 패널별 현재 z-index.
   * 평소에는 LAYERS.DESKTOP_PANEL(일반 창보다 아래)이고,
   * raise()를 부르면 LAYERS.DESKTOP_PANEL_RAISED 위로 올라간다.
   */
  z: Record<DesktopPanelId, number>
  /** 패널별 표시 여부. 작업 표시줄 버튼이 토글한다. */
  visible: Record<DesktopPanelId, boolean>
  /**
   * 패널별 **실제로 렌더된 높이**(px). 지금 쓰는 곳은 하나다 — 지갑칸이 날짜칸 **아래**에
   * 붙어야 하는데, 날짜칸은 자동 진행 문구가 붙었다 떨어졌다 하며 키가 변한다.
   *
   * ⚠️ **고정 오프셋으로 대신하지 말 것.** 최대 높이에 맞춰 상수를 박으면 평소에는 빈 띠가
   * 남고, 날짜칸에 줄을 하나 더하는 순간 두 패널이 겹친다(레이아웃 겹침은 테스트가 못 잡는다).
   * 값은 `HudPanel`이 자기 `ResizeObserver`로 넣는다.
   */
  heights: Partial<Record<DesktopPanelId, number>>
  /** `HudPanel`이 자기 높이를 알린다. 같은 값이면 아무것도 하지 않는다(갱신 루프 방지). */
  setHeight: (id: DesktopPanelId, height: number) => void
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
  wallet: LAYERS.DESKTOP_PANEL,
}

const ALL_VISIBLE: Record<DesktopPanelId, boolean> = {
  stats: true,
  calendar: true,
  wallet: true,
}

export const useDesktopPanelStore = create<DesktopPanelStore>((set, get) => ({
  z: { ...BASE },
  visible: { ...ALL_VISIBLE },
  /* 비어 있는 채로 시작한다 — 첫 렌더에서는 잰 값이 없고, 읽는 쪽이 0으로 폴백한다. */
  heights: {},

  setHeight: (id, height) => {
    const { heights } = get()
    if (heights[id] === height) return
    set({ heights: { ...heights, [id]: height } })
  },

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
