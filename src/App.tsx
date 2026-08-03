import { useGameStore } from './store/gameStore'
import { LockScreen } from './components/lockscreen/LockScreen'

export default function App() {
  const loggedIn = useGameStore((s) => s.loggedIn)
  const state = useGameStore((s) => s.state)

  if (!loggedIn || !state) return <LockScreen />

  return <div style={{ padding: 20 }}>바탕화면 준비 중 — {state.playerName}</div>
}
