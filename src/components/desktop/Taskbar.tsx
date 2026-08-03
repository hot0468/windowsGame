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

  const slotLabel = state.slot === 'morning' ? '오전 ☀️' : '오후 🌆'

  return (
    <div className="taskbar">
      <button className="taskbar-start">⊞</button>

      <div className="taskbar-items">
        {windows.map((w) => (
          <button key={w.id} className="taskbar-item" onClick={() => focus(w.id)}>
            {w.icon} {w.title}
          </button>
        ))}
      </div>

      <button
        className="taskbar-skip"
        onClick={doSkip}
        disabled={state.gameOver !== null}
        title="아무것도 하지 않고 다음 시간대로 넘어갑니다"
      >
        ⏭️ 넘기기
      </button>

      <div className="taskbar-clock">
        {formatGameDate(state.day)}
        <br />
        {state.day}일차 {slotLabel}
      </div>
    </div>
  )
}
