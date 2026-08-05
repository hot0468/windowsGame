import { create } from 'zustand'
import { LAYERS } from '../data/layers'
import type { FolderId, IconName, WindowKind } from '../types/game'

/** 최대화 이전의 좌표·크기. 복원할 때 이 값으로 되돌린다. */
export interface RestoreBounds {
  x: number
  y: number
  width: number
}

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
   * 런타임 상태. true면 작업 표시줄을 제외한 전체 화면으로 그린다.
   * 캡션 버튼으로 토글되므로 정적 데이터가 아니다 —
   * 열릴 때의 초기값은 `DesktopItem.openMaximized`가 정한다.
   * x/y/width는 무시되고 드래그도 걸리지 않으므로 move()가 이 창을 건드릴 일이 없다.
   */
  maximized: boolean
  /**
   * 런타임 상태. true면 렌더링하지 않지만 목록에서 지우지는 않는다 —
   * 작업 표시줄 항목은 남아 있어야 하고 거기서 복원할 수 있어야 한다.
   */
  minimized: boolean
  /**
   * 최대화 직전의 좌표·크기. 복원이 0,0으로 튀지 않게 하는 유일한 근거다.
   * 최대화 상태로 열린 창(인터넷)은 열 때의 x/y/width가 그대로 복원값이 된다.
   */
  restore: RestoreBounds
  /** 렌더링할 앱 종류. 'exe'는 activityId를, 'stub'은 message를 함께 쓴다. */
  kind: WindowKind
  activityId?: string
  /** kind가 'stub'일 때 보여줄 안내 문구. */
  message?: string
  /** kind가 'chat'(목록)/'mail'일 때 어느 앱을 열지. */
  appId?: string
  /** kind가 'thread'일 때 어느 채팅방을 열지. */
  threadId?: string
  /** kind가 'folder'일 때 어느 폴더를 열지. */
  folderId?: FolderId
}

/**
 * open()에 넘기는 인자.
 * zIndex·minimized·restore는 스토어가 계산하고, maximized는 초기값으로만 받는다.
 */
export type OpenWindowInput = Omit<
  OpenWindow,
  'zIndex' | 'maximized' | 'minimized' | 'restore'
> & {
  /** 열자마자 최대화 상태로 시작할지 여부. 이후로는 런타임 상태가 된다. */
  maximized?: boolean
}

interface WindowStore {
  windows: OpenWindow[]
  topZ: number
  open: (win: OpenWindowInput) => void
  close: (id: string) => void
  focus: (id: string) => void
  move: (id: string, x: number, y: number) => void
  /** 최소화. 창은 목록에 남고 렌더링만 멈춘다. */
  minimize: (id: string) => void
  /** 최대화 ↔ 복원 토글. 최대화 시 현재 좌표를 restore에 저장한다. */
  toggleMaximize: (id: string) => void
  /**
   * 작업 표시줄 항목 클릭. 실제 윈도우와 같이
   * 최소화된 창이면 복원해서 앞으로, 아니면 그냥 앞으로 가져온다.
   */
  activate: (id: string) => void
  closeAll: () => void
}

export const useWindowStore = create<WindowStore>((set, get) => ({
  windows: [],
  /** 일반 창은 바탕화면 패널(스탯창·날짜칸)보다 위에서 시작한다. */
  topZ: LAYERS.WINDOW_BASE,

  /** 이미 열린 창이면 새로 열지 않고 (최소화돼 있었다면 복원해서) 앞으로 가져온다. */
  open: (win) => {
    const existing = get().windows.find((w) => w.id === win.id)
    if (existing) {
      get().activate(win.id)
      return
    }
    const zIndex = get().topZ + 1
    const opened: OpenWindow = {
      ...win,
      maximized: win.maximized ?? false,
      minimized: false,
      // 최대화 상태로 열려도 복원 좌표는 남겨 둔다 — 없으면 복원이 0,0으로 튄다.
      restore: { x: win.x, y: win.y, width: win.width },
      zIndex,
    }
    set({ windows: [...get().windows, opened], topZ: zIndex })
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

  minimize: (id) =>
    set({
      windows: get().windows.map((w) => (w.id === id ? { ...w, minimized: true } : w)),
    }),

  toggleMaximize: (id) =>
    set({
      windows: get().windows.map((w) => {
        if (w.id !== id) return w
        if (w.maximized) {
          // 복원: 최대화 직전에 저장해 둔 좌표·크기로 되돌린다.
          return { ...w, maximized: false, ...w.restore }
        }
        // 최대화: 지금 좌표를 복원값으로 남긴다.
        return { ...w, maximized: true, restore: { x: w.x, y: w.y, width: w.width } }
      }),
    }),

  activate: (id) => {
    const zIndex = get().topZ + 1
    set({
      windows: get().windows.map((w) =>
        w.id === id ? { ...w, minimized: false, zIndex } : w,
      ),
      topZ: zIndex,
    })
  },

  closeAll: () => set({ windows: [] }),
}))
