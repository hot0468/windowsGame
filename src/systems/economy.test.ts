import { describe, it, expect } from 'vitest'
import {
  activeShock,
  getLivingCost,
  housingRate,
  livingCostForDay,
  nextShock,
  priceRate,
  shockCostFor,
  shockIncoming,
} from './economy'
import {
  BASE_LIVING_COST,
  FIRST_SHOCK_DAY,
  PRICE_SHOCKS,
  SHOCK_NOTICE_DAYS,
} from '../data/economy'
import { CHEAPEST_HOUSING, HOUSINGS } from '../data/housing'
import { createInitialState } from './turn'
import { moveTo } from './housing'

/*
 * ⚠️ **주기적 물가 인상은 2026-08-22에 폐지됐다**(설계자 지시). 이 묶음이 지키는 것은
 * 그 폐지가 유지되는 것이다 — 생활비는 평소에 **고정**이고, 오르는 것은 **며칠짜리 사건**뿐이다.
 * 옛 `ECONOMY_TIERS`(10일 주기 계단)를 되살리면 여기가 먼저 깨진다.
 */
describe('평시 물가는 고정이다', () => {
  it('사건이 없는 날은 며칠이 지나도 같은 금액이다', () => {
    const quiet = [1, 5, 10, 14].filter((d) => !activeShock(d))
    for (const day of quiet) expect(livingCostForDay(day)).toBe(BASE_LIVING_COST)
  })

  it('⚠️ 300일차도 1일차와 같다 — 복리로 오르지 않는다', () => {
    const day = [300, 301, 302, 303, 304, 305, 306].find((d) => !activeShock(d))!
    expect(livingCostForDay(day)).toBe(BASE_LIVING_COST)
  })

  it('첫 사건 전에는 아무 일도 없다 — 시작하자마자 급등이 오면 배경이 된다', () => {
    for (let day = 1; day < FIRST_SHOCK_DAY; day++) {
      expect(activeShock(day)).toBeUndefined()
      expect(priceRate(day)).toBe(1)
    }
  })
})

describe('물가 급등 사건', () => {
  it('사건 기간에는 그 배율만큼 오른다', () => {
    const w = nextShock(1)
    expect(activeShock(w.start)?.shock.id).toBe(w.shock.id)
    expect(livingCostForDay(w.start)).toBe(Math.round(BASE_LIVING_COST * w.shock.rate))
  })

  it('끝나면 원래대로 돌아온다 — 사건은 지나간다', () => {
    const w = nextShock(1)
    expect(activeShock(w.end)).toBeDefined()
    expect(activeShock(w.end + 1)).toBeUndefined()
    expect(livingCostForDay(w.end + 1)).toBe(BASE_LIVING_COST)
  })

  it('사건은 정해진 날수만큼만 간다', () => {
    const w = nextShock(1)
    expect(w.end - w.start + 1).toBe(w.shock.days)
  })

  it('다음 사건은 항상 미래에 있다 — 후반에도 경제가 멈추지 않는다', () => {
    for (const day of [1, 20, 100, 365, 1000]) {
      expect(nextShock(day).start).toBeGreaterThan(day)
    }
  })

  it('사건 풀을 순환한다 — 판이 길어져도 마르지 않는다', () => {
    const seen = new Set<string>()
    let day = 1
    for (let i = 0; i < PRICE_SHOCKS.length; i++) {
      const w = nextShock(day)
      seen.add(w.shock.id)
      day = w.end + 1
    }
    expect(seen.size).toBe(PRICE_SHOCKS.length)
  })

  it('⚠️ 결정적이다 — 같은 날은 언제 물어도 같은 답이다 (Math.random 금지)', () => {
    for (const day of [17, 48, 123, 400]) {
      expect(activeShock(day)?.shock.id).toBe(activeShock(day)?.shock.id)
      expect(livingCostForDay(day)).toBe(livingCostForDay(day))
    }
  })

  it('사건 사이에는 조용한 날이 훨씬 많다 — 급등이 일상이 되면 사건이 아니다', () => {
    let loud = 0
    for (let day = 1; day <= 365; day++) if (activeShock(day)) loud++
    expect(loud / 365).toBeLessThan(0.2)
  })
})

describe('예고', () => {
  it('사건 며칠 전부터 예고가 뜬다', () => {
    const w = nextShock(1)
    expect(shockIncoming(w.start - SHOCK_NOTICE_DAYS)?.shock.id).toBe(w.shock.id)
  })

  it('그 전에는 예고가 없다 — 늘 떠 있으면 경고가 배경이 된다', () => {
    const w = nextShock(1)
    expect(shockIncoming(w.start - SHOCK_NOTICE_DAYS - 1)).toBeUndefined()
  })
})

/* ── 집 배율 (2026-08-05 이사 신설) ──────────────────────────────────────────
 *
 * ⚠️ **생활비는 날짜만의 함수가 아니다** — 물가(평시 또는 급등) × 집 배율이다.
 * 이 묶음이 지키는 것은 두 가지: ①두 함수가 실제로 갈라져 있다 ②**급등은 집 위에
 * 그대로 얹힌다**(싼 방에 살아도 같은 비율로 맞는다).
 */
describe('생활비 = 물가 × 집 배율', () => {
  const gosiwon = CHEAPEST_HOUSING

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
    expect(living(5, gosiwon.id)).toBe(Math.round(livingCostForDay(5) * gosiwon.rate))
    expect(living(5, gosiwon.id)).toBeLessThan(living(5))
  })

  it('⚠️ 싼 집에 살아도 급등의 비율은 똑같다 — 이사는 폭이 아니라 상수를 바꾼다', () => {
    const w = nextShock(1)
    const plain = living(w.start) / living(w.end + 1)
    const cheap = living(w.start, gosiwon.id) / living(w.end + 1, gosiwon.id)
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
    const next = nextShock(s.day)
    expect(shockCostFor(s, next)).toBe(
      Math.round(BASE_LIVING_COST * next.shock.rate * gosiwon.rate),
    )
    // 오늘보다 비싸야 "상승 예고"라는 말이 참이 된다.
    expect(shockCostFor(s, next)).toBeGreaterThan(getLivingCost(s))
  })
})
