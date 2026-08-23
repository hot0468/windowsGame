import { create } from 'zustand'
import { LAYERS } from '../data/layers'
import { DESKTOP_ITEMS } from '../data/desktopItems'
import { playSound } from '../sound'
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

/**
 * **새 창이 서는 자리.** 가로는 화면 한가운데, 세로는 위쪽에 붙는다(설계자 지시 2026-08-21:
 * "팝업 뜨는 위치를 화면 가운데나 상단으로").
 *
 * ## ⚠️ 세로는 가운데가 아니라 상단이다
 * 창 높이는 **열릴 때 알 수 없다** — 대부분의 창이 내용만큼 자라므로(`.ad`·`.vs`처럼 스스로
 * 높이를 정하는 것도 있고 글 몇 줄로 끝나는 것도 있다) 세로 가운데를 계산하려면 없는 값이
 * 필요하다. 위에 붙이면 높이와 무관하게 언제나 같은 자리에서 시작한다.
 *
 * ## ⚠️ 부르는 쪽이 좌표를 정하지 않는다
 * 예전에는 창을 여는 자리마다 `x: 240, y: 96` 같은 값을 손으로 적었다(아홉 곳이었다).
 * 그래서 같은 규칙이 아홉 벌로 흩어졌고, 화면 폭과 무관한 고정값이라 넓은 화면에서는
 * 왼쪽에 치우쳐 떴다. **좌표를 만드는 곳은 여기 하나다.**
 */
const PLACE = {
  /** 화면 위에서 이만큼 아래에서 시작한다. */
  top: 56,
  /** 창끼리 완전히 겹치지 않게 어긋내는 폭. */
  step: 26,
  /** 어긋냄이 이만큼 반복되면 처음 자리로 돌아온다 — 안 그러면 계속 밀려 화면을 벗어난다. */
  cycle: 5,
  /** 화면 가장자리에서 최소한 남기는 여백. */
  margin: 8,
} as const

/**
 * 창 하나의 시작 좌표. `openCount`는 지금 열려 있는 창 수(어긋냄에만 쓴다).
 *
 * ⚠️ **화면 밖으로 내보내지 않는다** — 좁은 화면에서 폭이 큰 창을 열면 가운데 정렬만으로는
 * 왼쪽이 음수가 된다(제목 줄을 못 잡아 창을 옮길 수 없게 된다).
 */
/**
 * 창이 줄어들 수 있는 한계.
 *
 * ⚠️ **타이틀 바 + 내용 한 줄**이 기준이다. 이보다 작아지면 캡션 버튼이 서로 겹쳐
 * 창을 닫지도 못하고, 안쪽 화면은 가로 스크롤만 남는다(사이트들은 `container-type`으로
 * 접히지만 접힘에도 바닥이 있다).
 */
export const MIN_WINDOW = { width: 360, height: 220 } as const

export function placeWindow(width: number, openCount: number): { x: number; y: number } {
  const shift = (openCount % PLACE.cycle) * PLACE.step
  /* ⚠️ **`window`가 없는 환경에서도 값을 내놔야 한다** — 스토어 테스트는 노드에서 도는데
     (이 파일은 DOM을 안 쓰던 자리라 jsdom을 켜지 않는다) 여기서 터지면 창을 여는 규칙
     전체가 테스트에서 막힌다. 폴백은 흔한 창 폭 하나면 충분하다: 좌표만 달라진다. */
  const viewport = typeof window === 'undefined' ? 1280 : window.innerWidth
  const centered = (viewport - width) / 2
  const maxX = Math.max(PLACE.margin, viewport - width - PLACE.margin)
  return {
    x: Math.round(Math.min(maxX, Math.max(PLACE.margin, centered + shift))),
    y: PLACE.top + shift,
  }
}

