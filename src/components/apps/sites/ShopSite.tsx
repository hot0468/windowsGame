import { useState } from 'react'
import { SHOP_ITEMS } from '../../../data/items'
import { AppIcon } from '../../../icons/AppIcon'
import { useGameStore } from '../../../store/gameStore'
import { canOrder, owns } from '../../../systems/delivery'
import { STAT_NAMES } from '../../../types/game'
import type { ShopItem } from '../../../data/items'
import './ShopSite.css'

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
        {SHOP_ITEMS.map((item) => {
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
    </div>
  )
}
