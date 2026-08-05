import { describe, it, expect } from 'vitest'
import {
  DEPOSIT_MIN,
  DEPOSIT_RATE,
  DEPOSIT_TERM_DAYS,
  LEDGER_LIMIT,
  LOAN_LIMIT_BASE,
  LOAN_LIMIT_SALARY_MULTIPLE,
  LOAN_MIN,
  LOAN_RATE,
  SAVINGS_RATE,
} from '../data/bank'
import { CAREERS } from '../data/careers'
import {
  advanceBank,
  bankNightCredit,
  bankOf,
  bankedTotal,
  borrow,
  canBorrow,
  canOpenDeposit,
  canRepay,
  deposit,
  emptyBank,
  interestFor,
  loanLimit,
  loanRoom,
  lockedTotal,
  maturityValue,
  openDeposit,
  repay,
  withdraw,
} from './bank'
import { createInitialState, nightPayoutPending, skipSlot } from './turn'
import { getLivingCost } from './economy'
import type { GameState } from '../types/game'

function fresh(overrides: Partial<GameState> = {}): GameState {
  const base = createInitialState('은행테스터')
  return { ...base, ...overrides }
}

/** 초기 소지금(30만)으로는 못 하는 큰 거래를 재기 위한 상태. */
function rich(money = 10_000_000): GameState {
  const base = fresh()
  return { ...base, stats: { ...base.stats, money } }
}

/**
 * ⚠️ **이 테스트 묶음이 이 시스템의 가장 중요한 불변식을 지킨다.**
 *
 * 대출 이율이 예금 이율보다 낮아지면 "빌려서 예금하기"가 **무위험 차익**이 된다:
 * 한도까지 빌려 정기예금에 넣고 만기마다 반복하면 소지금이 무한히 늘어나고,
 * 물가 인상이 아무리 가팔라도 판이 끝나지 않는다 — 이 프로젝트의 핵심 보증
 * ("게임은 반드시 끝난다")이 통째로 무너진다.
 *
 * 그래서 **데이터에서 직접 읽어** 부등식을 확인한다. 나중에 누가 이율을 손보다가
 * 뒤집으면 여기서 바로 터진다.
 */
describe('차익 금지 — 대출 이율 > 예금 이율', () => {
  it('대출 이율이 자유예금 이율보다 높다', () => {
    expect(LOAN_RATE).toBeGreaterThan(SAVINGS_RATE)
  })

  it('대출 이율이 정기예금 이율보다 높다 — 가장 높은 예금 이율과 비교한다', () => {
    expect(LOAN_RATE).toBeGreaterThan(DEPOSIT_RATE)
  })

  it('예금 이율 중 가장 높은 것도 대출 이율을 넘지 못한다', () => {
    expect(Math.max(SAVINGS_RATE, DEPOSIT_RATE)).toBeLessThan(LOAN_RATE)
  })

  it('실제로 빌려서 정기예금에 넣으면 만기에 손해다 (수치로 확인)', () => {
    // 규칙이 아니라 **결과**로 한 번 더 확인한다. 이율 부등식이 지켜져도 반올림이나
    // 만기 일수 차이 때문에 차익이 날 수 있으므로, 실제 금액으로 재 본다.
    const amount = 1_000_000
    const gain = maturityValue({
      id: 't',
      principal: amount,
      openedDay: 1,
      matureDay: 1 + DEPOSIT_TERM_DAYS,
      rate: DEPOSIT_RATE,
    }) - amount
    const cost = interestFor(amount, LOAN_RATE, DEPOSIT_TERM_DAYS)
    expect(cost).toBeGreaterThan(gain)
  })
})

