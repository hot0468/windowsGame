import { useState } from 'react'
import { findActivity } from '../../../data/activities'
import { OUTFIT_BONUS, buyableFor } from '../../../data/items'
import { AppIcon } from '../../../icons/AppIcon'
import { useGameStore } from '../../../store/gameStore'
import { canOrder, owns } from '../../../systems/delivery'
import type { Site } from '../../../data/sites'
import type { ShopItem } from '../../../data/items'
import './WearSite.css'

const won = (v: number) => `${v.toLocaleString('ko-KR')}원`
const percent = Math.round(OUTFIT_BONUS * 100)

/**
 * 무진장 — 의류 쇼핑몰.
 *
 * ⚠️ **하이마루·쇼핑과 같은 부류다.** 주문은 턴을 쓰지 않고("탐색은 무료"), 효과는 다음 날
 * 도착해야 난다. 가격·중복 구매·잔액 판정은 전부 `systems/delivery.ts`가 갖고 이 컴포넌트는
 * 물어보고 그리기만 한다 — **새 배송 경로를 만들지 않았다.**
 *
 * ## 이 가게가 파는 것
 * ⚠️ **옷은 도착해도 스탯을 주지 않는다.** 값어치는 **가지고 있는 동안** TPO가 맞는 활동의
 * 성장 상승분이 커지는 것이고(`systems/turn.ts`의 `outfitBonusFor`), 그래서 카드가 반드시
 * 적어야 하는 것은 가격이 아니라 **어디에 맞는 옷인가**다. 그 목록은 `ShopItem.outfit.fits`
 * 하나에서 나온다 — 화면에 활동 이름을 다시 적으면 활동 id가 바뀔 때 이 카드만 거짓이 된다.
 *
 * ⚠️ **입고 벗는 조작이 없다.** 가지고 있으면 적용이다(`data/items.ts` 주석 참조).
 * 그래서 이 화면에는 "착용" 버튼이 없고, 산 옷은 [보유 중]으로만 표시된다.
 */
export function WearSite({ site }: { site: Site }) {
  const state = useGameStore((s) => s.state)
  const orderItem = useGameStore((s) => s.orderItem)
  /** 방금 주문한 옷. 화면이 그대로라 무엇을 샀는지 글자로 남긴다(하이마루와 같은 규칙). */
  const [justOrdered, setJustOrdered] = useState<ShopItem | null>(null)

  if (!state) return null
  const shipping = (state.deliveries ?? []).map((d) => d.itemId)
  const items = buyableFor('wear')

  return (
    <div className="wr">
      {/* 매장 띠. 이 가게의 규칙 두 줄(배송 · 보너스)을 맨 위에 못 박는다. */}
      <p className="wr-strip">
        {site.notice ?? '주문한 옷은 다음 날 도착합니다.'} · 때와 장소가 맞으면 성장 상승분이{' '}
        {percent}% 커집니다
      </p>

      <header className="wr-head">
        <AppIcon name={site.icon} size={34} />
        <div className="wr-head-text">
          <h1 className="wr-title">무진장</h1>
          <p className="wr-sub">T.P.O — 때와 장소, 그리고 옷</p>
        </div>
        <p className="wr-money">
          소지금 <strong>{won(state.stats.money)}</strong>
        </p>
      </header>

      {justOrdered && (
        <p className="wr-receipt" role="status">
          <AppIcon name={justOrdered.icon} size={22} />
          <span>
            <strong>{justOrdered.name}</strong> 주문 완료 — 내일 도착하면 옷장(
            <strong>아이템 인벤토리</strong>)에 들어갑니다. 입고 벗을 필요는 없습니다.
          </span>
        </p>
      )}

      <ul className="wr-grid">
        {items.map((item) => {
          const isOwned = owns(state, item.id)
          const isShipping = shipping.includes(item.id)
          const buyable = canOrder(state, item)
          const poor = !isOwned && !isShipping && state.stats.money < item.price
          /* ⚠️ 활동 이름을 여기 적지 않는다 — id로 찾아 라벨을 가져온다. */
          const fits = (item.outfit?.fits ?? []).flatMap((id) => findActivity(id) ?? [])

          return (
            <li key={item.id} className={`wr-card${isOwned ? ' wr-card-owned' : ''}`}>
              <span className="wr-thumb">
                <AppIcon name={item.icon} size={48} />
              </span>

              <div className="wr-info">
                <h2 className="wr-name">{item.name}</h2>
                <p className="wr-desc">{item.desc}</p>

                {/*
                  이 카드의 본론. ⚠️ **어디에 맞는 옷인가**가 가격보다 먼저 읽혀야 한다 —
                  스탯 표가 아니라 이 목록이 옷의 성능표다.
                */}
                <p className="wr-fits-label">이 옷이 맞는 자리</p>
                <ul className="wr-fits">
                  {fits.map((a) => (
                    <li key={a.id} className="wr-fit">
                      <AppIcon name={a.icon} size={14} />
                      {a.label}
                    </li>
                  ))}
                </ul>
                <p className="wr-note">
                  가지고만 있으면 위 활동의 성장 상승분이 <strong>+{percent}%</strong>{' '}
                  (최소 +1) 커집니다.
                </p>
              </div>

              <div className="wr-buy">
                <span className="wr-price">{won(item.price)}</span>
                <button
                  type="button"
                  className="wr-btn"
                  disabled={!buyable}
                  onClick={() => {
                    orderItem(item)
                    setJustOrdered(item)
                  }}
                >
                  {isOwned ? '보유 중' : isShipping ? '배송 중' : buyable ? '주문하기' : '잔액 부족'}
                </button>
                {/* ux `error-clarity`: 못 사는 이유를 글자로 적는다(비활성만 두지 않는다). */}
                {poor && <span className="wr-why">{won(item.price - state.stats.money)} 모자랍니다</span>}
              </div>
            </li>
          )
        })}
      </ul>

      <footer className="wr-foot">
        <p className="wr-foot-logo">무진장</p>
        <p>교환·반품은 받지 않습니다. 사이즈는 알아서 맞습니다.</p>
        <p>{site.url}</p>
      </footer>
    </div>
  )
}
