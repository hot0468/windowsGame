import { useGameStore } from './store/gameStore'
import { useShell } from './hooks/useShell'
import { LockScreen } from './components/lockscreen/LockScreen'
import { Desktop } from './components/desktop/Desktop'
import { MobileShell } from './components/mobile/MobileShell'
import { UiGallery } from './dev/UiGallery'

/**
 * 셸 분기점. **여기 하나가 데스크톱/모바일을 가른다.**
 *
 * 판정은 `useShell` 하나가 한다(폭 + 수동 지정). 두 셸은 `windowStore`·`gameStore`를
 * 그대로 공유하므로 전환해도 열려 있던 앱과 진행 상황이 유지된다.
 *
 * ⚠️ 잠금화면은 아직 셸을 가르지 않는다(이번 범위 밖) — 좁은 폭에서도 그대로 뜬다.
 */
export default function App() {
  /*
   * ⚠️ **개발용 UI 견본**(`?ui`). 팝업 모양·등급 상승 인터랙션을 게임을 진행하지 않고
   * 보려고 만들었다 — 진짜 컴포넌트를 그대로 그리고 저장 키를 갈라 세이브를 안 건드린다
   * (`src/dev/UiGallery.tsx`). 배포 빌드에서는 `import.meta.env.DEV`가 거짓이라 길이 없다.
   * ⚠️ 훅보다 먼저 반환해도 되는 이유: 이 분기는 **첫 렌더에서 정해져 바뀌지 않는다**
   *    (주소가 바뀌면 새로고침이다) — 훅 순서가 렌더 사이에 흔들리지 않는다.
   */
  if (import.meta.env.DEV && new URLSearchParams(window.location.search).has('ui')) {
    return <UiGallery />
  }

  const loggedIn = useGameStore((s) => s.loggedIn)
  const state = useGameStore((s) => s.state)
  const shell = useShell()

  if (!loggedIn || !state) return <LockScreen />

  return shell === 'mobile' ? <MobileShell /> : <Desktop />
}
