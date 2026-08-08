import { BILLING_INTERVAL_DAYS, SUBSCRIPTIONS } from '../../../data/subscriptions'
import { AppIcon } from '../../../icons/AppIcon'
import { useGameStore } from '../../../store/gameStore'
import { daysToBilling, subscriptionsOf } from '../../../systems/subscription'
import { subscribed } from '../../../systems/turn'
import type { Subscription } from '../../../data/subscriptions'
import type { Site } from '../../../data/sites'
import type { GameState } from '../../../types/game'
import './AdobeSite.css'

/**
 * 어도비 — 구독 결제.
 *
 * ## 은행·부동산과 같은 "기능 사이트"다
 * **활동을 실행하지 않고 턴을 쓰지 않는다**(`activityId` 없음 → 확정 패널도 없다).
 * 파는 것은 물건도 활동도 아니라 **매달 나가는 지출과 그것이 여는 둘**이다:
 * 바탕화면의 포토샵 아이콘, 그리고 그몽의 디자인 일감.
 *
 * ## ⚠️ 이 화면이 이 게임의 옛 규칙 하나를 뒤집었다
 * "구독은 만들지 않는다(지속 상태는 밤 정산이 필요해진다)"가 설계자 지시로 폐기됐다.
 * 규칙·요금은 전부 `systems/subscription.ts`·`data/subscriptions.ts`가 갖고
 * 이 화면은 부르기만 한다.
 *
 * ## ⚠️ 해지를 숨기지 않는다
 * 실제 구독 서비스가 해지 버튼을 감추는 것이 이 화면의 농담거리이긴 하지만,
 * 되돌릴 수 없는 결제를 만드는 것은 이 프로젝트의 규칙(ux `escape-routes`)에 어긋난다.
 * 대신 **이미 낸 달치는 돌려주지 않는다**는 사실을 글자로 적는다.
 */
export function AdobeSite({ site }: { site: Site }) {
  const state = useGameStore((s) => s.state)
  const subscribeTo = useGameStore((s) => s.subscribeTo)
  const unsubscribeFrom = useGameStore((s) => s.unsubscribeFrom)

  if (!state) return null
  const book = subscriptionsOf(state)

  return (
    <div className="adb">
      <header className="adb-head">
        <h1 className="adb-logo">
          <AppIcon name={site.icon} size={26} />
          어도비
        </h1>
        <p className="adb-lede">
          창의적인 일을 하는 사람들이 쓰는 도구. 쓰는 동안에만 쓸 수 있습니다.
        </p>
      </header>

      <section className="adb-plans" aria-label="구독 상품">
        {SUBSCRIPTIONS.filter((s) => s.siteId === site.id).map((sub) => (
          <PlanCard
            key={sub.id}
            sub={sub}
            state={state}
            onSubscribe={() => subscribeTo(sub.id)}
            onCancel={() => unsubscribeFrom(sub.id)}
          />
        ))}
      </section>

      {book.paid > 0 && (
        <p className="adb-paid">
          지금까지 낸 금액 <b>{book.paid.toLocaleString('ko-KR')}원</b>
        </p>
      )}

      <footer className="adb-foot">
        <p>
          요금은 가입한 날로부터 {BILLING_INTERVAL_DAYS}일마다 자동으로 청구됩니다.
          <strong> 잔액이 모자라면 그날로 구독이 해지됩니다</strong> — 밀린 요금이 쌓이지는
          않습니다.
        </p>
        <p>{site.url}</p>
      </footer>
    </div>
  )
}

/** 상품 하나. 구독 중이면 다음 청구일과 해지 버튼이, 아니면 가입 버튼이 뜬다. */
function PlanCard({
  sub,
  state,
  onSubscribe,
  onCancel,
}: {
  sub: Subscription
  state: GameState
  onSubscribe: () => void
  onCancel: () => void
}) {
  const on = subscribed(state, sub.id)
  const left = daysToBilling(state, sub.id)
  /* ⚠️ 판정은 `subscribe`가 하고 화면은 **사유만 파생**한다(두 번째 판정 규칙 금지).
     소지금이 요금과 같아도 못 산다 — 0으로 만드는 결제는 그날 밤 파산이다. */
  const affordable = state.stats.money - sub.monthlyFee > 0

  return (
    <article className={`adb-plan${on ? ' adb-plan-on' : ''}`}>
      <div className="adb-plan-head">
        <h2 className="adb-plan-name">{sub.name}</h2>
        <p className="adb-plan-fee">
          <b>{sub.monthlyFee.toLocaleString('ko-KR')}원</b>
          <span className="adb-plan-per"> / {BILLING_INTERVAL_DAYS}일</span>
        </p>
      </div>

      <p className="adb-plan-desc">{sub.desc}</p>

      <ul className="adb-perks">
        {sub.perks.map((p) => (
          <li key={p} className="adb-perk">
            <AppIcon name="mdi:check" size={15} />
            {p}
          </li>
        ))}
      </ul>

      {/* 상태를 색만으로 알리지 않는다(ux `color-not-only`) — 글자가 함께 간다. */}
      {on ? (
        <div className="adb-plan-foot">
          <p className="adb-plan-state" role="status">
            구독 중 · 다음 청구까지 {left}일
          </p>
          <button type="button" className="adb-btn adb-btn-off" onClick={onCancel}>
            구독 해지
          </button>
          <p className="adb-plan-note">
            해지하면 다음 날부터 포토샵이 사라지고 디자인 일감이 잠깁니다. 이미 낸 달치는
            돌려드리지 않습니다.
          </p>
        </div>
      ) : (
        <div className="adb-plan-foot">
          <button
            type="button"
            className="adb-btn adb-btn-on"
            onClick={onSubscribe}
            disabled={!affordable}
            title={affordable ? '지금 가입하고 첫 달치를 결제합니다' : '소지금이 모자랍니다'}
          >
            구독하기
          </button>
          {/* ⚠️ 못 사는 이유를 글자로 적는다 — 비활성만으로는 무엇이 모자란지 알 수 없다. */}
          <p className="adb-plan-note">
            {affordable
              ? `가입하는 순간 첫 달치 ${sub.monthlyFee.toLocaleString('ko-KR')}원이 결제됩니다.`
              : `소지금이 모자랍니다 — ${sub.monthlyFee.toLocaleString('ko-KR')}원보다 많이 남아 있어야 합니다.`}
          </p>
        </div>
      )}
    </article>
  )
}