/** 열려 있는 창 하나. kind는 창 종류를 식별하는 키다. */
export interface OpenWindow {
  id: string
  title: string
  icon: IconName
  x: number
  y: number
  width: number
  /**
   * 창 높이(px). **없으면 내용이 정한다**(2026-08-22 크기 조절 신설) — 처음 열릴 때는
   * 내용 높이를 그대로 쓰고, 사람이 한 번 끌면 그때부터 이 값이 진실이 된다.
   */
  height?: number
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
  'zIndex' | 'maximized' | 'minimized' | 'restore' | 'x' | 'y'
> & {
  /** 열자마자 최대화 상태로 시작할지 여부. 이후로는 런타임 상태가 된다. */
  maximized?: boolean
  /**
   * 시작 좌표. **생략이 기본이다** — 비우면 `placeWindow`가 가운데·상단에 앉힌다.
   * ⚠️ 모바일 셸처럼 **화면을 꽉 채우는 창**만 직접 준다(그쪽은 좌표가 늘 0이다).
   */
  x?: number
  y?: number
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
  /**
   * 창이 **자기 안에서** 다른 폴더로 옮겨 간다(탐색기의 탐색 창·뒤로).
   *
   * ⚠️ 제목·아이콘을 폴더와 **함께** 간다 — 셋이 따로 놀면 작업 표시줄과 타이틀 바가
   * 옛 폴더를 가리킨 채로 남는다. 새 창을 여는 `open`과 갈라 둔 이유가 그것이다:
   * 이쪽은 창을 하나 더 만들지 않는다.
   */
  navigate: (id: string, to: { folderId: FolderId; title: string; icon: IconName }) => void
  close: (id: string) => void
  focus: (id: string) => void
  move: (id: string, x: number, y: number) => void
  /**
   * 크기 조절. **최소 크기(`MIN_WINDOW`) 아래로는 안 내려간다** — 타이틀 바와 내용
   * 한 줄이 남지 않으면 창을 다시 잡을 수도, 안을 읽을 수도 없다.
   */
  resize: (id: string, width: number, height: number) => void
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
    /* 좌표를 안 주면 여기서 정한다(사유는 `placeWindow`). 어긋냄의 기준은 **지금 열려 있는
       창 수**라, 다 닫고 다시 열면 첫 창은 늘 같은 자리에서 시작한다. */
    const at =
      win.x !== undefined && win.y !== undefined
        ? { x: win.x, y: win.y }
        : placeWindow(win.width, get().windows.length)
    const opened: OpenWindow = {
      ...win,
      ...at,
      maximized: win.maximized ?? false,
      minimized: false,
      // 최대화 상태로 열려도 복원 좌표는 남겨 둔다 — 없으면 복원이 0,0으로 튄다.
      restore: { ...at, width: win.width },
      zIndex,
    }
    /* 이미 열린 창을 앞으로 가져올 때는 위에서 반환됐다 — **정말 새로 열릴 때만** 소리. */
    playSound('open')
    set({ windows: [...get().windows, opened], topZ: zIndex })
  },

  navigate: (id, to) =>
    set({ windows: get().windows.map((w) => (w.id === id ? { ...w, ...to } : w)) }),

  close: (id) => {
    if (!get().windows.some((w) => w.id === id)) return
    playSound('close')
    set({ windows: get().windows.filter((w) => w.id !== id) })
  },

  focus: (id) => {
    const zIndex = get().topZ + Z_STEP
    set({
      windows: get().windows.map((w) => (w.id === id ? { ...w, zIndex } : w)),
      topZ: zIndex,
    })
  },

  move: (id, x, y) =>
    set({ windows: get().windows.map((w) => (w.id === id ? { ...w, x, y } : w)) }),

  resize: (id, width, height) =>
    set({
      windows: get().windows.map((w) =>
        w.id === id
          ? {
              ...w,
              width: Math.max(MIN_WINDOW.width, Math.round(width)),
              height: Math.max(MIN_WINDOW.height, Math.round(height)),
            }
          : w,
      ),
    }),

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
