import { useMemo, useState } from 'react'
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

/** 스탯 효과의 총합. "얼마나 오르는가"를 줄끼리 비교할 수 있게 하는 값이다. */
function totalGain(item: ShopItem): number {
  return Object.values(item.effects).reduce((sum, v) => sum + Math.max(0, v), 0)
}

/**
 * 종류 필터. **쇼핑(`ShopSite`)의 진열 구역과 같은 축이다** — `activitiesUnlockedBy`가
 * 파생하므로 새 데이터가 0개다(`ShopItem`에 카테고리 필드를 더하지 않았다).
 */
const KINDS = [
  { key: 'all', label: '전체' },
  { key: 'stat', label: '스탯 상승' },
  { key: 'unlock', label: '활동 해제' },
] as const
type KindKey = (typeof KINDS)[number]['key']

/**
 * 가격대 필터. ⚠️ **게임 수치가 아니라 목록을 거르는 눈금이다** — 이 값을 바꿔도
 * 물건값·정산은 하나도 안 변한다(그래서 `data/`가 아니라 여기 있다).
 * 취급 기기가 46,000원~1,650,000원에 걸쳐 있어 세 칸으로 가른다.
 */
const BANDS = [
  { key: 'all', label: '전체', min: 0, max: Infinity },
  { key: 'low', label: '10만원 이하', min: 0, max: 100_000 },
  { key: 'mid', label: '10만~50만원', min: 100_001, max: 500_000 },
  { key: 'high', label: '50만원 이상', min: 500_001, max: Infinity },
] as const
type BandKey = (typeof BANDS)[number]['key']

/** 정렬. ⚠️ **판매량순은 없다** — 이 게임에 판매 기록이 없어 만들면 거짓 순서가 된다. */
const SORTS = [
  { key: 'default', label: '기본순' },
  { key: 'cheap', label: '낮은 가격순' },
  { key: 'pricey', label: '높은 가격순' },
  { key: 'gain', label: '효과 높은순' },
] as const
type SortKey = (typeof SORTS)[number]['key']

/**
 * 하이마루 — 전자기기 양판점.
 *
 * ⚠️ **판형은 레퍼런스(실제 가전 양판점의 분류 목록 화면)가 스펙이다**(설계자 지시).
 * 구역 순서: 상단 띠(로고·소지금) → 빵부스러기 → 분류 제목 → **필터 줄** →
 * 정렬 줄 → **가로로 긴 목록 줄** → 각주.
 * ⚠️ **격자(구 `.tc-grid`)로 되돌리지 말 것.** 양판점은 "무엇이 더 나은가"를 묻는
 * 화면이고, 그 비교는 카드가 나란히 설 때가 아니라 **값이 같은 열에 세로로 쌓일 때**
 * 성립한다(레퍼런스가 목록인 이유다). 스펙 비교 줄(`.tc-spec`)이 사라진 것도 같은 이유다 —
 * 열 자체가 비교 축이 되면 줄마다 항목을 되풀이할 필요가 없다.
 *
 * ## 레퍼런스에서 **덜어낸 것**과 그 이유
 * ⚠️ **동작하지 않는 컨트롤은 그리지 않는다**(이 프로젝트의 규칙).
 * - **검색·장바구니·찜·상품비교**: 이 게임에 계정도 장바구니도 없다(주문은 즉시 결제다).
 * - **브랜드 필터**: `ShopItem`에 제조사가 없다. 만들면 목록을 거르지도 못하는 장식이다.
 * - **판매량순 정렬·베스트 10**: 판매 기록이 없다. 순위를 지어내면 거짓말이 된다.
 * - **좌측 떠 있는 레일·고객센터 푸터**: 갈 데가 하나도 없다.
 * 남긴 것은 전부 동작한다: 필터 셋과 정렬은 진짜로 목록을 바꾸고, 소지금은 실제 잔액이다.
 *
 * ⚠️ **쇼핑(`ShopSite`)과 같은 부류다.** 주문은 턴을 쓰지 않고(`"탐색은 무료"`), 효과는
 * 다음 날 도착해야 난다. 가격·중복 구매·잔액 판정은 전부 `systems/delivery.ts`가 갖고
 * 이 컴포넌트는 물어보고 그리기만 한다 — **새 배송 경로를 만들지 않았다.**
 *
 * ⚠️ **진열 목록은 `buyableFor('tech')`로 파생시킨다.** 여기에 id를 나열하면 물건을
 * 옮길 때 두 곳을 고쳐야 하는 두 번째 출처가 생긴다.
 */
