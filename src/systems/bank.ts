import {
  DEPOSIT_MIN,
  DEPOSIT_RATE,
  DEPOSIT_TERM_DAYS,
  LEDGER_LIMIT,
  LOAN_DANGER_RATIO,
  LOAN_LIMIT_BASE,
  LOAN_LIMIT_SALARY_MULTIPLE,
  LOAN_MIN,
  LOAN_RATE,
  SAVINGS_RATE,
} from '../data/bank'
import { findCareer } from '../data/careers'
import { clampStats, settleRecovery } from './turn'
import type { BankEntry, BankState, GameState, TermDeposit } from '../types/game'

/**
 * 은행 — 예금(자유·정기)과 대출.
 *
 * ## 무엇을 사는가
 * **거래 자체는 턴을 쓰지 않는다**(쇼핑 주문과 같은 규칙 — "탐색은 무료"). 이 시스템의
 * 비용은 슬롯이 아니라 **기회비용·만기·이자**다:
 *  - 예금에 넣은 돈은 **오늘 밤 생활비로 못 쓴다.**
 *  - 정기예금은 만기까지 **아예 못 뺀다.**
 *  - 대출로 받은 돈에는 매일 이자가 붙어 **죽는 날을 앞당긴다.**
 *
 * ## ⚠️ 이자는 **밤에** 붙는다 — `nightPayoutPending`의 두 번째 원천이다
 * 밤 정산은 생활비를 먼저 빼고(`turn.ts`의 `sleep`), 그 뒤 `gameStore.afterTurn`이
 * 이자와 급여를 넣는다. 그 **중간**에서 파산을 확정하면 "받을 이자가 있는데 그 전에 죽었다"가
 * 되고, 이것은 급여에서 이미 한 번 터진 버그와 **같은 형태**다. 그래서 `turn.ts`의
 * `nightPayoutPending`이 급여뿐 아니라 **이 시스템의 밤 입금까지** 본다
 * (`bankNightCredit`). 밤에 돈이 들어오는 원천을 또 만들면 그때도 같은 자리에 넣어야 한다.
 *
 * ## 의존 방향
 * ⚠️ `turn.ts`를 부르지만 **그 반대는 없다**(employment·schedule·delivery와 같은 규칙).
 * `turn.ts`가 보는 것은 세이브에 이미 있는 `GameState.bank`의 **숫자 몇 개**뿐이고,
 * 규칙(얼마를 언제 어떻게 주고받는가)은 전부 여기에 있다.
 *
 * ## 결정성
 * `Math.random`·`Date` 금지. 이자는 `일수 × 이율`의 곱뿐이라 굴림이 없다 —
 * 그래서 화면이 "만기에 얼마"를 거짓 없이 미리 적을 수 있다.
 */

/* ── 읽기 ─────────────────────────────────────────────────────────────── */

/** 거래한 적 없는 은행. 구버전 세이브(`bank` 없음)를 이걸로 읽는다. */
export function emptyBank(day = 1): BankState {
  return { savings: 0, debt: 0, deposits: [], accruedDay: day, ledger: [] }
}

/** 이 판의 은행 상태. 없으면 빈 것으로 읽는다 — 호출부마다 `?? `를 적지 않기 위해서다. */
export function bankOf(state: GameState): BankState {
  return state.bank ?? emptyBank(state.day)
}

/** 묶여 있는 정기예금 원금 합계. */
export function lockedTotal(state: GameState): number {
  return bankOf(state).deposits.reduce((sum, d) => sum + d.principal, 0)
}

/**
 * 은행에 맡긴 돈 전부(자유 + 정기). **소지금은 포함하지 않는다.**
 *
 * ⚠️ 이 값을 소지금에 합쳐 파산을 판정하지 않는다 — 예금이 파산을 막아 주면
 * "통장에 돈이 있어도 오늘 밥값이 없으면 죽는다"는 이 게임의 긴장이 사라진다.
 */
export function bankedTotal(state: GameState): number {
  return bankOf(state).savings + lockedTotal(state)
}

/**
 * 대출 한도. **고용 상태가 정한다.**
 *
 * 무직이면 기본 한도뿐이고, 재직 중이면 급여의 배수가 더해진다 — 이 한 줄이
 * 은행과 정규직을 잇는다. ⚠️ 해고되면 한도가 즉시 기본으로 돌아오지만 **빚은 그대로다.**
 */
export function loanLimit(state: GameState): number {
  const career = state.employment ? findCareer(state.employment.careerId) : undefined
  return LOAN_LIMIT_BASE + (career ? career.salary * LOAN_LIMIT_SALARY_MULTIPLE : 0)
}

