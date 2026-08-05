import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { LAYERS } from '../data/layers'
import { clampMenuPosition } from '../systems/contextMenu'
import './ContextMenu.css'

/** 메뉴 항목 하나. */
export interface ContextMenuItem {
  id: string
  label: string
  /**
   * 고를 수 있는 항목이면 무엇을 할지. **생략하면 비활성**이다 —
   * 지금은 할 수 없는 일을 감추는 대신 이유를 보여 주는 자리에 쓴다
   * (ux `empty-nav-state`: 갈 수 없는 곳은 숨기지 말고 밝힌다).
   */
  onSelect?: () => void
  /** 되돌릴 수 없는 쪽. 위험색을 입고 구분선 아래로 내려간다(ux `destructive-emphasis`). */
  danger?: boolean
}

/**
 * 오른쪽 클릭 메뉴 — **이 프로젝트의 첫 컨텍스트 메뉴이자 공용 부품**.
 *
 * 인라인으로 만들지 않은 이유: 열기·닫기·바깥 클릭·Esc·키보드 이동·화면 밖 클램프까지
 * **여섯 가지를 매번 다시 만들어야** 하고, 두 번째 자리에서 그중 하나를 빠뜨리면
 * "메뉴가 안 닫힌다"·"메뉴가 잘려서 못 고른다"가 된다.
 * 앞으로 휴지통·폴더·바탕화면 빈 자리도 이 부품을 쓴다.
 *
 * ## 세 가지 설계 결정
 * - ⚠️ **`document.body`로 포탈한다.** 사이트 확정 버튼은 브라우저 창 안에 있고
 *   `.win-body`는 `overflow: auto`인 스크롤 상자다 — 그 안에 그리면 메뉴가 **잘린다**.
 *   창은 자기 z-index로 쌓임 문맥을 만들므로 z를 아무리 올려도 작업 표시줄을 못 넘는다.
 *   포탈이 이 둘을 한 번에 푼다(ux `z-index-management`: 쌓임 문맥을 이해할 것).
 * - **바깥 클릭은 투명 판 한 장**(`.ctxmenu-scrim`)이 받는다. 전역 리스너를 붙였다
 *   떼는 정리 코드가 필요 없다 — 브라우저 ⋮ 메뉴와 같은 방식이다.
 * - **포커스는 되돌려 준다.** 열 때의 포커스를 기억했다가 닫을 때 그리로 돌려놓는다.
 *   안 그러면 메뉴를 닫는 순간 탭 순서가 문서 맨 앞으로 튄다
 *   (ux `focus-management` / `escape-routes`).
 */
export function ContextMenu({
  x,
  y,
  label,
  items,
  onClose,
}: {
  /** 커서 위치(뷰포트 기준). 화면 밖으로 나가면 알아서 뒤집힌다. */
  x: number
  y: number
  /** 스크린 리더용 이름. 메뉴에는 제목 글자가 없으므로 필수다(ux `aria-labels`). */
  label: string
  items: ContextMenuItem[]
  onClose: () => void
}) {
  const menuRef = useRef<HTMLDivElement>(null)
  /**
   * 실제 좌표. 처음에는 커서 자리에 그렸다가 **크기를 재고 나서** 옮긴다 —
   * 메뉴 크기는 항목 글자가 정하므로 그리기 전에는 알 수 없다.
   * `useLayoutEffect`라 화면에 칠해지기 전에 끝난다(깜빡이지 않는다).
   */
  const [pos, setPos] = useState({ x, y })

  useLayoutEffect(() => {
    const el = menuRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    setPos(
      clampMenuPosition(
        { x, y },
        { width: rect.width, height: rect.height },
        { width: window.innerWidth, height: window.innerHeight },
      ),
    )
  }, [x, y, items])

  /** 열기 직전의 포커스를 기억해 두었다가 닫을 때 돌려준다. */
  const returnFocus = useRef<HTMLElement | null>(null)
  useEffect(() => {
    returnFocus.current = document.activeElement as HTMLElement | null
    // 첫 항목에 포커스를 준다 — 키보드로 연 사람이 곧바로 고를 수 있어야 한다.
    //
    // ⚠️ **고를 수 있는 항목이 하나도 없으면 판 자체에 포커스를 준다**(CDP 실측으로 잡은 버그).
    // 비활성 버튼은 포커스를 받지 못하므로, 안내 한 줄만 있는 메뉴("이미 바탕화면에
    // 있습니다")에서는 포커스가 바깥에 남아 **Esc가 메뉴에 닿지 않았다** — 열고 나서
    // 닫을 방법이 바깥 클릭뿐인 상태가 된다(ux `escape-routes` 위반).
    const first = menuRef.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')
    ;(first ?? menuRef.current)?.focus()
    return () => {
      const back = returnFocus.current
      if (back?.isConnected) back.focus()
    }
  }, [])

  /** 방향키·Home·End로 항목 사이를 옮긴다(실제 윈도우 메뉴와 같다). */
  const move = (from: HTMLElement, step: number | 'first' | 'last') => {
    const list = Array.from(
      menuRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [],
    )
    if (!list.length) return
    if (step === 'first') return list[0].focus()
    if (step === 'last') return list[list.length - 1].focus()
    const i = list.indexOf(from as HTMLButtonElement)
    // 끝에서 반대쪽으로 넘어간다 — 목록이 짧아 막다른 끝을 만들 이유가 없다.
    list[(i + step + list.length) % list.length].focus()
  }

  return createPortal(
    <>
      {/* 바깥 클릭 닫기. 오른쪽 클릭으로도 닫히되 브라우저 기본 메뉴는 뜨지 않는다. */}
      <div
        className="ctxmenu-scrim"
        style={{ zIndex: LAYERS.CONTEXT_MENU }}
        onPointerDown={onClose}
        onContextMenu={(e) => {
          e.preventDefault()
          onClose()
        }}
      />
      <div
        ref={menuRef}
        className="ctxmenu"
        role="menu"
        aria-label={label}
        // 고를 항목이 없을 때 포커스를 받아 Esc를 처리하기 위한 자리(위 effect 참조).
        tabIndex={-1}
        style={{ left: pos.x, top: pos.y, zIndex: LAYERS.CONTEXT_MENU + 1 }}
        onKeyDown={(e) => {
          // ux `escape-routes` — 메뉴를 연 사람에게는 항상 빠져나갈 길이 있어야 한다.
          if (e.key === 'Escape') {
            // 창(`Window`)이 같은 키를 보고 다른 일을 하지 않도록 여기서 멈춘다.
            e.stopPropagation()
            onClose()
            return
          }
          // Tab은 메뉴를 닫고 원래 자리로 돌려보낸다(포커스가 메뉴 뒤로 새지 않는다).
          if (e.key === 'Tab') {
            e.preventDefault()
            onClose()
            return
          }
          const target = e.target as HTMLElement
          if (e.key === 'ArrowDown') move(target, 1)
          else if (e.key === 'ArrowUp') move(target, -1)
          else if (e.key === 'Home') move(target, 'first')
          else if (e.key === 'End') move(target, 'last')
          else return
          e.preventDefault()
        }}
      >
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            role="menuitem"
            className={`ctxmenu-item${item.danger ? ' ctxmenu-item-danger' : ''}`}
            // ux `disabled-states`: 속성 + 색 + 커서로 함께 알린다.
            disabled={!item.onSelect}
            onClick={() => {
              item.onSelect?.()
              onClose()
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
    </>,
    document.body,
  )
}
