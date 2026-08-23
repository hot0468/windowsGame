import { useEffect, useState } from 'react'
import { BootScreen } from '../lockscreen/BootScreen'
import { useGameStore } from '../../store/gameStore'
import './CrashScreen.css'

/** 꺼진 화면이 머무는 시간. 짧게 — 벌은 잃은 하루이지 기다림이 아니다. */
const DEAD_MS = 1500

/**
 * **강제 종료 — 체력이 바닥났을 때 컴퓨터가 대신 쓰러진다**(2026-08-22 설계자 지시).
 *
 * 이 게임의 화면은 가짜 윈도우이므로, 사람이 쓰러지는 것을 **컴퓨터가 꺼졌다 켜지는 일**로
 * 옮긴다. 순서는 셋이다: 검은 화면(전원이 나감) → 부팅 → 하루가 지나 있음.
 *
 * ⚠️ **게임 상태를 한 톨도 안 만진다**(`BlueScreen`·`BootScreen`과 같은 자리) — 24시간을
 * 넘기는 것은 이 창이 뜨기 **전에** 스토어가 이미 끝냈다(`crashIfExhausted`). 여기서
 * 상태를 밀면 창을 닫는 방식에 따라 결과가 갈린다.
 *
 * ⚠️ **새 시각 언어를 만들지 않는다** — 부팅 화면(`BootScreen`)을 그대로 재사용하고,
 * 그 앞의 검은 화면만 이 파일이 진다. 강제 종료 전용 그래픽을 새로 그리면 켜지는 연출이
 * 두 벌이 된다.
 */
export function CrashScreen() {
  const crashing = useGameStore((s) => s.crashing)
  const clearCrash = useGameStore((s) => s.clearCrash)
  /** 'dead' = 꺼진 화면, 'boot' = 다시 켜지는 중. */
  const [phase, setPhase] = useState<'dead' | 'boot'>('dead')

  useEffect(() => {
    if (!crashing) {
      setPhase('dead')
      return
    }
    const id = setTimeout(() => setPhase('boot'), DEAD_MS)
    return () => clearTimeout(id)
  }, [crashing])

  if (!crashing) return null
  if (phase === 'boot') return <BootScreen onDone={clearCrash} />

  return (
    <div className="crash" role="alertdialog" aria-live="assertive" aria-label="전원 꺼짐">
      <p className="crash-line">전원이 꺼졌습니다</p>
      <p className="crash-sub">체력이 바닥났습니다 · 하루가 지나갑니다</p>
    </div>
  )
}