/** 지금 더 빌릴 수 있는 금액. 음수가 되지 않게 잘라 준다(해고로 한도가 내려간 경우). */
export function loanRoom(state: GameState): number {
  return Math.max(0, loanLimit(state) - bankOf(state).debt)
}

/** 빚이 한도에 비해 위험한 수준인가. **표시용 술어다** — 막는 규칙이 아니다. */
export function loanDanger(state: GameState): boolean {
  const limit = loanLimit(state)
  return limit > 0 && bankOf(state).debt >= limit * LOAN_DANGER_RATIO
}

/* ── 이자 계산 (순수) ──────────────────────────────────────────────────── */

/**
 * 단리 `원금 × 이율 × 일수`를 반올림해 돌려준다.
 *
 * ⚠️ **복리를 매일 곱해 쌓지 않는다.** 대신 정산 때마다 잔액에 더해지고, 다음 정산은
 * 늘어난 잔액을 본다 — 결과적으로 **일 복리**가 된다. 곱셈을 반복하지 않으므로
 * 며칠이 한 번에 흘러도(스케줄러 연쇄) 부동소수 오차가 누적되지 않는다.
 */
export function interestFor(principal: number, rate: number, days: number): number {
  if (principal <= 0 || days <= 0) return 0
  return Math.round(principal * rate * days)
}

/** 만기에 받게 될 원리금. 화면이 "며칠 뒤 얼마"를 미리 적는 근거다. */
export function maturityValue(deposit: TermDeposit): number {
  return deposit.principal + interestFor(deposit.principal, deposit.rate, DEPOSIT_TERM_DAYS)
}

/**
 * **오늘 밤 소지금으로 들어올 은행 돈** (만기가 된 정기예금의 원리금).
 *
 * ⚠️ **이 함수가 `turn.ts`의 `nightPayoutPending`에 물리는 지점이다.** 밤 정산은 생활비를
 * 먼저 빼고(`turn.ts`의 `sleep`) 만기금은 그 뒤 `afterTurn` → `advanceBank`가 넣는다.
 * 그 **중간**에서 파산을 확정하면 **만기 원리금을 손에 쥔 채 굶어 죽는다** — 급여에서
 * 이미 한 번 터졌던 것과 완전히 같은 버그다. 그래서 급여와 나란히 여기를 물어본다.
 *
 * ⚠️ **만기금은 자유예금이 아니라 소지금으로 나온다**(설계 결정). 자유예금으로 넣으면
 * 만기가 와도 플레이어가 은행에 들러 출금하기 전에는 굶어 죽으므로, "12일을 참으면
 * 그날 밤 살아난다"는 정기예금의 약속이 성립하지 않는다. **정기예금이 실제로 며칠을
 * 사 주는 것**이 이 시스템의 존재 이유다.
 *
 * 반면 **빚 이자는 소지금을 깎지 않는다**(빚에 얹힌다) — 이자 때문에 그날 밤 즉사하면
 * "빌린 돈으로 오늘을 산다"는 약속이 깨진다. 대출이 죽음을 앞당기는 방식은 즉사가 아니라
 * **갚아야 할 돈이 계속 커지는 것**이다.
 */
export function bankNightCredit(state: GameState): number {
  const bank = state.bank
  if (!bank) return 0
  return bank.deposits
    .filter((d) => state.day >= d.matureDay)
    .reduce((sum, d) => sum + maturityValue(d), 0)
}

/* ── 거래 (전부 턴을 쓰지 않는다) ──────────────────────────────────────── */

function entry(state: GameState, kind: BankEntry['kind'], amount: number): BankEntry {
  // 같은 날 같은 종류를 두 번 해도 구분돼야 한다 — 내역 길이를 섞어 키를 만든다.
  return { id: `${kind}-${state.day}-${bankOf(state).ledger.length}`, day: state.day, kind, amount }
}

/** 은행 상태를 갈아 끼우고 내역을 한 줄 남긴다. */
function write(state: GameState, bank: BankState, log: BankEntry): GameState {
  return { ...state, bank: { ...bank, ledger: [...bank.ledger, log].slice(-LEDGER_LIMIT) } }
}

/** 자유예금에 넣을 수 있는가. 게임오버·0 이하·잔액 초과면 못 넣는다. */
export function canDeposit(state: GameState, amount: number): boolean {
  return !state.recovery && amount > 0 && state.stats.money >= amount
}

/**
 * 소지금 → 자유예금. **턴을 쓰지 않는다.**
 * 조건이 안 되면 상태를 그대로 돌려준다(호출부에서 막지 않아도 안전 — `order`와 같은 규칙).
 */
