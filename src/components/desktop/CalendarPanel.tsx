import { HudPanel } from './HudPanel'
import { AppIcon } from '../../icons/AppIcon'
import { useGameStore } from '../../store/gameStore'
import { useDesktopPanelStore } from '../../store/desktopPanelStore'
import { UI_ICONS } from '../../data/icons'
import { CALENDAR_PANEL_LAYOUT, formatGameDate } from '../../data/calendar'

/**
 * 날짜칸. 스탯창 왼쪽에 붙는 바탕화면 상시 패널이다.
 * 스탯창과 마찬가지로 windowStore에 등록하지 않으므로(작업 표시줄 목록·closeAll 회피)
 * z-index는 desktopPanelStore로 관리한다.
 * 크롬은 공용 Window가 아니라 게임 HUD 컨테이너(HudPanel)를 쓴다 — 사유는 HudPanel.tsx 주석 참조.
 */
export function CalendarPanel() {
  const state = useGameStore((s) => s.state)
  const doSkip = useGameStore((s) => s.doSkip)
  const zIndex = useDesktopPanelStore((s) => s.z.calendar)
  const raise = useDesktopPanelStore((s) => s.raise)

  const { width, gap, top } = CALENDAR_PANEL_LAYOUT
  /** 스탯창 바로 왼쪽에 고정한다. 드래그로 옮길 수 없으므로 상태로 들고 있지 않는다. */
  const pos = {
    x: Math.max(8, window.innerWidth - CALENDAR_PANEL_LAYOUT.statPanelReserve - width - gap),
    y: top,
  }

  if (!state) return null

  const isMorning = state.slot === 'morning'
  const slotIcon = isMorning ? UI_ICONS.slotMorning : UI_ICONS.slotAfternoon

  return (
    <HudPanel
      id="calendar"
      title="날짜"
      icon={UI_ICONS.calendarPanel}
      x={pos.x}
      y={pos.y}
      width={width}
      zIndex={zIndex}
      onActivate={() => raise('calendar')}
    >
      {/* 날짜는 이 패널의 주인공이다 — 타입 스케일 최상단(24px)에 두어
          한눈에 잡히게 한다(ux `visual-hierarchy`: 크기로 위계를 만든다). */}
      <div className="cal-date">{formatGameDate(state.day)}</div>
      <div className="cal-day">{state.day}일차</div>

      <div className="cal-slot">
        <AppIcon name={slotIcon} size={16} />
        {isMorning ? '오전' : '오후'}
      </div>

      {/* 건너뛰기는 무료 탐색이 아니라 시간을 소모하는 행동이다.
          경고색 테두리로 바탕화면의 다른 버튼과 시각적으로 구분한다. */}
      <button
        className="cal-skip"
        onClick={doSkip}
        disabled={state.gameOver !== null}
        title="이 슬롯을 아무것도 하지 않고 넘깁니다"
      >
        <AppIcon name={UI_ICONS.skipTurn} size={14} />
        {isMorning ? '오전' : '오후'} 건너뛰기
      </button>
      <div className="cal-skip-note">
        <AppIcon name={UI_ICONS.turnCost} size={12} />
        1턴을 소모합니다{!isMorning && ' · 하루가 끝납니다'}
      </div>
    </HudPanel>
  )
}
