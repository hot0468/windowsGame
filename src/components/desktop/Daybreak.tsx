import { useEffect, useRef, useState } from 'react'
import { formatGameDate, weekdayOf } from '../../data/calendar'
import { useGameStore } from '../../store/gameStore'
import { useWindowStore } from '../../store/windowStore'
import './Daybreak.css'

/** 화면이 스스로 사라지기까지. 애니메이션(해가 다 뜨는 데 1.6초)보다 넉넉히 잡는다. */
const SHOW_MS = 2600

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

/**
 * **날이 밝았다는 알림.** 날짜가 바뀌면 해가 떠오르는 화면이 잠깐 덮었다가 사라진다.
 *
 * ## 왜 필요한가
 * 이 게임에는 날짜 제한이 없고 하루가 슬롯 둘이라, **오후 행동 한 번에 날짜가 조용히
 * 넘어간다**. 날짜칸을 보고 있지 않으면 며칠이 지났는지 감각이 없어진다(설계자 지시).
 * 토스트로는 부족하다 — 토스트는 "무슨 일이 있었나"를 알리는 창구이고, 날이 바뀌는 것은
 * **판 전체가 한 칸 움직이는 사건**이라 화면이 한 번 덮여야 몸으로 읽힌다.
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
  const recovery = useGameStore((s) => s.state?.recovery)
  const autoRunning = useGameStore((s) => s.autoRunning)
  /* ⚠️ **창 종류로 본다**(창 id가 아니라) — 실행 연출은 활동마다 id가 다르고, 앞으로
     장면이 붙는 활동이 늘어도 이 줄은 그대로여야 한다. */
  /* ⚠️ **기다리는 대상이 둘이다**: 실행 연출(`kind: 'tool'`)과 **시스템 팝업 전부**
     (`popup` — 등급 상승 알림이 그쪽이다). 팝업은 [확인]을 눌러야 넘어가는 창이라
     그 위를 해가 덮으면 두 알림이 한 화면에서 다툰다. */
  const runOpen = useWindowStore((s) =>
    s.windows.some((w) => !w.minimized && (w.kind === 'tool' || w.popup)),
  )

  /**
   * 마지막으로 알린 날. **ref인 이유는 ToastHost와 같다** — 이 값이 바뀐다고 다시 그릴
   * 필요가 없고, 상태로 두면 갱신 루프가 쉽다.
   * ⚠️ 초깃값이 `undefined`라 **첫 렌더에서는 안 뜬다**: 이어하기로 들어온 순간
   * "날이 밝았다"가 뜨면 거짓말이다(그 날은 이미 밝아 있었다).
   */
  const shown = useRef<number | undefined>(undefined)
  /** 날은 밝았는데 아직 못 띄운 상태. 결과 창이 닫히면 그때 뜬다. */
  const pending = useRef(false)
  const [visible, setVisible] = useState(false)

  /*
   * ⚠️ **효과를 둘로 쪼개지 않는다.** "날짜가 바뀌었다"와 "창이 닫혔다"는 서로 다른 시점에
   * 오지만, 뜨는 조건은 둘을 함께 봐야 한다 — 나누면 창이 처음부터 안 열린 경우
   * (잠자기·이동)에 두 번째 효과의 의존값이 안 바뀌어 알림이 영영 안 뜬다.
   */
  useEffect(() => {
    if (day === undefined) return
    if (shown.current !== day) {
      const first = shown.current === undefined
      shown.current = day
      // 첫 렌더·자동 진행·주저앉은 동안은 건너뛴다(위 주석의 세 규칙).
      if (!first && !autoRunning && !recovery) pending.current = true
    }
    // 결과 창이 떠 있으면 그것부터 읽게 두고 기다린다.
    if (!pending.current || runOpen) return
    pending.current = false
    setVisible(true)
    const timer = setTimeout(() => setVisible(false), SHOW_MS)
    return () => clearTimeout(timer)
  }, [day, autoRunning, recovery, runOpen])

  if (!visible || day === undefined) return null

  return (
    /*
     * 누르면 바로 닫힌다. `role="status"`인 이유: 이것은 대답을 요구하는 대화상자가
     * 아니라 **지나가는 알림**이다 — `alertdialog`로 두면 스크린 리더가 초점을 뺏는다.
     */
    <div className="db" role="status" onClick={() => setVisible(false)}>
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
