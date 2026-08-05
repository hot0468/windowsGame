import { useGameStore } from './store/gameStore'
import { LockScreen } from './components/lockscreen/LockScreen'
import { Desktop } from './components/desktop/Desktop'

export default function App() {
  const loggedIn = useGameStore((s) => s.loggedIn)
  const state = useGameStore((s) => s.state)

  if (!loggedIn || !state) return <LockScreen />

  return <Desktop />
}
