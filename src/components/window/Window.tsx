import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent, ReactNode } from 'react'
import { SHELL } from '../../data/shell'

/** 창을 화면 가장자리에 붙이지 않기 위한 최소 여백. */
const GAP = 8
import { AppIcon } from '../../icons/AppIcon'
import { PanelOrnament } from '../PanelOrnament'
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
  /**
   * true면 드래그로 옮길 수 없다. 바탕화면에 고정된 스탯창·날짜칸처럼
   * 위치가 정해진 패널용. 최대화 창과 마찬가지로 잡을 수 있다는 신호(grab 커서)도 주지 않는다.
   */
  fixed?: boolean
  /** 없으면 닫기 버튼을 숨긴다 (스탯창처럼 상시 표시되는 창). */
  onClose?: () => void
  /**
   * 없으면 최소화 버튼을 숨긴다.
   * 스탯창·날짜칸은 windowStore에 등록되지 않아 작업 표시줄에서 되돌릴 수단이 없으므로
   * 최소화시키면 영영 사라진다 → 넘기지 않는다.
   */
  onMinimize?: () => void
  /** 없으면 최대화 버튼을 숨긴다. 스탯창·날짜칸은 넘기지 않는다. */
  onToggleMaximize?: () => void
  /** 지정하면 드래그 시 store의 move 대신 이 콜백을 호출한다 (스탯창처럼 store에 등록되지 않은 창용). */
  onMove?: (x: number, y: number) => void
  /**
   * 지정하면 창을 누를 때 windowStore.focus 대신 이 콜백을 호출한다.
   * 스토어에 등록되지 않은 창(스탯창·날짜칸)은 focus(id)가 아무것도 갱신하지 못하고
   * topZ만 올려 다른 창의 z를 앞당겨 소모시키므로, 자체 z 관리 콜백을 받는다.
   */
  onActivate?: () => void
  /**
   * true면 네 모서리에 테두리 장식을 그린다.
   *
   * **켜는 자리를 고른 이유:** 이 앱은 "가짜 윈도우 OS 위에 게임이 얹혀 있다"는 인상으로
   * 굴러간다. 활동창·안내창처럼 **게임이 말을 거는 창**은 장식이 붙어야 게임 요소로 읽히고,
   * 브라우저처럼 **설치된 프로그램으로 읽혀야 하는 창**은 장식이 붙는 순간 그 인상이 깨진다.
   * 그래서 기본값은 꺼짐이다 — 새 앱을 올릴 때 아무 생각 없이 켜지지 않도록.
   */
  ornament?: boolean
  /**
   * true면 타이틀 바를 **투명하게** 만들고 아이콘·제목을 감춘다. 캡션 버튼만 남아
   * 앱 배경 위에 떠 있는 형태가 된다(레퍼런스: 카톡·네이트온 PC 창).
   *
   * 실제 메신저 창에는 OS 타이틀 바가 따로 보이지 않는다 — 앱이 창 꼭대기까지 자기 색을
   * 칠하고 캡션 버튼만 그 위에 얹힌다. 회색 타이틀 바를 남겨 두면 그 인상이 나오지 않는다.
   * 바 자체는 그대로 있으므로 **드래그·더블클릭 최대화는 그대로 동작한다.**
   */
  bareTitle?: boolean
  /**
   * true면 창 크롬을 **어둡게** 칠한다(명령 프롬프트).
   * 캡션 글리프도 함께 밝은 색으로 뒤집힌다 — 어두운 바 위에 검은 글리프를 두면
   * 보이지 않는다(닫기 hover의 빨강만 그대로다: 어느 테마에서도 같은 뜻이다).
   */
  dark?: boolean
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
  fixed = false,
  onClose,
  onMinimize,
  onToggleMaximize,
  onMove,
  onActivate,
  ornament = false,
  bareTitle = false,
  dark = false,
  children,
}: WindowProps) {
  const move = useWindowStore((s) => s.move)
  const storeFocus = useWindowStore((s) => s.focus)
  /** 스토어에 등록된 창은 store.focus, 그렇지 않은 창은 자체 콜백으로 앞으로 온다. */
  const activate = onActivate ?? (() => storeFocus(id))
  /** 드래그 시작 시점의 커서-창 좌표 차이. 창이 커서로 순간이동하는 것을 막는다. */
  const offset = useRef({ dx: 0, dy: 0 })
  /** 열릴 때 실제 높이를 재기 위한 참조(아래 위치 보정 참조). */
  const ref = useRef<HTMLDivElement>(null)
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

  /**
   * 창이 작업 표시줄 아래로 삐져나오지 않게 **열릴 때 한 번** 위로 끌어올린다.
   *
   * 여는 쪽에서 y를 잘 고르는 것으로는 못 막는다 — 창 높이는 내용이 정하므로
   * 여는 시점에는 아무도 모른다(메신저 창 560px, 활동창 200px 남짓). 그래서 실제로
   * 그려진 높이를 재서 넘치는 만큼만 올린다. 마운트 직후 한 번만 하므로 이후 드래그는
   * 자유롭고, 이미 들어맞는 창은 건드리지 않는다.
   */
  useEffect(() => {
    if (maximized || fixed) return
    const el = ref.current
    if (!el) return
    // 작업 표시줄에 딱 붙이지 않고 8px 띄운다 — 창이 바닥에 붙으면 "빠진 것"처럼 보인다.
    const maxY = window.innerHeight - SHELL.TASKBAR_HEIGHT - el.offsetHeight - GAP
    if (y <= maxY) return
    // 화면보다 큰 창은 maxY가 음수가 된다 → 위쪽에 붙이되 역시 8px 띄운다.
    const nextY = Math.max(GAP, maxY)
    if (onMove) onMove(x, nextY)
    else move(id, x, nextY)
    // 마운트 시 한 번만 보정한다. y를 의존성에 넣으면 드래그할 때마다 다시 끌어올린다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    // 타이틀 바 pointerdown이 컨테이너로 버블링되어 container의
    // onPointerDown도 함께 발생하므로, focus는 여기서 한 번만 호출하고
    // 컨테이너 쪽 핸들러에서는 이벤트 전파를 막아 중복 호출을 방지한다.
    e.stopPropagation()
    activate()
    // ⚠️ 회귀 주의: 캡션 버튼(최소화·최대화·닫기)은 전부 타이틀 바 안에 있다.
    // 여기서 포인터를 캡처하면 pointerup이 버튼 대신 타이틀 바로 가서
    // click이 성립하지 않는다(이 버그로 이미 한 번 창이 안 닫혔다).
    // 버튼을 하나씩 나열하면 새 버튼을 추가할 때마다 같은 버그가 재발하므로,
    // 모든 캡션 버튼이 공유하는 클래스 하나로 한 번에 걸러낸다.
    // 드래그도 걸지 않는다 — 버튼을 누른 채 움직이는 건 드래그 의도가 아니다.
    if ((e.target as HTMLElement).closest('.win-caption-btn')) return
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

  /** 전체 화면 창과 고정 패널은 위치가 정해져 있어 드래그하지 않는다. */
  const immovable = maximized || fixed

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
      ref={ref}
      className={`win${maximized ? ' win-max' : ''}${fixed ? ' win-fixed' : ''}${
        bareTitle ? ' win-bare' : ''
      }${dark ? ' win-dark' : ''}`}
      style={style}
      onPointerDown={activate}
    >
      <div
        className={`win-title${bareTitle ? ' win-title-bare' : ''}`}
        // 전체 화면 창과 고정 패널은 끌 수 없다 — 핸들러를 아예 붙이지 않아 포인터 캡처도 걸리지 않는다.
        // (캡션 버튼 클릭은 캡처가 없으므로 그대로 성립한다.)
        // 컨테이너의 onPointerDown이 살아 있으므로 눌렀을 때 앞으로 오는 동작은 유지된다.
        onPointerDown={immovable ? undefined : handlePointerDown}
        onPointerMove={immovable ? undefined : handlePointerMove}
        onPointerUp={immovable ? undefined : handlePointerUp}
        // 실제 윈도우처럼 타이틀 바 더블클릭으로도 최대화/복원을 토글한다.
        // 캡션 버튼 위의 더블클릭까지 토글되면 최소화를 두 번 누를 때 엉뚱하게 최대화되므로 제외한다.
        onDoubleClick={
          onToggleMaximize
            ? (e) => {
                if ((e.target as HTMLElement).closest('.win-caption-btn')) return
                onToggleMaximize()
              }
            : undefined
        }
      >
        {/* 제목 줄은 bareTitle이면 그리지 않는다 — 창 목록·접근성 이름은 title prop이
            작업 표시줄과 aria로 계속 전달한다. */}
        {!bareTitle && (
          <>
            <AppIcon name={icon} size={16} className="win-title-icon" />
            <span className="win-title-text">{title}</span>
          </>
        )}

        {/* 캡션 버튼 구역. 윈도우처럼 최소화 → 최대화 → 닫기 순으로 우상단 모서리에 붙는다.
            세 버튼 모두 .win-caption-btn을 공유해야 한다 —
            handlePointerDown이 이 클래스로 포인터 캡처를 건너뛰기 때문이다. */}
        <div className="win-caption">
          {onMinimize && (
            <button
              className="win-caption-btn win-minimize"
              onClick={onMinimize}
              aria-label="최소화"
              title="최소화"
            >
              <span className="win-glyph win-glyph-minimize" />
            </button>
          )}
          {onToggleMaximize && (
            <button
              className="win-caption-btn win-maximize"
              onClick={onToggleMaximize}
              aria-label={maximized ? '이전 크기로 복원' : '최대화'}
              title={maximized ? '이전 크기로 복원' : '최대화'}
            >
              <span
                className={maximized ? 'win-glyph win-glyph-restore' : 'win-glyph win-glyph-maximize'}
              />
            </button>
          )}
          {onClose && (
            <button
              className="win-caption-btn win-close"
              onClick={onClose}
              aria-label="닫기"
              title="닫기"
            >
              <span className="win-glyph win-glyph-close" />
            </button>
          )}
        </div>
      </div>
      {/* 장식은 타이틀 바를 비켜 본문만 감싼다 — 위치 규칙은 Window.css의 .win > .panel-ornament 참조. */}
      {ornament && <PanelOrnament />}
      <div className="win-body">{children}</div>
    </div>
  )
}
