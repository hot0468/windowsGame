import { DEFAULT_HOUSING_ID, findHousing } from '../data/housing'
import { clampStats } from './turn'
import type { Housing } from '../data/housing'
import type { GameState, HousingState } from '../types/game'

/**
 * 이사 — 집을 옮겨 **생활비를 영구히 낮춘다.**
 *
 * ## 무엇을 사는가
 * **턴을 쓰지 않는다**(은행 거래·쇼핑 주문과 같은 규칙 — "탐색은 무료"). 비용은 슬롯이
 * 아니라 **목돈이 묶이는 것**(보증금)과 **돌아오지 않는 중개수수료**, 그리고 싼 방일수록
 * 커지는 **밤마다의 멘탈 손실**이다.
 *
 * ## 보증금은 돌려받는다 — 그래서 은행과 이어진다
 * 이사할 때 이전 집의 보증금이 소지금으로 **먼저 돌아오고**, 새 집의 보증금과 수수료가
 * 그 뒤에 빠져나간다. 그래서 실제로 필요한 현금은 **차액 + 수수료**뿐이다
 * (`moveCost`). 보증금이 사라지지 않으므로 이사는 "돈을 태우는 것"이 아니라
 * **자본을 방에 묶는 것**이고, 정기예금과 자리를 다툰다.
 *
 * ⚠️ **수수료만은 돌아오지 않는다.** 되돌릴 수 없는 비용이 하나도 없으면 이사가
 * 공짜가 되어 매일 방을 옮기는 것이 최적해가 된다.
 *
 * ## 의존 방향
 * ⚠️ `turn.ts`를 부르지만 **그 반대는 없다**(bank·employment·schedule·delivery와 같은
 * 규칙). `turn.ts`의 밤 정산이 보는 것은 `economy.ts`의 `getLivingCost(state)` 하나이고,
 * 규칙(누가 어디로 옮길 수 있고 얼마가 오가는가)은 전부 여기에 있다.
 *
 * ## 결정성
 * `Math.random`·`Date` 금지. 이사에는 굴림이 없다 — 그래서 화면이 "옮기면 하루 얼마"를
 * 거짓 없이 미리 적을 수 있다.
 */

/* ── 읽기 ─────────────────────────────────────────────────────────────── */

/** 지금 사는 집의 정의. 이사한 적이 없거나 모르는 id면 시작 원룸으로 읽는다. */
export function currentHousing(state: GameState): Housing {
  const id = state.housing?.id ?? DEFAULT_HOUSING_ID
  return findHousing(id) ?? findHousing(DEFAULT_HOUSING_ID)!
}

/**
 * 지금 묶여 있는 보증금.
 *
 * ⚠️ **매물 정의가 아니라 세이브에 박아 둔 금액을 본다**(`HousingState.deposit`).
 * 이사한 적 없는 사람만 매물 정의의 값을 쓴다 — 시작 원룸의 보증금은 "이미 낸 것"이다.
 */
export function lockedDeposit(state: GameState): number {
  return state.housing?.deposit ?? currentHousing(state).deposit
}

/**
 * 그 집으로 옮기는 데 **지금 당장 필요한 현금**. = 새 보증금 + 수수료 − 돌려받을 보증금.
 *
 * ⚠️ **음수일 수 있다**(더 싼 방으로 갈 때). 그때는 이사하면서 오히려 현금이 늘어난다 —
 * 그것이 "고시원으로 내려가는 것"이 현금 흐름 관점에서 매력적인 이유이고, 대가는
 * 멘탈로 치른다. 화면은 이 값을 그대로 적는다(음수면 "돌려받는 금액"으로 읽힌다).
 */
export function moveCost(state: GameState, target: Housing): number {
  return target.deposit + target.fee - lockedDeposit(state)
}

/**
 * 그 집으로 옮길 수 있는가.
 *
 * ⚠️ **판정은 여기 하나다.** 화면이 자기 기준으로 다시 판정하면 "버튼은 살아 있는데
 * 눌러도 안 되는" 어긋남이 생긴다(알바몬·벼룩장터와 같은 규칙).
 */
