import { MOBILE_ICONS } from '../../data/icons'
import { formatGameDate } from '../../data/calendar'
import { AppIcon } from '../../icons/AppIcon'
import { useGameStore } from '../../store/gameStore'
import { useShownTime } from '../desktop/shownTime'

/**
 * 상단 상태바 — 폰의 시계·배터리 자리에 **게임의 시계**가 앉는다.
 *
 * ⚠️ 데스크톱의 날짜칸·스탯창이 모바일에는 없으므로, **날짜·소지금·행동력을 볼 길이
 * 여기밖에 없다.** 요약만 얹고 전체는 탭해서 시트로 연다(설계 제약 H).
 *
 * ⚠️ **`HudPanel`을 재사용하지 않는다** — 좌표 기반이고 밝은 아크릴이라
 * 어두운 유리 위에서 성립하지 않는다. 재사용하는 것은 **데이터**뿐이다.
 *
 * 전체가 하나의 버튼이다(탭 대상이 크면 클수록 좋다, ux `touch-target-size`).
 */
export function MobileStatusBar({ onOpenStats }: { onOpenStats: () => void }) {
  const state = useGameStore((s) => s.state)
  /* 시계는 데스크톱 날짜칸과 **같은 규칙**으로 미룬다(사유는 `desktop/shownTime.ts`). */
  const shown = useShownTime()
  if (!state) return null

  const { stats } = state
  const day = shown.day ?? state.day
  const slot = shown.slot ?? state.slot

  return (
    <button type="button" className="mo-status" onClick={onOpenStats}>
      <span className="mo-status-date">
        {formatGameDate(day)}
        <span className="mo-status-slot">{slot === 'morning' ? '오전' : '오후'}</span>
      </span>
      <span className="mo-status-metrics">
        <span className="mo-status-metric">
          <AppIcon name={MOBILE_ICONS.stamina} size={14} />
          {stats.stamina}
          <span className="mo-sr-only"> 행동력</span>
        </span>
        <span className="mo-status-metric">
          <AppIcon name={MOBILE_ICONS.money} size={14} />
          {stats.money.toLocaleString('ko-KR')}
          <span className="mo-sr-only"> 원</span>
        </span>
      </span>
    </button>
  )
}
