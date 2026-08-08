import { create } from 'zustand'
import { LAYERS } from '../data/layers'
import { DESKTOP_ITEMS } from '../data/desktopItems'
import type { FolderId, IconName, ToolRunPayload, WindowKind } from '../types/game'

/** 최대화 이전의 좌표·크기. 복원할 때 이 값으로 되돌린다. */
export interface RestoreBounds {
  x: number
  y: number
  width: number
}

/**
 * 창 하나가 차지하는 z 층수. **2다.**
 *
 * ⚠️ 1이면 **팝업 딤이 낄 자리가 없다** — 딤은 팝업 바로 아래(`zIndex - 1`)에 깔려야
 * 하는데 그 값이 직전 창의 z와 같아지고, 같으면 DOM 순서가 이겨서 딤이 안 보인다
 * (실측으로 잡았다). 창 사이에 한 칸씩 비워 두는 것이 그 자리다.
 */
export const Z_STEP = 2

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
  /**
   * 시스템 팝업으로 그린다 — **타이틀 바의 최소화·최대화·닫기를 전부 뺀다.**
   *
   * ⚠️ 셋 중 닫기만 빼면 최소화로 치워 놓고 잊어버릴 수 있어 "치울 수 없는 창"이라는
   * 뜻이 반만 지켜진다. ⚠️ **빠져나갈 길은 창 안에 있어야 한다**(ux `escape-routes`) —
   * 공부 팝업은 [건너뛰기]·[확인]·Esc 셋이 그 일을 한다.
   */
  popup?: boolean
  activityId?: string
  /** kind가 'stub'일 때 보여줄 안내 문구. */
  message?: string
  /** kind가 'chat'(목록)/'mail'일 때 어느 앱을 열지. */
  appId?: string
  /** kind가 'thread'일 때 어느 채팅방을 열지. */
  threadId?: string
  /** kind가 'folder'일 때 어느 폴더를 열지. */
  folderId?: FolderId
  /**
   * kind가 'tool'일 때 무엇을 그릴지(`ToolRunPayload`).
   * ⚠️ **실행 직전에 찍은 사실이라 창이 들고 있어야 한다** — 창이 열릴 때는 이미 턴이
   * 지나갔으므로 그 자리에서 다시 계산하면 방금 일어난 일과 다른 숫자가 나온다.
   */
  toolRun?: ToolRunPayload
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
  /**
   * 브라우저에게 남기는 **이동 요청**. `BrowserApp`이 마운트 뒤 받아 가고 곧바로 비운다.
   *
   * ⚠️ **탭 목록이 `BrowserApp`의 `useState`에 살기 때문에 이 자리가 필요하다.** 창을
   * 여는 것만으로는 목적지를 정할 수 없고(`open`은 이미 열린 창이면 앞으로 가져오기만 한다),
   * 그렇다고 탭 상태를 스토어로 올리면 창 id별로 나눠 담고 닫을 때 지우는 코드가 딸려 온다.
   * **소비하고 비우는 방식**이라 같은 사이트를 두 번 눌러도 null → 값으로 다시 바뀐다
   * (`gameStore.arrivals`와 같은 형태 — 논스가 따로 필요 없는 이유가 그것이다).
   */
  pendingSite: string | null
  open: (win: OpenWindowInput) => void
  /**
   * **브라우저를 열고 그 사이트로 보낸다.** 이미 열려 있으면 앞으로 가져오고 이동만 시킨다.
   *
   * ⚠️ 브라우저를 여는 방법을 부르는 쪽마다 적지 않는다 — 폭·최대화 규칙이 두 벌이 되면
   * 한쪽만 고치게 된다. 바탕화면의 인터넷 항목 정의를 그대로 재사용한다.
   */
  openSite: (siteId: string) => void
  /** 이동 요청을 받아 갔다. `BrowserApp`만 부른다. */
  clearPendingSite: () => void
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
  pendingSite: null,

  openSite: (siteId) => {
    const browser = DESKTOP_ITEMS.find((i) => i.id === 'browser')
    if (!browser) return
    get().open({
      id: `${browser.kind}-${browser.id}`,
      title: browser.label,
      icon: browser.icon,
      x: 120,
      y: 80,
      width: browser.width,
      maximized: browser.openMaximized,
      kind: browser.kind,
    })
    set({ pendingSite: siteId })
  },

  clearPendingSite: () => set({ pendingSite: null }),

  /** 이미 열린 창이면 새로 열지 않고 (최소화돼 있었다면 복원해서) 앞으로 가져온다. */
  open: (win) => {
    const existing = get().windows.find((w) => w.id === win.id)
    if (existing) {
      get().activate(win.id)
      return
    }
    const zIndex = get().topZ + Z_STEP
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
    const zIndex = get().topZ + Z_STEP
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
    const zIndex = get().topZ + Z_STEP
    set({
      windows: get().windows.map((w) =>
        w.id === id ? { ...w, minimized: false, zIndex } : w,
      ),
      topZ: zIndex,
    })
  },

  closeAll: () => set({ windows: [] }),
}))
