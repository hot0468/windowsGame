import { useEffect, useRef, useState } from 'react'
import { findActivity } from '../../data/activities'
import { EFFICIENCY_FLOOR, getBurnoutPenalty } from '../../systems/burnout'
import { useGameStore } from '../../store/gameStore'
import './BlueScreen.css'

/** 화면이 스스로 사라지기까지. */
const SHOW_MS = 3000

/**
 * **블루스크린 — 번아웃의 얼굴.**
 *
 * ## 왜 필요한가
 * 번아웃은 이미 있는 규칙이다(같은 활동을 이어서 하면 효율이 떨어지고 멘탈이 더 깎인다).
 * 문제는 그 값이 **작업 관리자를 열어야만 보인다**는 것이었다 — 판에서 가장 아픈 벌인데
 * 화면에 아무 일도 안 일어난다. 이 화면은 **새 규칙이 아니라 이미 있는 수치의 표현**이고,
 * 그것을 이 가짜 OS의 언어로 말한다.
 *
 * ⚠️ **게임 상태를 한 톨도 안 바꾼다.** 효율도 멘탈도 창이 뜨기 전에 이미 정산됐다
 * (`ToolRun`이 연출이지 규칙이 아닌 것과 같은 자리). 그래서 밸런스·엔딩·테스트와 무관하다.
 *
 * ## 언제 뜨는가
 * **효율이 하한에 닿은 순간 딱 한 번.** 임계를 여기서 다시 적지 않고
 * `efficiency <= EFFICIENCY_FLOOR` 한 줄로 묻는다 — 연속 횟수를 적어 두면
 * `EFFICIENCY_STEP`을 손볼 때 이 화면만 낡는다.
 *
 * ⚠️ **자동 진행 중에는 뜨지 않는다**(`Daybreak`와 같은 규칙): 120ms마다 슬롯이 넘어가는
 * 구간에서 화면을 덮으면 번쩍이기만 하고 아무것도 안 읽힌다.
 *
 * ⚠️ **결과 창(`ToolRun`)을 기다리지 않는다.** 기다리게 만들면 결과 창이 닫히는 바로 그
 * 순간에 뜨는데, `Daybreak`도 같은 시점을 기다리고 있어 오후 행동마다 둘이 한 화면에서
 * 다툰다. 곧바로 덮었다가 3초 뒤 비키면 결과는 그대로 뒤에 남아 있다 — 잃는 것이 없다.
 *
 * ⚠️ **아무것도 막지 않는다.** 스스로 사라지고 누르면 즉시 닫힌다(ux `escape-routes`).
 */
export function BlueScreen() {
  /* 셀렉터는 **원본 배열 참조**를 고른다 — 활동을 실행할 때마다 `runActivity`가 새 배열을
     돌려주므로 참조가 곧 "방금 뭔가 했다"는 신호다(길이는 8에서 멈춰 신호가 못 된다). */
  const recent = useGameStore((s) => s.state?.recentActivities)
  const autoRunning = useGameStore((s) => s.autoRunning)

  /** 이미 알린 이력. **ref인 이유는 `Daybreak`와 같다** — 바뀐다고 다시 그릴 필요가 없다. */
  const shown = useRef<string[] | undefined>(undefined)
  const [failed, setFailed] = useState<string | null>(null)

  useEffect(() => {
    if (!recent) return
    const first = shown.current === undefined
    if (shown.current === recent) return
    shown.current = recent
    /* 첫 렌더는 건너뛴다 — 이어하기로 들어온 순간 화면이 뻗으면 거짓말이다
       (그 번아웃은 이미 지난 판의 것이다). */
    if (first || autoRunning) return

    const id = recent[recent.length - 1]
    if (!id) return
    if (getBurnoutPenalty(recent, id).efficiency > EFFICIENCY_FLOOR) return
    setFailed(id)
    const timer = setTimeout(() => setFailed(null), SHOW_MS)
    return () => clearTimeout(timer)
  }, [recent, autoRunning])

  if (!failed) return null

  /* 번아웃 키는 활동 id가 아닐 수도 있다(`burnoutKey`로 여러 활동이 한 키를 나눠 쓴다).
     이름을 못 찾으면 키를 그대로 적는다 — 실제 중지 코드도 그런 문자열이다. */
  const label = findActivity(failed)?.label ?? failed

  return (
    /* `role="status"`인 이유는 `Daybreak`와 같다: 대답을 요구하는 대화상자가 아니라
       지나가는 알림이다. `alertdialog`로 두면 스크린 리더가 초점을 뺏는다. */
    <div className="bs" role="status" onClick={() => setFailed(null)}>
      <div className="bs-body">
        <p className="bs-face" aria-hidden="true">
          :(
        </p>
        <p className="bs-lead">
          당신에게 문제가 발생하여 잠시 멈춥니다. 몇 가지 정보를 수집한 뒤 다시 시작하겠습니다.
        </p>
        <p className="bs-progress">100% 완료</p>
        <dl className="bs-codes">
          <dt>중지 코드</dt>
          <dd>BURNOUT_THRESHOLD_EXCEEDED</dd>
          <dt>실패한 작업</dt>
          <dd>{label}</dd>
        </dl>
      </div>
    </div>
  )
}
