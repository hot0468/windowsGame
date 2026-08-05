import { describe, it, expect } from 'vitest'
import {
  advanceLottery,
  affordableTickets,
  buyTickets,
  canBuyTickets,
  expectedValue,
  lotteryNightCredit,
  payoutRatio,
  prizeForRoll,
  ticketRoll,
} from './lottery'
import { LOTTERY_PRIZES, MAX_TICKETS_PER_BUY, TICKET_PRICE } from '../data/lottery'
import { createInitialState, nightPayoutPending } from './turn'
import type { GameState } from '../types/game'

function rich(over: Partial<GameState> = {}): GameState {
  const s = createInitialState('복권')
  return { ...s, stats: { ...s.stats, money: 10_000_000 }, ...over }
}

/* ── 기대값 ───────────────────────────────────────────────────────────────
 *
 * ⚠️ **이 묶음이 "복권이 수입원이 되는 것"을 막는다.** 표가 자기 값을 하면 파산 보증이
 * 죽는다 — 은행의 이율 부등식(`bank.test.ts`)과 정확히 같은 자리의 같은 장치다.
 */
describe('⚠️ 기대값은 반드시 표 값보다 낮다', () => {
  it('상금표에서 직접 계산한 기대값이 표 값 미만이다', () => {
    // ⚠️ **데이터에서 계산한다** — 상수를 적어 두면 상금을 올려도 테스트가 안 터진다.
    const ev = LOTTERY_PRIZES.reduce((sum, p) => sum + p.amount / p.odds, 0)
    expect(ev).toBe(expectedValue())
    expect(ev).toBeLessThan(TICKET_PRICE)
  })

  it('환급률이 100% 미만이다 — 사면 반드시 잃는 쪽이다', () => {
    expect(payoutRatio()).toBeLessThan(100)
    // 실제 로또(약 50%)보다도 박하게 잡아 뒀다. 복권은 며칠을 사 주지 않는다.
    expect(payoutRatio()).toBeLessThan(50)
  })

  it('상금표는 확률이 낮을수록 상금이 크다 — 순서가 뒤집히면 등수가 무의미하다', () => {
    for (let i = 1; i < LOTTERY_PRIZES.length; i++) {
      expect(LOTTERY_PRIZES[i].odds).toBeLessThan(LOTTERY_PRIZES[i - 1].odds)
      expect(LOTTERY_PRIZES[i].amount).toBeLessThan(LOTTERY_PRIZES[i - 1].amount)
    }
  })

  it('1등은 "엄청 낮은" 확률이다 (설계자 지시)', () => {
    expect(LOTTERY_PRIZES[0].odds).toBeGreaterThanOrEqual(1_000_000)
  })

  it('⚠️ 아무것도 안 터지는 복권이 아니다 — 최하 등수는 자주 걸린다', () => {
    // 하나도 안 걸리면 "돈을 지우는 버튼"이라 두 번째 장을 살 이유가 없다.
    const easiest = LOTTERY_PRIZES[LOTTERY_PRIZES.length - 1]
    expect(easiest.odds).toBeLessThanOrEqual(20)
  })

  it('큰 표본의 실제 환급이 기대값 근처다 — 굴림이 표를 배신하지 않는다', () => {
    let won = 0
    const N = 200_000
    for (let serial = 1; serial <= N; serial++) {
      won += prizeForRoll(ticketRoll(serial))?.amount ?? 0
    }
    // 1등(100만분의 1)이 표본에 끼면 크게 튀므로 상한을 넉넉히 둔다.
    // 핵심은 **아래쪽**이다: 표본 환급이 표 값을 넘지 않는다.
    expect(won / N).toBeLessThan(TICKET_PRICE)
  })
})

/* ── 독립 시행 · 결정성 ───────────────────────────────────────────────────
 *
 * 설계자 지시: "복권은 살때마다 확률이 새로 나온다니까"
 */
