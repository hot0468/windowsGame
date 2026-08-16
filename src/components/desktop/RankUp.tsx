import { useEffect, useRef, useState } from 'react'
import { AppIcon } from '../../icons/AppIcon'
import { useGameStore } from '../../store/gameStore'
import { useWindowStore } from '../../store/windowStore'
import { useSceneStore } from '../../store/sceneStore'
import { rankUps } from '../../systems/rank'
import { STAT_META } from '../../data/statMeta'
import { STAT_NAMES } from '../../types/game'
import type { RankUp as RankUpItem } from '../../systems/rank'
import type { Stats } from '../../types/game'
import './RankUp.css'

/**
 * 화면이 스스로 사라지기까지.
 *
 * ⚠️ **날 밝음(2600ms)보다 짧다.** 오후 행동 하나가 둘을 함께 부르므로 그대로 두면
 * 한 번 행동하고 5.2초를 기다리게 된다. 이쪽은 장면 전환이 아니라 **뱃지가 뒤집히는
 * 순간**이라 짧아도 뜻이 다 전해진다.
 */
const SHOW_MS = 2200

/**
 * **등급이 올랐다는 알림.** 성장 스탯의 등급이 오르면 화면이 잠깐 덮이고
 * "지식 C → B"가 뜬다.
 *
 * ## 왜 필요한가
 * 랭크는 2026-08-05부터 있었지만 **오르는 순간이 게임 어디에도 없었다** — 스탯창의
 * 글자 하나가 조용히 바뀔 뿐이라, 마흔 번 공부해서 등급을 올린 사람과 오늘 처음 책을 편
 * 사람의 화면이 똑같았다. 등급은 이 게임에서 **쌓아 올린 것의 유일한 척도**인데
 * (`systems/rank.ts`) 그 척도가 움직이는 것을 아무도 못 봤다.
 *
 * ## 판정을 여기서 하는 이유
 * ⚠️ **스토어가 아니라 화면이 전후를 비교한다.** 스탯을 올리는 통로는 활동 넷만이 아니다 —
 * 밤 정산의 랭크 이벤트·목돈 청구·웹툰 마감이 전부 스탯을 건드리고, 그 호출부는 스무 곳이
 * 넘는다. 여기서 `state.stats`의 변화를 보면 **어느 통로로 올랐든 한 자리에서** 잡힌다
 * (`afterTurn`에 `before`를 실어 나르려면 호출부마다 고쳐야 하고, 그러면 새 통로가 생길 때
 * 하나씩 빠뜨린다 — `afterTurn` 첫 주석이 경고하는 바로 그 함정이다).
 *
 * ## 지키는 것
 * ⚠️ **자동 진행 중에는 뜨지 않는다.** 120ms마다 슬롯이 넘어가는 구간에서 띄우면
 * 연출이 아니라 통행세다. 그 구간의 요약은 `AutoLogApp`이 통째로 맡는다
 * (`Daybreak`와 같은 규칙·같은 이유).
 *
 * ⚠️ **첫 렌더에서는 뜨지 않는다.** 이어하기로 들어온 순간의 등급은 **이미 올라 있던 것**이라
 * 축하하면 거짓말이 된다 — 첫 렌더는 비교 기준만 잡고 지나간다.
 *
 * ⚠️ **게임오버면 뜨지 않는다.** 파산한 밤에도 등급은 오를 수 있지만, 그때 먼저 읽혀야
 * 하는 것은 엔딩이다.
 *
 * ⚠️ **실행 결과 창이 닫힐 때까지 기다린다.** 승급을 만든 것이 바로 그 창이 보여 주는
 * 행동이라, 결과를 읽기도 전에 덮으면 인과가 거꾸로 보인다(`Daybreak`와 같은 장치).
 *
 * ⚠️ **한 턴에 여럿이 올라도 화면은 하나다.** 스탯마다 띄우면 랭크 이벤트가 여럿을 함께
 * 올린 밤에 같은 연출이 네 번 반복된다.
 *
 * ⚠️ **아무것도 막지 않는다.** 스스로 사라지고, 누르면 즉시 닫히며, 게임 상태를 읽기만
 * 한다(ux `escape-routes`·`no-blocking-animation`·`interruptible`).
 */
