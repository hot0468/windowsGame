import { CHART_DAYS, STOCKS, TRADE_FEE } from '../../../data/stocks'
import { AppIcon } from '../../../icons/AppIcon'
import { useGameStore } from '../../../store/gameStore'
import {
  avgPriceOf,
  buyableShares,
  canForecast,
  canForecastDetail,
  changeOf,
  chartOf,
  forecastOf,
  swingOf,
  positionValue,
  priceOf,
  sharesOf,
  stocksOf,
  unrealized,
} from '../../../systems/stocks'
import { findStock } from '../../../data/stocks'
import type { Stock } from '../../../data/stocks'
import type { Site } from '../../../data/sites'
import type { GameState } from '../../../types/game'
import './StockSite.css'

/**
 * 네이놈증권 — 주식.
 *
 * ## 은행과 같은 부류다
 * **활동을 실행하지 않고 턴을 쓰지 않는다**(`activityId` 없음 → 확정 패널도 없다).
 * 매매는 `gameStore`의 `buyStock`/`sellStock` 하나를 지나고, 규칙·수치는 전부
 * `systems/stocks.ts`·`data/stocks.ts`가 갖는다 — 화면은 부르기만 한다.
 *
 * ## ⚠️ 미래를 한 칸도 그리지 않는다
 * 시세는 날짜의 순수 함수라 내일 값도 계산할 수 있지만, 그리는 순간 주식이 도박이 아니라
 * **버튼 하나짜리 무한 수익**이 된다. 차트는 `chartOf`가 오늘까지만 잘라 준다 —
 * 이 컴포넌트가 직접 `priceOf`에 미래 날짜를 넣지 않는다.
 *
 * ## ⚠️ 색만으로 알리지 않는다 (ux `color-not-only`)
 * 한국 증시 관행대로 **상승이 빨강·하락이 파랑**인데, 이 앱의 나머지 화면에서 빨강은
 * 위험이다. 그래서 색은 거들기만 하고 **▲▼ 기호 + 부호(+/−) + 퍼센트**가 뜻을 진다.
 */
