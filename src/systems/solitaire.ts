/**
 * 솔리테어(클론다이크) 규칙.
 *
 * ⚠️ **이 게임은 육성 게임의 상태를 한 톨도 건드리지 않는다.** 시작 메뉴 항목은
 * "게임 바깥의 도구"라는 규칙(`data/startMenu.ts`)을 그대로 따른다 — 스탯도 턴도 돈도
 * 움직이지 않으므로 밸런스 테스트·번아웃·엔딩 판정과 무관하다. 판은 창 안에서만 살고
 * 창을 닫으면 사라진다(그래서 세이브에도, 어떤 store에도 들어가지 않는다).
 *
 * ⚠️ **`Math.random`을 쓰지 않는다**(systems 규칙). 섞기는 **시드를 받아** 돌리고
 * 시드는 화면이 판을 시작할 때 정한다 — 복권(`systems/lottery.ts`)과 같은 방식이다.
 * 덕분에 테스트가 "이 시드의 판은 이렇게 깔린다"를 단언할 수 있다.
 */

export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs'

/** 정렬·기초 더미 순서의 단일 출처. 기초 더미 4개가 이 순서로 놓인다. */
export const SUITS: readonly Suit[] = ['spades', 'hearts', 'diamonds', 'clubs']

/** 무늬 기호. 화면은 이 표만 읽는다(컴포넌트에 기호를 다시 적지 않는다). */
export const SUIT_SYMBOLS: Record<Suit, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
}

/** 스크린 리더용 이름. 기호(♠)는 읽히지 않거나 "검은 스페이드 슈트"로 길게 읽힌다. */
export const SUIT_NAMES: Record<Suit, string> = {
  spades: '스페이드',
  hearts: '하트',
  diamonds: '다이아몬드',
  clubs: '클럽',
}

/** A·J·Q·K만 글자다. 숫자를 그대로 쓰면 1·11·12·13이 카드에 뜬다. */
const RANK_LABELS: Record<number, string> = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' }

export const rankLabel = (rank: number): string => RANK_LABELS[rank] ?? String(rank)

export interface Card {
  /** `hearts-12` 같은 고유 id. 52장이 서로 다르므로 React key로 그대로 쓴다. */
  id: string
  suit: Suit
  /** A=1 … K=13. 화면 글자는 `rankLabel`이 만든다. */
  rank: number
  faceUp: boolean
}

/** 빨강 무늬. "같은 색 위에는 못 놓는다"는 규칙의 유일한 판단 지점이다. */
export const isRed = (card: Card): boolean => card.suit === 'hearts' || card.suit === 'diamonds'

/**
 * 더미 이름. 문자열 하나로 두는 것이 의도다 — DOM 키·클릭 핸들러·선택 상태가
 * 전부 이 값을 그대로 나른다(객체로 두면 비교 때마다 풀어 헤쳐야 한다).
 */
export type PileId = 'stock' | 'waste' | `f${number}` | `t${number}`

export interface SolitaireState {
  /** 뒤집어 놓은 산. 클릭하면 한 장씩 나온다. */
  stock: Card[]
  /** 뽑아 놓은 자리. 맨 뒤가 지금 쓸 수 있는 한 장이다. */
  waste: Card[]
  /** 기초 더미 4개(무늬별, `SUITS` 순서). A부터 K까지 쌓으면 이긴다. */
  foundations: Card[][]
  /** 작업 더미 7개. */
  tableau: Card[][]
}

/** 한 판에 뽑는 장수. 1장 뽑기(윈도우 기본)다 — 3장 뽑기로 바꾸려면 이 값만 고친다. */
export const DRAW_COUNT = 1

/* ── 섞기 ────────────────────────────────────────────────────────────────── */

/** mulberry32. 검증된 상수를 그대로 쓴다(사유는 `systems/lottery.ts` 주석 참조). */
function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** 52장 한 벌. 순서는 항상 같고 섞는 것은 `deal`이 한다. */
function freshDeck(): Card[] {
  return SUITS.flatMap((suit) =>
    Array.from({ length: 13 }, (_, i) => ({
      id: `${suit}-${i + 1}`,
      suit,
      rank: i + 1,
      faceUp: false,
    })),
  )
}

