import { MOBILE_SHELL } from '../data/shell'
import type { ShellMode } from '../store/shellStore'

/**
 * 화면 폭 → 셸 종류. 순수 함수다(systems 규칙).
 *
 * ⚠️ 경계는 **이하**다: `MOBILE_MAX_WIDTH`와 정확히 같은 폭은 모바일이다.
 * "최대 폭"이라는 이름이 그 뜻이고, 부등호를 뒤집으면 상수 이름이 거짓이 된다.
 */
export function shellForWidth(width: number): ShellMode {
  return width <= MOBILE_SHELL.MOBILE_MAX_WIDTH ? 'mobile' : 'desktop'
}

/**
 * 지금 쓸 셸. **수동 지정이 폭을 이긴다.**
 * `override`가 null이면 폭 판정으로 되돌아간다.
 */
export function resolveShell(width: number, override: ShellMode | null): ShellMode {
  return override ?? shellForWidth(width)
}
