import {
  LOTTERY_LOG_LIMIT,
  LOTTERY_PRIZES,
  MAX_TICKETS_PER_BUY,
  TICKET_PRICE,
} from '../data/lottery'
import { clampStats, settleGameOver } from './turn'
import type { GameState, LotteryState, LotteryTicket } from '../types/game'

/**
 * 복권 — **살 때마다 새로 굴린다.**
 *
 * ## ⚠️ `Math.random` 금지 — 그런데 복권은 무작위여야 한다
 * 이 프로젝트는 결정성을 규칙으로 못 박았다(테스트 전체와 새로 고침 동작이 거기 달려
 * 있다). 그래서 굴림을 **시드 PRNG**로 만든다. 시드에 **구매 일련번호**(`serial`)가
 * 들어가므로:
 *  - 한 장 한 장이 **독립 시행**이다(설계자 지시: "살 때마다 확률이 새로 나온다").
 *  - 일련번호가 세이브에 남으므로 **새로 고침해도 이미 산 표는 다시 굴러가지 않는다.**
 *    ⚠️ 이게 없으면 결과가 마음에 안 들 때 새로 고침하는 것이 **최적 전략**이 된다
 *    (세이브 스커밍). 그 순간 복권은 분산 장치가 아니라 무한 상금 버튼이 된다.
 *
 * ## ⚠️ 기대값은 반드시 음수다
 * 표가 자기 값을 하면 복권은 수입원이 되고 "판은 반드시 끝난다"는 보증이 죽는다.
 * 상금표의 기대값(2,750원)이 표 값(10,000원)보다 낮다는 것을 `lottery.test.ts`가
 * **데이터에서 직접 계산해** 지킨다 — 은행의 이율 부등식과 같은 장치다.
 *
 * ## ⚠️ 상금은 밤에 들어온다 — `nightPayoutPending`의 세 번째 원천
 * 오후에 산 표가 당첨됐는데 그날 밤 생활비를 못 내면 **상금을 손에 쥔 채 굶어 죽는다** —
 * 급여·정기예금 만기에서 이미 두 번 터진 것과 **완전히 같은 버그**다. 그래서
 * `LotteryState.pending`에 담아 두고 밤 정산(`advanceLottery`)이 소지금에 넣는다.
 *
 * ## 의존 방향
 * ⚠️ `turn.ts`를 부르지만 **그 반대는 없다**. `turn.ts`가 보는 것은 세이브에 이미 있는
 * `GameState.lottery.pending`의 **숫자 하나**뿐이고, 규칙은 전부 여기에 있다.
 */

/* ── 시드 PRNG ─────────────────────────────────────────────────────────── */

/**
 * 32비트 정수 하나를 [0, 1) 실수로 흩뿌린다 (mulberry32).
 *
 * ⚠️ **`Math.random`의 대역이 아니라 순수 함수다** — 같은 시드는 언제나 같은 값을 준다.
 * 그래서 테스트가 "정확히 이 표가 이 등수에 당첨된다"를 단언할 수 있고,
 * 새로 고침해도 이미 산 표의 결과가 바뀌지 않는다.
 *
 * 곱셈 상수는 mulberry32의 것을 그대로 쓴다. 직접 고르지 않는 이유는 분포가
 * 눈으로는 판별되지 않기 때문이다 — 검증된 것을 쓴다.
 */
