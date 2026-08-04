import { useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { DEFAULT_ICON_CELLS, DESKTOP_ICON_ORDER } from '../../data/desktopIcons'
import { DESKTOP_ITEMS } from '../../data/desktopItems'
import { DESKTOP_GRID } from '../../data/shell'
import {
  cellKey,
  cellOrigin,
  gridSize,
  nearestFreeCell,
  resolveLayout,
  snapToCell,
} from '../../systems/desktopGrid'
import { AppIcon } from '../../icons/AppIcon'
import { useDesktopIconStore } from '../../store/desktopIconStore'
import { useGameStore } from '../../store/gameStore'
import { useWindowStore } from '../../store/windowStore'
import type { DesktopItem } from '../../types/game'
import { WindowManager } from '../window/WindowManager'
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

  const storedCells = useDesktopIconStore((s) => s.cells)
  const place = useDesktopIconStore((s) => s.place)
  const resetLayout = useDesktopIconStore((s) => s.resetLayout)

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
  const layout = useMemo(
    () => resolveLayout(DESKTOP_ICON_ORDER, DEFAULT_ICON_CELLS, storedCells, size),
    [storedCells, size],
  )

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
   * ⚠️ 포인터 캡처는 **아이콘 버튼 자기 자신**에 건다.
   * (`Window`의 타이틀 바가 자식 캡션 버튼의 pointerup을 훔쳐 클릭이 죽었던 회귀와 다르다 —
   * 캡처 대상과 클릭 대상이 같은 요소면 click/dblclick은 그대로 성립한다.)
   * 캡처를 걸어야 커서가 아이콘 밖으로 나가도 pointermove가 계속 온다.
   */
  const handlePointerDown = (e: ReactPointerEvent<HTMLButtonElement>, item: DesktopItem) => {
    const origin = cellOrigin(layout[item.id])
    dragRef.current = {
      id: item.id,
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
        {DESKTOP_ITEMS.map((item) => {
          const cell = layout[item.id]
          if (!cell) return null
          const dragging = dragPos?.id === item.id
          const pos = dragging ? dragPos : cellOrigin(cell)
          return (
            <button
              key={item.id}
              className={`desktop-icon${dragging ? ' desktop-icon-dragging' : ''}`}
              style={{ left: pos.x, top: pos.y }}
              onPointerDown={(e) => handlePointerDown(e, item)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerCancel}
              onDoubleClick={() => {
                if (Date.now() - dragEndAt.current < DRAG_CLICK_GUARD) return
                openItem(item)
              }}
              // 키보드로도 열려야 한다(ux `keyboard-nav`). 마우스는 더블클릭이지만
              // 키보드에는 "더블"이 없으므로 Enter/Space가 곧 실행이다.
              // onClick을 쓰지 않는 이유: 한 번 클릭으로 열리면 드래그로 잡을 수 없다.
              onKeyDown={(e) => {
                if (e.key !== 'Enter' && e.key !== ' ') return
                e.preventDefault()
                openItem(item)
              }}
            >
              <AppIcon name={item.icon} size={38} className="desktop-icon-glyph" />
              {item.label}
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
      <EndingModal />
    </div>
  )
}
