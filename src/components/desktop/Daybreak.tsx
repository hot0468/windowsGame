import { useEffect, useRef, useState } from 'react'
import { formatGameDate, weekdayOf } from '../../data/calendar'
import { useGameStore } from '../../store/gameStore'
import { useResultOpen } from './shownTime'
import type { Slot } from '../../types/game'
import './Daybreak.css'

/**
 * 화면이 스스로 사라지기까지. 애니메이션(해가 다 뜨는 데 1.6초)보다 넉넉히 잡는다.
 *
 * ⚠️ **오후는 더 짧다.** 날이 바뀌는 것은 판이 한 칸 움직이는 사건이지만 오후로 접어드는
 * 것은 **같은 하루 안의 반환점**이라, 같은 길이를 주면 하루에 두 번 같은 무게의 화면이
 * 들어와 둘 다 성가셔진다.
 */
const SHOW_MS = { dawn: 2600, dusk: 1800 } as const

/** 지금 알리는 것이 무엇인가. `null`이면 아무것도 안 뜬다. */
type Phase = 'dawn' | 'dusk'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

/**
 * **시간이 넘어갔다는 알림.** 갈래가 둘이고 **한 컴포넌트가 둘 다 진다**:
 *   - `dawn` — 날짜가 바뀌었다. 해가 떠오른다.
 *   - `dusk` — 같은 날 **오전 → 오후**로 접어들었다. 해가 기운다.
 *
 * ⚠️ **둘을 다른 컴포넌트로 쪼개지 말 것**(2026-08-14에 오후 갈래를 여기에 붙였다).
 * 쪼개면 타이밍·자동 진행 제외·회복 중 제외·결과 창 대기·모션 감소 처리 다섯 가지를
 * 두 벌로 유지하게 되고, 무엇보다 **둘이 동시에 뜨는 조합**이 생긴다. 여기서는
 * 날짜가 바뀌었는지를 먼저 묻기 때문에 두 갈래가 구조적으로 배타다.
 *
 * ## 왜 필요한가
 * 이 게임에는 날짜 제한이 없고 하루가 슬롯 둘이라, **행동 한 번에 시간이 조용히
 * 넘어간다**. 날짜칸을 보고 있지 않으면 며칠이 지났는지, 지금이 오전인지 오후인지
 * 감각이 없어진다(설계자 지시 — 오후 갈래는 "오전에서 오후로 넘어가는 게 인식이 잘
 * 안 된다"는 신고에서 왔다). 토스트로는 부족하다 — 토스트는 "무슨 일이 있었나"를 알리는
 * 창구이고, 시간이 넘어가는 것은 **판이 한 칸 움직이는 사건**이라 화면이 한 번 덮여야
 * 몸으로 읽힌다.
 *
 * ## 지키는 것
 * ⚠️ **자동 진행 중에는 뜨지 않는다.** 자동 진행은 120ms마다 슬롯을 넘기므로 날마다
 * 띄우면 화면이 번쩍이기만 하고 아무것도 읽히지 않는다. 그 구간의 요약은 진행이 끝난 뒤
 * `AutoLogApp`이 통째로 맡는다(알림 창구를 두 개로 늘리지 않는다).
 *
 * ⚠️ **주저앉은 동안에는 뜨지 않는다.** 날은 밝지만 그 며칠은 플레이어가 아무것도
 * 고르지 않는 구간이라, 해 뜨는 연출이 매일 끼어들면 "넘기기만 하는 시간"이 더 길게
 * 느껴진다. 회복이 끝나는 날 아침부터 다시 뜬다.
 *
 * ⚠️ **아무것도 막지 않는다.** 스스로 사라지고, 누르면 즉시 닫히며, 뒤의 게임 상태는
 * 손대지 않는다(ux `escape-routes`·`no-blocking-animation`).
 *
 * ⚠️ **실행 연출이 끝날 때까지 기다린다.** 오후 행동은 날짜를 넘기는데, 그 행동이
 * 도구·알바·공부처럼 결과 창(`WindowKind: 'tool'`)을 여는 것이면 **결과를 읽기도 전에
 * 해가 떠 화면을 덮었다**(2026-08-09 설계자 신고). 날짜 변화는 `pending`에 적어 두고
 * 그 창이 닫힌 뒤에 띄운다 — 알림을 없애는 것이 아니라 **순서를 주는 것**이다.
 *
 * ⚠️ **`prefers-reduced-motion`을 존중한다** — 모션을 줄인 환경에서는 해가 움직이지 않고
 * 밝아진 화면만 뜬다(CSS가 처리한다).
 */
