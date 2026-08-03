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
  children,
}: WindowProps) {
  const move = useWindowStore((s) => s.move)
  const focus = useWindowStore((s) => s.focus)
  /** 드래그 시작 시점의 커서-창 좌표 차이. 창이 커서로 순간이동하는 것을 막는다. */
  const offset = useRef({ dx: 0, dy: 0 })

  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    focus(id)
    offset.current = { dx: e.clientX - x, dy: e.clientY - y }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return
    // 창이 화면 밖으로 완전히 사라지지 않도록 가둔다.
    const nextX = Math.min(Math.max(0, e.clientX - offset.current.dx), window.innerWidth - 80)
    const nextY = Math.min(Math.max(0, e.clientY - offset.current.dy), window.innerHeight - 60)
    move(id, nextX, nextY)
  }

  const handlePointerUp = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId)
  }

  return (
    <div
      className="win"
      style={{ left: x, top: y, width, zIndex }}
      onPointerDown={() => focus(id)}
    >
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
