import { findActivity } from '../../data/activities'
import { UI_ICONS } from '../../data/icons'
import { STAT_META } from '../../data/statMeta'
import { AppIcon } from '../../icons/AppIcon'
import { useGameStore } from '../../store/gameStore'
import { canRun } from '../../systems/turn'
import { getLivingCost } from '../../systems/economy'
import { STAT_NAMES } from '../../types/game'
import type { Stats } from '../../types/game'
import { previewActivity } from './activityPreview'
import { openToolWindow } from './ToolRun'
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
  // 증감 계산은 브라우저 사이트의 확정 패널과 **같은 함수**를 쓴다(activityPreview 주석 참조).
  const { rows, efficiency, mentalPenalty, isBurnedOut } = previewActivity(state, activity)

  /**
   * ⚠️ **도구 앱은 이 창을 닫고 자기 창을 연다**(설계자 지시). 나머지 활동은 실행이 곧
   * 끝이지만, 도구는 "프로그램이 돌아가는 것"까지가 실행이다 — 그리고 그 프로그램은
   * 이 팝업의 일부가 아니라 **단독 창**이어야 한다(`ToolRun` 주석 참조).
   * ⚠️ 창을 여는 것이 `doActivity`보다 **먼저**다: 결과 화면이 견줄 것은 실행 직전의 상태다.
   */
  const handleRun = () => {
    if (activity.toolId) openToolWindow(state, activity)
    doActivity(activity)
    onDone()
  }

  return (
    <div>
      <p className="exe-desc">{activity.description}</p>

      <div className="exe-effects">
        {rows.map(({ key, value }) => (
          <div key={key} className="exe-effect">
            <StatLabel statKey={key} />
            <span className={value >= 0 ? 'exe-plus' : 'exe-minus'}>
              {value >= 0 ? '+' : ''}
              {value.toLocaleString('ko-KR')}
            </span>
          </div>
        ))}
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
            {getLivingCost(state).toLocaleString('ko-KR')}원이 차감됩니다. (행동력·멘탈은
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
