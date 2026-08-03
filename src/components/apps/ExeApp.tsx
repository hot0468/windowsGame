import { findActivity } from '../../data/activities'
import { useGameStore } from '../../store/gameStore'
import { canRun } from '../../systems/turn'
import { getBurnoutPenalty } from '../../systems/burnout'
import { getLivingCost, getWageMultiplier } from '../../systems/economy'
import type { Stats } from '../../types/game'
import './ExeApp.css'

const STAT_LABELS: Record<keyof Stats, string> = {
  stamina: '💪 체력',
  maxStamina: '💪 최대 체력',
  intelligence: '🧠 지능',
  charm: '✨ 매력',
  mental: '😊 멘탈',
  money: '💰 소지금',
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
              <span>{STAT_LABELS[statKey]}</span>
              <span className={value >= 0 ? 'exe-plus' : 'exe-minus'}>
                {value >= 0 ? '+' : ''}
                {value.toLocaleString('ko-KR')}
              </span>
            </div>
          )
        })}
        {mentalPenalty > 0 && (
          <div className="exe-effect">
            <span>😊 멘탈 (연속 페널티)</span>
            <span className="exe-minus">-{mentalPenalty}</span>
          </div>
        )}
      </div>

      {isBurnedOut && (
        <div className="exe-warn">
          같은 일을 반복하고 있습니다. 효율이 {Math.round(efficiency * 100)}%로 떨어졌습니다.
        </div>
      )}

      {!runnable && <div className="exe-warn">지금은 실행할 수 없습니다. 스탯이 부족합니다.</div>}

      {state.slot === 'afternoon' && (
        <div className="exe-warn">
          이 행동을 하면 하루가 끝나고 잠자리에 듭니다. 생활비{' '}
          {getLivingCost(state.day).toLocaleString('ko-KR')}원이 차감됩니다. (체력·멘탈은 회복됩니다)
        </div>
      )}

      <button className="exe-run" onClick={handleRun} disabled={!runnable}>
        실행하기
      </button>
      <div className="exe-cost">⚠️ 1턴을 소모합니다</div>
    </div>
  )
}