describe('이자 계산', () => {
  it('원금·일수가 0 이하면 이자가 없다', () => {
    expect(interestFor(0, SAVINGS_RATE, 10)).toBe(0)
    expect(interestFor(100_000, SAVINGS_RATE, 0)).toBe(0)
    expect(interestFor(-100, SAVINGS_RATE, 10)).toBe(0)
  })

  it('원금 × 이율 × 일수를 반올림한다', () => {
    expect(interestFor(1_000_000, 0.004, 10)).toBe(40_000)
  })

  it('만기 원리금은 원금 + 만기 일수만큼의 이자다', () => {
    const d = { id: 't', principal: 500_000, openedDay: 3, matureDay: 3 + DEPOSIT_TERM_DAYS, rate: DEPOSIT_RATE }
    expect(maturityValue(d)).toBe(500_000 + interestFor(500_000, DEPOSIT_RATE, DEPOSIT_TERM_DAYS))
  })
})

describe('자유예금 — 넣고 뺀다', () => {
  it('소지금이 줄고 잔액이 늘어난다', () => {
    const before = fresh()
    const after = deposit(before, 100_000)
    expect(after.stats.money).toBe(before.stats.money - 100_000)
    expect(bankOf(after).savings).toBe(100_000)
  })

  it('잔액보다 많이 넣을 수 없다 — 상태를 그대로 돌려준다', () => {
    const before = fresh()
    expect(deposit(before, before.stats.money + 1)).toBe(before)
    expect(deposit(before, 0)).toBe(before)
  })

  it('넣은 만큼 다시 뺄 수 있다', () => {
    const s = withdraw(deposit(fresh(), 100_000), 40_000)
    expect(bankOf(s).savings).toBe(60_000)
    expect(s.stats.money).toBe(fresh().stats.money - 60_000)
  })

  it('없는 돈은 못 뺀다', () => {
    const s = deposit(fresh(), 50_000)
    expect(withdraw(s, 50_001)).toBe(s)
  })

  it('게임오버면 아무 거래도 되지 않는다', () => {
    const dead = fresh({ gameOver: 'bankrupt' })
    expect(deposit(dead, 10_000)).toBe(dead)
    expect(borrow(dead, LOAN_MIN)).toBe(dead)
  })

  it('예금은 소지금에 섞이지 않는다 — 파산 판정이 예금을 보면 긴장이 사라진다', () => {
    const s = deposit(fresh(), 200_000)
    expect(bankedTotal(s)).toBe(200_000)
    expect(s.stats.money).not.toBe(bankedTotal(s))
  })
})

describe('정기예금 — 묶어야 더 준다', () => {
  it('최소 금액 미만은 가입할 수 없다', () => {
    const s = fresh()
    expect(canOpenDeposit(s, DEPOSIT_MIN - 1)).toBe(false)
    expect(canOpenDeposit(s, DEPOSIT_MIN)).toBe(true)
  })

  it('가입하면 소지금이 줄고 묶인 금액이 늘어난다 — 자유예금은 그대로다', () => {
    const s = openDeposit(fresh(), DEPOSIT_MIN)
    expect(lockedTotal(s)).toBe(DEPOSIT_MIN)
    expect(bankOf(s).savings).toBe(0)
    expect(s.stats.money).toBe(fresh().stats.money - DEPOSIT_MIN)
  })

  it('가입 시점의 이율이 예금에 박힌다 — 나중에 이율을 고쳐도 약속은 안 바뀐다', () => {
    const s = openDeposit(fresh(), DEPOSIT_MIN)
    expect(bankOf(s).deposits[0].rate).toBe(DEPOSIT_RATE)
    expect(bankOf(s).deposits[0].matureDay).toBe(s.day + DEPOSIT_TERM_DAYS)
  })

  it('만기 전에는 소지금으로 돌아오지 않는다', () => {
    let s = openDeposit(fresh(), DEPOSIT_MIN)
    const money = s.stats.money
    s = advanceBank({ ...s, day: s.day + DEPOSIT_TERM_DAYS - 1 })
    expect(s.stats.money).toBe(money)
    expect(lockedTotal(s)).toBe(DEPOSIT_MIN)
  })

  it('만기가 오면 원리금이 소지금으로 나온다 — 자유예금이 아니다', () => {
    let s = openDeposit(fresh(), DEPOSIT_MIN)
    const expected = maturityValue(bankOf(s).deposits[0])
    const money = s.stats.money
    s = advanceBank({ ...s, day: s.day + DEPOSIT_TERM_DAYS })
    expect(s.stats.money).toBe(money + expected)
    expect(lockedTotal(s)).toBe(0)
    expect(expected).toBeGreaterThan(DEPOSIT_MIN)
  })

  it('정기 이율이 자유 이율보다 높다 — 묶는 대가가 있어야 계획이 보상된다', () => {
    expect(DEPOSIT_RATE).toBeGreaterThan(SAVINGS_RATE)
  })
})