export function deposit(state: GameState, amount: number): GameState {
  if (!canDeposit(state, amount)) return state
  const bank = bankOf(state)
  return write(
    {
      ...state,
      stats: clampStats({ ...state.stats, money: state.stats.money - amount }),
    },
    { ...bank, savings: bank.savings + amount },
    entry(state, 'deposit', amount),
  )
}

/** 자유예금에서 뺄 수 있는가. */
export function canWithdraw(state: GameState, amount: number): boolean {
  return !state.recovery && amount > 0 && bankOf(state).savings >= amount
}

/** 자유예금 → 소지금. **턴을 쓰지 않는다.** */
export function withdraw(state: GameState, amount: number): GameState {
  if (!canWithdraw(state, amount)) return state
  const bank = bankOf(state)
  return write(
    {
      ...state,
      stats: clampStats({ ...state.stats, money: state.stats.money + amount }),
    },
    { ...bank, savings: bank.savings - amount },
    entry(state, 'withdraw', amount),
  )
}

/** 정기예금에 들 수 있는가. 최소 금액이 있는 것은 이자가 반올림에 먹히지 않게 하기 위함이다. */
export function canOpenDeposit(state: GameState, amount: number): boolean {
  return !state.recovery && amount >= DEPOSIT_MIN && state.stats.money >= amount
}

/**
 * 소지금 → 정기예금. **만기까지 못 뺀다.**
 *
 * ⚠️ **가입 시점의 이율을 예금에 박아 둔다**(`rate`) — 나중에 이율을 고쳐도 이미 든
 * 예금의 약속은 바뀌지 않는다. 화면이 미리 보여 준 만기 금액이 거짓이 되면 안 된다.
 */
export function openDeposit(state: GameState, amount: number): GameState {
  if (!canOpenDeposit(state, amount)) return state
  const bank = bankOf(state)
  const term: TermDeposit = {
    id: `term-${state.day}-${bank.deposits.length}-${bank.ledger.length}`,
    principal: amount,
    openedDay: state.day,
    matureDay: state.day + DEPOSIT_TERM_DAYS,
    rate: DEPOSIT_RATE,
  }
  return write(
    { ...state, stats: clampStats({ ...state.stats, money: state.stats.money - amount }) },
    { ...bank, deposits: [...bank.deposits, term] },
    entry(state, 'term-open', amount),
  )
}

/** 빌릴 수 있는가. 한도·최소 금액·게임오버를 본다. */
export function canBorrow(state: GameState, amount: number): boolean {
  return !state.recovery && amount >= LOAN_MIN && amount <= loanRoom(state)
}

/**
 * 대출 실행. 소지금이 **즉시** 늘고 같은 금액이 빚으로 남는다. **턴을 쓰지 않는다.**
 *
 * 이 거래 하나가 이 시스템의 위험 전부다: 오늘의 현금은 진짜지만, 내일부터 매일
 * `LOAN_RATE`만큼 갚을 돈이 불어난다.
 */
export function borrow(state: GameState, amount: number): GameState {
  if (!canBorrow(state, amount)) return state
  const bank = bankOf(state)
  return write(
    { ...state, stats: clampStats({ ...state.stats, money: state.stats.money + amount }) },
    { ...bank, debt: bank.debt + amount },
    entry(state, 'borrow', amount),
  )
}

/** 갚을 수 있는 금액인가. 빚보다 많이 갚을 수는 없다(과납은 돈을 버리는 것이다). */
export function canRepay(state: GameState, amount: number): boolean {
  const bank = bankOf(state)
  if (state.recovery || bank.debt <= 0) return false
  return amount > 0 && amount <= state.stats.money && amount <= bank.debt
}

/**
 * 빚을 갚는다. **턴을 쓰지 않는다.**
 *
 * ⚠️ **자동 상환은 없다.** 갚는 것은 언제나 플레이어의 선택이다 — 급여가 들어오는 순간
 * 자동으로 빠져나가면 "빌려서 오늘을 산다"는 계획 자체를 세울 수 없고, 파산이 왜
 * 앞당겨졌는지도 설명할 수 없게 된다. 갚지 않으면 그냥 계속 불어난다(그게 벌이다).
 */
export function repay(state: GameState, amount: number): GameState {
  if (!canRepay(state, amount)) return state
  const bank = bankOf(state)
  return write(
    { ...state, stats: clampStats({ ...state.stats, money: state.stats.money - amount }) },
    { ...bank, debt: bank.debt - amount },
    entry(state, 'repay', amount),
  )
}

/* ── 하루 정산 ─────────────────────────────────────────────────────────── */

