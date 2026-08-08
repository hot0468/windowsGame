import { CHART_DAYS, STOCKS, STOCK_LOG_LIMIT, TRADE_FEE, findStock } from '../data/stocks'
import { clampStats } from './turn'
import type { Stock } from '../data/stocks'
import type { GameState, StockState, StockTrade } from '../types/game'

/**
 * 네이놈증권 — 시세와 매매 규칙.
 *
 * ## ⚠️ 시세는 저장하지 않는다 — **날짜의 순수 함수다**
 * `priceOf(stock, day)`가 언제 불려도 같은 값을 준다. 그래서:
 *  - 새로 고쳐도 시세가 다시 굴러가지 않는다(**세이브 스커밍이 막힌다** — 복권이
 *    일련번호를 시드로 쓰는 것과 같은 이유. 저장했다가 다시 굴리면 마음에 드는 시세가
 *    나올 때까지 새로 고치는 것이 최적 전략이 된다).
 *  - 차트가 지난 날짜를 되짚어 그릴 수 있다(가격 이력을 세이브에 쌓지 않아도 된다).
 *
 * ## ⚠️ 화면은 **미래를 한 칸도** 보여 주지 않는다
 * 함수는 미래 날짜도 계산할 수 있지만(순수 함수이므로), 그 값을 화면에 그리면
 * 주식이 도박이 아니라 **버튼 하나짜리 무한 수익**이 된다. 차트는 `chartOf`가
 * 오늘까지만 잘라 준다 — 화면이 직접 `priceOf`에 미래 날짜를 넣지 않는다.
 *
 * ## ⚠️ "판은 반드시 끝난다"를 어떻게 지키는가
 * 시세는 **기준가 대비 ±`volatility`로 묶여 있고**, 보유는 **종목당 `maxShares`로
 * 묶여 있다.** 둘의 곱이 "완벽한 타이밍으로 매매해도 하루에 벌 수 있는 최대치"이고,
 * 그 값이 **가장 싼 집의 마지막 물가 구간 생활비보다 작다**는 것을 `stocks.test.ts`가
 * 데이터에서 직접 계산해 지킨다. 상한이 없으면 소지금이 늘수록 포지션이 커져
 * 복리로 폭발한다 — 물가 상승이라는 종결 장치가 그 순간 무의미해진다.
 *
 * ## 의존 방향
 * `stocks.ts` → `turn.ts` (반대는 없다). ⚠️ **밤 정산이 없다** — 매매는 즉시 체결되고
 * 배당도 없으므로 `nightPayoutPending`에 원천을 더하지 않는다(은행·복권과 달리
 * "나중에 들어올 돈"이라는 것이 생기지 않는다).
 */

/* ── 시세 ──────────────────────────────────────────────────────────────── */

