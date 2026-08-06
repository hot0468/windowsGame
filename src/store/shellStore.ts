import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** 화면 셸의 종류. 데스크톱 = 가짜 윈도우, 모바일 = 휴대폰 UI. */
export type ShellMode = 'desktop' | 'mobile'

/**
 * 셸 수동 전환.
 *
 * `null`이면 **화면 폭이 정한다**(자동). 값이 있으면 폭을 이긴다 —
 * 좁은 창에서도 바탕화면을 보고 싶은 사람과, 넓은 화면에서 폰 UI를 시험하는 사람
 * 양쪽이 필요하다(설계자 지시: 폭 기준 판정 + 수동 토글).
 *
 * ⚠️ **`gameStore`에 넣지 않는다** — `reset()`이 비워 새 판마다 셸이 튄다.
 * 어느 셸로 보느냐는 판이 아니라 **기기와 사람의 취향**이다
 * (`desktopIconStore`·`browserStore`와 같은 판단).
 *
 * ⚠️ persist이므로 폰 모드로 바꾼 뒤 새로 고쳐도 유지된다. 되돌리는 길은
 * 모바일 하단바와 데스크톱 시작 메뉴 **양쪽에** 있어야 한다 — 한쪽에만 두면
 * 그 셸로 넘어간 순간 돌아올 수 없다.
 */
interface ShellStore {
  /** null = 자동(폭 판정). 값이 있으면 폭을 무시하고 그 셸을 쓴다. */
  override: ShellMode | null
  /** 수동 지정. 같은 값을 다시 넣어도 그대로 유지된다(멱등). */
  setOverride: (mode: ShellMode) => void
  /** 자동(폭 판정)으로 되돌린다. */
  clearOverride: () => void
}

export const useShellStore = create<ShellStore>()(
  persist(
    (set) => ({
      override: null,
      setOverride: (mode) => set({ override: mode }),
      clearOverride: () => set({ override: null }),
    }),
    { name: 'windows-game-shell' },
  ),
)
