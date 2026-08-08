import { BILLING_INTERVAL_DAYS, SUBSCRIPTIONS } from '../../data/subscriptions'
import { findSite } from '../../data/sites'
import { AppIcon } from '../../icons/AppIcon'
import { useGameStore } from '../../store/gameStore'
import { useWindowStore } from '../../store/windowStore'
import { daysToBilling, subscriptionsOf } from '../../systems/subscription'
import { subscribed } from '../../systems/turn'
import type { Subscription } from '../../data/subscriptions'
import type { GameState } from '../../types/game'
import './SettingsApp.css'

/**
 * 설정 — 지금은 **구독 관리** 한 구역뿐이다.
 *
 * ## ⚠️ 역할을 어도비 사이트와 갈라 뒀다
 * - **어도비 사이트** = 가입하는 곳(상품 소개 + 첫 결제).
 * - **여기** = 이미 끊고 있는 것을 **관리**하는 곳(무엇을 내고 있나 · 언제 또 나가나 · 해지).
 *
 * 실제 OS와 같은 갈래다: 설치는 스토어에서, 제거는 설정에서. 그래서 이 화면에는
 * **가입 버튼이 없다** — 미구독 상품은 "어디로 가면 되는지"만 알리고 그 사이트를 열어 준다
 * (갈 데 없는 안내를 만들지 않는다).
 *
 * ⚠️ **해지 동작은 어도비와 같은 함수 하나를 지난다**(`unsubscribeFrom`). 두 화면이 각자
 * 상태를 만지면 한쪽만 고치는 사고가 난다 — 규칙은 전부 `systems/subscription.ts`에 있다.
 *
 * ## ⚠️ 레일(좌측 카테고리)을 만들지 않았다
 * 실제 윈도우 설정은 좌측 카테고리 목록이 있지만 **여기 카테고리는 하나뿐**이라,
 * 레일을 두면 눌러도 갈 데 없는 항목이 여섯 개 생긴다(이 프로젝트의 장식 금지 규칙).
 * 구역이 둘 이상이 되면 그때 만든다.
 */
export function SettingsApp() {
  const state = useGameStore((s) => s.state)
  const unsubscribeFrom = useGameStore((s) => s.unsubscribeFrom)
  const openSite = useWindowStore((s) => s.openSite)

  if (!state) return null
  const book = subscriptionsOf(state)
  const active = SUBSCRIPTIONS.filter((s) => subscribed(state, s.id))
  const monthly = active.reduce((sum, s) => sum + s.monthlyFee, 0)

  return (
    <div className="set">
      <header className="set-head">
        <h1 className="set-title">설정</h1>
        <p className="set-sub">이 컴퓨터에서 매달 나가는 것들</p>
      </header>

      <section className="set-sec" aria-label="구독">
        <div className="set-sec-head">
          <h2 className="set-sec-title">구독</h2>
          {/* ⚠️ 합계는 파생값이다 — 어딘가에 따로 저장하지 않는다. */}
          <p className="set-total">
            매달 <b>{monthly.toLocaleString('ko-KR')}원</b>
            {book.paid > 0 && (
              <span className="set-total-note">
                지금까지 낸 금액 {book.paid.toLocaleString('ko-KR')}원
              </span>
            )}
          </p>
        </div>

        <ul className="set-list">
          {SUBSCRIPTIONS.map((sub) => (
            <li key={sub.id}>
              <SubRow
                sub={sub}
                state={state}
                onCancel={() => unsubscribeFrom(sub.id)}
                /* 브라우저를 띄우기만 하지 않고 **그 상품의 결제 화면까지** 데려다 준다 —
                   홈에 떨궈 놓고 찾아가라고 하면 안내가 절반만 끝난 것이다. */
                onGoSite={() => openSite(sub.siteId)}
              />
            </li>
          ))}
        </ul>

        <p className="set-note">
          요금은 가입한 날로부터 {BILLING_INTERVAL_DAYS}일마다 청구됩니다. 잔액이 모자라면
          그날로 해지되고, 밀린 요금이 쌓이지는 않습니다.
        </p>
      </section>
    </div>
  )
}

/** 구독 한 줄. 구독 중이면 다음 청구일과 해지가, 아니면 어디서 가입하는지가 뜬다. */
function SubRow({
  sub,
  state,
  onCancel,
  onGoSite,
}: {
  sub: Subscription
  state: GameState
  onCancel: () => void
  onGoSite: () => void
}) {
  const on = subscribed(state, sub.id)
  const left = daysToBilling(state, sub.id)
  const site = findSite(sub.siteId)

  return (
    <article className={`set-row${on ? ' set-row-on' : ''}`}>
      <span className="set-row-mark" aria-hidden="true">
        <AppIcon name={site?.icon ?? 'fluent-color:design-ideas-24'} size={26} />
      </span>

      <span className="set-row-body">
        <span className="set-row-name">{sub.name}</span>
        {/* 상태를 색만으로 알리지 않는다(ux `color-not-only`) — 글자가 뜻을 진다. */}
        <span className="set-row-state">
          {on
            ? `구독 중 · ${sub.monthlyFee.toLocaleString('ko-KR')}원 / ${BILLING_INTERVAL_DAYS}일 · 다음 청구까지 ${left}일`
            : `구독하지 않음 · ${sub.monthlyFee.toLocaleString('ko-KR')}원 / ${BILLING_INTERVAL_DAYS}일`}
        </span>
        <span className="set-row-perks">{sub.perks.join(' · ')}</span>
      </span>

      <span className="set-row-act">
        {on ? (
          <button type="button" className="set-btn" onClick={onCancel}>
            해지
          </button>
        ) : (
          /* ⚠️ 여기서는 가입할 수 없다 — 가입은 상품 사이트의 몫이다(위 주석).
             대신 **갈 곳을 열어 준다**: 안내만 하고 길이 없으면 막다른 골목이 된다. */
          <button type="button" className="set-btn set-btn-go" onClick={onGoSite}>
            {site?.title ?? '상품 사이트'}에서 구독
          </button>
        )}
      </span>
    </article>
  )
}
