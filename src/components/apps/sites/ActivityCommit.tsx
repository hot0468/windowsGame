import { UI_ICONS } from '../../../data/icons'
import { STAT_META } from '../../../data/statMeta'
import { AppIcon } from '../../../icons/AppIcon'
import { useGameStore } from '../../../store/gameStore'
import { getLivingCost } from '../../../systems/economy'
import { canRun } from '../../../systems/turn'
import { STAT_NAMES } from '../../../types/game'
import type { Activity } from '../../../types/game'
import { previewActivity } from '../activityPreview'
import './ActivityCommit.css'

/** 이 패널에서만 쓰는 경고 글리프. 세 종류의 경고 문구가 공유한다(ExeApp과 같은 규칙). */
const WARN_ICON = 'fluent-color:warning-24'

/**
 * 사이트의 **확정 패널** — 브라우저에서 활동을 실행하는 유일한 자리.
 *
 * ⚠️ **브라우저는 활동 실행의 세 번째 통로다**(①카톡 [만나러 가기] ②스케줄러 예약 ③여기).
 * 그래도 규칙은 그대로다: **둘러보기는 무료이고, 이 버튼 하나만 1턴을 쓴다.**
 * 사이트 본문(책 목록·상영 시간표·글감)은 게임 상태를 읽기만 하고, 스탯을 움직이는
 * 코드는 이 파일의 `doActivity` 한 줄뿐이다.
 *
 * ## 왜 사이트마다 만들지 않고 하나로 뒀나
 * 이 패널이 지는 약속이 넷이다 — ①증감 미리보기 ②번아웃 경고 ③조건 미달 경고
 * ④**오후 슬롯의 생활비 차감 경고**. 세 사이트가 각자 그리면 넷 중 하나를 빠뜨린
 * 사이트가 반드시 생기고, 그 사고는 "누르기 전에 비용을 알 수 없다"는 형태로 터진다.
 *
 * ## 왜 어느 사이트에서든 같은 밝은 카드인가
 * 시집이는 어두운 극장 톤이지만 이 패널만은 흰 카드다(실제 예매 사이트의 결제 시트와 같다).
 * **1턴을 쓰는 자리는 어느 사이트에서나 같은 모양이어야** 플레이어가 "여기가 그 자리"임을
 * 사이트를 옮겨 다니며 다시 배우지 않는다(ux `navigation-consistency`,
 * style `primary-action`: 화면당 주 CTA는 하나).
 */
export function ActivityCommit({
  activity,
  actionLabel,
  selection,
  selectionHint,
  onCommitted,
}: {
  activity: Activity
  /** 확정 버튼의 글자. 사이트마다 다르다(읽기 / 예매하기 / 발행하기). */
  actionLabel: string
  /** 고른 것의 이름. 아무것도 안 골랐으면 undefined — 그때는 버튼을 막는다. */
  selection?: string
  /** 안 골랐을 때 무엇을 하면 되는지(ux `empty-states`). */
  selectionHint: string
  onCommitted: () => void
}) {
  const state = useGameStore((s) => s.state)
  const doActivity = useGameStore((s) => s.doActivity)
  if (!state) return null

  const enough = canRun(state, activity)
  const ready = selection !== undefined
  const { rows, efficiency, mentalPenalty, isBurnedOut } = previewActivity(state, activity)

  return (
    <section className="ac" aria-label={`${activity.label} 확정`}>
      <header className="ac-head">
        <AppIcon name={activity.icon} size={22} />
        <div>
          <h2 className="ac-title">{activity.label}</h2>
          {/* 고른 것을 글자로 다시 적는다 — 목록에서 눌린 칸이 화면 밖으로 밀려도
              무엇을 확정하는지 버튼 옆에서 확인할 수 있어야 한다. */}
          <p className={`ac-pick${ready ? '' : ' ac-pick-empty'}`}>
            {ready ? selection : selectionHint}
          </p>
        </div>
      </header>

      <ul className="ac-effects">
        {rows.map(({ key, value }) => (
          <li key={key} className="ac-effect">
            <span className="ac-effect-label">
              <AppIcon name={STAT_META[key].icon} size={15} />
              {STAT_NAMES[key]}
            </span>
            {/* 부호를 항상 적는다 — 색만으로 증감을 전하지 않는다(ux `color-not-only`). */}
            <span className={value >= 0 ? 'ac-plus' : 'ac-minus'}>
              {value >= 0 ? '+' : ''}
              {value.toLocaleString('ko-KR')}
            </span>
          </li>
        ))}
        {mentalPenalty > 0 && (
          <li className="ac-effect">
            <span className="ac-effect-label">
              <AppIcon name={STAT_META.mental.icon} size={15} />
              {STAT_NAMES.mental} (연속 페널티)
            </span>
            <span className="ac-minus">-{mentalPenalty}</span>
          </li>
        )}
      </ul>

      {isBurnedOut && (
        <p className="ac-warn">
          <AppIcon name={WARN_ICON} size={15} />
          <span>같은 일을 반복하고 있습니다. 효율이 {Math.round(efficiency * 100)}%입니다.</span>
        </p>
      )}

      {!enough && (
        <p className="ac-warn">
          <AppIcon name={WARN_ICON} size={15} />
          <span>지금은 할 수 없습니다. 행동력이나 소지금이 부족합니다.</span>
        </p>
      )}

      {/* ⚠️ 오후 슬롯의 생활비 차감 경고. 오후 행동은 하루를 끝내고 `sleep()`이 생활비를
          빼 가는데, 이걸 안 적으면 "-15,000원"만 보고 눌렀다가 실제로는 그보다 훨씬
          많이 빠져나간다. 활동 창(ExeApp)이 지는 약속과 같은 약속이다. */}
      {state.slot === 'afternoon' && (
        <p className="ac-warn">
          <AppIcon name={WARN_ICON} size={15} />
          <span>
            지금 확정하면 하루가 끝나고 잠자리에 듭니다. 생활비{' '}
            {getLivingCost(state.day).toLocaleString('ko-KR')}원이 차감됩니다. (행동력·멘탈은
            회복됩니다)
          </span>
        </p>
      )}

      <button
        type="button"
        className="ac-btn"
        disabled={!ready || !enough}
        onClick={() => {
          doActivity(activity)
          onCommitted()
        }}
        title={ready ? '1턴을 소모합니다' : selectionHint}
      >
        {actionLabel}
      </button>
      <p className="ac-cost">
        <AppIcon name={UI_ICONS.turnCost} size={13} />
        1턴을 소모합니다
      </p>
    </section>
  )
}
