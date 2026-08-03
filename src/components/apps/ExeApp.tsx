import { findActivity } from '../../data/activities'
import { UI_ICONS } from '../../data/icons'
import { STAT_META } from '../../data/statMeta'
import { AppIcon } from '../../icons/AppIcon'
import { useGameStore } from '../../store/gameStore'
import { canRun } from '../../systems/turn'
import { getBurnoutPenalty } from '../../systems/burnout'
import { getLivingCost, getWageMultiplier } from '../../systems/economy'
import { STAT_NAMES } from '../../types/game'
import type { Stats } from '../../types/game'
import './ExeApp.css'

/** 이 창에서만 쓰는 일회성 경고 글리프. 여러 경고 문구가 공유한다. */
const WARN_ICON = 'fluent-color:warning-24'

/** 스탯 라벨 한 줄(아이콘 + 이름). 효과 목록에서 재사용한다. */
function StatLabel({ statKey, note }: { statKey: keyof Stats; note?: string }) {
  const { icon } = STAT_META[statKey]
  return (
    <span className="exe-effect-label">
      <AppIcon name={icon} size={15} />
      {STAT_NAMES[statKey]}
      {note ? ` ${note}` : ''}
    </span>
  )
}

export function ExeApp({ activityId, onDone }: { activityId: string; onDone: () => void }) {
  const state = useGameStore((s) => s.state)
  const doActivity = useGameStore((s) => s.doActivity)

  const activity = findActivity(activityId)
  if (!activity || !state) return null

  const runnable = canRun(state, activity)
  const { efficiency, mentalPenalty } = getBurnoutPenalty(state.recentActivities, activity.id)
  const isBurnedOut = efficiency < 1

  /** 표시용 실제 변화량. 번아웃 효율과 알바비 배율을 반영한다. */
  const displayValue = (key: keyof Stats, raw: number): number => {
    let value = raw
    if (key === 'money' && value > 0 && activity.scalesWithWage) {
      value *= getWageMultiplier(state.day)
    }
    return Math.round(value > 0 ? value * efficiency : value)
  }

  const handleRun = () => {
    doActivity(activity)
    onDone()
  }

  return (
    <div>
      <p className="exe-desc">{activity.description}</p>

      <div className="exe-effects">
        {Object.entries(activity.effects).map(([key, raw]) => {
          const statKey = key as keyof Stats
          const value = displayValue(statKey, raw)
          return (
            <div key={key} className="exe-effect">
              <StatLabel statKey={statKey} />
              <span className={value >= 0 ? 'exe-plus' : 'exe-minus'}>
                {value >= 0 ? '+' : ''}
                {value.toLocaleString('ko-KR')}
              </span>
            </div>
          )
        })}
        {mentalPenalty > 0 && (
          <div className="exe-effect">
            <StatLabel statKey="mental" note="(연속 페널티)" />
            <span className="exe-minus">-{mentalPenalty}</span>
          </div>
        )}
      </div>

      {isBurnedOut && (
        <div className="exe-warn">
          <AppIcon name={WARN_ICON} size={15} className="exe-warn-icon" />
          <span>
            같은 일을 반복하고 있습니다. 효율이 {Math.round(efficiency * 100)}%로 떨어졌습니다.
          </span>
        </div>
      )}

      {!runnable && (
        <div className="exe-warn">
          <AppIcon name={WARN_ICON} size={15} className="exe-warn-icon" />
          <span>지금은 실행할 수 없습니다. 스탯이 부족합니다.</span>
        </div>
      )}

      {state.slot === 'afternoon' && (
        <div className="exe-warn">
          <AppIcon name={WARN_ICON} size={15} className="exe-warn-icon" />
          <span>
            이 행동을 하면 하루가 끝나고 잠자리에 듭니다. 생활비{' '}
            {getLivingCost(state.day).toLocaleString('ko-KR')}원이 차감됩니다. (행동력·멘탈은
            회복됩니다)
          </span>
        </div>
      )}

      <button className="exe-run" onClick={handleRun} disabled={!runnable}>
        실행하기
      </button>
      <div className="exe-cost">
        <AppIcon name={UI_ICONS.turnCost} size={13} />
        1턴을 소모합니다
      </div>
    </div>
  )
}
