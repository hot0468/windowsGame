import { useState } from 'react'
import { activitiesUnlockedBy } from '../../../data/activities'
import { BUYABLE_ITEMS } from '../../../data/items'
import { LOTTERY_NAME, LOTTERY_PRIZES, MAX_TICKETS_PER_BUY, TICKET_PRICE } from '../../../data/lottery'
import { AppIcon } from '../../../icons/AppIcon'
import { useGameStore } from '../../../store/gameStore'
import { canOrder, owns } from '../../../systems/delivery'
import { affordableTickets, canBuyTickets, lotteryOf, payoutRatio } from '../../../systems/lottery'
import { STAT_NAMES } from '../../../types/game'
import type { ShopItem } from '../../../data/items'
import './ShopSite.css'

const won = (v: number) => `${Math.round(v).toLocaleString('ko-KR')}원`

/**
 * 복권 판매대.
 *
 * ⚠️ **여기 있는 이유:** 복권은 물건도 활동도 아니라 **계산대 옆에서 충동적으로 사는
 * 것**이다. 별도 사이트로 만들면 "복권을 사러 간다"는 계획적인 행동이 되어 성격이 뒤집힌다.
 * 컬리엔마트는 이미 편의점 성격의 화면이고, 거기 카운터에 붙은 판매대가 실제 자리와 같다.
 *
 * ⚠️ **확률과 환급률을 감추지 않는다.** 실제 복권은 작은 글씨로 적지만, 이 게임에서는
 * "이건 손해 보는 거래다"를 알고 누르는 것이 정직함의 조건이다(확정 패널이 경고를
 * 반드시 적는 것과 같은 규칙). 판정·확률은 전부 `systems/lottery.ts`가 갖는다.
 */
function LotteryCounter() {
  const state = useGameStore((s) => s.state)
  const buyLottery = useGameStore((s) => s.buyLottery)
  const [count, setCount] = useState(1)

  if (!state) return null
  const lot = lotteryOf(state)
  const max = affordableTickets(state)
  const ok = canBuyTickets(state, count)
  /** 아직 정산되지 않은 표(= 오늘 산 것). 최신이 앞에 있다. */
  const recent = lot.tickets.slice(0, 5)

  return (
    <section className="shop-lotto" aria-labelledby="shop-lotto-title">
      <header className="shop-lotto-head">
        <AppIcon name="fluent-color:gift-card-24" size={28} />
        <div>
          <h2 className="shop-lotto-title" id="shop-lotto-title">
            {LOTTERY_NAME}
          </h2>
          <p className="shop-lotto-sub">
            한 장 {won(TICKET_PRICE)} · 당첨금은 <strong>그날 밤</strong> 들어옵니다
          </p>
        </div>
        <p className="shop-lotto-ev">
          환급률 <strong>{payoutRatio().toFixed(1)}%</strong>
          <span>사면 살수록 손해입니다</span>
        </p>
      </header>

      {/* ⚠️ 확률표를 그대로 편다. 숨기면 "엄청 낮게"라는 설계가 플레이어에게 전달되지 않는다. */}
      <ul className="shop-lotto-odds">
        {LOTTERY_PRIZES.map((p) => (
          <li key={p.label}>
            <span className="shop-lotto-rank">{p.label}</span>
            <span className="shop-lotto-amt">{won(p.amount)}</span>
            <span className="shop-lotto-odd">{p.odds.toLocaleString('ko-KR')}장에 1장</span>
          </li>
        ))}
      </ul>

      <div className="shop-lotto-buy">
        {/* ux `input-labels`: 보이는 라벨을 둔다(placeholder 라벨 금지). */}
        <label className="shop-lotto-label" htmlFor="shop-lotto-count">
          장수
        </label>
        <input
          id="shop-lotto-count"
          className="shop-lotto-count"
          type="number"
          min={1}
          max={MAX_TICKETS_PER_BUY}
          value={count}
          onChange={(e) => setCount(Math.max(1, Math.min(MAX_TICKETS_PER_BUY, Number(e.target.value) || 1)))}
        />
        <span className="shop-lotto-total">{won(count * TICKET_PRICE)}</span>
        <button type="button" className="shop-btn" disabled={!ok} onClick={() => buyLottery(count)}>
          {max === 0 ? '잔액 부족' : '구매'}
        </button>
      </div>

      {/* ⚠️ 왜 못 사는지 글자로 적는다(ux `error-clarity`). */}
      {!ok && max > 0 && (
        <p className="shop-lotto-why">지금 살 수 있는 최대 장수는 {max}장입니다.</p>
      )}

      {recent.length > 0 && (
        <div className="shop-lotto-log">
          <h3 className="shop-lotto-log-title">최근 구매</h3>
          <ul>
            {recent.map((t) => (
              <li key={t.id}>
                <span>{t.day}일차</span>
                {/* ux `color-not-only`: 당첨은 색만이 아니라 등수 글자가 함께 말한다. */}
                <span className={t.prize ? 'shop-lotto-win' : 'shop-lotto-lose'}>
                  {t.prize ? `${t.prize} ${won(t.amount)}` : '꽝'}
                </span>
              </li>
            ))}
          </ul>
          <p className="shop-lotto-tally">
            지금까지 {won(lot.spent)} 써서 {won(lot.won)} 받았습니다.
          </p>
        </div>
      )}
    </section>
  )
}