/** 32비트 정수 하나를 [0,1)로 흩뿌린다 (mulberry32). `lottery.ts`와 같은 것을 쓴다. */
function mulberry32(seed: number): number {
  let t = (seed + 0x6d2b79f5) | 0
  t = Math.imul(t ^ (t >>> 15), 1 | t)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

/** 종목 id를 정수 시드로. 종목마다 파형과 잡음이 갈리게 하는 값이다. */
function seedOf(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (Math.imul(h, 31) + id.charCodeAt(i)) | 0
  return h
}

/**
 * 그 날의 흔들림 (-1 ~ 1).
 *
 * **정현파 셋 + 작은 잡음**이다. 순수한 난수만 쓰면 하루마다 톱니처럼 튀어 차트가
 * 주가로 안 읽히고, 정현파만 쓰면 며칠 만에 주기를 외워 버린다. 둘을 섞되
 * **잡음의 몫을 작게** 둔다 — 그래야 "추세는 보이는데 내일은 모르는" 모양이 된다.
 *
 * ⚠️ 어떤 조합이든 **반드시 -1~1 안에 있다**(계수 합이 1). 이 경계가 위 불변식의 근거다.
 */
function wave(stockId: string, day: number): number {
  const s = seedOf(stockId)
  const p1 = mulberry32(s) * Math.PI * 2
  const p2 = mulberry32(s + 101) * Math.PI * 2
  const p3 = mulberry32(s + 202) * Math.PI * 2
  const smooth =
    0.55 * Math.sin(day / 3.1 + p1) + 0.3 * Math.sin(day / 7.7 + p2) + 0.15 * Math.sin(day / 1.7 + p3)
  const noise = mulberry32(s + day * 7919) * 2 - 1
  return 0.78 * smooth + 0.22 * noise
}

/**
 * 그 날의 주가(원, 정수).
 *
 * ⚠️ **1일 미만은 1일로 본다** — 판이 시작되기 전 날짜로 차트를 그리다가 음수 날이
 * 들어오면 파형이 뒤집혀 없던 급등락이 생긴다.
 */
export function priceOf(stock: Stock, day: number): number {
  const d = Math.max(1, Math.floor(day))
  return Math.max(1, Math.round(stock.base * (1 + stock.volatility * wave(stock.id, d))))
}

/**
 * 차트에 그릴 **지난** 시세. 마지막 칸이 오늘이다.
 * ⚠️ **미래를 넘겨주지 않는 것이 이 함수의 존재 이유다**(위 주석).
 */
export function chartOf(stock: Stock, today: number, days = CHART_DAYS): number[] {
  const from = Math.max(1, today - days + 1)
  const out: number[] = []
  for (let d = from; d <= today; d++) out.push(priceOf(stock, d))
  return out
}

/** 어제 대비 등락액. 1일차에는 비교할 어제가 없으므로 0이다. */
export function changeOf(stock: Stock, day: number): number {
  if (day <= 1) return 0
  return priceOf(stock, day) - priceOf(stock, day - 1)
}

/* ── 보유 ──────────────────────────────────────────────────────────────── */

export function emptyStocks(): StockState {
  return { holdings: {}, spent: 0, earned: 0, trades: [] }
}

export function stocksOf(state: GameState): StockState {
  return state.stocks ?? emptyStocks()
}

/** 그 종목을 몇 주 갖고 있는가. */
export function sharesOf(state: GameState, stockId: string): number {
  return stocksOf(state).holdings[stockId]?.shares ?? 0
}

/** 평균 매입가. 없으면 0이다. */
export function avgPriceOf(state: GameState, stockId: string): number {
  return stocksOf(state).holdings[stockId]?.avgPrice ?? 0
}

/** 지금 살 수 있는 최대 주수 = 보유 상한과 소지금 중 **작은 쪽**. */
export function buyableShares(state: GameState, stock: Stock): number {
  const room = stock.maxShares - sharesOf(state, stock.id)
  const unit = Math.ceil(priceOf(stock, state.day) * (1 + TRADE_FEE))
  const afford = Math.floor(state.stats.money / unit)
  return Math.max(0, Math.min(room, afford))
}

/** 보유 전체의 오늘 평가액. */
export function positionValue(state: GameState): number {
  return STOCKS.reduce((sum, s) => sum + sharesOf(state, s.id) * priceOf(s, state.day), 0)
}

/** 평가손익(오늘 팔면 얼마가 남는가 — 수수료 전). */
export function unrealized(state: GameState): number {
  return STOCKS.reduce((sum, s) => {
    const shares = sharesOf(state, s.id)
    if (!shares) return sum
    return sum + shares * (priceOf(s, state.day) - avgPriceOf(state, s.id))
  }, 0)
}

/* ── 매매 ──────────────────────────────────────────────────────────────── */

function log(prev: StockTrade[], entry: StockTrade): StockTrade[] {
  return [entry, ...prev].slice(0, STOCK_LOG_LIMIT)
}

/**
 * 산다. **턴을 쓰지 않는다**(은행 거래·쇼핑 주문과 같은 규칙).
 *
 * ⚠️ 조건이 하나라도 안 되면 **상태를 그대로 돌려준다** — 반쪽 상태(돈은 나갔는데
 * 주식은 안 들어온)를 남기지 않는다(`orderItem`·`takeCourse`와 같은 규칙).
 * ⚠️ **평균 매입가를 갱신한다** — 평가손익이 그 값 위에서만 뜻을 갖는다.
 */
export function buyStock(state: GameState, stockId: string, shares: number): GameState {
  const stock = findStock(stockId)
  if (!stock || state.gameOver) return state
  const n = Math.floor(shares)
  if (n <= 0) return state

  const held = sharesOf(state, stockId)
  if (held + n > stock.maxShares) return state

  const price = priceOf(stock, state.day)
  const cost = Math.round(price * n * (1 + TRADE_FEE))
  // ⚠️ `<=`가 아니라 `<`다: 소지금을 정확히 0으로 만드는 매수는 그날 밤 파산이다.
  if (state.stats.money - cost <= 0) return state

  const prev = stocksOf(state)
  const avg = held > 0 ? (avgPriceOf(state, stockId) * held + price * n) / (held + n) : price

  return {
    ...state,
    stats: clampStats({ ...state.stats, money: state.stats.money - cost }),
    stocks: {
      ...prev,
      holdings: { ...prev.holdings, [stockId]: { shares: held + n, avgPrice: Math.round(avg) } },
      spent: prev.spent + cost,
      trades: log(prev.trades, { id: `b${state.day}-${stockId}-${held + n}`, day: state.day, stockId, kind: 'buy', shares: n, price, amount: cost }),
    },
  }
}

/** 판다. 수수료를 뗀 금액이 **즉시** 소지금으로 들어온다(밤 정산이 없다). */
export function sellStock(state: GameState, stockId: string, shares: number): GameState {
  const stock = findStock(stockId)
  if (!stock || state.gameOver) return state
  const n = Math.floor(shares)
  const held = sharesOf(state, stockId)
  if (n <= 0 || n > held) return state

  const price = priceOf(stock, state.day)
  const gain = Math.round(price * n * (1 - TRADE_FEE))
  const prev = stocksOf(state)
  const holdings = { ...prev.holdings }
  if (held - n === 0) delete holdings[stockId]
  // ⚠️ 일부만 팔아도 **평균 매입가는 그대로다** — 남은 주식을 언제 샀는지는 안 바뀐다.
  else holdings[stockId] = { shares: held - n, avgPrice: avgPriceOf(state, stockId) }

  return {
    ...state,
    stats: clampStats({ ...state.stats, money: state.stats.money + gain }),
    stocks: {
      ...prev,
      holdings,
      earned: prev.earned + gain,
      trades: log(prev.trades, { id: `s${state.day}-${stockId}-${held}`, day: state.day, stockId, kind: 'sell', shares: n, price, amount: gain }),
    },
  }
}