describe('대출 — 한도는 고용이 정한다', () => {
  it('무직이면 기본 한도뿐이다', () => {
    expect(loanLimit(fresh())).toBe(LOAN_LIMIT_BASE)
  })

  it('재직 중이면 급여의 배수가 더해진다 — 은행과 정규직이 이어지는 지점', () => {
    const career = CAREERS[0]
    const s = fresh({
      employment: {
        careerId: career.id,
        hiredDay: 1,
        paydayDay: 99,
        attendedDays: [],
        absences: 0,
        checkedDay: 1,
      },
    })
    expect(loanLimit(s)).toBe(LOAN_LIMIT_BASE + career.salary * LOAN_LIMIT_SALARY_MULTIPLE)
    expect(loanLimit(s)).toBeGreaterThan(loanLimit(fresh()))
  })

  it('한도를 넘겨 빌릴 수 없다', () => {
    const s = fresh()
    expect(canBorrow(s, LOAN_LIMIT_BASE)).toBe(true)
    expect(canBorrow(s, LOAN_LIMIT_BASE + 1)).toBe(false)
    expect(canBorrow(s, LOAN_MIN - 1)).toBe(false)
  })

  it('빌리면 소지금이 즉시 늘고 같은 금액이 빚으로 남는다', () => {
    const before = fresh()
    const after = borrow(before, LOAN_LIMIT_BASE)
    expect(after.stats.money).toBe(before.stats.money + LOAN_LIMIT_BASE)
    expect(bankOf(after).debt).toBe(LOAN_LIMIT_BASE)
    expect(loanRoom(after)).toBe(0)
  })

  it('해고되면 한도가 내려가지만 빚은 그대로다 — 그것이 해고의 무게다', () => {
    const career = CAREERS[0]
    const employed = fresh({
      employment: {
        careerId: career.id,
        hiredDay: 1,
        paydayDay: 99,
        attendedDays: [],
        absences: 0,
        checkedDay: 1,
      },
    })
    const borrowed = borrow(employed, 1_000_000)
    const fired: GameState = { ...borrowed, employment: undefined }
    expect(bankOf(fired).debt).toBe(1_000_000)
    expect(loanLimit(fired)).toBe(LOAN_LIMIT_BASE)
    // 한도보다 빚이 크므로 더 빌릴 여지는 0이다(음수가 되면 안 된다).
    expect(loanRoom(fired)).toBe(0)
  })

  it('빚은 매일 불어난다 — 갚지 않으면 계속 커진다', () => {
    let s = borrow(fresh(), LOAN_LIMIT_BASE)
    const start = bankOf(s).debt
    s = advanceBank({ ...s, day: s.day + 10 })
    expect(bankOf(s).debt).toBe(start + interestFor(start, LOAN_RATE, 10))
    expect(bankOf(s).debt).toBeGreaterThan(start)
  })

  it('빚 이자는 소지금을 깎지 않는다 — 이자로 즉사시키지 않는다', () => {
    let s = borrow(fresh(), LOAN_LIMIT_BASE)
    const money = s.stats.money
    s = advanceBank({ ...s, day: s.day + 10 })
    expect(s.stats.money).toBe(money)
  })

  it('갚으면 소지금이 줄고 빚이 준다. 빚보다 많이 갚을 수는 없다', () => {
    const s = borrow(fresh(), LOAN_LIMIT_BASE)
    expect(canRepay(s, LOAN_LIMIT_BASE + 1)).toBe(false)
    const paid = repay(s, 100_000)
    expect(bankOf(paid).debt).toBe(LOAN_LIMIT_BASE - 100_000)
    expect(paid.stats.money).toBe(s.stats.money - 100_000)
  })

  it('빚이 없으면 갚을 것도 없다', () => {
    const s = fresh()
    expect(canRepay(s, 10_000)).toBe(false)
    expect(repay(s, 10_000)).toBe(s)
  })
})