/**
 * **턴이 넘어간 뒤** 은행을 하루치 굴린다(`gameStore.afterTurn`이 부른다).
 *
 * 순서가 규칙이다: **만기 상환 → 이자 정산 → 게임오버 확정.**
 * 만기가 이자보다 앞인 것은 "만기 당일까지의 이자는 정기 이율로 이미 계산돼 있다"이고
 * (만기금이 자유예금에 들어간 뒤 같은 날 자유 이자를 또 받으면 이중 지급이다),
 * 게임오버가 맨 뒤인 것은 `advanceEmployment`와 **완전히 같은 이유**다.
 *
 * `accruedDay` 커서가 같은 날을 두 번 정산하는 것을 막는다 — 스케줄러 연쇄나 자동
 * 진행으로 며칠이 한 번에 흘러도 그 사이가 **전부** 정산된다(`Employment.checkedDay`와
 * 같은 장치).
 *
 * ⚠️ **거래한 적이 없으면 아무것도 하지 않는다**(`state.bank`가 없는 판). 빈 은행 상태를
 * 만들어 세이브에 얹으면 은행에 가 본 적도 없는 사람의 세이브가 커진다.
 */
export function advanceBank(state: GameState): GameState {
  const bank = state.bank
  if (!bank) return state
  const days = state.day - bank.accruedDay
  if (days <= 0) return state

  const ledger: BankEntry[] = []

  // ① 만기가 된 정기예금 — **원리금이 소지금으로 나온다**(자유예금이 아니다).
  //    그래야 만기가 온 밤에 실제로 살아남는다(`bankNightCredit` 참조).
  const matured = bank.deposits.filter((d) => state.day >= d.matureDay)
  const held = bank.deposits.filter((d) => state.day < d.matureDay)
  let payout = 0
  for (const d of matured) {
    const value = maturityValue(d)
    payout += value
    ledger.push({ id: `term-mature-${d.id}`, day: state.day, kind: 'term-mature', amount: value })
  }

  // ② 자유예금 이자와 대출 이자. **같은 일수**를 본다 — 한쪽만 며칠 밀리면
  //    "빌린 채로 시간을 멈추는" 구멍이 생긴다.
  //    ⚠️ 만기금은 이자 계산에 넣지 않는다(위 ①에서 정기 이율로 이미 받았다).
  const savingsInterest = interestFor(bank.savings, SAVINGS_RATE, days)
  const debtInterest = interestFor(bank.debt, LOAN_RATE, days)
  const savings = bank.savings + savingsInterest
  const debt = bank.debt + debtInterest
  if (savingsInterest > 0) {
    ledger.push({
      id: `interest-${state.day}-s`,
      day: state.day,
      kind: 'interest',
      amount: savingsInterest,
    })
  }
  if (debtInterest > 0) {
    ledger.push({
      id: `interest-${state.day}-d`,
      day: state.day,
      kind: 'interest',
      amount: debtInterest,
    })
  }

  const next: BankState = {
    savings,
    debt,
    deposits: held,
    accruedDay: state.day,
    ledger: [...bank.ledger, ...ledger].slice(-LEDGER_LIMIT),
  }

  // ⚠️ **맨 마지막에 딱 한 번** 확정한다(`advanceEmployment`와 같은 규칙).
  //    만기 원리금이 소지금에 들어간 **뒤에** 판정해야 "받을 돈이 있는데 그 전에 죽었다"가
  //    나오지 않는다. `afterTurn`은 이 함수를 `advanceEmployment`보다 **먼저** 부르고,
  //    두 함수 다 마지막 줄에서 `settleRecovery`를 부르므로 어느 쪽이 마지막이든 옳다
  //    (`settleRecovery`는 이미 확정된 사유를 되살리지 않는다).
  return settleRecovery({
    ...state,
    stats: payout > 0 ? clampStats({ ...state.stats, money: state.stats.money + payout }) : state.stats,
    bank: next,
  })
}

/* ── 화면이 묻는 것들 ──────────────────────────────────────────────────── */

/** 거래 내역 한 줄의 한국어 라벨. 화면이 문구를 다시 적지 않는다. */
export const LEDGER_LABELS: Record<BankEntry['kind'], string> = {
  deposit: '자유예금 입금',
  withdraw: '자유예금 출금',
  'term-open': '정기예금 가입',
  'term-mature': '정기예금 만기',
  interest: '이자',
  borrow: '대출 실행',
  repay: '대출 상환',
}

/** 그 거래가 소지금을 늘리는 방향인가. 색·부호를 화면이 두 번 판정하지 않게 한다. */
export function isInflow(kind: BankEntry['kind']): boolean {
  return kind === 'withdraw' || kind === 'borrow' || kind === 'interest' || kind === 'term-mature'
}

/** 만기까지 남은 일수. 0이면 오늘 밤 만기다. */
export function daysToMature(deposit: TermDeposit, day: number): number {
  return Math.max(0, deposit.matureDay - day)
}