export function Daybreak() {
  const day = useGameStore((s) => s.state?.day)
  const slot = useGameStore((s) => s.state?.slot)
  const recovery = useGameStore((s) => s.state?.recovery)
  const autoRunning = useGameStore((s) => s.autoRunning)
  /* ⚠️ **판정은 `useResultOpen` 하나가 진다** — 화면이 적는 시각(`useShownTime`)도 같은
     것을 기다리므로, 여기에 조건을 따로 적으면 시계가 넘어가는 시점과 이 알림이 뜨는
     시점이 갈린다(팝업은 [확인]을 눌러야 넘어가는 창이라 그 위를 해가 덮으면 두 알림이
     한 화면에서 다툰다). */
  const runOpen = useResultOpen()

  /**
   * 마지막으로 알린 날. **ref인 이유는 ToastHost와 같다** — 이 값이 바뀐다고 다시 그릴
   * 필요가 없고, 상태로 두면 갱신 루프가 쉽다.
   * ⚠️ 초깃값이 `undefined`라 **첫 렌더에서는 안 뜬다**: 이어하기로 들어온 순간
   * "날이 밝았다"가 뜨면 거짓말이다(그 날은 이미 밝아 있었다).
   */
  const shown = useRef<number | undefined>(undefined)
  /**
   * 마지막으로 알린 슬롯. **`shown`과 따로 두는 것이 두 갈래를 배타로 만든다** —
   * 날이 바뀌면 슬롯도 함께 바뀌는데(오후 → 다음 날 오전), 날짜 변화를 먼저 처리하고
   * 이 값을 같이 갱신하므로 같은 전환에서 오후 알림이 뒤따라 뜨지 않는다.
   */
  const shownSlot = useRef<Slot | undefined>(undefined)
  /** 시간은 넘어갔는데 아직 못 띄운 알림. 결과 창이 닫히면 그때 뜬다. */
  const pending = useRef<Phase | null>(null)
  const [showing, setShowing] = useState<Phase | null>(null)

  /*
   * ⚠️ **효과를 둘로 쪼개지 않는다.** "날짜가 바뀌었다"와 "창이 닫혔다"는 서로 다른 시점에
   * 오지만, 뜨는 조건은 둘을 함께 봐야 한다 — 나누면 창이 처음부터 안 열린 경우
   * (잠자기·이동)에 두 번째 효과의 의존값이 안 바뀌어 알림이 영영 안 뜬다.
   */
  useEffect(() => {
    if (day === undefined || slot === undefined) return
    const first = shown.current === undefined
    if (shown.current !== day || shownSlot.current !== slot) {
      /* ⚠️ **날짜를 먼저 묻는다.** 날이 바뀌는 전환은 슬롯도 함께 바꾸므로(오후 → 오전),
         순서를 뒤집으면 한 전환에서 두 알림이 다 예약된다. */
      const next: Phase | null =
        shown.current !== day ? 'dawn' : slot === 'afternoon' ? 'dusk' : null
      shown.current = day
      shownSlot.current = slot
      // 첫 렌더·자동 진행·주저앉은 동안은 건너뛴다(위 주석의 세 규칙).
      if (!first && next && !autoRunning && !recovery) pending.current = next
    }
    // 결과 창이 떠 있으면 그것부터 읽게 두고 기다린다.
    const phase = pending.current
    if (!phase || runOpen) return
    pending.current = null
    setShowing(phase)
    const timer = setTimeout(() => setShowing(null), SHOW_MS[phase])
    return () => clearTimeout(timer)
  }, [day, slot, autoRunning, recovery, runOpen])

  if (!showing || day === undefined) return null

  /*
   * ⚠️ **두 갈래의 판형이 다르고 그것이 규칙이다**(2026-08-14 설계자 지시로 오후를
   * 전체 화면에서 이쪽으로 옮겼다). 날이 바뀌는 것은 판이 한 칸 움직이는 사건이라
   * 화면을 통째로 덮을 값이 있지만, 오후로 접어드는 것은 **같은 하루의 반환점**이라
   * 하루 걸러 한 번씩 전체 화면이 들어오면 연출이 아니라 통행세가 된다.
   * 그래서 오후는 **딤 + 작은 팝업**이고, 시계 하나가 왼쪽에서 오른쪽으로 건너간다.
   * ⚠️ **오후를 다시 전체 화면으로 만들지 말 것.**
   */
  if (showing === 'dusk') {
    return (
      <div className="db-slot" role="status" onClick={() => setShowing(null)}>
        <div className="db-slot-card">
          {/* 시계가 왼쪽 끝에서 오른쪽 끝으로 건너가며 바늘이 한 바퀴 돈다 —
              "시간이 앞으로 갔다"를 글자 없이 전하는 부분이라 `aria-hidden`이다
              (읽어야 할 것은 아래 두 줄이 이미 적는다). */}
          <div className="db-track" aria-hidden="true">
            <span className="db-clock">
              <span className="db-hand" />
            </span>
          </div>
          <p className="db-slot-title">오후가 되었습니다</p>
          <p className="db-slot-note">{day}일차 오후</p>
        </div>
      </div>
    )
  }

  return (
    /*
     * 누르면 바로 닫힌다. `role="status"`인 이유: 이것은 대답을 요구하는 대화상자가
     * 아니라 **지나가는 알림**이다 — `alertdialog`로 두면 스크린 리더가 초점을 뺏는다.
     */
    <div className="db" role="status" onClick={() => setShowing(null)}>
      <div className="db-sky" aria-hidden="true">
        <span className="db-sun" />
        <span className="db-land" />
      </div>
      <div className="db-text">
        <p className="db-day">{day}일차</p>
        <p className="db-date">
          {formatGameDate(day)} {WEEKDAYS[weekdayOf(day)]}요일
        </p>
        <p className="db-note">아침이 밝았습니다</p>
      </div>
    </div>
  )
}
