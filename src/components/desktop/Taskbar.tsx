import { LayoutGrid, Moon, SkipForward, Sun } from 'lucide-react'
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
  const SlotIcon = isMorning ? Sun : Moon

  return (
    <div className="taskbar">
      <button className="taskbar-start" aria-label="시작">
        <LayoutGrid size={18} />
      </button>

      <div className="taskbar-items">
        {windows.map((w) => {
          const Icon = w.icon
          return (
            <button key={w.id} className="taskbar-item" onClick={() => focus(w.id)}>
              <Icon size={14} />
              {w.title}
            </button>
          )
        })}
      </div>

      <button
        className="taskbar-skip"
        onClick={doSkip}
        disabled={state.gameOver !== null}
        title="아무것도 하지 않고 다음 시간대로 넘어갑니다"
      >
        <SkipForward size={14} />
        넘기기
      </button>

      <div className="taskbar-clock">
        {formatGameDate(state.day)}
        <br />
        <span className="taskbar-slot">
          {state.day}일차 {isMorning ? '오전' : '오후'}
          <SlotIcon size={12} />
        </span>
      </div>
    </div>
  )
}
