import { useGameStore } from './store/gameStore'
import { useShell } from './hooks/useShell'
import { LockScreen } from './components/lockscreen/LockScreen'
import { Desktop } from './components/desktop/Desktop'
import { MobileShell } from './components/mobile/MobileShell'

/**
 * 셸 분기점. **여기 하나가 데스크톱/모바일을 가른다.**
 *
 * 판정은 `useShell` 하나가 한다(폭 + 수동 지정). 두 셸은 `windowStore`·`gameStore`를
 * 그대로 공유하므로 전환해도 열려 있던 앱과 진행 상황이 유지된다.
 *
 * ⚠️ 잠금화면은 아직 셸을 가르지 않는다(이번 범위 밖) — 좁은 폭에서도 그대로 뜬다.
 */
export default function App() {
  const loggedIn = useGameStore((s) => s.loggedIn)
  const state = useGameStore((s) => s.state)
  const shell = useShell()

  if (!loggedIn || !state) return <LockScreen />

  return shell === 'mobile' ? <MobileShell /> : <Desktop />
}
