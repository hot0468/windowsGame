import { create } from 'zustand'
import type { IconName } from '../types/game'

/** 열려 있는 창 하나. kind는 창 종류를 식별하는 키다. */
export interface OpenWindow {
  id: string
  title: string
  icon: IconName
  x: number
  y: number
  width: number
  zIndex: number
  /** 렌더링할 앱 종류. 'exe'는 activityId를 함께 쓴다. */
  kind: 'exe' | 'ending'
  activityId?: string
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
  topZ: 10,

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
