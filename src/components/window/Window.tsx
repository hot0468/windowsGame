import { useRef } from 'react'
import type { PointerEvent, ReactNode } from 'react'
import { useWindowStore } from '../../store/windowStore'
import './Window.css'

interface WindowProps {
  id: string
  title: string
  icon: string
  x: number
  y: number
  width: number
  zIndex: number
  /** 없으면 닫기 버튼을 숨긴다 (스탯창처럼 상시 표시되는 창). */
  onClose?: () => void
  /** 지정하면 드래그 시 store의 move 대신 이 콜백을 호출한다 (스탯창처럼 store에 등록되지 않은 창용). */
  onMove?: (x: number, y: number) => void
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
  onClose,
  onMove,
  children,
}: WindowProps) {
  const move = useWindowStore((s) => s.move)
  const focus = useWindowStore((s) => s.focus)
  /** 드래그 시작 시점의 커서-창 좌표 차이. 창이 커서로 순간이동하는 것을 막는다. */
  const offset = useRef({ dx: 0, dy: 0 })

  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    // 타이틀 바 pointerdown이 컨테이너로 버블링되어 container의
    // onPointerDown도 함께 발생하므로, focus는 여기서 한 번만 호출하고
    // 컨테이너 쪽 핸들러에서는 이벤트 전파를 막아 중복 호출을 방지한다.
    e.stopPropagation()
    focus(id)
    offset.current = { dx: e.clientX - x, dy: e.clientY - y }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return
    // 창이 화면 밖으로 완전히 사라지지 않도록 가둔다.
    // MIN_VISIBLE_WIDTH: 창을 오른쪽 끝까지 끌어도 화면에 남아 있어야 하는 최소 가로 폭.
    const MIN_VISIBLE_WIDTH = width
    // TASKBAR_HEIGHT: 화면 하단에 고정된 작업 표시줄(추후 작업)의 높이. 타이틀 바가 그 아래로 가려지면 안 된다.
    const TASKBAR_HEIGHT = 44
    // TITLE_BAR_HEIGHT: 타이틀 바 자체 높이(패딩 포함, 여유값). 최소한 타이틀 바는 작업 표시줄 위에서 항상 잡을 수 있어야 한다.
    const TITLE_BAR_HEIGHT = 40
    const maxX = Math.max(0, window.innerWidth - MIN_VISIBLE_WIDTH)
    const maxY = Math.max(0, window.innerHeight - TASKBAR_HEIGHT - TITLE_BAR_HEIGHT)
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

  return (
    <div className="win" style={{ left: x, top: y, width, zIndex }} onPointerDown={() => focus(id)}>
      <div
        className="win-title"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <span>{icon}</span>
        <span className="win-title-text">{title}</span>
        {onClose && (
          <button className="win-close" onClick={onClose} aria-label="닫기">
            ✕
          </button>
        )}
      </div>
      <div className="win-body">{children}</div>
    </div>
  )
}
