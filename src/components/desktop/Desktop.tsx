import { useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { findActivity } from '../../data/activities'
import { DEFAULT_ICON_CELLS, DESKTOP_ICON_ORDER } from '../../data/desktopIcons'
import { DESKTOP_ITEMS, desktopEntries } from '../../data/desktopItems'
import { DESKTOP_GRID } from '../../data/shell'
import { UI_ICONS } from '../../data/icons'
import {
  cellKey,
  cellOrigin,
  gridSize,
  nearestFreeCell,
  resolveLayout,
  snapToCell,
} from '../../systems/desktopGrid'
import { placeShortcuts } from '../../systems/shortcuts'
import { AppIcon } from '../../icons/AppIcon'
import { useDesktopIconStore } from '../../store/desktopIconStore'
import { useGameStore } from '../../store/gameStore'
import { useShortcutStore } from '../../store/shortcutStore'
import { useWindowStore } from '../../store/windowStore'
import type { Activity, DesktopEntry, DesktopItem } from '../../types/game'
import { ContextMenu } from '../ContextMenu'
import type { ContextMenuItem } from '../ContextMenu'
import { WindowManager } from '../window/WindowManager'
import { ActivityConfirm } from '../apps/ActivityConfirm'
import { EndingModal } from '../apps/EndingModal'
import { CalendarPanel } from './CalendarPanel'
import { StatPanel } from './StatPanel'
import { Taskbar } from './Taskbar'
import { ToastHost } from './ToastHost'
import './Desktop.css'

/** 드래그 중인 아이콘의 임시 상태. 놓는 순간 격자 칸으로 확정된다. */
interface DragState {
  id: string
  /** 커서와 아이콘 좌상단의 차이. 아이콘이 커서로 순간이동하는 것을 막는다. */
  dx: number
  dy: number
  /** 임계값 판정용 시작 좌표. */
  startX: number
  startY: number
  /** 임계값을 넘겨 "드래그"가 된 순간부터 true. */
  moved: boolean
}

/**
 * 드래그 직후의 더블클릭을 무시하는 시간(ms).
 * 끌어다 놓은 뒤 손이 떨려 두 번 눌리면 옮기려던 것이 열려 버린다.
 */
const DRAG_CLICK_GUARD = 300

export function Desktop() {
  const open = useWindowStore((s) => s.open)
  /**
   * 바탕화면 풍경은 슬롯을 따라간다(설계자 지시).
   * 오전은 낮 하늘, 오후는 해 질 녘 — 게임에서 밤은 자동 취침이라 화면에 없으므로
   * "하루가 저물어 간다"는 신호를 오후 배경이 대신 진다. 색은 CSS가 정하고
   * 여기서는 어느 쪽인지만 알린다.
   */
  const slot = useGameStore((s) => s.state?.slot)

  /*
   * 자동 진행이 끝나면 요약 창을 **스스로** 띄운다.
   *
   * ⚠️ 여기(바탕화면)에 있는 이유: 날짜칸에 두면 작업 표시줄 버튼으로 패널을 꺼 놓은 동안
   * 요약이 영영 안 뜬다(패널이 `null`을 반환해 effect 자체가 없어진다). 바탕화면은
   * 로그인해 있는 한 항상 그려진다.
   * 한 슬롯도 못 간 진행(계획이 비어 있었다)은 창을 띄우지 않는다 — 보고할 "지난 며칠"이
   * 없고, 사유는 날짜칸에 이미 한 줄로 적혀 있다.
   */
  const autoRun = useGameStore((s) => s.autoRun)
  const autoRunning = useGameStore((s) => s.autoRunning)
  useEffect(() => {
    if (autoRunning || !autoRun?.stop || autoRun.slots === 0) return
    open({
      id: 'autolog',
      kind: 'autolog',
      title: '자동 진행 기록',
      icon: UI_ICONS.autoLog,
      x: 180,
      y: 90,
      width: 520,
    })
  }, [autoRun, autoRunning, open])

  const storedCells = useDesktopIconStore((s) => s.cells)
  const place = useDesktopIconStore((s) => s.place)
  const resetLayout = useDesktopIconStore((s) => s.resetLayout)

  /** 플레이어가 만든 활동 바로 가기. 내장 아이콘과 **같은 격자**에 산다. */
  const shortcutIds = useShortcutStore((s) => s.activityIds)
  const removeShortcut = useShortcutStore((s) => s.remove)

  /** 열려 있는 오른쪽 클릭 메뉴(한 번에 하나). */
  const [menu, setMenu] = useState<{ x: number; y: number; entry: DesktopEntry } | null>(null)
  /** 실행 여부를 묻는 중인 활동. 바로 가기를 더블클릭하면 여기 들어온다. */
  const [confirming, setConfirming] = useState<Activity | null>(null)

  /**
   * 격자 판 크기는 뷰포트가 정한다 — 창을 줄이면 칸도 줄어야 하고,
   * 그때 바깥으로 밀려난 아이콘은 `resolveLayout`이 안으로 끌어들인다.
   * (100vw/100vh 대신 innerWidth/innerHeight를 쓰는 이유는 `Window`와 같다: 스크롤바 폭.)
   */
  const [viewport, setViewport] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }))
  useEffect(() => {
    const sync = () => setViewport({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', sync)
    return () => window.removeEventListener('resize', sync)
  }, [])

  const size = useMemo(() => gridSize(viewport.w, viewport.h), [viewport])

  const entries = useMemo(() => desktopEntries(shortcutIds), [shortcutIds])
  /** 실제로 그려지는 바로 가기만 칸을 차지한다(없는 활동을 가리키는 것은 빠진다). */
  const shortcutEntryIds = useMemo(
    () => entries.filter((e) => e.shortcut).map((e) => e.id),
    [entries],
  )

  /**
   * ⚠️ **내장 아이콘을 먼저 배치하고, 바로 가기는 그 위에 얹는다**(2단계).
   * 한 판에 섞어 돌리면 바로 가기 하나가 내장 아이콘의 기본 칸을 차지해 기본 배치가
   * 통째로 밀린다 — 바로 가기를 만들었다고 원래 있던 아이콘이 움직이면 안 된다.
   * 덕분에 바로 가기가 하나도 없을 때의 화면은 예전과 픽셀 단위로 같다.
   */
  const layout = useMemo(() => {
    const base = resolveLayout(DESKTOP_ICON_ORDER, DEFAULT_ICON_CELLS, storedCells, size)
    return placeShortcuts(shortcutEntryIds, base, storedCells, size)
  }, [storedCells, shortcutEntryIds, size])

  /** 드래그 진행 상태는 ref(매 픽셀 재렌더가 필요 없는 값), 화면에 그릴 좌표만 state. */
  const dragRef = useRef<DragState | null>(null)
  const dragEndAt = useRef(0)
  const [dragPos, setDragPos] = useState<{ id: string; x: number; y: number } | null>(null)

  const openItem = (item: DesktopItem) => {
    const i = DESKTOP_ITEMS.indexOf(item)
    open({
      id: `${item.kind}-${item.id}`,
      title: item.label,
      icon: item.icon,
      // 창끼리 겹치지 않게 순번만큼 어긋나게 배치한다.
      // 최대화 상태로 열리는 창도 이 좌표를 그대로 받는다 —
      // 최대화 중에는 무시되지만 복원하면 여기로 돌아오므로 0,0을 주면 안 된다.
      // ⚠️ 아이콘을 어디로 옮겼든 창이 열리는 자리는 바뀌지 않는다(설계자 요구).
      x: 120 + i * 28,
      y: 80 + i * 28,
      width: item.width,
      maximized: item.openMaximized,
      kind: item.kind,
      activityId: item.activityId,
      message: item.stubMessage,
      appId: item.appId,
      folderId: item.folderId,
    })
  }

  /**
   * 아이콘을 "연다". 내장 항목은 창을, **바로 가기는 실행 확인창**을 띄운다.
   * ⚠️ 바로 가기가 곧바로 실행하지 않는 이유: 더블클릭 한 번으로 1턴이 사라지면
   * 바탕화면이 지뢰밭이 된다(ux `confirmation-dialogs`).
   */
  const openEntry = (entry: DesktopEntry) => {
    if (!entry.shortcut) {
      openItem(entry.item)
      return
    }
    const activity = findActivity(entry.activityId)
    if (activity) setConfirming(activity)
  }

  /**
   * 오른쪽 클릭 메뉴의 항목.
   *
   * ⚠️ **내장 아이콘에는 삭제가 없다**(설계자 요구이자 실제 윈도우의 규칙이다 —
   * 시스템 아이콘은 지울 수 없다). 지울 수 있는 것은 **플레이어가 만든 것**뿐이라,
   * 삭제 항목은 `entry.shortcut`이 참일 때만 붙는다.
   *
   * 바로 가기 삭제에 다시 확인을 받지 않는 이유(스케줄러의 예약 취소와 다른 판단):
   * **되돌리는 비용이 거의 0이다.** 사이트의 확정 버튼을 다시 우클릭하면 그만이고,
   * 옮겨 둔 칸까지 기억돼 있어 같은 자리로 돌아온다. 예약 취소는 다시 짜야 하지만
   * 이건 아니다.
   */
  const menuItems = (entry: DesktopEntry): ContextMenuItem[] => [
    { id: 'open', label: entry.shortcut ? '실행' : '열기', onSelect: () => openEntry(entry) },
    ...(entry.shortcut
      ? [
          {
            id: 'delete',
            label: '바로 가기 삭제',
            danger: true,
            onSelect: () => removeShortcut(entry.activityId),
          },
        ]
      : []),
  ]

  /**
   * ⚠️ 포인터 캡처는 **아이콘 버튼 자기 자신**에 건다.
   * (`Window`의 타이틀 바가 자식 캡션 버튼의 pointerup을 훔쳐 클릭이 죽었던 회귀와 다르다 —
   * 캡처 대상과 클릭 대상이 같은 요소면 click/dblclick은 그대로 성립한다.)
   * 캡처를 걸어야 커서가 아이콘 밖으로 나가도 pointermove가 계속 온다.
   */
  const handlePointerDown = (e: ReactPointerEvent<HTMLButtonElement>, entry: DesktopEntry) => {
    // 오른쪽 버튼은 드래그가 아니다 — 잡아 두면 메뉴를 여는 동안 아이콘이 딸려 온다.
    if (e.button !== 0) return
    const origin = cellOrigin(layout[entry.id])
    dragRef.current = {
      id: entry.id,
      dx: e.clientX - origin.x,
      dy: e.clientY - origin.y,
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
    }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current
    if (!drag) return
    if (!drag.moved) {
      // ux `drag-threshold` — 이 검사가 없으면 더블클릭 중의 손떨림이 드래그로 잡힌다.
      // 축별로 재는 것은 윈도우(SM_CXDRAG/SM_CYDRAG)와 같은 방식이다.
      const far =
        Math.abs(e.clientX - drag.startX) >= DESKTOP_GRID.DRAG_THRESHOLD ||
        Math.abs(e.clientY - drag.startY) >= DESKTOP_GRID.DRAG_THRESHOLD
      if (!far) return
      drag.moved = true
    }
    // 끄는 동안에는 격자를 무시하고 커서를 그대로 따라간다
    // (ux `gesture-feedback`: 드래그는 손가락을 실시간으로 따라가야 한다).
    setDragPos({ id: drag.id, x: e.clientX - drag.dx, y: e.clientY - drag.dy })
  }

  const handlePointerUp = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current
    dragRef.current = null
    setDragPos(null)
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
    if (!drag?.moved) return
    dragEndAt.current = Date.now()

    // 놓은 자리에서 가장 가까운 칸 → 이미 차 있으면 가장 가까운 빈 칸.
    // 자기 자신은 점유 목록에서 빼야 제자리에 도로 놓을 수 있다.
    const taken = new Set(
      Object.entries(layout)
        .filter(([id]) => id !== drag.id)
        .map(([, cell]) => cellKey(cell)),
    )
    const target = snapToCell(e.clientX - drag.dx, e.clientY - drag.dy, size)
    place(drag.id, nearestFreeCell(target, taken, size))
  }

  const handlePointerCancel = () => {
    dragRef.current = null
    setDragPos(null)
  }

  const hasMoved = Object.keys(storedCells).length > 0

  return (
    <div className={`desktop ${slot === 'afternoon' ? 'desktop-dusk' : 'desktop-day'}`}>
      {/* 아이콘은 **격자 칸에 절대 배치**된다(실제 윈도우의 "자동 정렬 끔 + 격자에 맞춤").
          기본 배치는 data/desktopIcons.ts, 옮긴 위치는 desktopIconStore, 계산은
          systems/desktopGrid.ts가 나눠 갖는다. */}
      <div className="desktop-icons">
        {entries.map((entry) => {
          const cell = layout[entry.id]
          if (!cell) return null
          const dragging = dragPos?.id === entry.id
          const pos = dragging ? dragPos : cellOrigin(cell)
          return (
            <button
              key={entry.id}
              className={`desktop-icon${dragging ? ' desktop-icon-dragging' : ''}`}
              style={{ left: pos.x, top: pos.y }}
              onPointerDown={(e) => handlePointerDown(e, entry)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerCancel}
              onDoubleClick={() => {
                if (Date.now() - dragEndAt.current < DRAG_CLICK_GUARD) return
                openEntry(entry)
              }}
              // 오른쪽 클릭 = 메뉴. 브라우저 기본 메뉴를 막지 않으면 그게 위에 떠서
              // 우리 메뉴를 가린다(스케줄러의 예약 취소와 같은 처리).
              onContextMenu={(e) => {
                e.preventDefault()
                // 누른 아이콘에 포커스를 준다 — 실제 윈도우도 우클릭한 아이콘이 선택되고,
                // 메뉴를 닫을 때 포커스가 돌아올 자리가 생긴다(ux `focus-management`).
                e.currentTarget.focus()
                setMenu({ x: e.clientX, y: e.clientY, entry })
              }}
              // 키보드로도 열려야 한다(ux `keyboard-nav`). 마우스는 더블클릭이지만
              // 키보드에는 "더블"이 없으므로 Enter/Space가 곧 실행이다.
              // onClick을 쓰지 않는 이유: 한 번 클릭으로 열리면 드래그로 잡을 수 없다.
              onKeyDown={(e) => {
                // 키보드에도 메뉴로 가는 길을 둔다(ux `keyboard-shortcuts`:
                // 마우스 전용 상호작용을 만들지 않는다). 윈도우의 메뉴 키와 같은 자리다.
                if (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) {
                  e.preventDefault()
                  const r = e.currentTarget.getBoundingClientRect()
                  setMenu({ x: r.left + r.width / 2, y: r.bottom, entry })
                  return
                }
                if (e.key !== 'Enter' && e.key !== ' ') return
                e.preventDefault()
                openEntry(entry)
              }}
            >
              <span className="desktop-icon-art">
                <AppIcon name={entry.icon} size={38} className="desktop-icon-glyph" />
                {/*
                 * 바로 가기 화살표. 실제 윈도우와 같은 자리(왼쪽 아래)에 붙는다.
                 * ⚠️ 아이콘 세트가 아니라 **CSS 도형**이다 — 캡션 버튼·브라우저 도구 모음
                 * 글리프와 같은 이유다(가는 단색 선이라 다색 플랫 아이콘과 성격이 다르고,
                 * 어느 아이콘 위에도 같은 크기로 얹혀야 한다). 장식이 아니라 뜻이 있으므로
                 * 형태만으로 알리지 않고 라벨 옆에 "(바로 가기)"를 스크린 리더용으로 덧댄다.
                 */}
                {entry.shortcut && <span className="desktop-icon-link" aria-hidden="true" />}
              </span>
              {entry.label}
              {entry.shortcut && <span className="desktop-sr-only"> (바로 가기)</span>}
            </button>
          )
        })}

        {/*
         * 되돌리는 길. 옮긴 적이 있을 때만 나타난다.
         *
         * ux `gesture-alternative`("gesture-only 상호작용에 의존하지 말고 눈에 보이는
         * 컨트롤을 둔다") + `undo-support`. 흩뜨려 놓고 나면 localStorage를 비우는 것
         * 말고는 돌아올 길이 없다는 게 이 기능의 유일한 막다른 길이었다.
         *
         * **오른쪽 클릭 메뉴를 만들지 않은 이유:** 메뉴는 항목 하나를 위해 열기·닫기·
         * 바깥 클릭·키보드 이동을 전부 새로 만들어야 하고, 그 메뉴가 존재한다는 사실도
         * 따로 알려야 한다. 버튼은 **필요해진 순간에만 나타나** 스스로를 설명한다
         * (기본 화면은 예전과 픽셀 단위로 같게 유지된다).
         */}
        {hasMoved && (
          <button className="desktop-restore" onClick={resetLayout}>
            아이콘 위치 초기화
          </button>
        )}
      </div>

      {/* 스탯창·날짜칸은 바탕화면 요소다 — 일반 창에 가려지는 것이 정상이며,
          작업 표시줄의 패널 버튼으로 다시 앞으로 가져온다. */}
      <CalendarPanel />
      <StatPanel />
      <WindowManager />
      <Taskbar />
      {/* 알림은 작업 표시줄 위·엔딩 모달 아래에 뜬다. 턴이 넘어갈 때만 나타난다. */}
      <ToastHost />

      {/* 아이콘 오른쪽 클릭 메뉴. 공용 부품이라 열고 닫는 것만 여기서 관리한다. */}
      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          label={`${menu.entry.label} 메뉴`}
          items={menuItems(menu.entry)}
          onClose={() => setMenu(null)}
        />
      )}

      {/* 바로 가기 실행 확인. 비용을 다 보여 준 뒤에만 1턴이 나간다. */}
      {confirming && (
        <ActivityConfirm activity={confirming} onClose={() => setConfirming(null)} />
      )}

      <EndingModal />
    </div>
  )
}
