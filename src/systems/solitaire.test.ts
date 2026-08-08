import { describe, it, expect } from 'vitest'
import {
  canMove,
  deal,
  draw,
  isWon,
  move,
  pileOf,
  sendToFoundation,
  SUITS,
} from './solitaire'
import type { Card, SolitaireState, Suit } from './solitaire'

const card = (suit: Suit, rank: number, faceUp = true): Card => ({
  id: `${suit}-${rank}`,
  suit,
  rank,
  faceUp,
})

/** 빈 판. 검사할 더미만 채워 쓴다(딜한 판으로 규칙을 재면 시드에 끌려다닌다). */
const empty = (): SolitaireState => ({
  stock: [],
  waste: [],
  foundations: SUITS.map(() => []),
  tableau: Array.from({ length: 7 }, () => []),
})

describe('deal', () => {
  it('52장이 빠짐없이, 한 장도 겹치지 않게 깔린다', () => {
    const s = deal(7)
    const all = [...s.stock, ...s.waste, ...s.foundations.flat(), ...s.tableau.flat()]
    expect(all).toHaveLength(52)
    expect(new Set(all.map((c) => c.id)).size).toBe(52)
  })

  it('작업 더미는 1~7장이고 맨 위 한 장만 앞면이다', () => {
    const s = deal(7)
    s.tableau.forEach((pile, i) => {
      expect(pile).toHaveLength(i + 1)
      expect(pile.filter((c) => c.faceUp)).toHaveLength(1)
      expect(pile[pile.length - 1].faceUp).toBe(true)
    })
    expect(s.stock).toHaveLength(24)
  })

  it('같은 시드는 같은 판을 준다 — 새로 고쳐도 판이 바뀌지 않는다', () => {
    const ids = (s: SolitaireState) => s.tableau.flat().map((c) => c.id)
    expect(ids(deal(42))).toEqual(ids(deal(42)))
    expect(ids(deal(42))).not.toEqual(ids(deal(43)))
  })
})

describe('작업 더미 규칙', () => {
  it('색이 번갈아 한 장씩 내려갈 때만 놓인다', () => {
    const s = empty()
    s.tableau[0] = [card('spades', 8)]
    s.tableau[1] = [card('hearts', 7)]
    s.tableau[2] = [card('clubs', 7)]
    // 검정 8 위에 빨강 7 → 된다 / 검정 7 → 안 된다.
    expect(canMove(s, 't1', 0, 't0')).toBe(true)
    expect(canMove(s, 't2', 0, 't0')).toBe(false)
  })

  it('빈 자리에는 K만 놓인다', () => {
    const s = empty()
    s.tableau[0] = [card('hearts', 13)]
    s.tableau[1] = [card('hearts', 12)]
    expect(canMove(s, 't0', 0, 't6')).toBe(true)
    expect(canMove(s, 't1', 0, 't6')).toBe(false)
  })

  it('여러 장은 그 묶음이 이미 규칙에 맞을 때만 함께 옮겨진다', () => {
    const s = empty()
    s.tableau[0] = [card('spades', 9)]
    // 빨강8 → 검정7: 이어져 있다.
    s.tableau[1] = [card('hearts', 8), card('clubs', 7)]
    // 빨강8 → 빨강7: 이어져 있지 않다.
    s.tableau[2] = [card('hearts', 8), card('diamonds', 7)]
    expect(canMove(s, 't1', 0, 't0')).toBe(true)
    expect(canMove(s, 't2', 0, 't0')).toBe(false)
  })

  it('뒤집힌 카드는 잡을 수 없다', () => {
    const s = empty()
    s.tableau[0] = [card('spades', 8)]
    s.tableau[1] = [card('hearts', 7, false)]
    expect(canMove(s, 't1', 0, 't0')).toBe(false)
  })

  it('옮기고 나서 드러난 뒤집힌 카드는 앞면이 된다', () => {
    const s = empty()
    s.tableau[0] = [card('spades', 8)]
    s.tableau[1] = [card('diamonds', 3, false), card('hearts', 7)]
    const next = move(s, 't1', 1, 't0')!
    expect(next.tableau[1]).toHaveLength(1)
    expect(next.tableau[1][0].faceUp).toBe(true)
  })
})

describe('기초 더미 규칙', () => {
  it('A부터 같은 무늬로만 쌓인다', () => {
    const s = empty()
    s.tableau[0] = [card('hearts', 1)]
    s.tableau[1] = [card('hearts', 2)]
    s.tableau[2] = [card('spades', 2)]
    // 빈 기초 더미는 A만 받는다.
    expect(canMove(s, 't1', 0, 'f0')).toBe(false)
    const withAce = move(s, 't0', 0, 'f0')!
    expect(canMove(withAce, 't1', 0, 'f0')).toBe(true)
    // 무늬가 다르면 2도 못 올라간다.
    expect(canMove(withAce, 't2', 0, 'f0')).toBe(false)
  })

  it('여러 장을 한 번에 올리지 못한다', () => {
    const s = empty()
    s.tableau[0] = [card('hearts', 2), card('spades', 1)]
    expect(canMove(s, 't0', 0, 'f0')).toBe(false)
  })

  it('자동 보내기는 받아 줄 기초 더미를 찾고, 없으면 아무 일도 안 한다', () => {
    const s = empty()
    s.waste = [card('clubs', 1)]
    expect(sendToFoundation(s, 'waste')!.foundations.flat()).toHaveLength(1)

    const stuck = empty()
    stuck.waste = [card('clubs', 5)]
    expect(sendToFoundation(stuck, 'waste')).toBeNull()
  })
})

describe('산 뽑기', () => {
  it('한 장씩 앞면으로 나오고, 산이 비면 뽑아 놓은 자리가 뒤집혀 되돌아간다', () => {
    const s = empty()
    s.stock = [card('spades', 1, false), card('hearts', 2, false)]
    const one = draw(s)
    expect(one.waste.map((c) => c.id)).toEqual(['hearts-2'])
    expect(one.waste[0].faceUp).toBe(true)

    const two = draw(one)
    expect(two.stock).toHaveLength(0)

    const recycled = draw(two)
    expect(recycled.waste).toHaveLength(0)
    expect(recycled.stock.map((c) => c.id)).toEqual(['spades-1', 'hearts-2'])
    expect(recycled.stock.every((c) => !c.faceUp)).toBe(true)
  })

  it('산도 뽑은 자리도 비어 있으면 그대로다 — 눌러도 아무 일이 없다', () => {
    const s = empty()
    expect(draw(s)).toBe(s)
  })
})

describe('규칙에 안 맞는 이동', () => {
  it('null을 돌려주고 판을 건드리지 않는다', () => {
    const s = empty()
    s.tableau[0] = [card('spades', 8)]
    s.tableau[1] = [card('clubs', 7)]
    expect(move(s, 't1', 0, 't0')).toBeNull()
    expect(pileOf(s, 't0')).toHaveLength(1)
  })
})

describe('승리 판정', () => {
  it('52장이 전부 기초 더미에 올라가야 이긴다', () => {
    const s = empty()
    expect(isWon(s)).toBe(false)
    s.foundations = SUITS.map((suit) =>
      Array.from({ length: 13 }, (_, i) => card(suit, i + 1)),
    )
    expect(isWon(s)).toBe(true)
  })
})
