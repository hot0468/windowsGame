import { POSTCARD_LIST_PRICE, RESALE_RATE } from '../data/resale'
import { findItem } from '../data/items'
import { FILMS } from '../data/media'
import { clampStats, inventoryOf, owns } from './turn'
import { postcardsOf } from './cinema'
import type { ShopItem } from '../data/items'
import type { GameState, Postcard } from '../types/game'

/**
 * 중고마켓 — **가진 것을 정가의 반값에 넘긴다.**
 *
 * ⚠️ **턴을 쓰지 않는다**(쇼핑 주문·은행 창구와 같은 규칙 — "탐색은 무료"). 다만 쇼핑과
 * 방향이 반대라 **효과도 반대가 아니다**: 판다고 해서 도착할 때 받았던 스탯을 도로
 * 빼앗지 않는다. 이미 쓴 것을 되물릴 수는 없기 때문이고, 되물리면 소지금이 음수가 되어
 * 파산 판정이 엉뚱한 자리에서 터진다.
 *
 * ## ⚠️ 되사기 구멍을 막는 것이 이 파일의 핵심이다
 * 물건을 사면 도착할 때 **한 번** 스탯이 오른다(`delivery.ts`의 `collect`). 팔고 다시 사는
 * 것을 그냥 두면 **정가의 절반만 내고 그 상승분을 무한히 반복**할 수 있다. 그래서 판 물건의
 * id를 `GameState.sold`에 남기고, **다시 사서 도착해도 효과는 붙지 않는다**(`collect`가
 * 이 목록을 본다). 되사는 것 자체는 막지 않는다 — 타블렛을 팔았다가 다시 사서 그림을
 * 그릴 수는 있어야 한다. 사라지는 것은 **처음 받았을 때의 상승분**뿐이다.
 *
 * ## 무엇을 팔 수 있나
 * - **쇼핑에서 파는 물건**(`buyable !== false`)만. 수료증·졸업장은 시중에 없는 물건이라
 *   중고마켓이 받지 않는다(팔면 되살 길이 강의밖에 없어 사실상 삭제가 된다).
 * - **포스트카드**. 이쪽은 정가가 없어 `POSTCARD_LIST_PRICE`가 그 자리를 대신한다.
 */

/** 한 번 팔아 본 적 있는 물건 id. 되사도 효과가 다시 붙지 않는 근거다. */
export function soldOf(state: GameState): string[] {
  return state.sold ?? []
}

/** 이 물건을 판 적이 있는가. `delivery.ts`의 `collect`가 효과를 건너뛸 때 본다. */
export function wasSold(state: GameState, itemId: string): boolean {
  return soldOf(state).includes(itemId)
}

/** 매입가 = 정가의 반값(원 단위로 내림). 화면과 규칙이 같은 함수를 본다. */
export function sellPriceOf(price: number): number {
  return Math.floor(price * RESALE_RATE)
}

/** 포스트카드 한 장의 매입가. 장마다 다르지 않다(영화가 값을 갖지 않는다). */
export const POSTCARD_SELL_PRICE = sellPriceOf(POSTCARD_LIST_PRICE)

/**
 * 지금 팔 수 있는 물건. **가진 것 중 시중에서 파는 것**만이다.
 * 최근에 받은 것이 앞에 온다(고르는 화면이 스크롤을 덜 탄다 — `postableArtworks`와 같다).
 */
export function sellableItems(state: GameState): ShopItem[] {
  return inventoryOf(state)
    .map((entry) => findItem(entry.id))
    .filter((item): item is ShopItem => !!item && item.buyable !== false)
    .reverse()
}

/** 지금 팔 수 있는 포스트카드. 영화 정보가 없는 카드(구세이브)는 뺀다. */
export function sellablePostcards(state: GameState): Postcard[] {
  return postcardsOf(state)
    .filter((p) => FILMS.some((f) => f.id === p.filmId))
    .reverse()
}

/**
 * 물건을 판다. **인벤토리에서 빠지고 소지금이 는다.**
 *
 * ⚠️ 안 가진 물건·못 파는 물건이면 상태를 그대로 돌려준다(반쪽 상태 금지).
 * ⚠️ **`sold`에 남기는 것을 빼먹지 말 것** — 그 한 줄이 위의 되사기 구멍을 막는다.
 */
export function sellItem(state: GameState, itemId: string): GameState {
  if (state.gameOver) return state
  const item = findItem(itemId)
  if (!item || item.buyable === false || !owns(state, itemId)) return state

  return {
    ...state,
    stats: clampStats({ ...state.stats, money: state.stats.money + sellPriceOf(item.price) }),
    inventory: inventoryOf(state).filter((i) => i.id !== itemId),
    sold: wasSold(state, itemId) ? soldOf(state) : [...soldOf(state), itemId],
  }
}

/**
 * 포스트카드를 판다.
 *
 * ⚠️ **`sold`에 남기지 않는다** — 포스트카드는 사서 얻는 물건이 아니라 영화를 봐야
 * 생기는 것이고, 다시 보려면 **1턴과 관람료**를 또 낸다. 되사기 구멍이 애초에 없다.
 * (도감의 '전종 수집' 업적은 다시 못 채우게 되지만, 그건 파는 쪽이 감수하는 값이다.)
 */
export function sellPostcard(state: GameState, filmId: string): GameState {
  if (state.gameOver) return state
  if (!postcardsOf(state).some((p) => p.filmId === filmId)) return state

  return {
    ...state,
    stats: clampStats({ ...state.stats, money: state.stats.money + POSTCARD_SELL_PRICE }),
    postcards: postcardsOf(state).filter((p) => p.filmId !== filmId),
  }
}