describe('정산 커서 — 같은 날을 두 번 계산하지 않는다', () => {
  it('같은 날 다시 정산해도 이자가 더 붙지 않는다', () => {
    let s = deposit(rich(), 1_000_000)
    s = advanceBank({ ...s, day: s.day + 5 })
    const once = bankOf(s).savings
    s = advanceBank(s)
    expect(bankOf(s).savings).toBe(once)
  })

  it('며칠이 한 번에 흘러도 그 사이가 전부 정산된다 — 스케줄러 연쇄 대응', () => {
    const start = deposit(rich(), 1_000_000)
    const jumped = advanceBank({ ...start, day: start.day + 8 })
    // 하루씩 여덟 번 돌린 것보다 작지 않아야 한다(단리로 한 번에 계산하므로 조금 작을 수 있다).
    let stepped = start
    for (let i = 0; i < 8; i++) stepped = advanceBank({ ...stepped, day: stepped.day + 1 })
    expect(bankOf(jumped).savings).toBeGreaterThan(1_000_000)
    expect(bankOf(stepped).savings).toBeGreaterThanOrEqual(bankOf(jumped).savings)
  })

  it('거래한 적 없는 판은 은행 상태를 만들지 않는다 — 세이브를 부풀리지 않는다', () => {
    const s = fresh()
    expect(s.bank).toBeUndefined()
    expect(advanceBank({ ...s, day: 30 }).bank).toBeUndefined()
  })

  it('빈 은행은 잔액 0으로 읽힌다', () => {
    expect(bankOf(fresh())).toEqual(emptyBank(1))
    expect(bankedTotal(fresh())).toBe(0)
  })
})

describe('거래 내역', () => {
  it('거래마다 한 줄이 남고 종류가 기록된다', () => {
    let s = deposit(fresh(), 100_000)
    s = withdraw(s, 50_000)
    s = borrow(s, LOAN_MIN)
    const kinds = bankOf(s).ledger.map((e) => e.kind)
    expect(kinds).toEqual(['deposit', 'withdraw', 'borrow'])
  })

  it('내역이 무한히 자라지 않는다', () => {
    let s = fresh({ stats: { ...fresh().stats, money: 100_000_000 } })
    for (let i = 0; i < LEDGER_LIMIT + 20; i++) s = deposit(s, 1000)
    expect(bankOf(s).ledger.length).toBe(LEDGER_LIMIT)
  })
})

/**
 * **밤 정산의 순서 — 만기 원리금도 급여와 똑같이 우선한다** (2026-08-05).
 *
 * ## 왜 이 테스트가 있는가
 * 급여에서 이미 한 번 터졌던 버그다: 밤 정산이 생활비를 먼저 빼고 입금이 그 뒤에
 * 일어나는데 파산 판정이 그 **중간**에 있으면, **손에 쥘 돈이 있는 채로 굶어 죽는다.**
 * `turn.ts`의 `nightPayoutPending`이 그 판정을 미루는 술어이고, 그 doc 주석은
 * **"밤에 돈이 들어오는 원천을 새로 만들면 여기에 함께 넣어라"**라고 못 박고 있다.
 * 정기예금 만기가 바로 그 두 번째 원천이므로, 급여 쪽과 **짝이 되는 테스트**를 둔다.
 *
 * ⚠️ 아래 둘은 짝이다. 위만 있으면 파산을 통째로 못 걸게 만들어도 통과하므로,
 * 만기가 아닌 밤에는 **여전히 파산한다**는 것을 함께 못 박는다.
 */
