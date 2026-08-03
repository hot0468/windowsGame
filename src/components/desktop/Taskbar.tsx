import { formatGameDate } from '../../data/calendar'
import { UI_ICONS } from '../../data/icons'
import { AppIcon } from '../../icons/AppIcon'
import { useGameStore } from '../../store/gameStore'
import { useDesktopPanelStore } from '../../store/desktopPanelStore'
import { useWindowStore } from '../../store/windowStore'
import type { DesktopPanelId } from '../../store/desktopPanelStore'
import type { IconName } from '../../types/game'

/**
 * 바탕화면 상시 패널을 다시 앞으로 가져오는 버튼 목록.
 * 이 패널들은 일반 창에 가려지므로(바탕화면 요소이므로 정상), 이 버튼이 되찾는 수단이다.
 */
const PANEL_BUTTONS: { id: DesktopPanelId; label: string; icon: IconName }[] = [
  { id: 'calendar', label: '날짜', icon: UI_ICONS.calendarPanel },
  { id: 'stats', label: '스탯', icon: UI_ICONS.statPanel },
]

export function Taskbar() {
  const state = useGameStore((s) => s.state)
  const windows = useWindowStore((s) => s.windows)
  const focus = useWindowStore((s) => s.focus)
  const raise = useDesktopPanelStore((s) => s.raise)

  if (!state) return null

  const isMorning = state.slot === 'morning'
  const slotIcon = isMorning ? UI_ICONS.slotMorning : UI_ICONS.slotAfternoon

  return (
    <div className="taskbar">
      <button className="taskbar-start" aria-label="시작">
        <AppIcon name={UI_ICONS.start} size={20} />
      </button>

      <div className="taskbar-items">
        {windows.map((w) => (
          <button key={w.id} className="taskbar-item" onClick={() => focus(w.id)}>
            <AppIcon name={w.icon} size={16} />
            {w.title}
          </button>
        ))}
      </div>

      {/* 시계 왼쪽: 바탕화면 패널 되돌리기 버튼. 열린 창 목록과는 성격이 달라 구역을 나눈다. */}
      <div className="taskbar-panels">
        {PANEL_BUTTONS.map((panel) => (
          <button
            key={panel.id}
            className="taskbar-panel"
            onClick={() => raise(panel.id)}
            title={`${panel.label}창을 맨 앞으로 가져옵니다`}
            aria-label={`${panel.label}창을 맨 앞으로`}
          >
            <AppIcon name={panel.icon} size={16} />
          </button>
        ))}
      </div>

      {/* 실제 윈도우처럼 작업 표시줄에는 시계만 남긴다. 넘기기는 날짜칸으로 옮겼다. */}
      <div className="taskbar-clock">
        {formatGameDate(state.day)}
        <br />
        <span className="taskbar-slot">
          {state.day}일차 {isMorning ? '오전' : '오후'}
          <AppIcon name={slotIcon} size={13} />
        </span>
      </div>
    </div>
  )
}
