import { describe, it, expect } from 'vitest'
import {
  canMove,
  currentHousing,
  housingMentalCost,
  lockedDeposit,
  moveBlockers,
  moveCost,
  moveTo,
} from './housing'
import { DEFAULT_HOUSING_ID, HOUSINGS, findHousing } from '../data/housing'
import { getLivingCost } from './economy'
import { createInitialState, runActivity, skipSlot } from './turn'
import { findActivity } from '../data/activities'
import type { GameState } from '../types/game'

const gosiwon = HOUSINGS.find((h) => h.id === 'gosiwon')!
const villa = HOUSINGS.find((h) => h.id === 'villa')!
const rooftop = HOUSINGS.find((h) => h.id === 'rooftop')!

function withMoney(money: number, over: Partial<GameState> = {}): GameState {
  const s = createInitialState('이사')
  return { ...s, stats: { ...s.stats, money }, ...over }
}

describe('매물 정의', () => {
  it('id가 중복되지 않는다', () => {
    const ids = HOUSINGS.map((h) => h.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('첫 항목이 기본 집이고 배율은 1이다', () => {
    expect(HOUSINGS[0].id).toBe(DEFAULT_HOUSING_ID)
    expect(HOUSINGS[0].rate).toBe(1)
    expect(HOUSINGS[0].fee).toBe(0)
  })

  /**
   * ⚠️ **이 방향이 뒤집히면 이사가 첫날의 공짜 이득이 된다.** 보증금은 돌려주는 돈이라,
   * 싼 방의 보증금이 더 싸면 내려가는 것만으로 현금이 늘어난다 — 그러면 모두가
   * 1일차에 고시원으로 가고 이사는 판단이 아니라 절차가 된다.
   *
   * ⚠️ **생활비 방향(rate)은 할인 사다리(rate ≤ 1)에만 건다**(2026-08-17) — 사치 칸은
   * 정의상 rate가 올라간다. **보증금 오름차순은 배열 전체다**: 사치 칸의 보증금이
   * 사다리보다 작으면 위 공짜 이득이 그쪽에서 다시 열린다.
   */
  it('⚠️ 아래로 갈수록 생활비는 싸지고, 보증금은 전 목록에서 비싸진다', () => {
    const ladder = HOUSINGS.filter((h) => h.rate <= 1)
    for (let i = 1; i < ladder.length; i++) {
      expect(ladder[i].rate).toBeLessThan(ladder[i - 1].rate)
    }
    for (let i = 1; i < HOUSINGS.length; i++) {
      expect(HOUSINGS[i].deposit).toBeGreaterThan(HOUSINGS[i - 1].deposit)
    }
  })

  /**
   * ⚠️ **사치 칸의 규칙**(2026-08-17): 후반 돈 싱크라 배율이 1보다 커야 하고(그것이
   * 싱크의 본체), 밤 보너스는 취침 회복(5)을 넘보면 안 된다 — 집이 회복 활동 네 곳을
   * 대체하면 사치가 아니라 정답이 된다.
   */
  it('⚠️ 사치 칸은 배율이 1보다 크고 밤 보너스는 3을 넘지 않는다', () => {
    const luxury = HOUSINGS.filter((h) => h.rate > 1)
    expect(luxury.length).toBeGreaterThan(0)
    for (const h of luxury) {
      expect(h.mentalPerNight).toBeLessThanOrEqual(0)
      expect(h.mentalPerNight).toBeGreaterThanOrEqual(-3)
      // 사다리 순서와 같은 규칙: 비싼 삶일수록 배율도 보너스도 크다.
    }
    for (let i = 1; i < luxury.length; i++) {
      expect(luxury[i].rate).toBeGreaterThan(luxury[i - 1].rate)
    }
  })

  it('⚠️ 어느 매물로 옮겨도 지금 당장 현금이 든다 — 공짜 이사가 없다', () => {
    const s = createInitialState('현금')
    for (const h of HOUSINGS.slice(1)) expect(moveCost(s, h)).toBeGreaterThan(0)
  })

  /**
   * ⚠️ **싼 방이 순수한 이득이면 이사는 판단이 아니라 절차가 된다.**
   * 생활비를 크게 깎는 방일수록 밤마다의 멘탈 대가가 커야 한다(할인 사다리만 —
   * 사치 칸의 음수 보너스는 위 전용 묶음이 지킨다).
   */
  it('⚠️ 싼 방일수록 대가가 크다 — 공짜 이득이 없다', () => {
    const ladder = HOUSINGS.filter((h) => h.rate <= 1)
    for (let i = 1; i < ladder.length; i++) {
      expect(ladder[i].mentalPerNight).toBeGreaterThanOrEqual(ladder[i - 1].mentalPerNight)
    }
    expect(gosiwon.mentalPerNight).toBeGreaterThan(0)
  })

  /**
   * ⚠️ **취침 회복(5)보다 작아야 한다.** 크면 아무것도 안 해도 멘탈이 계속 내려가
   * 시간 자체가 사형선고가 된다 — 번아웃을 피할 방법이 없어진다.
   */
  it('⚠️ 어떤 방도 취침 회복보다 많이 갉지 않는다', () => {
    for (const h of HOUSINGS) expect(h.mentalPerNight).toBeLessThan(5)
  })

  /**
   * ⚠️ **시작 소지금(300,000원)으로는 아무 데도 못 간다**는 것이 설계다 —
   * 이사는 "번 다음에 하는 투자"이지 시작 옵션이 아니다.
   */
  it('⚠️ 첫날 소지금으로는 어느 매물로도 이사할 수 없다', () => {
    const day1 = createInitialState('첫날')
    for (const h of HOUSINGS.slice(1)) expect(canMove(day1, h)).toBe(false)
  })
})

describe('현재 집 읽기', () => {
  it('이사한 적 없으면 시작 원룸이다', () => {
    expect(currentHousing(createInitialState('기본')).id).toBe(DEFAULT_HOUSING_ID)
  })

  it('모르는 id가 저장돼 있어도 기본 집으로 읽는다 (NaN 생활비 방지)', () => {
    const broken = { ...createInitialState('손상'), housing: { id: '없음', movedDay: 1, deposit: 0 } }
    expect(currentHousing(broken).id).toBe(DEFAULT_HOUSING_ID)
    expect(Number.isFinite(getLivingCost(broken))).toBe(true)
  })

  it('묶인 보증금은 계약 시점에 낸 금액이다 — 매물 정의를 다시 읽지 않는다', () => {
    const moved = moveTo(withMoney(3_000_000), villa)
    expect(lockedDeposit(moved)).toBe(villa.deposit)
    // 정의가 바뀌어도 세이브의 값이 이긴다.
    const stale = { ...moved, housing: { ...moved.housing!, deposit: 999 } }
    expect(lockedDeposit(stale)).toBe(999)
  })
})

describe('계약금 = 새 보증금 + 수수료 − 돌려받을 보증금', () => {
  it('이전 보증금이 계약금에서 그대로 차감된다', () => {
    const s = withMoney(3_000_000)
    expect(moveCost(s, villa)).toBe(villa.deposit + villa.fee - HOUSINGS[0].deposit)
  })

  it('싼 방일수록 계약금이 크다 — 생활비를 깎는 값을 선불로 낸다', () => {
    const s = withMoney(9_000_000)
    expect(moveCost(s, gosiwon)).toBeGreaterThan(moveCost(s, villa))
  })

  it('이미 옮긴 뒤에는 그 집의 보증금을 돌려받는 것으로 계산한다', () => {
    const moved = moveTo(withMoney(9_000_000), rooftop)
    expect(moveCost(moved, gosiwon)).toBe(gosiwon.deposit + gosiwon.fee - rooftop.deposit)
  })
})

describe('이사', () => {
  it('⚠️ 턴을 쓰지 않는다 — 날짜도 슬롯도 그대로다', () => {
    const before = withMoney(3_000_000)
    const after = moveTo(before, villa)
    expect(after.day).toBe(before.day)
    expect(after.slot).toBe(before.slot)
  })

  it('⚠️ 보증금은 돌려받고 수수료만 사라진다', () => {
    const before = withMoney(3_000_000)
    const after = moveTo(before, villa)
    expect(after.stats.money).toBe(
      before.stats.money + HOUSINGS[0].deposit - villa.deposit - villa.fee,
    )
    expect(after.housing).toMatchObject({ id: villa.id, deposit: villa.deposit })
  })

  it('생활비가 즉시 내려간다 — 이것이 이 장치의 전부다', () => {
    const before = withMoney(9_000_000)
    const after = moveTo(before, gosiwon)
    expect(getLivingCost(after)).toBeLessThan(getLivingCost(before))
    expect(getLivingCost(after)).toBe(Math.round(getLivingCost(before) * gosiwon.rate))
  })

  it('돈이 모자라면 아무것도 하지 않는다 (반쪽 상태 금지)', () => {
    const poor = withMoney(0)
    expect(canMove(poor, gosiwon)).toBe(false)
    expect(moveTo(poor, gosiwon)).toBe(poor)
    expect(moveBlockers(poor, gosiwon)[0]).toContain('계약금')
  })

  it('살고 있는 집으로는 다시 이사할 수 없다 — 수수료만 나가는 거래', () => {
    const s = withMoney(9_000_000)
    expect(canMove(s, HOUSINGS[0])).toBe(false)
    expect(moveBlockers(s, HOUSINGS[0])[0]).toContain('이미')
    const moved = moveTo(s, villa)
    expect(canMove(moved, villa)).toBe(false)
  })

  it('게임오버면 계약할 수 없다', () => {
    const dead = withMoney(9_000_000, { recovery: { kind: 'bankrupt', startedDay: 1, daysLeft: 3 } })
    expect(canMove(dead, villa)).toBe(false)
    expect(moveTo(dead, villa)).toBe(dead)
  })

  /**
   * ⚠️ **매몰비용은 수수료뿐이다.** 되돌릴 수 없는 비용이 하나도 없으면
   * 이사가 공짜가 되어 매일 방을 옮기는 것이 최적해가 된다.
   */
  it('⚠️ 왕복하면 수수료 두 번만큼 손해다 — 이사가 공짜가 아니다', () => {
    const start = withMoney(5_000_000)
    const there = moveTo(start, rooftop)
    const back = moveTo(there, HOUSINGS[0])
    expect(back.stats.money).toBe(start.stats.money - rooftop.fee)
    expect(back.housing!.id).toBe(HOUSINGS[0].id)
  })
})

describe('밤마다 치르는 대가', () => {
  it('기본 집은 대가가 없다', () => {
    expect(housingMentalCost(createInitialState('기본'))).toBe(0)
  })

  it('⚠️ 취침 정산이 실제로 멘탈을 깎는다 — 화면 표시만이 아니다', () => {
    const base = withMoney(5_000_000, { slot: 'afternoon' })
    const cheap = moveTo(base, gosiwon)
    const plainNight = skipSlot({ ...base, stats: { ...base.stats, mental: 50 } })
    const cheapNight = skipSlot({ ...cheap, stats: { ...cheap.stats, mental: 50 } })
    expect(cheapNight.stats.mental).toBe(plainNight.stats.mental - gosiwon.mentalPerNight)
  })

  it('⚠️ 사치 칸은 밤마다 멘탈을 더한다 — 음수 대가가 실제 보너스다', () => {
    const luxury = HOUSINGS.find((h) => h.rate > 1)!
    const base = withMoney(9_000_000, { slot: 'afternoon' })
    const rich = moveTo(base, luxury)
    expect(rich).not.toBe(base) // 이사가 실제로 됐는지부터 — 안 되면 아래 비교가 헛돈다.
    const plainNight = skipSlot({ ...base, stats: { ...base.stats, mental: 50 } })
    const richNight = skipSlot({ ...rich, stats: { ...rich.stats, mental: 50 } })
    expect(richNight.stats.mental).toBe(plainNight.stats.mental - luxury.mentalPerNight)
  })

  it('그래도 하룻밤 순회복은 양수다 — 시간 자체가 사형선고면 안 된다', () => {
    const s = moveTo(withMoney(5_000_000, { slot: 'afternoon' }), gosiwon)
    const night = skipSlot({ ...s, stats: { ...s.stats, mental: 50 } })
    expect(night.stats.mental).toBeGreaterThan(50)
  })

  it('생활비 차감도 집 배율을 탄다 — 정산과 표시가 같은 함수를 본다', () => {
    const s = moveTo(withMoney(5_000_000, { slot: 'afternoon' }), gosiwon)
    const night = skipSlot(s)
    expect(night.stats.money).toBe(s.stats.money - getLivingCost(s))
  })

  it('활동으로 밤을 넘겨도 같다 (통로가 둘이라 둘 다 확인한다)', () => {
    const study = findActivity('study')!
    const s = moveTo(withMoney(5_000_000, { slot: 'afternoon' }), gosiwon)
    const night = runActivity(s, study)
    const spent = study.effects.money ?? 0
    expect(night.stats.money).toBe(s.stats.money + spent - getLivingCost(s))
  })
})

describe('찾기', () => {
  it('없는 id는 undefined', () => {
    expect(findHousing('없음')).toBeUndefined()
    expect(findHousing(gosiwon.id)).toBe(gosiwon)
  })
})