describe('밤 정산의 순서 — 만기 원리금이 우선한다', () => {
  /** 잔고가 그날 생활비보다 적은, 만기 전날 밤. */
  function brokeOnMaturityEve(): GameState {
    const day = 20
    const base = fresh({ day, slot: 'afternoon' })
    // 생활비를 내고 나면 0 이하가 되는 잔고 + 오늘 밤 만기가 오는 정기예금.
    return {
      ...base,
      stats: { ...base.stats, money: getLivingCost(day) - 1000 },
      bank: {
        ...emptyBank(day),
        deposits: [
          {
            id: 'term-test',
            principal: 500_000,
            openedDay: day - DEPOSIT_TERM_DAYS + 1,
            matureDay: day + 1,
            rate: DEPOSIT_RATE,
          },
        ],
      },
    }
  }

  it('만기가 오는 밤에 잔고가 바닥나도 원리금이 들어와 살아남는다', () => {
    const before = brokeOnMaturityEve()
    const living = getLivingCost(before.day)
    expect(before.stats.money).toBeLessThan(living)
    // 아직 만기가 아니므로 이 시점에는 미루지 않는다.
    expect(nightPayoutPending(before)).toBe(false)

    // 오후를 넘긴다 = 취침 정산(생활비 차감)이 일어나고 날이 만기일로 바뀐다.
    const night = skipSlot(before)
    expect(night.day).toBe(before.day + 1)
    // 이 시점의 잔고는 0 이하다 — 순서를 안 지키면 여기서 파산이 확정된다.
    expect(night.stats.money).toBeLessThanOrEqual(0)
    // ⚠️ **그러나 아직 판정하지 않는다.** 오늘 밤 나올 만기 원리금이 남아 있다.
    expect(nightPayoutPending(night)).toBe(true)
    expect(night.gameOver).toBeNull()

    const credit = bankNightCredit(night)
    expect(credit).toBeGreaterThan(500_000)

    const settled = advanceBank(night)
    // 원리금이 들어왔으니 살아 있어야 한다. 이것이 이 테스트의 전부다.
    expect(settled.stats.money).toBe(night.stats.money + credit)
    expect(settled.stats.money).toBeGreaterThan(0)
    expect(settled.gameOver).toBeNull()
  })

  it('만기가 아닌 밤에 바닥나면 그대로 파산한다 — 파산이 사라지면 안 된다', () => {
    const base = brokeOnMaturityEve()
    // 같은 상황에서 만기만 멀리 밀어 둔다.
    const before: GameState = {
      ...base,
      bank: { ...base.bank!, deposits: [{ ...base.bank!.deposits[0], matureDay: base.day + 30 }] },
    }
    expect(nightPayoutPending(before)).toBe(false)

    const night = skipSlot(before)
    expect(night.stats.money).toBeLessThanOrEqual(0)
    // 나올 돈이 없는 밤이므로 **그 자리에서** 파산이 확정된다(미루지 않는다).
    expect(night.gameOver).toBe('bankrupt')
    expect(advanceBank(night).gameOver).toBe('bankrupt')
  })

  it('은행 거래가 없으면 미루지 않는다 — 밸런스 시뮬레이션이 이 성질에 기대고 있다', () => {
    // `balance.verify.test.ts`의 기존 시뮬레이션은 `runActivity`/`skipSlot`만 부른다.
    // 미루기가 은행을 안 쓴 판에까지 번지면 그 시뮬레이션이 영원히 안 끝난다.
    const base = fresh({ day: 20, slot: 'afternoon' })
    const broke: GameState = {
      ...base,
      stats: { ...base.stats, money: getLivingCost(20) - 1000 },
    }
    expect(nightPayoutPending(broke)).toBe(false)
    expect(skipSlot(broke).gameOver).toBe('bankrupt')
  })

  it('빚만 있는 판은 미루지 않는다 — 빚은 들어올 돈이 아니다', () => {
    const s = borrow(fresh({ day: 20 }), LOAN_MIN)
    expect(nightPayoutPending(s)).toBe(false)
  })
})
