import { useState } from 'react'
import { findActivity } from '../../../data/activities'
import { DISHES, DISH_TABS, dishesOf, findDish } from '../../../data/dishes'
import { AppIcon } from '../../../icons/AppIcon'
import { useGameStore } from '../../../store/gameStore'
import { STAT_NAMES } from '../../../types/game'
import type { Dish } from '../../../data/dishes'
import type { Site } from '../../../data/sites'
import type { GameState } from '../../../types/game'
import { previewActivity } from '../activityPreview'
import { ActivityConfirm } from '../ActivityConfirm'
import './FoodSite.css'

/**
 * 배달의정석 — 배달 음식 주문.
 *
 * ⚠️ **알바몬과 같은 구조다.** 메뉴는 **어느 활동을 실행할지 가리키기만** 하고
 * (`Dish.activityId` → `meal-junk` / `meal-healthy`) 값·효과는 활동이 갖는다.
 * 그래서 카드의 가격은 여기서 적지 않고 **`previewActivity`가 돌려준 money 행**을 읽는다 —
 * 물가 배율이 붙어도 화면과 실제가 갈리지 않는다.
 *
 * ⚠️ **택배(`systems/delivery.ts`)와 다른 것이다.** 음식은 인벤토리에 쌓이지도 다음 날
 * 도착하지도 않는다 — 1턴을 쓰고 그 자리에서 끝난다.
 *
 * ⚠️ **정크푸드는 매력을 깎는다**(설계자 지시). 그 사실을 카드에서 **숨기지 않는다** —
 * 확인창이 증감을 보여 주기 전에 목록에서 이미 읽힌다(알바몬이 잠금 사유를 적는 것과
 * 같은 방향: 누르기 전에 대가를 알 수 있어야 한다).
 */
export function FoodSite({ site }: { site: Site }) {
  const state = useGameStore((s) => s.state)
  const [tab, setTab] = useState<string | null>(null)
  const [pickedId, setPickedId] = useState<string | null>(null)
  /** 방금 주문한 메뉴. 목록이 그대로라 결과를 글자로 남긴다. */
  const [ordered, setOrdered] = useState<string | null>(null)

  if (!state) return null
  const shown = tab ? dishesOf(tab) : DISHES
  const picked = pickedId ? findDish(pickedId) : undefined
  const pickedActivity = picked ? findActivity(picked.activityId) : undefined

  return (
    <div className="fd">
      <p className="fd-strip">지금 주문하면 오늘 안에 도착합니다 · 최소 주문 금액 없음</p>

      <header className="fd-head">
        <AppIcon name={site.icon} size={34} />
        <div className="fd-head-text">
          <h1 className="fd-logo">배달의정석</h1>
          <p className="fd-sub">오늘도 시켜 먹는 당신에게</p>
        </div>
        <p className="fd-money">
          소지금 <strong>{state.stats.money.toLocaleString('ko-KR')}원</strong>
        </p>
      </header>

      {/* 분류 탭. 실행 활동과 1:1이라 목록을 두 벌로 만들지 않는다. */}
      <nav className="fd-tabs" aria-label="메뉴 분류">
        <button
          type="button"
          className={`fd-tab${tab === null ? ' fd-tab-on' : ''}`}
          aria-pressed={tab === null}
          onClick={() => setTab(null)}
        >
          전체
        </button>
        {DISH_TABS.map((t) => (
          <button
            key={t.activityId}
            type="button"
            className={`fd-tab${tab === t.activityId ? ' fd-tab-on' : ''}`}
            aria-pressed={tab === t.activityId}
            onClick={() => setTab(tab === t.activityId ? null : t.activityId)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {ordered && (
        <p className="fd-receipt" role="status">
          「{ordered}」 주문 완료. 잘 먹었습니다.
        </p>
      )}

      <ul className="fd-list">
        {shown.map((dish) => (
          <li key={dish.id}>
            <DishCard dish={dish} state={state} onPick={() => setPickedId(dish.id)} />
          </li>
        ))}
      </ul>

      <footer className="fd-foot">
        <p className="fd-foot-logo">배달의정석</p>
        <p>가게 정보와 조리 시간은 가게가 등록한 내용이며 배달의정석은 이를 보증하지 않습니다.</p>
        <p>{site.url}</p>
      </footer>

      {/* 메뉴를 누르면 곧바로 확인창이 뜬다(사이트 공통 규칙 — 확정 패널은 없다). */}
      {picked && pickedActivity && (
        <ActivityConfirm
          activity={pickedActivity}
          kicker="배달의정석 주문"
          title={`「${picked.name}」을(를) 주문하시겠습니까?`}
          actionLabel="주문하기"
          notes={[
            { label: '가게', value: picked.shop },
            { label: '배달 예상', value: picked.eta },
          ]}
          onCommitted={() => setOrdered(picked.name)}
          onClose={() => setPickedId(null)}
        />
      )}
    </div>
  )
}

/**
 * 메뉴 카드 하나.
 * ⚠️ 가격·매력 감소는 **활동에서 파생**한다 — 여기에 숫자를 적으면 두 번째 출처가 된다.
 */
function DishCard({ dish, state, onPick }: { dish: Dish; state: GameState; onPick: () => void }) {
  const activity = findActivity(dish.activityId)
  if (!activity) return null

  const rows = previewActivity(state, activity).rows
  const price = Math.abs(rows.find((r) => r.key === 'money')?.value ?? 0)
  /* 깎이는 스탯. 정크푸드의 매력이 여기 걸린다 — 목록에서 미리 읽혀야 한다. */
  const costs = rows.filter((r) => r.value < 0 && r.key !== 'money' && r.key !== 'stamina')

  return (
    <button type="button" className="fd-card" onClick={onPick} title={dish.desc}>
      <span className="fd-photo" style={{ background: dish.cover }} />
      <span className="fd-body">
        <span className="fd-shop">{dish.shop}</span>
        <span className="fd-name">{dish.name}</span>
        <span className="fd-desc">{dish.desc}</span>
        <span className="fd-meta">
          <span className="fd-rating">
            <AppIcon name="mdi:star" size={13} />
            {dish.rating.toFixed(1)}
          </span>
          <span>{dish.eta}</span>
        </span>
        {/* ux `color-not-only`: 색이 아니라 부호와 스탯 이름이 함께 말한다. */}
        {costs.map((c) => (
          <span key={c.key} className="fd-warn">
            {STAT_NAMES[c.key]} {c.value}
          </span>
        ))}
      </span>
      <span className="fd-price">{price.toLocaleString('ko-KR')}원</span>
    </button>
  )
}
