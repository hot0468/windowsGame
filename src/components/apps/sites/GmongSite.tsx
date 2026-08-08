import { useState } from 'react'
import { findActivity } from '../../../data/activities'
import { GIGS } from '../../../data/gigs'
import { AppIcon } from '../../../icons/AppIcon'
import { useGameStore } from '../../../store/gameStore'
import { canRun } from '../../../systems/turn'
import type { Gig } from '../../../data/gigs'
import type { Site } from '../../../data/sites'
import type { Activity, GameState } from '../../../types/game'
import { blockReasons, previewActivity } from '../activityPreview'
import { ActivityConfirm } from '../ActivityConfirm'
import './GmongSite.css'

/**
 * 그몽 — 부업(외주) 중개.
 *
 * ## 알바몬과 같은 구조다
 * 일감이 활동을 **가리키기만** 하고(`Gig.activityId`), 보수·조건은 전부 활동이 갖는다 —
 * 금액을 여기 적으면 물가 배율이 오를 때 목록과 확인창이 어긋난다. 목록만 그리고
 * 항목을 누르면 곧바로 `ActivityConfirm`이 뜬다(확정 패널은 폐기됐다).
 *
 * ## ⚠️ 다른 점: 잠금의 종류가 셋이다
 * 알바몬은 **스탯**이 열지만 여기는 **자격(수료증)과 도구(구독)**가 연다.
 * 그중 구독은 **끊기면 다시 잠긴다** — 아이템·자격증과 달리 되돌아가는 유일한 잠금이다.
 * 판정은 언제나 `canRun` 하나가 하고 이 화면은 **사유만 파생**한다(`blockReasons`) —
 * 두 번째 판정을 만들면 스케줄러·활동 창과 규칙이 갈라진다.
 *
 * ⚠️ **조건 미달 일감을 감추지 않는다**(ux `empty-nav-state`). 감추면 "구독하면 일이
 * 늘어난다"는 사실을 알 길이 없다.
 */

/** 보수 표시. 활동의 money 증감을 **미리보기와 같은 함수**로 뽑는다(물가 배율 포함). */
function payOf(state: GameState, activity: Activity): number {
  const row = previewActivity(state, activity).rows.find((r) => r.key === 'money')
  return row ? row.value : 0
}

export function GmongSite({ site }: { site: Site }) {
  const state = useGameStore((s) => s.state)
  const [pickedId, setPickedId] = useState<string | null>(null)
  /** 방금 받은 일. 목록이 그대로라 무슨 일이 있었는지 글자로 남긴다. */
  const [doneAt, setDoneAt] = useState<string | null>(null)

  if (!state) return null
  const picked = GIGS.find((g) => g.id === pickedId)
  /** 고른 일감의 활동. 아무것도 안 골랐으면 사이트 기본 활동(조건 없는 것)으로 둔다. */
  const commit = findActivity(picked?.activityId ?? site.activityId ?? '')
  if (!commit) return null

  const open = GIGS.filter((g) => {
    const a = findActivity(g.activityId)
    return a && canRun(state, a)
  }).length

  return (
    <div className="gm">
      <header className="gm-head">
        <h1 className="gm-logo">
          <AppIcon name={site.icon} size={24} />
          그몽
        </h1>
        <p className="gm-lede">
          건별로 받는 일. 지금 받을 수 있는 일감 <b>{open}</b>건 / 전체 {GIGS.length}건
        </p>
      </header>

      {doneAt && (
        <p className="gm-receipt" role="status">
          {doneAt}의 작업을 넘겼습니다. 보수가 소지금에 들어왔습니다.
        </p>
      )}

      <section className="gm-sec" aria-label="일감">
        <ul className="gm-list" role="radiogroup" aria-label="받을 일감 고르기">
          {GIGS.map((gig) => (
            <li key={gig.id}>
              <GigCard
                gig={gig}
                state={state}
                on={gig.id === pickedId}
                onPick={() => setPickedId(gig.id === pickedId ? null : gig.id)}
              />
            </li>
          ))}
        </ul>
      </section>

      {picked && (
        <ActivityConfirm
          activity={commit}
          kicker="그몽"
          title={`${picked.client}의 일을 받으시겠습니까?`}
          actionLabel="일감 받기"
          notes={[{ label: '작업', value: picked.title }]}
          onCommitted={() => setDoneAt(picked.client)}
          onClose={() => setPickedId(null)}
        />
      )}

      <footer className="gm-foot">
        <p>보수는 작업을 넘긴 날 지급됩니다. 수정 요청은 보수에 포함돼 있습니다.</p>
        <p>{site.url}</p>
      </footer>
    </div>
  )
}

/**
 * 일감 카드. 조건이 미달이면 **감추지 않고 비활성**으로 그리고 사유를 적는다.
 * ⚠️ 사유는 `blockReasons` 하나에서 나온다 — 화면이 문구를 새로 만들지 않는다.
 */
function GigCard({
  gig,
  state,
  on,
  onPick,
}: {
  gig: Gig
  state: GameState
  on: boolean
  onPick: () => void
}) {
  const activity = findActivity(gig.activityId)
  if (!activity) return null

  const allowed = canRun(state, activity)
  const reasons = allowed ? [] : blockReasons(state, activity)
  const pay = payOf(state, activity)

  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      disabled={!allowed}
      className={`gm-card${on ? ' gm-card-on' : ''}${allowed ? '' : ' gm-card-locked'}`}
      title={activity.description}
      onClick={onPick}
    >
      <span className="gm-mark" aria-hidden="true">
        <AppIcon name={activity.icon} size={22} />
      </span>

      <span className="gm-body">
        <span className="gm-client">{gig.client}</span>
        <span className="gm-title">
          {gig.title}
          {gig.badge && <span className="gm-badge">{gig.badge}</span>}
        </span>
        <span className="gm-tags">
          {gig.tags.map((t) => (
            <span key={t} className="gm-tag">
              {t}
            </span>
          ))}
        </span>
        {/* ⚠️ 잠금 사유를 글자로 적는다. 색만으로 알리지 않는다(ux `color-not-only`). */}
        {reasons.map((r) => (
          <span key={r} className="gm-lock">
            <AppIcon name="mdi:lock-outline" size={13} />
            {r}
          </span>
        ))}
      </span>

      <span className="gm-pay">
        <span className="gm-pay-label">보수</span>
        <span className="gm-pay-value">{pay.toLocaleString('ko-KR')}원</span>
        {/* 고른 상태를 색만으로 알리지 않는다. */}
        {on && <span className="gm-picked">선택함</span>}
      </span>
    </button>
  )
}