function mulberry32(seed: number): number {
  let t = (seed + 0x6d2b79f5) | 0
  t = Math.imul(t ^ (t >>> 15), 1 | t)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

/**
 * 한 장의 굴림 값. **일련번호가 시드다.**
 *
 * 날짜를 섞지 않는 것이 의도다: 같은 날 다섯 장을 사도 다섯 번 다르게 굴러야 하고,
 * 일련번호는 그 자체로 절대 겹치지 않는다. 날짜를 섞으면 오히려 "같은 날 같은 번호"라는
 * 충돌 경로가 생긴다.
 *
 * `serial * 2654435761`은 Knuth의 곱셈 해시 — 연속한 일련번호(1, 2, 3…)가 시드
 * 공간에 고르게 흩어지게 한다. 안 흩으면 이웃한 표들의 결과가 서로 닮는다.
 */
export function ticketRoll(serial: number): number {
  return mulberry32(Math.imul(serial, 2654435761) >>> 0)
}

/* ── 판정 ─────────────────────────────────────────────────────────────── */

/**
 * 굴림 값 하나를 등수로 바꾼다. 아무 데도 안 걸리면 undefined(꽝).
 *
 * ⚠️ **표 순서대로 위(희귀·고액)부터 묻는다** — 그래야 한 장이 두 등급에 동시에
 * 당첨되지 않는다. `roll < 1/odds`가 그 등급의 당첨 구간이고, 구간은 겹치지만
 * 위에서 먼저 걸리므로 실제 확률은 표에 적힌 그대로가 아니라 **위 등급을 뺀 나머지**다
 * (그 차이는 1등 100만분의 1 수준이라 기대값 계산에 영향이 없고, 테스트는
 * **위험한 쪽으로 안전하게** 표 값 그대로 계산한다 — 실제 환급률은 그보다 더 낮다).
 */
export function prizeForRoll(roll: number) {
  return LOTTERY_PRIZES.find((p) => roll < 1 / p.odds)
}

/* ── 읽기 ─────────────────────────────────────────────────────────────── */

/** 산 적 없는 사람의 복권 상태. 구버전 세이브를 이걸로 읽는다. */
export function emptyLottery(): LotteryState {
  return { serial: 0, spent: 0, won: 0, tickets: [], pending: 0 }
}

export function lotteryOf(state: GameState): LotteryState {
  return state.lottery ?? emptyLottery()
}

/** 몇 장까지 살 수 있는가. 잔액과 1회 상한 중 작은 쪽이다. */
export function affordableTickets(state: GameState): number {
  if (state.gameOver) return 0
  return Math.min(MAX_TICKETS_PER_BUY, Math.floor(state.stats.money / TICKET_PRICE))
}

/** 그만큼 살 수 있는가. */
export function canBuyTickets(state: GameState, count: number): boolean {
  return count >= 1 && count <= affordableTickets(state)
}

/**
 * **오늘 밤 소지금으로 들어올 상금.**
 *
 * ⚠️ 이 함수가 `turn.ts`의 `nightPayoutPending`에 물리는 지점이다(급여·정기예금 만기와
 * 나란히). 밤 정산은 생활비를 먼저 빼고 상금은 그 뒤 `advanceLottery`가 넣으므로,
 * 그 중간에서 파산을 확정하면 **당첨금을 쥔 채 굶어 죽는다.**
 */
export function lotteryNightCredit(state: GameState): number {
  return state.lottery?.pending ?? 0
}

/* ── 구매 (턴을 쓰지 않는다) ───────────────────────────────────────────── */

/**
 * 복권을 산다. **턴을 쓰지 않는다**(은행 거래·쇼핑 주문과 같은 규칙).
 *
 * 표 값은 **즉시** 나가고 상금은 **그날 밤** 들어온다. 이 시차가 의도다 —
 * 당첨금이 즉시 들어오면 "복권으로 오늘 생활비를 낸다"가 되어 복권이 생계 수단이 된다.
 * 하루를 기다려야 하므로 복권은 여전히 **오늘을 갉아 내일에 거는 일**이다.
 *
 * 조건이 안 되면 상태를 **그대로** 돌려준다(호출부에서 막지 않아도 안전).
 */
export function buyTickets(state: GameState, count: number): GameState {
  if (!canBuyTickets(state, count)) return state
  const lot = lotteryOf(state)

  const bought: LotteryTicket[] = []
  let won = 0
  for (let i = 0; i < count; i++) {
    // ⚠️ **일련번호는 장마다 1씩 올라간다** — 그것이 곧 독립 시행이다.
    const serial = lot.serial + i + 1
    const prize = prizeForRoll(ticketRoll(serial))
    won += prize?.amount ?? 0
    bought.push({
      id: `ticket-${serial}`,
      day: state.day,
      prize: prize?.label,
      amount: prize?.amount ?? 0,
    })
  }

  const spent = count * TICKET_PRICE

  return {
    ...state,
    stats: clampStats({ ...state.stats, money: state.stats.money - spent }),
    lottery: {
      serial: lot.serial + count,
      spent: lot.spent + spent,
      won: lot.won + won,
      // 최신이 앞에 오게 쌓는다 — 화면이 정렬을 다시 하지 않는다.
      tickets: [...bought.reverse(), ...lot.tickets].slice(0, LOTTERY_LOG_LIMIT),
      // ⚠️ 상금은 **오늘 밤** 들어온다(위 주석). 여기서 소지금에 바로 넣지 않는다.
      pending: lot.pending + won,
    },
  }
}

/* ── 밤 정산 ──────────────────────────────────────────────────────────── */

/**
 * **턴이 넘어간 뒤** 당첨금을 소지금에 넣는다(`gameStore.afterTurn`이 부른다).
 *
 * ⚠️ **맨 마지막에 딱 한 번** 게임오버를 확정한다(`advanceBank`·`advanceEmployment`와
 * 같은 규칙). 상금이 소지금에 들어간 **뒤에** 판정해야 "받을 돈이 있는데 그 전에
 * 죽었다"가 나오지 않는다.
 *
 * ⚠️ **산 적이 없으면 아무것도 하지 않는다** — 빈 복권 상태를 세이브에 얹으면
 * 복권을 사 본 적 없는 사람의 세이브가 커진다(`advanceBank`와 같은 규칙).
 */
export function advanceLottery(state: GameState): GameState {
  const lot = state.lottery
  if (!lot || lot.pending <= 0) return state
  return settleGameOver({
    ...state,
    stats: clampStats({ ...state.stats, money: state.stats.money + lot.pending }),
    lottery: { ...lot, pending: 0 },
  })
}

/* ── 화면이 묻는 것들 ──────────────────────────────────────────────────── */

/**
 * 상금표의 **기대값**(표 한 장당). 화면이 이 값을 그대로 적는다.
 *
 * ⚠️ **감추지 않는다.** 실제 복권은 환급률을 작은 글씨로 적지만, 이 게임에서는
 * 플레이어가 "이건 손해 보는 거래다"를 알고 누르는 것이 정직함의 조건이다
 * (확정 패널이 경고를 반드시 적는 것과 같은 규칙).
 */
export function expectedValue(): number {
  return LOTTERY_PRIZES.reduce((sum, p) => sum + p.amount / p.odds, 0)
}

/** 환급률(%). 표 값 대비 기대값. */
export function payoutRatio(): number {
  return (expectedValue() / TICKET_PRICE) * 100
}
