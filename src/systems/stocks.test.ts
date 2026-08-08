import { describe, it, expect } from 'vitest'
import {
  avgPriceOf,
  buyStock,
  buyableShares,
  changeOf,
  chartOf,
  positionValue,
  priceOf,
  sellStock,
  sharesOf,
  stocksOf,
  unrealized,
} from './stocks'
import { createInitialState } from './turn'
import { STOCKS, TRADE_FEE, findStock } from '../data/stocks'
import { ECONOMY_TIERS } from '../data/economy'
import { HOUSINGS } from '../data/housing'
import type { GameState } from '../types/game'

/**
 * ⚠️ 첫 describe는 **돈·게임오버를 만드는 불변식**이라 규칙을 뒤집어 실패를 확인하는
 * 증명까지 한다(은행 이율 부등식·트위터 팔로워 상한과 같은 급). 나머지는 회귀 수준이다.
 */

function rich(money = 5_000_000, day = 1): GameState {
  const base = createInitialState('개미')
  return { ...base, day, stats: { ...base.stats, money } }
}

describe('⚠️ 불변식 — 주식만으로는 물가를 못 이긴다', () => {
  /*
   * 이 게임은 물가 상승으로 반드시 끝난다. 주식이 그 장치를 무력화하지 않으려면
   * **완벽한 타이밍으로 매매해도** 하루 수익이 생활비를 못 넘어야 한다.
   *
   * 하루 최대 수익의 상한 = Σ(종목별 최고가 × 보유 상한 × 하루 최대 변동률).
   * 시세가 `base × (1 ± volatility)` 안에 갇혀 있으므로(파형 계수 합이 1) 이 값이
   * 실제로 상한이다 — 소지금이 아무리 많아도 `maxShares` 위로는 못 산다.
   */
  const lastTier = ECONOMY_TIERS[ECONOMY_TIERS.length - 1]
  const cheapestLiving = lastTier.living * Math.min(...HOUSINGS.map((h) => h.rate))
  const maxDailyGain = STOCKS.reduce(
    (sum, s) => sum + s.base * (1 + s.volatility) * s.maxShares * (2 * s.volatility),
    0,
  )

  it('완벽한 타이밍으로 매매해도 가장 싼 집의 마지막 물가 생활비를 못 넘는다', () => {
    expect(maxDailyGain).toBeLessThan(cheapestLiving)
  })

  it('규칙을 뒤집으면 실패한다 — 보유 상한을 두 배로 두면 생활비를 넘긴다', () => {
    // 이 줄이 통과해야 위 부등식이 "우연히 맞는 값"이 아님이 증명된다.
    expect(maxDailyGain * 2).toBeGreaterThan(cheapestLiving)
  })

  it('시세는 기준가 ±변동폭 안에 갇혀 있다 — 이 경계가 위 계산의 근거다', () => {
    for (const s of STOCKS) {
      for (let day = 1; day <= 240; day++) {
        const p = priceOf(s, day)
        expect(p, `${s.id} ${day}일차`).toBeGreaterThanOrEqual(
          Math.floor(s.base * (1 - s.volatility)),
        )
        expect(p, `${s.id} ${day}일차`).toBeLessThanOrEqual(Math.ceil(s.base * (1 + s.volatility)))
      }
    }
  })

  it('보유 상한 위로는 소지금이 아무리 많아도 못 산다', () => {
    let s = rich(100_000_000)
    const stock = STOCKS[0]
    for (let i = 0; i < stock.maxShares + 5; i++) s = buyStock(s, stock.id, 1)
    expect(sharesOf(s, stock.id)).toBe(stock.maxShares)
    expect(buyableShares(s, stock)).toBe(0)
  })

  it('수수료가 사고팔 때 각각 빠진다 — 같은 날 되팔면 반드시 손해다', () => {
    const stock = STOCKS[0]
    const before = rich()
    const bought = buyStock(before, stock.id, 1)
    const sold = sellStock(bought, stock.id, 1)
    expect(sold.stats.money).toBeLessThan(before.stats.money)
    expect(TRADE_FEE).toBeGreaterThan(0)
  })
})

