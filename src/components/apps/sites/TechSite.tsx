import { useState } from 'react'
import { activitiesUnlockedBy } from '../../../data/activities'
import { buyableFor } from '../../../data/items'
import { AppIcon } from '../../../icons/AppIcon'
import { useGameStore } from '../../../store/gameStore'
import { canOrder, owns } from '../../../systems/delivery'
import { STAT_NAMES } from '../../../types/game'
import type { Site } from '../../../data/sites'
import type { ShopItem } from '../../../data/items'
import './TechSite.css'

const won = (v: number) => `${v.toLocaleString('ko-KR')}원`

/** 스탯 효과의 총합. "얼마나 오르는가"를 카드끼리 비교할 수 있게 하는 한 줄이다. */
function totalGain(item: ShopItem): number {
  return Object.values(item.effects).reduce((sum, v) => sum + Math.max(0, v), 0)
}

/**
 * 하이마루 — 전자기기 양판점.
 *
 * ⚠️ **쇼핑(`ShopSite`)과 같은 부류다.** 주문은 턴을 쓰지 않고(`"탐색은 무료"`), 효과는
 * 다음 날 도착해야 난다. 가격·중복 구매·잔액 판정은 전부 `systems/delivery.ts`가 갖고
 * 이 컴포넌트는 물어보고 그리기만 한다 — **새 배송 경로를 만들지 않았다.**
 *
 * ⚠️ **진열 목록은 `buyableFor('tech')`로 파생시킨다.** 여기에 id를 나열하면 물건을
 * 옮길 때 두 곳을 고쳐야 하는 두 번째 출처가 생긴다.
 *
 * 잠금 해제형 기기(방송용 마이크 세트)는 스탯이 아니라 **활동을 연다**. 그 관계는
 * `Activity.requiresItem` 한 곳에서만 뒤집어 찾는다(`activitiesUnlockedBy`) —
 * 아이템 쪽에 "여는 활동" 목록을 또 적으면 한쪽만 고치는 사고가 난다.
 */
export function TechSite({ site }: { site: Site }) {
  const state = useGameStore((s) => s.state)
  const orderItem = useGameStore((s) => s.orderItem)
  /** 방금 주문한 기기. 배송 안내를 그 자리에 띄운다 — 화면이 바뀌면 뭘 샀는지 잊는다. */
  const [justOrdered, setJustOrdered] = useState<ShopItem | null>(null)

  if (!state) return null
  const shipping = (state.deliveries ?? []).map((d) => d.itemId)
  const items = buyableFor('tech')

  return (
    <div className="tc">
      {/* 양판점의 매장 띠. 배송 규칙을 맨 위에 못 박는다 — 이 가게의 유일한 규칙이다. */}
      <p className="tc-strip">{site.notice ?? '주문한 기기는 다음 날 도착합니다.'}</p>

      <header className="tc-head">
        <AppIcon name={site.icon} size={34} />
        <div className="tc-head-text">
          <h1 className="tc-title">하이마루</h1>
          <p className="tc-sub">전자기기 전문관 · 전 품목 익일 배송</p>
        </div>
        <p className="tc-money">
          소지금 <strong>{won(state.stats.money)}</strong>
        </p>
      </header>

      {justOrdered && (
        <p className="tc-receipt" role="status">
          <AppIcon name={justOrdered.icon} size={22} />
          <span>
            <strong>{justOrdered.name}</strong> 주문 완료 — 내일 도착하면 바탕화면{' '}
            <strong>아이템 인벤토리</strong>에 들어갑니다.
          </span>
        </p>
      )}

      <ul className="tc-grid">
        {items.map((item) => {
          const isOwned = owns(state, item.id)
          const isShipping = shipping.includes(item.id)
          const buyable = canOrder(state, item)
          const unlocks = activitiesUnlockedBy(item.id)
          const gain = totalGain(item)
          const poor = !isOwned && !isShipping && state.stats.money < item.price

          return (
            <li key={item.id} className="tc-card">
              <span className="tc-thumb">
                <AppIcon name={item.icon} size={48} />
              </span>

              <div className="tc-info">
                <h2 className="tc-name">{item.name}</h2>
                <p className="tc-desc">{item.desc}</p>

                {/*
                  ⚠️ 스펙 줄. 카드가 나란히 서는 화면이라 **같은 자리에 같은 항목**이
                  있어야 비교가 된다(style `Feature-Rich Showcase`의 비교 축).
                  잠금 해제형은 스탯이 0이므로 '여는 활동'이 그 자리를 대신 채운다.
                */}
                <dl className="tc-spec">
                  <div className="tc-spec-row">
                    <dt>종류</dt>
                    <dd>{unlocks.length > 0 ? '활동 해제' : '스탯 상승'}</dd>
                  </div>
                  <div className="tc-spec-row">
                    <dt>효과</dt>
                    <dd>{unlocks.length > 0 ? `+${unlocks.length}종` : `합계 +${gain}`}</dd>
                  </div>
                </dl>

                <p className="tc-effects">
                  {Object.entries(item.effects).map(([key, value]) => (
                    <span key={key} className="tc-effect">
                      {STAT_NAMES[key as keyof typeof STAT_NAMES]} +{value}
                    </span>
                  ))}
                  {/*
                    스탯이 아니라 **활동**을 여는 기기의 값어치.
                    ux `color-not-only`: 자물쇠 글리프 + '활동 해제' 글자가 함께 말한다.
                  */}
                  {unlocks.map((a) => (
                    <span key={a.id} className="tc-effect tc-effect-unlock">
                      <AppIcon name="mdi:lock-open-variant-outline" size={13} />
                      {a.label} 활동 해제
                    </span>
                  ))}
                </p>
              </div>

              <div className="tc-buy">
                <span className="tc-price">{won(item.price)}</span>
                <button
                  type="button"
                  className="tc-btn"
                  disabled={!buyable}
                  onClick={() => {
                    orderItem(item)
                    setJustOrdered(item)
                  }}
                >
                  {isOwned ? '보유 중' : isShipping ? '배송 중' : buyable ? '주문하기' : '잔액 부족'}
                </button>
                {/* ux `error-clarity`: 못 사는 이유를 글자로 적는다(비활성만 두지 않는다). */}
                {poor && (
                  <span className="tc-why">
                    {won(item.price - state.stats.money)} 모자랍니다
                  </span>
                )}
              </div>
            </li>
          )
        })}
      </ul>

      <p className="tc-foot">
        모든 기기는 <strong>다음 날</strong> 도착하며, 효과는 도착한 순간에 한 번 적용됩니다.
        같은 기기는 한 번만 구매할 수 있습니다.
      </p>
    </div>
  )
}
