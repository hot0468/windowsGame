import { UI_ICONS } from '../../data/icons'
import { AppIcon } from '../../icons/AppIcon'
import { useGameStore } from '../../store/gameStore'
import { useWindowStore } from '../../store/windowStore'

/** 게임 내 날짜를 3월 1일 기준으로 환산해 표시한다. */
function formatGameDate(day: number): string {
  const base = new Date(2026, 2, 1)
  base.setDate(base.getDate() + day - 1)
  return base.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })
}

export function Taskbar() {
  const state = useGameStore((s) => s.state)
  const doSkip = useGameStore((s) => s.doSkip)
  const windows = useWindowStore((s) => s.windows)
  const focus = useWindowStore((s) => s.focus)

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

      <button
        className="taskbar-skip"
        onClick={doSkip}
        disabled={state.gameOver !== null}
        title="아무것도 하지 않고 다음 시간대로 넘어갑니다"
      >
        <AppIcon name={UI_ICONS.skipTurn} size={14} />
        넘기기
      </button>

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