/**
 * 쇼핑 사이트.
 *
 * ⚠️ **브라우저에서 게임 상태를 바꾸는 두 번째 통로다**(첫 번째는 광고 배너 보상).
 * 원칙은 그대로다 — 여기서 스탯을 계산하지 않고, 가격·도착일·중복 구매 판정은
 * 전부 `systems/delivery.ts`가 정한다. 이 컴포넌트는 순수 함수에 물어보고 그릴 뿐이다.
 *
 * **턴은 소모하지 않는다**("탐색은 무료"). 대신 물건은 다음 날 도착하고 효과도 그때 난다 —
 * 결제와 수령 사이의 하루가 쇼핑의 진짜 비용이다.
 */
export function ShopSite() {
  const state = useGameStore((s) => s.state)
  const orderItem = useGameStore((s) => s.orderItem)
  /** 방금 주문한 물건. 배송 안내를 그 자리에 띄운다 — 화면이 바뀌면 뭘 샀는지 잊는다. */
  const [justOrdered, setJustOrdered] = useState<ShopItem | null>(null)

  if (!state) return null
  const shipping = (state.deliveries ?? []).map((d) => d.itemId)

  return (
    <div className="shop">
      <header className="shop-head">
        <h1 className="shop-title">컬리엔마트</h1>
        <p className="shop-sub">오늘 주문하면 내일 도착합니다.</p>
        <p className="shop-money">
          소지금 <strong>{state.stats.money.toLocaleString()}</strong>원
        </p>
      </header>

      {justOrdered && (
        <p className="shop-receipt" role="status">
          <AppIcon name={justOrdered.icon} size={20} />
          <span>
            <strong>{justOrdered.name}</strong> 주문 완료 — 내일 도착하면 바탕화면{' '}
            <strong>아이템 인벤토리</strong>에 들어갑니다.
          </span>
        </p>
      )}

      <ul className="shop-grid">
        {BUYABLE_ITEMS.map((item) => {
          const isOwned = owns(state, item.id)
          const isShipping = shipping.includes(item.id)
          const buyable = canOrder(state, item)
          return (
            <li key={item.id} className="shop-card">
              <span className="shop-thumb">
                <AppIcon name={item.icon} size={44} />
              </span>
              <div className="shop-info">
                <h2 className="shop-name">{item.name}</h2>
                <p className="shop-desc">{item.desc}</p>
                <p className="shop-effects">
                  {/* 효과를 숨기면 "왜 사야 하나"에 답이 없다. 상한은 도착할 때 클램프된다. */}
                  {Object.entries(item.effects).map(([key, value]) => (
                    <span key={key} className="shop-effect">
                      {STAT_NAMES[key as keyof typeof STAT_NAMES]} +{value}
                    </span>
                  ))}
                  {/* 스탯이 아니라 **활동**을 여는 물건(회원권)의 값어치. 관계는
                      `Activity.requiresItem` 한 곳에서만 뒤집어 찾는다. */}
                  {activitiesUnlockedBy(item.id).map((a) => (
                    <span key={a.id} className="shop-effect">
                      {a.label} 활동 해제
                    </span>
                  ))}
                </p>
              </div>
              <div className="shop-buy">
                <span className="shop-price">{item.price.toLocaleString()}원</span>
                <button
                  type="button"
                  className="shop-btn"
                  disabled={!buyable}
                  onClick={() => {
                    orderItem(item)
                    setJustOrdered(item)
                  }}
                >
                  {isOwned ? '보유 중' : isShipping ? '배송 중' : buyable ? '주문하기' : '잔액 부족'}
                </button>
              </div>
            </li>
          )
        })}
      </ul>

      {/* ⚠️ 물건 목록 **아래**에 둔다. 위에 두면 이 가게가 복권 가게로 읽히는데,
          복권은 계산대 옆에서 마지막에 집는 물건이지 진열대의 주인공이 아니다. */}
      <LotteryCounter />
    </div>
  )
}