/**
 * 시드 하나로 한 판을 깐다.
 *
 * 작업 더미는 1·2·3…7장이고 **각 더미의 맨 위 한 장만 앞면**이다(클론다이크 규칙).
 * 남은 24장이 산이 된다.
 */
export function deal(seed: number): SolitaireState {
  const rand = mulberry32(seed)
  const deck = freshDeck()
  // Fisher-Yates. 앞에서부터 섞으면 분포가 치우친다 — 뒤에서부터가 정석이다.
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[deck[i], deck[j]] = [deck[j], deck[i]]
  }

  const tableau: Card[][] = []
  let at = 0
  for (let col = 0; col < 7; col++) {
    const pile = deck.slice(at, at + col + 1).map((c) => ({ ...c }))
    at += col + 1
    pile[pile.length - 1].faceUp = true
    tableau.push(pile)
  }

  return {
    stock: deck.slice(at).map((c) => ({ ...c })),
    waste: [],
    foundations: SUITS.map(() => []),
    tableau,
  }
}

/* ── 더미 읽기 ───────────────────────────────────────────────────────────── */

/** 더미 하나의 카드 목록. 없는 이름이면 빈 배열이다(화면이 실수해도 터지지 않는다). */
export function pileOf(state: SolitaireState, pile: PileId): Card[] {
  if (pile === 'stock') return state.stock
  if (pile === 'waste') return state.waste
  const index = Number(pile.slice(1))
  const piles = pile[0] === 'f' ? state.foundations : state.tableau
  return piles[index] ?? []
}

/** 맨 위 한 장(없으면 undefined). 작업·기초 더미 모두 배열 끝이 위다. */
const topOf = (cards: Card[]): Card | undefined => cards[cards.length - 1]

/* ── 규칙 ────────────────────────────────────────────────────────────────── */

/** 기초 더미에 놓을 수 있는가 — 같은 무늬로 A부터 한 장씩. */
function acceptsOnFoundation(foundation: Card[], card: Card): boolean {
  const top = topOf(foundation)
  if (!top) return card.rank === 1
  return top.suit === card.suit && card.rank === top.rank + 1
}

/** 작업 더미에 놓을 수 있는가 — 색을 번갈아 한 장씩 내려가고, 빈 자리는 K만. */
function acceptsOnTableau(tableau: Card[], card: Card): boolean {
  const top = topOf(tableau)
  if (!top) return card.rank === 13
  return isRed(top) !== isRed(card) && card.rank === top.rank - 1
}

/**
 * `from`의 `cardIndex`번째 카드부터를 `to`로 옮길 수 있는가.
 *
 * ⚠️ **여러 장을 한 번에 옮기는 것은 작업 더미끼리뿐이다.** 기초 더미는 한 장씩만
 * 받는다(그래야 A부터 쌓인다는 규칙이 성립한다).
 */
export function canMove(
  state: SolitaireState,
  from: PileId,
  cardIndex: number,
  to: PileId,
): boolean {
  if (from === to || from === 'stock' || to === 'stock' || to === 'waste') return false

  const source = pileOf(state, from)
  const moving = source.slice(cardIndex)
  if (moving.length === 0) return false
  // 뒤집힌 카드는 잡을 수 없다 — 무엇인지 모르는 카드를 옮기는 규칙은 없다.
  if (moving.some((c) => !c.faceUp)) return false

  if (to[0] === 'f') {
    if (moving.length !== 1) return false
    return acceptsOnFoundation(pileOf(state, to), moving[0])
  }

  // 작업 더미로 옮기는 여러 장은 **그 자체로 이미 규칙에 맞게 이어져 있어야** 한다.
  for (let i = 1; i < moving.length; i++) {
    if (!acceptsOnTableau([moving[i - 1]], moving[i])) return false
  }
  return acceptsOnTableau(pileOf(state, to), moving[0])
}