describe('시세 — 날짜의 순수 함수', () => {
  it('같은 날은 언제 물어도 같은 값이다 (새로 고쳐도 다시 굴러가지 않는다)', () => {
    const stock = STOCKS[1]
    expect(priceOf(stock, 17)).toBe(priceOf(stock, 17))
    // 종목이 다르면 값도 갈린다(시드가 종목 id에서 나온다).
    expect(priceOf(STOCKS[1], 17)).not.toBe(priceOf(STOCKS[2], 17))
  })

  it('차트는 오늘까지만 준다 — 미래를 한 칸도 넘기지 않는다', () => {
    const stock = STOCKS[0]
    const chart = chartOf(stock, 20, 5)
    expect(chart).toHaveLength(5)
    expect(chart[chart.length - 1]).toBe(priceOf(stock, 20))
    // 마지막 칸이 내일 값이면 화면이 미래를 그리게 된다.
    expect(chart).not.toContain(priceOf(stock, 21))
  })

  it('⚠️ 1일차에도 지난 시세가 있다 — 상장은 게임보다 먼저다', () => {
    // 판 시작 전을 잘라 내면 첫날 화면이 전부 "보합"이고 차트가 점 하나가 된다
    // (CDP 실측으로 잡은 버그). 그래서 0·음수 날짜도 정상으로 계산한다.
    const stock = STOCKS[0]
    expect(chartOf(stock, 1, 14)).toHaveLength(14)
    // 첫날에도 등락이 0이 아니어야 한다(적어도 종목 하나는 움직인다).
    expect(STOCKS.some((s) => changeOf(s, 1) !== 0)).toBe(true)
    // 그래도 범위는 그대로 갇혀 있다 — 불변식의 근거가 흔들리지 않는다.
    for (const s of STOCKS) {
      for (let d = -20; d <= 0; d++) {
        expect(priceOf(s, d)).toBeGreaterThanOrEqual(Math.floor(s.base * (1 - s.volatility)))
        expect(priceOf(s, d)).toBeLessThanOrEqual(Math.ceil(s.base * (1 + s.volatility)))
      }
    }
  })
})

describe('매매', () => {
  it('사면 소지금이 줄고 보유가 늘어난다', () => {
    const stock = STOCKS[2]
    const before = rich()
    const after = buyStock(before, stock.id, 2)
    expect(sharesOf(after, stock.id)).toBe(2)
    expect(after.stats.money).toBeLessThan(before.stats.money)
    expect(avgPriceOf(after, stock.id)).toBe(priceOf(stock, before.day))
  })

  it('소지금을 0 이하로 만드는 매수는 막는다 — 그날 밤 파산이다', () => {
    const stock = STOCKS[0]
    const price = priceOf(stock, 1)
    const broke = rich(price) // 딱 한 주 값만 있다(수수료까지 내면 0 이하)
    expect(buyStock(broke, stock.id, 1)).toBe(broke)
  })

  it('가진 것보다 많이 팔 수 없고, 0주는 아무 일도 아니다', () => {
    const stock = STOCKS[2]
    const s = buyStock(rich(), stock.id, 1)
    expect(sellStock(s, stock.id, 2)).toBe(s)
    expect(sellStock(s, stock.id, 0)).toBe(s)
  })

  it('전량 매도하면 보유가 사라진다', () => {
    const stock = STOCKS[2]
    const s = buyStock(rich(), stock.id, 3)
    const sold = sellStock(s, stock.id, 3)
    expect(sharesOf(sold, stock.id)).toBe(0)
    expect(stocksOf(sold).holdings[stock.id]).toBeUndefined()
  })

  it('일부만 팔아도 평균 매입가는 그대로다', () => {
    const stock = STOCKS[2]
    const s = buyStock(rich(), stock.id, 3)
    const avg = avgPriceOf(s, stock.id)
    const sold = sellStock(s, stock.id, 1)
    expect(avgPriceOf(sold, stock.id)).toBe(avg)
    expect(sharesOf(sold, stock.id)).toBe(2)
  })

  it('없는 종목·게임오버에는 아무 일도 일어나지 않는다', () => {
    const s = rich()
    expect(buyStock(s, 'nope', 1)).toBe(s)
    const over: GameState = { ...s, gameOver: 'bankrupt' }
    expect(buyStock(over, STOCKS[0].id, 1)).toBe(over)
  })

  it('평가액·평가손익이 보유에서 파생된다', () => {
    const stock = STOCKS[2]
    const day = 9
    const s = buyStock(rich(5_000_000, day), stock.id, 2)
    expect(positionValue(s)).toBe(2 * priceOf(stock, day))
    // 산 날에는 평가손익이 0이다(수수료는 소지금에서 이미 빠졌다).
    expect(unrealized(s)).toBe(0)
    // 다음 날에는 시세 차이만큼 벌어진다.
    const later = { ...s, day: day + 1 }
    expect(unrealized(later)).toBe(2 * (priceOf(stock, day + 1) - avgPriceOf(s, stock.id)))
  })

  it('거래 내역이 사실만 남긴다', () => {
    const stock = STOCKS[2]
    const s = buyStock(rich(), stock.id, 1)
    const [t] = stocksOf(s).trades
    expect(t.kind).toBe('buy')
    expect(t.stockId).toBe(stock.id)
    expect(t.price).toBe(priceOf(stock, 1))
    expect(findStock(t.stockId)).toBeDefined()
  })
})