export function TechSite({ site }: { site: Site }) {
  const state = useGameStore((s) => s.state)
  const orderItem = useGameStore((s) => s.orderItem)
  /** 방금 주문한 기기. 배송 안내를 그 자리에 띄운다 — 화면이 바뀌면 뭘 샀는지 잊는다. */
  const [justOrdered, setJustOrdered] = useState<ShopItem | null>(null)
  const [kind, setKind] = useState<KindKey>('all')
  const [band, setBand] = useState<BandKey>('all')
  /** 살 수 있는 것만 보기. 소지금이 곧 판정 기준이라 이 칩만은 상태를 읽는다. */
  const [affordable, setAffordable] = useState(false)
  const [sort, setSort] = useState<SortKey>('default')

  const money = state?.stats.money ?? 0
  const items = buyableFor('tech')
  const list = useMemo(() => {
    const range = BANDS.find((b) => b.key === band) ?? BANDS[0]
    const filtered = items.filter((item) => {
      const unlock = activitiesUnlockedBy(item.id).length > 0
      if (kind !== 'all' && (kind === 'unlock') !== unlock) return false
      if (item.price < range.min || item.price > range.max) return false
      if (affordable && item.price > money) return false
      return true
    })
    /* ⚠️ 원본을 뒤집지 않는다(`buyableFor`가 돌려준 배열은 데이터의 순서 그 자체다). */
    const sorted = [...filtered]
    if (sort === 'cheap') sorted.sort((a, b) => a.price - b.price)
    if (sort === 'pricey') sorted.sort((a, b) => b.price - a.price)
    if (sort === 'gain') sorted.sort((a, b) => totalGain(b) - totalGain(a))
    return sorted
  }, [items, kind, band, affordable, money, sort])

  if (!state) return null
  const shipping = (state.deliveries ?? []).map((d) => d.itemId)

  return (
    <div className="tc">
      {/* ── 상단 띠: 로고 + 소지금 ─────────────────────────────
          레퍼런스의 검색·장바구니 자리에 **소지금**이 선다 — 이 가게에서 실제로
          매 순간 확인해야 하는 값이 그것 하나다. */}
      <header className="tc-bar">
        <span className="tc-logo">
          <AppIcon name={site.icon} size={22} />
          하이마루
        </span>
        <p className="tc-money">
          소지금 <strong>{won(money)}</strong>
        </p>
      </header>

      <nav className="tc-crumb" aria-label="현재 위치">
        하이마루 <AppIcon name="mdi:chevron-right" size={14} />
        <span className="tc-crumb-now">전자기기</span>
      </nav>

      <div className="tc-cat">
        <h1 className="tc-cat-title">전자기기</h1>
        <p className="tc-cat-note">{site.notice ?? '주문한 기기는 다음 날 도착합니다.'}</p>
      </div>

      {/* ── 필터 줄. 레퍼런스의 [브랜드][크기][종류]와 같은 자리다. ── */}
      <div className="tc-filters">
        <ChipRow
          label="종류"
          options={KINDS}
          value={kind}
          onPick={(v) => setKind(v as KindKey)}
        />
        <ChipRow
          label="가격"
          options={BANDS}
          value={band}
          onPick={(v) => setBand(v as BandKey)}
        />
        <div className="tc-filter-row">
          <span className="tc-filter-label">조건</span>
          <button
            type="button"
            className={`tc-chip${affordable ? ' tc-chip-on' : ''}`}
            aria-pressed={affordable}
            onClick={() => setAffordable(!affordable)}
          >
            지금 살 수 있는 것만
          </button>
        </div>
      </div>

      {/* ── 정렬 줄: 왼쪽에 건수, 오른쪽에 정렬(레퍼런스와 같은 배치) ── */}
      <div className="tc-tools">
        <p className="tc-count">
          총 <strong>{list.length}</strong>종
        </p>
        <label className="tc-sort">
          <span className="tc-sort-label">정렬</span>
          <select
            className="tc-sort-select"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
          >
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {justOrdered && (
        <p className="tc-receipt" role="status">
          <AppIcon name={justOrdered.icon} size={22} />
          <span>
            <strong>{justOrdered.name}</strong> 주문 완료 — 내일 도착하면 바탕화면{' '}
            <strong>아이템 인벤토리</strong>에 들어갑니다.
          </span>
        </p>
      )}

      <ul className="tc-list">
        {list.map((item) => {
          const isOwned = owns(state, item.id)
          const isShipping = shipping.includes(item.id)
          const buyable = canOrder(state, item)
          const unlocks = activitiesUnlockedBy(item.id)
          const poor = !isOwned && !isShipping && money < item.price

          return (
            <li key={item.id} className="tc-row">
              <span className="tc-thumb">
                <AppIcon name={item.icon} size={44} />
              </span>

              <div className="tc-body">
                <p className="tc-badges">
                  <span className={`tc-badge${unlocks.length > 0 ? ' tc-badge-unlock' : ''}`}>
                    {unlocks.length > 0 ? '활동 해제' : '스탯 상승'}
                  </span>
                  {isOwned && <span className="tc-badge tc-badge-quiet">보유 중</span>}
                  {isShipping && <span className="tc-badge tc-badge-quiet">배송 중</span>}
                </p>
                <h2 className="tc-name">{item.name}</h2>
                <p className="tc-desc">{item.desc}</p>

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

              {/* 레퍼런스의 오른쪽 값 열. **모든 줄에서 같은 열에 선다** — 가격 비교가
                  성립하는 유일한 배치다. */}
              <div className="tc-buy">
                <span className="tc-price">{won(item.price)}</span>
                <span className="tc-ship">무료배송 · 내일 도착</span>
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
                {poor && <span className="tc-why">{won(item.price - money)} 모자랍니다</span>}
              </div>
            </li>
          )
        })}

        {/* 필터를 조이면 목록이 빌 수 있다. 빈 화면을 말없이 두지 않는다. */}
        {list.length === 0 && (
          <li className="tc-empty">
            조건에 맞는 기기가 없습니다. 필터를 넓혀 보세요.
          </li>
        )}
      </ul>

      <p className="tc-foot">
        모든 기기는 <strong>다음 날</strong> 도착하며, 효과는 도착한 순간에 한 번 적용됩니다.
        같은 기기는 한 번만 구매할 수 있습니다.
        <span className="tc-foot-url">{site.url}</span>
      </p>
    </div>
  )
}

/** 필터 한 줄(라벨 + 칩). 줄마다 같은 구조라 부품 하나로 만든다. */
function ChipRow({
  label,
  options,
  value,
  onPick,
}: {
  label: string
  options: readonly { key: string; label: string }[]
  value: string
  onPick: (key: string) => void
}) {
  return (
    <div className="tc-filter-row">
      <span className="tc-filter-label">{label}</span>
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          className={`tc-chip${value === o.key ? ' tc-chip-on' : ''}`}
          aria-pressed={value === o.key}
          onClick={() => onPick(o.key)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