/** 더미 하나를 바꾼 새 상태. systems는 상태를 갈아엎지 않는다(새 객체를 만든다). */
function withPile(state: SolitaireState, pile: PileId, cards: Card[]): SolitaireState {
  if (pile === 'stock') return { ...state, stock: cards }
  if (pile === 'waste') return { ...state, waste: cards }
  const index = Number(pile.slice(1))
  if (pile[0] === 'f') {
    return { ...state, foundations: state.foundations.map((p, i) => (i === index ? cards : p)) }
  }
  return { ...state, tableau: state.tableau.map((p, i) => (i === index ? cards : p)) }
}

/**
 * 옮긴다. **규칙에 안 맞으면 `null`** — 화면은 그때 아무 일도 일으키지 않는다
 * (조용히 원래 상태를 돌려주면 "왜 안 움직였지"와 "움직였는데 같아 보인다"를 구분 못 한다).
 *
 * ⚠️ **드러난 뒤집힌 카드는 여기서 뒤집는다.** 화면에 맡기면 실행 통로마다
 * (클릭 이동·더블클릭 자동 이동) 같은 코드를 적게 되고 한쪽을 반드시 빠뜨린다.
 */
export function move(
  state: SolitaireState,
  from: PileId,
  cardIndex: number,
  to: PileId,
): SolitaireState | null {
  if (!canMove(state, from, cardIndex, to)) return null

  const source = pileOf(state, from)
  const moving = source.slice(cardIndex)
  const rest = source.slice(0, cardIndex)
  // 옮기고 나서 드러난 카드가 뒤집혀 있으면 앞면으로 돌린다(작업 더미에서만 생긴다).
  const exposed = rest[rest.length - 1]
  const restFlipped =
    exposed && !exposed.faceUp
      ? [...rest.slice(0, -1), { ...exposed, faceUp: true }]
      : rest

  let next = withPile(state, from, restFlipped)
  next = withPile(next, to, [...pileOf(next, to), ...moving])
  return next
}

/**
 * 산에서 한 장 뽑는다. **산이 비어 있으면 뽑아 놓은 자리를 되돌려 다시 산으로 만든다**
 * (뒤집어 쌓으므로 순서가 뒤집힌다 — 실제 카드와 같다).
 */
export function draw(state: SolitaireState): SolitaireState {
  if (state.stock.length === 0) {
    if (state.waste.length === 0) return state
    return {
      ...state,
      stock: [...state.waste].reverse().map((c) => ({ ...c, faceUp: false })),
      waste: [],
    }
  }
  const count = Math.min(DRAW_COUNT, state.stock.length)
  const drawn = state.stock.slice(state.stock.length - count).map((c) => ({ ...c, faceUp: true }))
  return {
    ...state,
    stock: state.stock.slice(0, state.stock.length - count),
    // 뽑은 순서대로 쌓인다 — 맨 뒤가 지금 쓸 수 있는 한 장이다.
    waste: [...state.waste, ...drawn.reverse()],
  }
}

/**
 * 더블클릭 자동 이동: 이 카드를 받아 줄 **기초 더미**를 찾아 옮긴다.
 * 없으면 `null`(작업 더미로는 자동으로 보내지 않는다 — 어디로 갈지가 하나로 정해지지 않고,
 * 플레이어가 원치 않는 자리로 옮겨 놓으면 되돌릴 길이 없다).
 */
export function sendToFoundation(state: SolitaireState, from: PileId): SolitaireState | null {
  const cards = pileOf(state, from)
  if (cards.length === 0) return null
  const index = cards.length - 1
  for (let i = 0; i < state.foundations.length; i++) {
    const next = move(state, from, index, `f${i}`)
    if (next) return next
  }
  return null
}

/** 52장이 전부 기초 더미에 올라갔는가. */
export const isWon = (state: SolitaireState): boolean =>
  state.foundations.reduce((n, pile) => n + pile.length, 0) === 52
