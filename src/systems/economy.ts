import {
  BASE_LIVING_COST,
  FIRST_SHOCK_DAY,
  PRICE_SHOCKS,
  SHOCK_GAP,
  SHOCK_JITTER,
  SHOCK_NOTICE_DAYS,
} from '../data/economy'
import { DEFAULT_HOUSING_ID, findHousing } from '../data/housing'
import type { GameState, PriceShock, ShockWindow } from '../types/game'

/**
 * 물가 — **평소에는 고정, 가끔 며칠 흔들린다**(2026-08-22 설계자 지시).
 *
 * ⚠️ **주기적 인상(`ECONOMY_TIERS`)을 되살리지 말 것.** 사유는 `data/economy.ts`에 있다.
 *
 * ⚠️ **무작위가 아니다.** 사건이 언제 오는지는 날짜의 순수 함수다(뉴스·실검과 같은 결정성
 * 규칙 — `Math.random` 금지). 같은 날 창을 닫았다 열면 물가가 달라지는 것은 정보가 아니라
 * 소음이고, 밸런스 시뮬레이션도 재현할 수 없게 된다.
 */

/** n번째(0부터) 사건이 시작하는 날. 간격에 결정적 지터를 더해 주기성을 흐린다. */
function shockStart(index: number): number {
  return FIRST_SHOCK_DAY + index * SHOCK_GAP + ((index * 7) % SHOCK_JITTER)
}

/** n번째 사건의 내용. 풀을 순환한다 — 판이 길어져도 사건이 마르지 않는다. */
function shockAt(index: number): PriceShock {
  return PRICE_SHOCKS[index % PRICE_SHOCKS.length]
}

/**
 * 그날에 걸쳐 있는(또는 곧 올) 사건 창.
 *
 * ⚠️ **인덱스를 순회로 찾지 않는다** — 300일차에서 열 번 도는 것이 비싸서가 아니라,
 * 시작일이 지터 때문에 단조롭게 증가한다는 사실을 한 곳에서만 쓰기 위해서다.
 */
function windowAt(index: number): ShockWindow {
  const start = shockStart(index)
  const shock = shockAt(index)
  return { shock, start, end: start + shock.days - 1 }
}

/** 오늘 진행 중인 급등. 평시면 undefined. */
export function activeShock(day: number): ShockWindow | undefined {
  if (day < FIRST_SHOCK_DAY) return undefined
  for (let i = Math.max(0, Math.floor((day - FIRST_SHOCK_DAY) / SHOCK_GAP) - 1); ; i++) {
    const w = windowAt(i)
    if (w.start > day) return undefined
    if (day <= w.end) return w
  }
}

/**
 * 아직 오지 않은 다음 급등. **항상 값이 있다**(사건 풀이 순환하므로).
 * 뉴스 예고와 스탯창이 이 값을 읽는다 — 언제 흔들릴지 모르면 대비할 수가 없다.
 */
export function nextShock(day: number): ShockWindow {
  for (let i = Math.max(0, Math.floor((day - FIRST_SHOCK_DAY) / SHOCK_GAP) - 1); ; i++) {
    const w = windowAt(i)
    if (w.start > day) return w
  }
}

/** 예고 기간에 들어왔는가. 뉴스가 이때부터 "곧 온다"고 적는다. */
export function shockIncoming(day: number): ShockWindow | undefined {
  const next = nextShock(day)
  return next.start - day <= SHOCK_NOTICE_DAYS ? next : undefined
}

/** 오늘의 물가 배율. 평시 1, 급등 중이면 그 사건의 배율. */
export function priceRate(day: number): number {
  return activeShock(day)?.shock.rate ?? 1
}

/**
 * **집 배율을 곱하지 않은** 그 날의 기준 생활비.
 *
 * ⚠️ **화면에도 정산에도 이 값을 쓰지 않는다.** 플레이어가 실제로 내는 돈은
 * `getLivingCost(state)`이고, 이 함수는 **물가 자체를 재는 자리**(뉴스, 물가 테스트)에만
 * 쓴다. 이름에 `ForDay`가 붙어 있는 것이 그 경고다 — 정산 경로에서 이 함수를 보면
 * 그 화면은 이사한 플레이어에게 거짓말을 하는 것이다.
 */
export function livingCostForDay(day: number): number {
  return Math.round(BASE_LIVING_COST * priceRate(day))
}

/**
 * 지금 사는 집의 생활비 배율. 이사한 적이 없으면 1이다.
 *
 * 모르는 매물 id가 저장돼 있으면(데이터에서 매물을 지운 경우) 기본 집으로 읽는다 —
 * 배율을 못 찾아 NaN이 되면 생활비가 NaN이 되고 `NaN <= 0`이 false라
 * **파산이 영영 안 걸린다**(`reviveBank`가 막는 것과 같은 사고 형태).
 */
export function housingRate(state: GameState): number {
  const id = state.housing?.id ?? DEFAULT_HOUSING_ID
  return findHousing(id)?.rate ?? findHousing(DEFAULT_HOUSING_ID)?.rate ?? 1
}

/**
 * **오늘 밤 실제로 빠져나가는 생활비.** = 기준 생활비 × 급등 배율 × 집 배율.
 *
 * ⚠️ **생활비를 읽는 모든 곳이 이 함수를 지나야 한다** — 밤 정산, 스탯창 안내,
 * 자동 진행 위험선, 확정 패널 경고, 작업 관리자, 포털, 은행, 밸런스 시뮬레이션.
 * 하나라도 `livingCostForDay`에 남으면 **그 화면만 조용히 이사 전 금액을 보여 준다**
 * (숫자가 틀린 UI는 규칙이 틀린 것보다 알아채기 어렵다).
 *
 * ⚠️ **곱하는 순서가 규칙이다: 물가가 먼저, 집이 나중.** 그래야 급등이 그대로 위에
 * 얹힌다 — **싼 방에 사는 사람도 급등을 똑같은 비율로 맞는다.** 이사는 사건의 폭을
 * 바꾸는 것이 아니라 **상수를 줄이는 것**이다.
 */
export function getLivingCost(state: GameState): number {
  return Math.round(livingCostForDay(state.day) * housingRate(state))
}

/**
 * 급등이 왔을 때 내가 낼 생활비. 예고 줄이 이 값을 적는다.
 *
 * ⚠️ 예고가 기준값을 그대로 적으면 **이사한 플레이어에게만 거짓말**을 한다("오늘 21,600원 →
 * 곧 45,000원"처럼 이사 전 금액으로 튀어 보인다). 오늘 금액과 예고 금액이 **같은 배율 위에**
 * 있어야 두 숫자를 나란히 읽을 수 있다.
 */
export function shockCostFor(state: GameState, w: ShockWindow): number {
  return Math.round(BASE_LIVING_COST * w.shock.rate * housingRate(state))
}