export function canMove(state: GameState, target: Housing): boolean {
  if (state.gameOver) return false
  // 살고 있는 집으로 다시 이사할 수는 없다(수수료만 나가는 무의미한 거래).
  if (currentHousing(state).id === target.id) return false
  const cost = moveCost(state, target)
  // 차액이 음수면(더 싼 방) 현금이 필요 없으므로 언제나 갈 수 있다.
  return cost <= 0 || state.stats.money >= cost
}

/** 못 옮기는 이유. 판정은 `canMove`가 하고 여기서는 **문장으로 옮기기만** 한다. */
export function moveBlockers(state: GameState, target: Housing): string[] {
  if (state.gameOver) return ['게임이 끝나 더 이상 계약할 수 없습니다.']
  if (currentHousing(state).id === target.id) return ['이미 이 집에 살고 있습니다.']
  const cost = moveCost(state, target)
  if (cost > 0 && state.stats.money < cost) {
    return [
      `계약금 ${cost.toLocaleString('ko-KR')}원이 필요합니다 — 현재 ${state.stats.money.toLocaleString('ko-KR')}원`,
    ]
  }
  return []
}

/* ── 거래 (턴을 쓰지 않는다) ───────────────────────────────────────────── */

/**
 * 이사한다. **턴을 쓰지 않는다.**
 *
 * 순서가 규칙이다: **이전 보증금 회수 → 새 보증금·수수료 납부.** 한 번의 뺄셈으로
 * 합치지 않는 이유는 **더 싼 방으로 갈 때 현금이 늘어야** 하기 때문이다 — 합쳐서
 * "잔액이 충분한가"만 물으면 고시원으로 내려가는 길이 잔액 때문에 막힌다.
 *
 * 조건이 안 되면 상태를 **그대로** 돌려준다(호출부에서 막지 않아도 안전 —
 * `deposit`·`order`와 같은 규칙).
 */
export function moveTo(state: GameState, target: Housing): GameState {
  if (!canMove(state, target)) return state

  const refunded = state.stats.money + lockedDeposit(state)
  const money = refunded - target.deposit - target.fee

  const housing: HousingState = {
    id: target.id,
    movedDay: state.day,
    // ⚠️ **낸 금액을 박아 둔다** — 나중에 매물 가격을 손봐도 이 계약의 약속은 안 바뀐다.
    deposit: target.deposit,
  }

  return { ...state, stats: clampStats({ ...state.stats, money }), housing }
}

/* ── 밤 정산 ──────────────────────────────────────────────────────────── */

/**
 * 그 집에 사는 대가로 **밤마다 깎이는 멘탈**.
 *
 * ⚠️ **싼 방이 순수한 이득이면 이사는 판단이 아니라 절차가 된다.** 생활비를 절반으로
 * 줄이는 고시원이 아무 대가도 없으면 모두가 첫날부터 고시원에 살고, 그 순간 매물이
 * 다섯 개일 이유가 사라진다. 대가를 **멘탈**로 받는 이유는 그것이 번아웃(멘탈 0 =
 * 게임오버)과 직접 이어져 있어 **다른 자원으로 갚아야 하는 빚**이 되기 때문이다.
 *
 * ⚠️ **취침 회복(5)보다 작게 잡는다** — 크면 아무것도 안 해도 멘탈이 계속 내려가
 * 시간 자체가 사형선고가 된다. 최대치인 고시원(3)도 순회복 +2를 남긴다.
 *
 * ⚠️ **실제로 빼는 것은 `turn.ts`의 취침 정산이다**(순환 의존을 피하려고 그쪽이 데이터를
 * 직접 읽는다). 여기 있는 것은 **화면이 물어보는 창구**이고, 둘이 같은 데이터 한 줄을
 * 보므로 어긋날 수 없다.
 */
export function housingMentalCost(state: GameState): number {
  return currentHousing(state).mentalPerNight
}
