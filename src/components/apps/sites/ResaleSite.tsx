import { useState } from 'react'
import { activitiesUnlockedBy } from '../../../data/activities'
import { FILMS } from '../../../data/media'
import { POSTCARD_LIST_PRICE } from '../../../data/resale'
import {
  POSTCARD_SELL_PRICE,
  sellPriceOf,
  sellableItems,
  sellablePostcards,
} from '../../../systems/resale'
import { AppIcon } from '../../../icons/AppIcon'
import { useGameStore } from '../../../store/gameStore'
import type { Site } from '../../../data/sites'
import './ResaleSite.css'

/**
 * 두손마켓(중고마켓) — **가진 것을 정가의 반값에 넘기는 화면.**
 *
 * 레퍼런스는 실제 중고거래 앱의 '내 물건 팔기' 목록이고, 이 게임에 있는 것만 그린다:
 * ⚠️ **채팅·시세 그래프·거래 후기·동네 설정은 없다** — 상대가 없는 거래라 전부 장식이 된다.
 * 남긴 것은 목록과 [팔기] 하나뿐이고 둘 다 실제로 동작한다.
 *
 * ## 이 화면이 반드시 지는 약속
 * ⚠️ **팔기 전에 잃는 것을 말한다.** 물건이 여는 활동이 있으면(`activitiesUnlockedBy`)
 * 그 이름을 그 자리에 적는다 — 타블렛을 팔면 그림을 못 그리게 되는데, 그 사실을 판 뒤에
 * 알게 되면 되돌릴 방법이 없다.
 * ⚠️ **되돌릴 수 없으므로 한 번 더 묻는다.** 다만 모달을 새로 만들지 않고 **그 줄이
 * 확인 줄로 바뀐다**(`ActivityConfirm`은 턴을 쓰는 활동 전용이라 여기 못 쓴다).
 *
 * ⚠️ **턴을 쓰지 않는다** — 규칙·시세는 `systems/resale.ts`가 전부 갖고 여기서는 부르기만 한다.
 */
export function ResaleSite({ site }: { site: Site }) {
  const state = useGameStore((s) => s.state)
  const sellItem = useGameStore((s) => s.sellItem)
  const sellPostcard = useGameStore((s) => s.sellPostcard)
  const [tab, setTab] = useState<'item' | 'postcard'>('item')
  /** 확인을 기다리는 줄의 키. 한 번에 하나만 열린다. */
  const [asking, setAsking] = useState<string | null>(null)
  /** 방금 판 것. 목록에서 사라지므로 무슨 일이 있었는지 글자로 남긴다. */
  const [receipt, setReceipt] = useState<string | null>(null)

  if (!state) return null

  const items = sellableItems(state)
  const cards = sellablePostcards(state)
  const rows =
    tab === 'item'
      ? items.map((item) => ({
          key: item.id,
          icon: item.icon,
          name: item.name,
          list: item.price,
          price: sellPriceOf(item.price),
          // ⚠️ 잃는 것을 파는 자리에서 적는다. 관계는 아이템 쪽에만 적혀 있으므로 뒤집어 찾는다.
          losing: activitiesUnlockedBy(item.id).map((a) => a.label),
          sell: () => sellItem(item.id),
        }))
      : cards.map((card) => {
          const film = FILMS.find((f) => f.id === card.filmId)!
          return {
            key: card.filmId,
            icon: 'fluent-color:image-24',
            name: `${film.title} 포스트카드`,
            list: POSTCARD_LIST_PRICE,
            price: POSTCARD_SELL_PRICE,
            losing: [] as string[],
            sell: () => sellPostcard(card.filmId),
          }
        })

  const total = rows.reduce((sum, r) => sum + r.price, 0)

  return (
    <div className="rsl">
      <header className="rsl-head">
        <span className="rsl-logo">
          <AppIcon name={site.icon} size={26} />
          <b>두손마켓</b>
        </span>
        <p className="rsl-lead">
          쓰던 물건을 <b>정가의 반값</b>에 매입합니다. 파는 데 시간은 들지 않지만,
          <b> 판 물건은 돌아오지 않습니다.</b>
        </p>
      </header>

      <div className="rsl-tabs" role="tablist" aria-label="팔 물건 종류">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'item'}
          className={`rsl-tab${tab === 'item' ? ' rsl-tab-on' : ''}`}
          onClick={() => {
            setTab('item')
            setAsking(null)
          }}
        >
          물건 {items.length}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'postcard'}
          className={`rsl-tab${tab === 'postcard' ? ' rsl-tab-on' : ''}`}
          onClick={() => {
            setTab('postcard')
            setAsking(null)
          }}
        >
          포스트카드 {cards.length}
        </button>
        {/* 다 팔면 얼마인가. 목록을 훑지 않고도 결정할 수 있게 한다. */}
        {rows.length > 0 && (
          <span className="rsl-total">전부 팔면 {total.toLocaleString('ko-KR')}원</span>
        )}
      </div>

      {receipt && (
        <p className="rsl-receipt" role="status">
          {receipt}
        </p>
      )}

      {/* ux `empty-states`: 빈 화면 대신 무엇을 하면 되는지 적는다. */}
      {rows.length === 0 ? (
        <p className="rsl-empty">
          {tab === 'item'
            ? '팔 물건이 없습니다. 쇼핑·하이마루·무진장에서 산 물건이 도착하면 여기 올라옵니다.'
            : '팔 포스트카드가 없습니다. 시집이에서 영화를 보면 한 장씩 생깁니다.'}
        </p>
      ) : (
        <ul className="rsl-list">
          {rows.map((row) => (
            <li key={row.key} className="rsl-row">
              <AppIcon name={row.icon} size={34} />
              <span className="rsl-name">
                {row.name}
                {row.losing.length > 0 && (
                  <span className="rsl-warn">
                    팔면 「{row.losing.join('·')}」을(를) 할 수 없게 됩니다
                  </span>
                )}
              </span>
              <span className="rsl-price">
                <b>{row.price.toLocaleString('ko-KR')}원</b>
                <span className="rsl-list-price">정가 {row.list.toLocaleString('ko-KR')}원</span>
              </span>

              {asking === row.key ? (
                <span className="rsl-confirm">
                  <span className="rsl-ask">파시겠습니까?</span>
                  <button
                    type="button"
                    className="rsl-yes"
                    onClick={() => {
                      row.sell()
                      setAsking(null)
                      setReceipt(
                        `「${row.name}」을(를) ${row.price.toLocaleString('ko-KR')}원에 넘겼습니다.`,
                      )
                    }}
                  >
                    예, 팝니다
                  </button>
                  <button type="button" className="rsl-no" onClick={() => setAsking(null)}>
                    아니오
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  className="rsl-sell"
                  onClick={() => {
                    setAsking(row.key)
                    setReceipt(null)
                  }}
                >
                  팔기
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* 되사기 규칙을 감추지 않는다 — 판 뒤에 알면 손해를 보고 나서 아는 것이 된다. */}
      <p className="rsl-foot">
        ⚠ 팔았던 물건을 다시 사면 물건은 돌아오지만 <b>처음 받았을 때의 스탯 상승은 없습니다.</b>
      </p>
    </div>
  )
}
