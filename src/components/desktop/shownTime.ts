import { useEffect, useState } from 'react'
import { useGameStore } from '../../store/gameStore'
import { useWindowStore } from '../../store/windowStore'
import type { Slot } from '../../types/game'

/**
 * **아직 읽지 않은 결과 창이 떠 있는가.**
 *
 * 기다리는 대상이 둘이다: 실행 연출(`kind: 'tool'`)과 **시스템 팝업 전부**(`popup` —
 * 등급 상승 알림이 그쪽이다). 최소화한 창은 치운 것이므로 세지 않는다.
 *
 * ⚠️ **`Daybreak`와 아래 `useShownTime`이 이 하나를 함께 본다.** 각자 적으면 시계가
 * 넘어가는 시점과 알림이 뜨는 시점이 갈려 "팝업이 뜰 때 시간이 바뀐다"가 거짓이 된다.
 */
export function useResultOpen(): boolean {
  return useWindowStore((s) =>
    s.windows.some((w) => !w.minimized && (w.kind === 'tool' || w.popup)),
  )
}

/**
 * **화면이 적는 시각.** 결과 창이 떠 있는 동안에는 행동하기 전 값에 머문다.
 *
 * ## 왜 게임 상태가 아니라 화면만 미루나
 * 턴·스탯은 창이 열리기 **전에** 확정된다(`data/runScenes.ts`의 "연출이지 규칙이 아니다") —
 * 그래야 창을 닫든 [건너뛰기]를 누르든 결과가 같고, 애니메이션이 게임을 잡고 있는 동안
 * "닫아서 이득 보는" 자리가 생기지 않는다. 그 규칙을 뒤집는 대신 **적는 값만** 미룬다.
 * ⚠️ 2026-08-22에 **시간 전환 팝업(`Daybreak`)이 없어졌다**(설계자 지시) — 그래도 이 지연은
 * 남는다. 결과 창이 떠 있는 동안 작업 표시줄 시계만 먼저 넘어가면, 창이 말하는 "방금 한 일"과
 * 화면이 말하는 시각이 어긋난다.
 *
 * ⚠️ **`lagging`을 받아 턴을 미는 버튼을 막는다.** 화면이 아직 오전이라고 적고 있는데
 * [오전 건너뛰기]가 실제로는 오후를 태우면, **이미 써 버린 슬롯의 이름으로 남은 슬롯을
 * 빼앗는** 셈이다. 결과 창을 닫으면 그 자리에서 풀리므로 갇히지 않는다.
 */
export function useShownTime(): {
  day?: number
  minute?: number
  slot?: Slot
  lagging: boolean
} {
  const day = useGameStore((s) => s.state?.day)
  const minute = useGameStore((s) => s.state?.minute)
  const slot = useGameStore((s) => s.state?.slot)
  const held = useResultOpen()
  const [shown, setShown] = useState<{ day?: number; minute?: number; slot?: Slot }>({
    day,
    minute,
    slot,
  })

  useEffect(() => {
    if (held) return
    /* 같은 값이면 새 객체를 만들지 않는다 — 참조가 흔들리면 이걸 읽는 화면이 매 렌더 다시 그린다. */
    setShown((prev) =>
      prev.day === day && prev.minute === minute && prev.slot === slot
        ? prev
        : { day, minute, slot },
    )
  }, [day, minute, slot, held])

  /* ⚠️ **첫 값은 미루지 않는다.** 판이 열리기 전 렌더에서는 미룰 '전 값'이 없어서,
     그대로 두면 잠금화면을 지나 판이 서는 한 프레임 동안 날짜가 비고 오후로 읽힌다. */
  const settled = shown.day === undefined ? { day, minute, slot } : shown
  return { ...settled, lagging: settled.day !== day || settled.minute !== minute }
}
