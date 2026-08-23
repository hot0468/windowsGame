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
  const { rows, mentalPenalty, isBurnedOut } = previewActivity(state, activity)

  /**
   * ⚠️ **장면이 있는 활동은 이 창을 닫고 자기 창을 연다**(설계자 지시). 도구 앱이
   * 먼저였고 **2026-08-08에 알바 4종이 같은 길에 붙었다** — "누르자마자 끝"이 아니라
   * 일하는 동안이 보여야 1턴의 무게가 읽힌다. 장면이 없는 활동은 예전대로 곧바로 끝난다
   * (`runSceneOf`가 `undefined`를 돌려준다).
   * ⚠️ 창을 여는 것이 `doActivity`보다 **먼저**다: 결과 화면이 견줄 것은 실행 직전의 상태다.
   */
  const handleRun = () => {
    openToolWindow(state, activity)
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
            같은 일을 반복하고 있습니다. 멘탈이 {mentalPenalty} 더 깎입니다.
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