export function StockSite({ site }: { site: Site }) {
  const state = useGameStore((s) => s.state)
  const buy = useGameStore((s) => s.buyStock)
  const sell = useGameStore((s) => s.sellStock)

  if (!state) return null

  const held = positionValue(state)
  const pl = unrealized(state)
  const book = stocksOf(state)
  const owned = STOCKS.filter((s) => sharesOf(state, s.id) > 0)

  return (
    <div className="stk">
      <header className="stk-head">
        <h1 className="stk-logo">
          <AppIcon name={site.icon} size={24} />
          네이놈증권
        </h1>
        <p className="stk-clock">
          {state.day}일차 {state.slot === 'afternoon' ? '오후' : '오전'} 장중
        </p>
      </header>

      {/* 요약. ⚠️ 실제로 들고 있는 값만 적는다 — 가짜 지수·거래대금 같은 건 만들지 않는다. */}
      <section className="stk-sum" aria-label="내 계좌">
        <Fact label="소지금" value={`${state.stats.money.toLocaleString('ko-KR')}원`} />
        <Fact label="평가액" value={`${held.toLocaleString('ko-KR')}원`} />
        <Fact
          label="평가손익"
          value={`${pl > 0 ? '+' : pl < 0 ? '−' : ''}${Math.abs(pl).toLocaleString('ko-KR')}원`}
          /* ⚠️ **0에는 색을 주지 않는다** — 산 날의 평가손익은 언제나 0인데 상승 빨강으로
             칠하면 "오른 것"으로 읽힌다(색이 뜻을 지는 화면이라 더 그렇다). */
          tone={owned.length === 0 || pl === 0 ? undefined : pl > 0 ? 'up' : 'down'}
        />
        <Fact
          label="넣은 돈 / 뺀 돈"
          value={`${book.spent.toLocaleString('ko-KR')} / ${book.earned.toLocaleString('ko-KR')}원`}
        />
      </section>

      <p className="stk-note">
        수수료는 사고팔 때 각각 {(TRADE_FEE * 100).toFixed(1)}%입니다. 매매에 하루가 들지
        않지만, 오르내리는 것은 하루가 지나야 압니다.
      </p>

      <section className="stk-sec" aria-label="시세">
        <h2 className="stk-sec-head">
          시세
          <span className="stk-sec-note">최근 {CHART_DAYS}일</span>
        </h2>
        <ul className="stk-list">
          {STOCKS.map((stock) => (
            <li key={stock.id}>
              <StockRow
                stock={stock}
                state={state}
                onBuy={() => buy(stock.id, 1)}
                onSell={(n: number) => sell(stock.id, n)}
              />
            </li>
          ))}
        </ul>
      </section>

      {book.trades.length > 0 && (
        <section className="stk-sec" aria-label="거래 내역">
          <h2 className="stk-sec-head">거래 내역</h2>
          <ul className="stk-log">
            {book.trades.map((t) => {
              const s = findStock(t.stockId)
              return (
                <li key={t.id} className="stk-log-row">
                  <span className="stk-log-day">{t.day}일차</span>
                  <span className="stk-log-name">{s?.name ?? t.stockId}</span>
                  <span className={`stk-log-kind stk-${t.kind === 'buy' ? 'up' : 'down'}`}>
                    {t.kind === 'buy' ? '매수' : '매도'} {t.shares}주
                  </span>
                  <span className="stk-log-price">
                    {t.price.toLocaleString('ko-KR')}원
                  </span>
                  <span className="stk-log-amount">
                    {t.kind === 'buy' ? '−' : '+'}
                    {t.amount.toLocaleString('ko-KR')}원
                  </span>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <footer className="stk-foot">
        <p>
          투자 판단의 책임은 본인에게 있습니다. 이 화면의 시세는 지난 날짜만 보여 주며,
          내일 값은 아무도 미리 알 수 없습니다.
        </p>
        <p>{site.url}</p>
      </footer>
    </div>
  )
}

function Fact({ label, value, tone }: { label: string; value: string; tone?: 'up' | 'down' }) {
  return (
    <div className="stk-fact">
      <dt className="stk-fact-label">{label}</dt>
      <dd className={`stk-fact-value${tone ? ` stk-${tone}` : ''}`}>{value}</dd>
    </div>
  )
}

/** 종목 한 줄. 스파크라인 · 현재가 · 등락 · 보유 · 매매 버튼. */
function StockRow({
  stock,
  state,
  onBuy,
  onSell,
}: {
  stock: Stock
  state: GameState
  onBuy: () => void
  onSell: (shares: number) => void
}) {
  const price = priceOf(stock, state.day)
  const change = changeOf(stock, state.day)
  const prev = price - change
  const pct = prev > 0 ? (change / prev) * 100 : 0
  const shares = sharesOf(state, stock.id)
  const avg = avgPriceOf(state, stock.id)
  const canBuy = buyableShares(state, stock) > 0
  const full = shares >= stock.maxShares
  const tone = change > 0 ? 'up' : change < 0 ? 'down' : 'flat'

  return (
    <article className={`stk-row${shares > 0 ? ' stk-row-held' : ''}`}>
      <span className="stk-mark" aria-hidden="true">
        <AppIcon name={stock.icon} size={22} />
      </span>

      <span className="stk-id">
        <span className="stk-name">{stock.name}</span>
        <span className="stk-code">{stock.code}</span>
        <span className="stk-desc">{stock.desc}</span>
      </span>

      <Spark prices={chartOf(stock, state.day)} tone={tone} />

      <span className="stk-quote">
        <span className="stk-price">{price.toLocaleString('ko-KR')}원</span>
        {/*
          ⚠️ **경제 스탯이 여는 예보. 방향은 끝까지 안 준다**(2026-08-08).
          내일 값을 알려 주면 버튼 하나짜리 무한 수익이 되므로(이 파일 상단 주석과 같은
          이유) 넘기는 것은 **흔들림의 크기**뿐이다 — 언제 들어가고 언제 쉴지의 정보이지
          무엇을 살지의 답이 아니다. 문턱·등급은 `systems/stocks.ts`가 갖는다.
        */}
        {canForecast(state) && (
          <span className="stk-forecast" title="경제 스탯이 읽어 주는 내일의 흔들림 — 방향은 알 수 없습니다">
            내일 {forecastOf(stock, state.day)}
            {canForecastDetail(state) &&
              ` · ±${(swingOf(stock, state.day) * 100).toFixed(1)}%`}
          </span>
        )}
        {/* ⚠️ 색이 아니라 기호와 부호가 뜻을 진다(ux `color-not-only`). */}
        <span className={`stk-change stk-${tone}`}>
          <span aria-hidden="true">{change > 0 ? '▲' : change < 0 ? '▼' : '—'}</span>
          {change === 0
            ? '보합'
            : `${change > 0 ? '+' : '−'}${Math.abs(change).toLocaleString('ko-KR')} (${
                change > 0 ? '+' : '−'
              }${Math.abs(pct).toFixed(1)}%)`}
        </span>
      </span>

      <span className="stk-hold">
        {shares > 0 ? (
          <>
            <span className="stk-hold-main">
              {shares}주 / {stock.maxShares}주
            </span>
            <span className="stk-hold-sub">평균 {avg.toLocaleString('ko-KR')}원</span>
            {/* ⚠️ 0에는 색도 부호도 주지 않는다(요약 칸과 같은 규칙). */}
            <span className={`stk-hold-pl stk-${price > avg ? 'up' : price < avg ? 'down' : 'flat'}`}>
              {price > avg ? '+' : price < avg ? '−' : ''}
              {Math.abs((price - avg) * shares).toLocaleString('ko-KR')}원
            </span>
          </>
        ) : (
          <span className="stk-hold-none">최대 {stock.maxShares}주</span>
        )}
      </span>

      <span className="stk-act">
        <button
          type="button"
          className="stk-btn stk-btn-buy"
          onClick={onBuy}
          disabled={!canBuy}
          /* ⚠️ 못 사는 이유를 글자로 적는다 — 비활성만으로는 무엇이 모자란지 알 수 없다. */
          title={full ? '보유 상한에 닿았습니다' : canBuy ? '1주 매수' : '소지금이 모자랍니다'}
        >
          매수
        </button>
        <button
          type="button"
          className="stk-btn"
          onClick={() => onSell(1)}
          disabled={shares === 0}
          title={shares === 0 ? '보유한 주식이 없습니다' : '1주 매도'}
        >
          매도
        </button>
        <button
          type="button"
          className="stk-btn stk-btn-all"
          onClick={() => onSell(shares)}
          disabled={shares === 0}
          title={shares === 0 ? '보유한 주식이 없습니다' : `${shares}주 전량 매도`}
        >
          전량
        </button>
        {/* 비활성 사유는 툴팁만으로는 안 읽히므로 글자로도 남긴다. */}
        {!canBuy && (
          <span className="stk-why">{full ? '상한 도달' : '소지금 부족'}</span>
        )}
      </span>
    </article>
  )
}

/**
 * 스파크라인. **이미지가 아니라 인라인 SVG다**(썸네일·배너와 같은 오프라인 규칙).
 * ⚠️ 넘겨받은 값만 그린다 — 여기서 미래 날짜를 계산하지 않는다.
 */
function Spark({ prices, tone }: { prices: number[]; tone: 'up' | 'down' | 'flat' }) {
  const w = 120
  const h = 36
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  const span = max - min || 1
  const step = prices.length > 1 ? w / (prices.length - 1) : w
  const points = prices
    .map((p, i) => `${(i * step).toFixed(1)},${(h - ((p - min) / span) * (h - 4) - 2).toFixed(1)}`)
    .join(' ')

  return (
    <svg
      className={`stk-spark stk-${tone}`}
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      /* 값은 옆 숫자가 이미 말한다 — 그림은 추세만 거든다. */
      aria-hidden="true"
      focusable="false"
    >
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}
