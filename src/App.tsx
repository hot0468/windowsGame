import { useCallback, useState } from 'react'
import { useGameStore } from './store/gameStore'
import { useShell } from './hooks/useShell'
import { BootScreen } from './components/lockscreen/BootScreen'
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
  /* 새 판을 시작하면 이 값이 켜진다(`startGame`) — 이어하기에는 안 켜진다. */
  const booting = useGameStore((s) => s.booting)
  const clearBooting = useGameStore((s) => s.clearBooting)
  const shell = useShell()
  /* ⚠️ **훅은 전부 조건부 반환보다 위에 둔다** — 위 `?ui` 분기가 예외인 이유는 그 주석에 있다. */
  const [booted, setBooted] = useState(false)
  /* ⚠️ **참조가 고정이라야 한다.** 매 렌더 새 함수를 넘기면 `BootScreen`의 타이머 effect가
     매번 다시 걸려, 창 크기 변경처럼 App을 다시 그리는 일이 반복되면 부팅이 안 끝난다. */
  const finishBoot = useCallback(() => setBooted(true), [])

  /* 부팅 → 잠금 → 바탕화면 순서. 부팅 화면은 세이브도 턴도 안 건드리므로 이 위치에서
     아무것도 지연시키지 않는다(사유는 `BootScreen.tsx`). */
  if (!booted) return <BootScreen onDone={finishBoot} />

  /* ⚠️ **새 판은 한 번 더 부팅한다**(2026-08-22 설계자 지시) — 이름을 넣고 로그인한 순간이
     이 컴퓨터를 처음 켜는 순간이라, 잠금화면에서 곧바로 바탕화면이 뜨면 순서가 어긋난다.
     상태는 이미 만들어져 있고(`startGame`) 이 화면은 아무것도 지연시키지 않는다. */
  if (booting) return <BootScreen onDone={clearBooting} />

  if (!loggedIn || !state) return <LockScreen />

  return shell === 'mobile' ? <MobileShell /> : <Desktop />
}
