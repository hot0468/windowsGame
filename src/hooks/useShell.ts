import { useEffect, useState } from 'react'
import { useShellStore } from '../store/shellStore'
import { resolveShell } from '../systems/shell'
import type { ShellMode } from '../store/shellStore'

/**
 * 지금 그릴 셸을 알려 준다. **`App`이 이 하나로 분기한다.**
 *
 * 폭은 `window.innerWidth`로 잰다(100vw가 아니라) — 스크롤바 폭을 포함하지 않는
 * 실제 사용 가능 폭이고, `Desktop`의 격자 계산도 같은 값을 쓴다.
 *
 * ⚠️ 폭을 구독해 두는 것은 override가 걸려 있을 때도 마찬가지다 — override를
 * 해제하는 순간 **그 시점의 폭**으로 즉시 돌아가야 하는데, 구독을 멈춰 두면
 * 마지막으로 기억한 옛 폭으로 판정한다.
 */
export function useShell(): ShellMode {
  const override = useShellStore((s) => s.override)
  const [width, setWidth] = useState(() => window.innerWidth)

  useEffect(() => {
    const sync = () => setWidth(window.innerWidth)
    window.addEventListener('resize', sync)
    // 마운트와 첫 resize 사이에 폭이 바뀌었을 수 있다(기기 회전·창 복원).
    sync()
    return () => window.removeEventListener('resize', sync)
  }, [])

  return resolveShell(width, override)
}
