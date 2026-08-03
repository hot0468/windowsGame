import { create } from 'zustand'
import { LAYERS } from '../data/layers'
import type { IconName, WindowKind } from '../types/game'

/** 열려 있는 창 하나. kind는 창 종류를 식별하는 키다. */
export interface OpenWindow {
  id: string
  title: string
  icon: IconName
  x: number
  y: number
  width: number
  zIndex: number
  /**
   * true면 작업 표시줄을 제외한 전체 화면으로 그린다.
   * x/y/width는 무시되고 드래그도 걸리지 않으므로 move()가 이 창을 건드릴 일이 없다.
   */
  maximized?: boolean
  /** 렌더링할 앱 종류. 'exe'는 activityId를, 'stub'은 message를 함께 쓴다. */
  kind: WindowKind
  activityId?: string
  /** kind가 'stub'일 때 보여줄 안내 문구. */
  message?: string
}

interface WindowStore {
  windows: OpenWindow[]
  topZ: number
  open: (win: Omit<OpenWindow, 'zIndex'>) => void
  close: (id: string) => void
  focus: (id: string) => void
  move: (id: string, x: number, y: number) => void
  closeAll: () => void
}

export const useWindowStore = create<WindowStore>((set, get) => ({
  windows: [],
  /** 일반 창은 바탕화면 패널(스탯창·날짜칸)보다 위에서 시작한다. */
  topZ: LAYERS.WINDOW_BASE,

  /** 이미 열린 창이면 새로 열지 않고 포커스만 올린다. */
  open: (win) => {
    const existing = get().windows.find((w) => w.id === win.id)
    if (existing) {
      get().focus(win.id)
      return
    }
    const zIndex = get().topZ + 1
    set({ windows: [...get().windows, { ...win, zIndex }], topZ: zIndex })
  },

  close: (id) => set({ windows: get().windows.filter((w) => w.id !== id) }),

  focus: (id) => {
    const zIndex = get().topZ + 1
    set({
      windows: get().windows.map((w) => (w.id === id ? { ...w, zIndex } : w)),
      topZ: zIndex,
    })
  },

  move: (id, x, y) =>
    set({ windows: get().windows.map((w) => (w.id === id ? { ...w, x, y } : w)) }),

  closeAll: () => set({ windows: [] }),
}))
