import { describe, expect, it } from 'vitest'
import {
  COLS,
  MINES,
  ROWS,
  flagCount,
  freshBoard,
  isLost,
  isWon,
  minedBoard,
  openCell,
  placeMines,
  toggleFlag,
} from './MinesweeperApp'

/**
 * 보드 로직만 지킨다 — 창은 순수 장난감이라(게임 상태에 안 쓴다) 렌더는 안 본다.
 * `placeMines`는 시드 있는 난수를 주입해 결정적으로 돌린다(컴포넌트만 `Math.random`을 쓴다).
 */

/** 시드 있는 LCG. 테스트에서만 쓴다. */
const lcg = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296
  return seed / 4294967296
}

describe('지뢰찾기 보드', () => {
  it('지뢰는 정확히 10개이고, 첫 클릭 칸은 절대 지뢰가 아니다', () => {
    for (const seed of [1, 42, 77777]) {
      const safe = 40
      const board = placeMines(freshBoard(), safe, lcg(seed))
      expect(board.filter((c) => c.mine)).toHaveLength(MINES)
      expect(board[safe].mine).toBe(false)
    }
  })

  it('첫 클릭 전에 꽂은 깃발은 배치 뒤에도 남는다', () => {
    const flagged = toggleFlag(freshBoard(), 3)
    const board = placeMines(flagged, 40, lcg(9))
    expect(board[3].flag).toBe(true)
    expect(flagCount(board)).toBe(1)
  })

  it('adj는 주변 지뢰 수다 — 모서리 지뢰 하나면 이웃 셋만 1이다', () => {
    const board = minedBoard([0]) // 좌상단 모서리
    expect(board[1].adj).toBe(1)
    expect(board[COLS].adj).toBe(1)
    expect(board[COLS + 1].adj).toBe(1)
    expect(board[2].adj).toBe(0)
    expect(board.filter((c) => c.adj > 0)).toHaveLength(3)
  })

  it('0칸을 열면 flood fill — 지뢰 하나짜리 판은 한 번에 승리까지 간다', () => {
    const last = ROWS * COLS - 1
    const board = openCell(minedBoard([last]), 0) // 우하단 모서리 지뢰, 좌상단 열기
    expect(board[last].open).toBe(false) // 지뢰는 안 열린다
    expect(isWon(board)).toBe(true) // 지뢰 아닌 칸(테두리 숫자 포함)이 전부 열렸다
    expect(isLost(board)).toBe(false)
  })

  it('flood fill은 깃발 꽂힌 칸을 열지 않는다 — 그래서 승리도 아직이다', () => {
    const last = ROWS * COLS - 1
    const board = openCell(toggleFlag(minedBoard([last]), 40), 0)
    expect(board[40].open).toBe(false)
    expect(board[40].flag).toBe(true)
    expect(isWon(board)).toBe(false)
  })

  it('지뢰를 열면 진다', () => {
    const board = openCell(minedBoard([13]), 13)
    expect(isLost(board)).toBe(true)
  })

  it('깃발은 토글이고, 이미 연 칸에는 못 꽂는다', () => {
    const once = toggleFlag(minedBoard([80]), 5)
    expect(once[5].flag).toBe(true)
    expect(toggleFlag(once, 5)[5].flag).toBe(false)
    const opened = openCell(minedBoard([80]), 0)
    expect(toggleFlag(opened, 0)[0].flag).toBe(false)
  })
})
