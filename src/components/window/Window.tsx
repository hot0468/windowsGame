import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent, ReactNode } from 'react'
import { UI_ICONS } from '../../data/icons'
import { SHELL } from '../../data/shell'
import { AppIcon } from '../../icons/AppIcon'
import { useWindowStore } from '../../store/windowStore'
import type { IconName } from '../../types/game'
import './Window.css'

interface WindowProps {
  id: string
  title: string
  /** 타이틀 바 아이콘 이름 (Iconify `"세트:이름"`). */
  icon: IconName
  x: number
  y: number
  width: number
  zIndex: number
  /**
   * true면 작업 표시줄을 제외한 전체 화면으로 그린다.
   * x/y/width는 무시하고 0,0에 붙이며 드래그를 걸지 않는다(전체 화면 창을 끄는 건 의미가 없고,
   * 끌리면 클램핑 로직에 걸려 화면이 어긋난다). 뷰포트 크기가 바뀌면 따라서 늘어난다.
   */
  maximized?: boolean
  /** 없으면 닫기 버튼을 숨긴다 (스탯창처럼 상시 표시되는 창). */
  onClose?: () => void
  /** 지정하면 드래그 시 store의 move 대신 이 콜백을 호출한다 (스탯창처럼 store에 등록되지 않은 창용). */
  onMove?: (x: number, y: number) => void
  /**
   * 지정하면 창을 누를 때 windowStore.focus 대신 이 콜백을 호출한다.
   * 스토어에 등록되지 않은 창(스탯창·날짜칸)은 focus(id)가 아무것도 갱신하지 못하고
   * topZ만 올려 다른 창의 z를 앞당겨 소모시키므로, 자체 z 관리 콜백을 받는다.
   */
  onActivate?: () => void
  children: ReactNode
}

export function Window({
  id,
  title,
  icon,
  x,
  y,
  width,
  zIndex,
  maximized = false,
  onClose,
  onMove,
  onActivate,
  children,
}: WindowProps) {
  const move = useWindowStore((s) => s.move)
  const storeFocus = useWindowStore((s) => s.focus)
  /** 스토어에 등록된 창은 store.focus, 그렇지 않은 창은 자체 콜백으로 앞으로 온다. */
  const activate = onActivate ?? (() => storeFocus(id))
  /** 드래그 시작 시점의 커서-창 좌표 차이. 창이 커서로 순간이동하는 것을 막는다. */
  const offset = useRef({ dx: 0, dy: 0 })
  /**
   * 전체 화면 창이 따라가야 할 뷰포트 크기.
   * CSS의 100vw/100vh 대신 실제 innerWidth/innerHeight를 쓴다 — 스크롤바 폭 때문에
   * 100vw가 innerWidth보다 커지는 경우를 피하고, 작업 표시줄과의 경계를 픽셀로 맞추기 위해서다.
   * 일반 창은 이 값을 쓰지 않으므로 리사이즈 구독도 전체 화면 창에서만 건다.
   */
  const [viewport, setViewport] = useState(() => ({
    w: window.innerWidth,
    h: window.innerHeight,
  }))

  useEffect(() => {
    if (!maximized) return
    const sync = () => setViewport({ w: window.innerWidth, h: window.innerHeight })
    sync()
    window.addEventListener('resize', sync)
    return () => window.removeEventListener('resize', sync)
  }, [maximized])

  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    // 타이틀 바 pointerdown이 컨테이너로 버블링되어 container의
    // onPointerDown도 함께 발생하므로, focus는 여기서 한 번만 호출하고
    // 컨테이너 쪽 핸들러에서는 이벤트 전파를 막아 중복 호출을 방지한다.
    e.stopPropagation()
    activate()
    // 닫기 버튼은 타이틀 바 안에 있다. 여기서 포인터를 캡처하면 pointerup이
    // 버튼 대신 타이틀 바로 가서 click이 성립하지 않아 창이 닫히지 않는다.
    // 드래그도 걸지 않는다 — 버튼을 누른 채 움직이는 건 드래그 의도가 아니다.
    if ((e.target as HTMLElement).closest('.win-close')) return
    offset.current = { dx: e.clientX - x, dy: e.clientY - y }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return
    // 창이 화면 밖으로 완전히 사라지지 않도록 가둔다.
    // MIN_VISIBLE_WIDTH: 창을 오른쪽 끝까지 끌어도 화면에 남아 있어야 하는 최소 가로 폭.
    const MIN_VISIBLE_WIDTH = width
    const maxX = Math.max(0, window.innerWidth - MIN_VISIBLE_WIDTH)
    // 타이틀 바가 작업 표시줄 아래로 숨으면 창을 다시 잡을 수 없다.
    const maxY = Math.max(0, window.innerHeight - SHELL.TASKBAR_HEIGHT - SHELL.TITLE_BAR_HEIGHT)
    const nextX = Math.min(Math.max(0, e.clientX - offset.current.dx), maxX)
    const nextY = Math.min(Math.max(0, e.clientY - offset.current.dy), maxY)
    if (onMove) {
      onMove(nextX, nextY)
    } else {
      move(id, nextX, nextY)
    }
  }

  const handlePointerUp = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId)
  }

  /** 전체 화면이면 x/y/width 대신 뷰포트를 채우고, 작업 표시줄 높이만 아래로 비워 둔다. */
  const style: CSSProperties = maximized
    ? {
        left: 0,
        top: 0,
        width: viewport.w,
        height: viewport.h - SHELL.TASKBAR_HEIGHT,
        zIndex,
      }
    : { left: x, top: y, width, zIndex }

  return (
    <div
      className={maximized ? 'win win-max' : 'win'}
      style={style}
      onPointerDown={activate}
    >
      <div
        className="win-title"
        // 전체 화면 창은 끌 수 없다 — 핸들러를 아예 붙이지 않아 포인터 캡처도 걸리지 않는다.
        // (닫기 버튼 클릭은 캡처가 없으므로 그대로 성립한다.)
        onPointerDown={maximized ? undefined : handlePointerDown}
        onPointerMove={maximized ? undefined : handlePointerMove}
        onPointerUp={maximized ? undefined : handlePointerUp}
      >
        <AppIcon name={icon} size={16} className="win-title-icon" />
        <span className="win-title-text">{title}</span>
        {onClose && (
          <button className="win-close" onClick={onClose} aria-label="닫기">
            <AppIcon name={UI_ICONS.windowClose} size={14} />
          </button>
        )}
      </div>
      <div className="win-body">{children}</div>
    </div>
  )
}
