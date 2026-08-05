import { describe, it, expect } from 'vitest'
import {
  getEconomyTier,
  getLivingCost,
  getNextTier,
  getWageMultiplier,
  housingRate,
  livingCostForDay,
  tierCostFor,
} from './economy'
import { HOUSINGS } from '../data/housing'
import { createInitialState } from './turn'
import { moveTo } from './housing'

describe('getEconomyTier', () => {
  it('1일차는 첫 구간을 반환한다', () => {
    expect(getEconomyTier(1).living).toBe(30000)
  })

  it('구간 경계 직전에는 이전 구간을 유지한다', () => {
    expect(getEconomyTier(10).living).toBe(30000)
  })

  it('구간 경계일에 다음 구간으로 넘어간다', () => {
    expect(getEconomyTier(11).living).toBe(38000)
  })

  it('마지막 표 구간 당일은 표의 값을 그대로 쓴다', () => {
    expect(getEconomyTier(51).living).toBe(95000)
    expect(getEconomyTier(51).wageMultiplier).toBe(1.55)
  })

  it('마지막 표 구간과 다음 외삽 구간 사이에는 값이 유지된다', () => {
    expect(getEconomyTier(60).living).toBe(95000)
  })

  it('마지막 표 구간을 넘어서면 생활비가 계속 오른다', () => {
    expect(getEconomyTier(61).living).toBeGreaterThan(95000)
    expect(getEconomyTier(71).living).toBeGreaterThan(getEconomyTier(61).living)
    expect(getEconomyTier(999).living).toBeGreaterThan(getEconomyTier(101).living)
  })

  it('외삽 구간에서도 10일 주기로만 인상된다', () => {
    expect(getEconomyTier(61).living).toBe(getEconomyTier(70).living)
    expect(getEconomyTier(71).living).toBeGreaterThan(getEconomyTier(70).living)
  })
})

describe('물가 외삽 — 무한 플레이 차단', () => {
  it('알바비도 오르지만 생활비보다 훨씬 느리게 오른다', () => {
    const livingRatio = livingCostForDay(151) / livingCostForDay(51)
    const wageRatio = getWageMultiplier(151) / getWageMultiplier(51)
    expect(wageRatio).toBeGreaterThan(1)
    expect(wageRatio).toBeLessThan(livingRatio)
  })

  it('생활비가 결국 하루 최대 수입(알바 2회)을 넘어선다', () => {
    // 알바 기본 보상 60000원 * 하루 2슬롯이 이론상 최대 수입이다.
    const maxDailyIncome = (day: number) => 2 * 60000 * getWageMultiplier(day)
    expect(livingCostForDay(51)).toBeLessThan(maxDailyIncome(51))
    expect(livingCostForDay(91)).toBeGreaterThan(maxDailyIncome(91))
  })

  it('한 번 역전된 뒤에는 영구히 회복되지 않는다', () => {
    const maxDailyIncome = (day: number) => 2 * 60000 * getWageMultiplier(day)
    for (let day = 91; day <= 1000; day += 10) {
      expect(livingCostForDay(day)).toBeGreaterThan(maxDailyIncome(day))
    }
  })
})

describe('livingCostForDay', () => {
  it('해당 날짜의 생활비를 반환한다', () => {
    expect(livingCostForDay(25)).toBe(48000)
  })
})

describe('getWageMultiplier', () => {
  it('알바비 배율은 생활비 인상률보다 낮게 오른다', () => {
    const livingRatio = livingCostForDay(51) / livingCostForDay(1)
    const wageRatio = getWageMultiplier(51) / getWageMultiplier(1)
    expect(wageRatio).toBeLessThan(livingRatio)
  })
})

/* ── 집 배율 (2026-08-05 이사 신설) ──────────────────────────────────────────
 *
 * ⚠️ **생활비는 더 이상 날짜만의 함수가 아니다** — 물가 구간 × 집 배율이다.
 * 이 묶음이 지키는 것은 두 가지: ①두 함수가 실제로 갈라져 있다 ②**물가 곡선은 집 위에
 * 그대로 얹힌다**(싼 방에 살아도 인플레는 같은 비율로 맞는다).
 */
describe('생활비 = 물가 구간 × 집 배율', () => {
  const gosiwon = HOUSINGS[HOUSINGS.length - 1]

  /** 그 집으로 옮긴 상태(돈은 넉넉히 준다 — 여기서 재는 것은 이사 조건이 아니다). */
  function living(day: number, housingId?: string) {
    let s = { ...createInitialState('물가'), day }
    s = { ...s, stats: { ...s.stats, money: 99_000_000 } }
    if (housingId) s = moveTo(s, HOUSINGS.find((h) => h.id === housingId)!)
    return getLivingCost(s)
  }

  it('이사한 적 없으면 기준 생활비 그대로다 — 배율 1', () => {
    const s = createInitialState('기본')
    expect(housingRate(s)).toBe(1)
    expect(getLivingCost(s)).toBe(livingCostForDay(s.day))
  })

  it('싼 집으로 옮기면 생활비가 그 배율만큼 내려간다', () => {
    expect(living(25, gosiwon.id)).toBe(Math.round(livingCostForDay(25) * gosiwon.rate))
    expect(living(25, gosiwon.id)).toBeLessThan(living(25))
  })

  it('⚠️ 싼 집에 살아도 물가 인상률은 똑같다 — 이사는 기울기가 아니라 상수를 바꾼다', () => {
    // 같은 두 날 사이의 배수가 집과 무관해야 "인플레를 그대로 느낀다"가 성립한다.
    const plain = living(91) / living(1)
    const cheap = living(91, gosiwon.id) / living(1, gosiwon.id)
    expect(cheap).toBeCloseTo(plain, 2)
  })

  it('모르는 매물 id가 저장돼 있어도 배율이 NaN이 되지 않는다', () => {
    // ⚠️ NaN이면 생활비가 NaN이 되고 `NaN <= 0`이 false라 **파산이 영영 안 걸린다.**
    const broken = { ...createInitialState('손상'), housing: { id: '없는방', movedDay: 1, deposit: 0 } }
    expect(housingRate(broken)).toBe(1)
    expect(Number.isFinite(getLivingCost(broken))).toBe(true)
  })

  it('예고 금액도 같은 배율을 탄다 — 두 숫자를 나란히 읽을 수 있어야 한다', () => {
    let s = { ...createInitialState('예고'), stats: { ...createInitialState('예고').stats, money: 9_000_000 } }
    s = moveTo(s, HOUSINGS.find((h) => h.id === gosiwon.id)!)
    const next = getNextTier(s.day)
    expect(tierCostFor(s, next)).toBe(Math.round(next.living * gosiwon.rate))
    // 오늘보다 비싸야 "인상 예고"라는 말이 참이 된다.
    expect(tierCostFor(s, next)).toBeGreaterThan(getLivingCost(s))
  })
})

describe('getNextTier', () => {
  it('다음 인상 구간을 반환한다', () => {
    expect(getNextTier(5).day).toBe(11)
  })

  it('표를 넘어선 날짜에서도 다음 구간을 반환한다', () => {
    // null을 반환하면 후반에 인상 경고가 사라져 압박이 전달되지 않는다.
    const next = getNextTier(999)
    expect(next.day).toBeGreaterThan(999)
    expect(next.living).toBeGreaterThan(livingCostForDay(999))
  })

  it('다음 구간은 항상 현재 날짜보다 미래다', () => {
    for (const day of [1, 10, 51, 61, 100, 137, 500]) {
      expect(getNextTier(day).day).toBeGreaterThan(day)
    }
  })
})