describe('한 장 한 장이 새로 굴러간다', () => {
  it('일련번호가 다르면 굴림도 다르다', () => {
    const rolls = new Set<number>()
    for (let i = 1; i <= 500; i++) rolls.add(ticketRoll(i))
    // 500번 굴려 값이 겹치면 시드가 섞이지 않은 것이다.
    expect(rolls.size).toBe(500)
  })

  it('한 번에 다섯 장을 사면 다섯 번 따로 굴린다', () => {
    const s = buyTickets(rich(), 5)
    const ids = (s.lottery?.tickets ?? []).map((t) => t.id)
    expect(ids.length).toBe(5)
    expect(new Set(ids).size).toBe(5)
    expect(s.lottery?.serial).toBe(5)
  })

  it('두 번 나눠 사도 일련번호가 이어진다 — 같은 표를 두 번 굴리지 않는다', () => {
    const once = buyTickets(rich(), 2)
    const twice = buyTickets(once, 2)
    expect(twice.lottery?.serial).toBe(4)
    const ids = (twice.lottery?.tickets ?? []).map((t) => t.id)
    expect(new Set(ids).size).toBe(4)
  })

  /**
   * ⚠️ **세이브 스커밍 차단.** 이미 산 표가 새로 고침 때 다시 굴러가면
   * "결과가 마음에 안 들면 새로 고침"이 최적 전략이 된다.
   */
  it('⚠️ 같은 일련번호는 언제 물어도 같은 결과다 — 새로 고침해도 재굴림이 없다', () => {
    for (const serial of [1, 7, 42, 999, 123_456]) {
      expect(ticketRoll(serial)).toBe(ticketRoll(serial))
      expect(prizeForRoll(ticketRoll(serial))?.label).toBe(prizeForRoll(ticketRoll(serial))?.label)
    }
  })

  it('같은 상태에서 같은 수를 사면 결과가 완전히 같다 (결정성)', () => {
    const a = buyTickets(rich(), 3)
    const b = buyTickets(rich(), 3)
    expect(a.lottery?.tickets).toEqual(b.lottery?.tickets)
    expect(a.lottery?.won).toBe(b.lottery?.won)
  })

  it('한 장이 두 등급에 동시에 당첨되지 않는다', () => {
    // 아주 작은 굴림 값은 1등 구간에도 6등 구간에도 들어가지만 위에서 먼저 걸린다.
    expect(prizeForRoll(0)?.label).toBe(LOTTERY_PRIZES[0].label)
  })
})

/* ── 구매 규칙 ────────────────────────────────────────────────────────── */
describe('구매', () => {
  it('표 값이 즉시 나간다', () => {
    const before = rich()
    const after = buyTickets(before, 2)
    expect(after.stats.money).toBe(before.stats.money - TICKET_PRICE * 2)
    expect(after.lottery?.spent).toBe(TICKET_PRICE * 2)
  })

  it('⚠️ 턴을 쓰지 않는다 — 날짜도 슬롯도 그대로다', () => {
    const before = rich()
    const after = buyTickets(before, 1)
    expect(after.day).toBe(before.day)
    expect(after.slot).toBe(before.slot)
  })

  it('잔액이 모자라면 아무것도 하지 않는다 (반쪽 상태 금지)', () => {
    const poor = { ...rich(), stats: { ...rich().stats, money: TICKET_PRICE - 1 } }
    expect(canBuyTickets(poor, 1)).toBe(false)
    expect(buyTickets(poor, 1)).toBe(poor)
  })

  it('1회 상한을 넘겨 살 수 없다 — 한 번에 몰아 사서 분산을 없애지 못한다', () => {
    const s = rich()
    expect(canBuyTickets(s, MAX_TICKETS_PER_BUY)).toBe(true)
    expect(canBuyTickets(s, MAX_TICKETS_PER_BUY + 1)).toBe(false)
    // 같은 객체를 그대로 돌려준다(반쪽 상태를 남기지 않는다).
    expect(buyTickets(s, MAX_TICKETS_PER_BUY + 1)).toBe(s)
  })

  it('살 수 있는 장수는 잔액과 상한 중 작은 쪽이다', () => {
    expect(affordableTickets(rich())).toBe(MAX_TICKETS_PER_BUY)
    const thin = { ...rich(), stats: { ...rich().stats, money: TICKET_PRICE * 2 } }
    expect(affordableTickets(thin)).toBe(2)
  })

  it('게임오버면 살 수 없다', () => {
    const dead = { ...rich(), gameOver: 'bankrupt' as const }
    expect(canBuyTickets(dead, 1)).toBe(false)
    expect(buyTickets(dead, 1)).toBe(dead)
  })
})

