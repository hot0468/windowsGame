import { useEffect } from 'react'
import { AppIcon } from '../../icons/AppIcon'
import { UI_ICONS } from '../../data/icons'
import './BootScreen.css'

/** 화면이 스스로 비키기까지. **짧게**(설계자 지시) — 로고를 읽고 한 박자 두면 끝이다. */
const BOOT_MS = 1600

/**
 * 점 다섯의 궤도 위 각도(도). 30도씩, 120도 호에 몰아 둔다 — 꼬리처럼 읽히라고.
 *
 * ⚠️ **시차(`animation-delay`)가 아니라 각도다.** 처음에는 같은 애니메이션에 음수 시차를
 * 주는 방식이었는데, 시차가 고르면 **각도는 고르지 않다**: 가감속 곡선의 시작 구간이
 * 거의 평평해서 다섯 점이 전부 0도 근처에 겹쳤고 실측 스크린샷에 **점이 하나** 찍혔다.
 * 각도를 직접 박으면 도는 속도와 무관하게 고리 모양이 보장된다.
 *
 * ⚠️ **360도를 균등분할하지 말 것**(72도씩). 회전 대칭이라 돌아도 안 도는 것처럼 보인다.
 */
const BOOT_DOTS = [0, 30, 60, 90, 120]

/**
 * **부팅 화면.** 판이 서기 전, 잠금화면보다도 먼저 한 번 지나간다.
 *
 * ## 왜 있나
 * 이 게임의 UI 전체가 가짜 윈도우 OS라는 것이 첫인상에서 정해지는데, 여태 첫 화면이
 * 곧바로 잠금화면이었다 — 컴퓨터를 **켜는** 순간이 없었다. 켜지는 것을 보고 나면
 * 그 뒤의 잠금화면이 연출이 아니라 순서로 읽힌다.
 *
 * ⚠️ **게임 상태를 한 톨도 안 만진다**(`BlueScreen`과 같은 자리). 세이브를 읽지도,
 * 턴을 밀지도 않는다 — 순수하게 화면 하나다. 그래서 밸런스·테스트와 무관하다.
 *
 * ⚠️ **아무것도 막지 않는다.** 스스로 사라지고, 누르거나 아무 키나 치면 즉시 건너뛴다
 * (ux `escape-routes`). 새로 고칠 때마다 1.6초를 강제로 뺏으면 개발 중에도 플레이 중에도
 * 성가시기만 하다.
 *
 * ⚠️ **`--reduced`에서는 회전이 멈춘다**(CSS). 정지한 고리만 남는데, 그래도 "무언가
 * 준비 중"으로 읽히므로 대체 표시를 따로 두지 않는다.
 */
export function BootScreen({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, BOOT_MS)
    /* 아무 키나 건너뛰기. 포커스 잡을 것이 없는 화면이라 창에 직접 건다. */
    const skip = () => onDone()
    window.addEventListener('keydown', skip)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('keydown', skip)
    }
  }, [onDone])

  return (
    <div className="boot" onClick={onDone} role="presentation">
      <AppIcon name={UI_ICONS.boot} size={120} />
      {/* 점 다섯이 도는 고리. **실제 부팅 화면에는 글자가 없어서** 여기도 없다 —
          "시작하는 중"은 눈에 안 보이는 자리로 내리고 화면 낭독기만 받는다. */}
      <div className="boot-dots" aria-hidden="true">
        {BOOT_DOTS.map((deg) => (
          <span key={deg} style={{ transform: `rotate(${deg}deg)` }} />
        ))}
      </div>
      <p className="boot-sr-only" role="status">
        시작하는 중
      </p>
    </div>
  )
}