export function RankUp() {
  const stats = useGameStore((s) => s.state?.stats)
  const gameOver = useGameStore((s) => s.state?.gameOver)
  const autoRunning = useGameStore((s) => s.autoRunning)
  /* 창 종류로 본다(창 id가 아니라) — 장면이 붙는 활동이 늘어도 이 줄은 그대로여야 한다. */
  const runOpen = useWindowStore((s) => s.windows.some((w) => w.kind === 'tool' && !w.minimized))
  const scene = useSceneStore((s) => s.scene)
  const openScene = useSceneStore((s) => s.openScene)
  const closeScene = useSceneStore((s) => s.closeScene)

  /**
   * 마지막으로 견준 스탯. **ref인 이유는 `Daybreak`의 `shown`과 같다** — 이 값이 바뀐다고
   * 다시 그릴 필요가 없고, 상태로 두면 갱신 루프가 쉽다.
   */
  const seen = useRef<Stats | undefined>(undefined)
  /** 올랐는데 아직 못 띄운 것들. 결과 창이 닫히면 그때 뜬다. */
  const pending = useRef<RankUpItem[]>([])
  const [shown, setShown] = useState<RankUpItem[]>([])

  /*
   * ⚠️ **뜨는 조건을 쪼개지 않는다**(`Daybreak`와 같은 이유): "등급이 올랐다"·"창이 닫혔다"·
   * "앞 장면이 끝났다"는 서로 다른 시점에 오지만, 하나라도 따로 보면 나머지가 안 바뀌는
   * 경우에 알림이 영영 안 뜬다. **머무는 시간만 아래에서 따로 잰다**(그 이유는 거기 적었다).
   */
  useEffect(() => {
    if (!stats) return
    const before = seen.current
    seen.current = stats
    if (before) {
      const ups = rankUps(before, stats)
      // 첫 렌더·자동 진행·게임오버는 기준만 갱신하고 지나간다(위 주석의 세 규칙).
      if (ups.length && !autoRunning && !gameOver) {
        /* ⚠️ **키로 합친다.** 결과 창이 떠 있는 동안 또 오르면(같은 스탯이 두 칸) 줄이
           둘이 되는데, 화면은 "어디서 어디로"만 말하면 된다 — **처음 자리에서 마지막
           자리로** 한 줄로 적는다. */
        const merged = [...pending.current]
        for (const up of ups) {
          const at = merged.findIndex((m) => m.key === up.key)
          if (at === -1) merged.push(up)
          else merged[at] = { ...merged[at], to: up.to }
        }
        pending.current = merged
      }
    }
    /* 결과 창이 떠 있거나 다른 장면이 도는 중이면 그것부터 읽게 두고 기다린다.
       ⚠️ 여기서 기다린 것은 버려지지 않는다 — 앞 장면이 닫혀 `scene`이 비면 이 효과가
       다시 돌아 그때 뜬다(그래서 `scene`이 의존값이다). */
    if (!pending.current.length || runOpen || scene !== null) return
    const ups = pending.current
    pending.current = []
    openScene('rankup')
    setShown(ups)
  }, [stats, autoRunning, gameOver, runOpen, scene, openScene])

  /*
   * 스스로 사라지는 타이머.
   * ⚠️ **위 효과 안에 두지 않는다.** 저 효과는 `scene`을 의존값으로 갖는데 자기가 그 값을
   * 바꾸므로(`openScene`), 타이머를 거기 두면 **연 직후 정리 함수가 돌아 타이머가 취소되고
   * 화면이 영영 안 닫힌다.** 뜨는 조건과 머무는 시간은 서로 다른 물음이라 자리도 갈린다.
   */
  useEffect(() => {
    if (!shown.length) return
    const timer = setTimeout(() => {
      setShown([])
      closeScene('rankup')
    }, SHOW_MS)
    return () => clearTimeout(timer)
  }, [shown, closeScene])

  /* 언마운트될 때 자리를 비운다 — 안 비우면 잠금화면으로 나갔다 온 판에서 날 밝음이 영영 막힌다. */
  useEffect(() => () => closeScene('rankup'), [closeScene])

  if (!shown.length) return null

  const dismiss = () => {
    setShown([])
    closeScene('rankup')
  }

  return (
    /*
     * 누르면 바로 닫힌다. `role="status"`인 이유는 `Daybreak`와 같다 — 대답을 요구하는
     * 대화상자가 아니라 **지나가는 알림**이라, `alertdialog`로 두면 초점을 뺏는다.
     */
    <div className="ru" role="status" onClick={dismiss}>
      <div className="ru-rays" aria-hidden="true" />
      <div className="ru-card">
        <p className="ru-kicker">등급이 올랐습니다</p>
        <ul className="ru-list">
          {shown.map((up) => (
            <li
              className="ru-item"
              key={up.key}
              /* 화살표는 그림이라 읽어 주지 않는다 — 줄 전체를 한 문장으로 대신 읽힌다. */
              aria-label={`${STAT_NAMES[up.key]} ${up.from}에서 ${up.to}로`}
            >
              {/* 단색 세트라 색을 입혀도 된다(다색 아이콘에는 금지). */}
              <AppIcon name={STAT_META[up.key].hudIcon} size={20} className="ru-icon" />
              <span className="ru-name">{STAT_NAMES[up.key]}</span>
              <span className="ru-from" aria-hidden="true">
                {up.from}
              </span>
              <span className="ru-arrow" aria-hidden="true">
                →
              </span>
              <span className="ru-to" aria-hidden="true">
                {up.to}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