/* ── 밤 정산 ──────────────────────────────────────────────────────────────
 *
 * ⚠️ **급여·정기예금 만기와 나란한 세 번째 원천이다.** 이 묶음이 없으면
 * "당첨금을 손에 쥔 채 굶어 죽는" 버그가 그대로 재현된다.
 */
describe('⚠️ 당첨금은 밤에 들어온다 — 그 전에 죽지 않는다', () => {
  /** 반드시 당첨되는 일련번호를 찾아 그 직전 상태를 만든다. */
  function winningSerial(): number {
    for (let i = 1; i < 100_000; i++) if (prizeForRoll(ticketRoll(i))) return i
    throw new Error('당첨되는 표가 없다 — 상금표가 비었는가?')
  }

  it('당첨금은 즉시가 아니라 pending에 담긴다', () => {
    const serial = winningSerial() - 1
    const before = { ...rich(), lottery: { serial, spent: 0, won: 0, tickets: [], pending: 0 } }
    const after = buyTickets(before, 1)
    expect(after.lottery!.pending).toBeGreaterThan(0)
    // 소지금은 표 값만큼 **줄어 있다** — 상금은 아직 안 들어왔다.
    expect(after.stats.money).toBe(before.stats.money - TICKET_PRICE)
  })

  it('⚠️ 입금이 남은 밤에는 게임오버 판정을 미룬다 (급여·만기와 같은 자리)', () => {
    const s = { ...rich(), lottery: { serial: 3, spent: 0, won: 0, tickets: [], pending: 50_000 } }
    expect(lotteryNightCredit(s)).toBe(50_000)
    expect(nightPayoutPending(s)).toBe(true)
  })

  it('당첨금이 없으면 미루지 않는다 — 무직·무거래는 그 자리에서 판정된다', () => {
    const s = { ...rich(), lottery: { serial: 3, spent: 0, won: 0, tickets: [], pending: 0 } }
    expect(nightPayoutPending(s)).toBe(false)
  })

  it('밤 정산이 소지금에 넣고 pending을 비운다', () => {
    const s = { ...rich(), lottery: { serial: 3, spent: 0, won: 0, tickets: [], pending: 70_000 } }
    const after = advanceLottery(s)
    expect(after.stats.money).toBe(s.stats.money + 70_000)
    expect(after.lottery!.pending).toBe(0)
  })

  /**
   * ⚠️ **이것이 이 묶음의 본체다.** 생활비를 낸 직후 소지금이 0 이하인데 당첨금이
   * 남아 있으면, 그 밤의 마지막 지점(`advanceLottery`)에서 살아나야 한다.
   */
  it('생활비로 잔액이 0이 됐어도 당첨금이 들어오면 파산이 아니다', () => {
    const s: GameState = {
      ...rich(),
      stats: { ...rich().stats, money: -5_000 },
      lottery: { serial: 3, spent: 0, won: 0, tickets: [], pending: 200_000 },
    }
    const after = advanceLottery(s)
    expect(after.stats.money).toBe(195_000)
    expect(after.gameOver).toBeNull()
  })

  it('당첨금을 받고도 여전히 0 이하면 파산으로 확정된다', () => {
    const s: GameState = {
      ...rich(),
      stats: { ...rich().stats, money: -50_000 },
      lottery: { serial: 3, spent: 0, won: 0, tickets: [], pending: 10_000 },
    }
    expect(advanceLottery(s).gameOver).toBe('bankrupt')
  })

  it('⚠️ 산 적이 없으면 아무것도 하지 않는다 — 빈 기록을 세이브에 얹지 않는다', () => {
    const s = rich()
    expect(advanceLottery(s)).toBe(s)
    expect(s.lottery).toBeUndefined()
  })
})
