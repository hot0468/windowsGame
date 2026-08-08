import { describe, expect, it } from 'vitest'
import {
  SHORTCUT_ID_PREFIX,
  activityIdOfShortcut,
  firstFreeCell,
  isShortcutId,
  placeShortcuts,
  shortcutIdOf,
} from './shortcuts'
import { cellKey, gridSize, resolveLayout } from './desktopGrid'
import { DEFAULT_ICON_CELLS, DESKTOP_ICON_ORDER } from '../data/desktopIcons'
import { DESKTOP_ITEMS } from '../data/desktopItems'
import type { GridCell } from '../types/game'

/** 실측 기준 뷰포트(1264×805 헤드리스 크롬) — desktopGrid.test.ts와 같은 값을 쓴다. */
const SIZE = gridSize(1264, 805)

const taken = (...cells: GridCell[]) => new Set(cells.map(cellKey))

describe('바로 가기 id', () => {
  it('활동 하나당 항상 같은 id를 준다', () => {
    expect(shortcutIdOf('reading')).toBe('shortcut:reading')
    expect(shortcutIdOf('reading')).toBe(shortcutIdOf('reading'))
  })

  it('되돌릴 수 있다', () => {
    expect(activityIdOfShortcut(shortcutIdOf('work-cafe'))).toBe('work-cafe')
    expect(activityIdOfShortcut('browser')).toBeNull()
    expect(isShortcutId('browser')).toBe(false)
  })

  it('⚠️ 내장 바탕화면 항목의 id와 절대 겹치지 않는다', () => {
    // 겹치면 격자 배치와 저장된 위치가 서로를 덮어써 아이콘이 사라진다.
    for (const item of DESKTOP_ITEMS) {
      expect(item.id.includes(SHORTCUT_ID_PREFIX)).toBe(false)
      expect(isShortcutId(item.id)).toBe(false)
    }
  })
})

describe('firstFreeCell', () => {
  it('빈 판이면 첫 칸', () => {
    expect(firstFreeCell(taken(), SIZE)).toEqual({ col: 0, row: 0 })
  })

  it('열 우선으로 훑는다 — 같은 열을 다 채운 뒤에 다음 열로 넘어간다', () => {
    const full = Array.from({ length: SIZE.rows }, (_, row) => ({ col: 0, row }))
    expect(firstFreeCell(taken(...full), SIZE)).toEqual({ col: 1, row: 0 })
    expect(firstFreeCell(taken({ col: 0, row: 0 }), SIZE)).toEqual({ col: 0, row: 1 })
  })

  it('판이 꽉 차면 마지막 칸을 준다(화면 밖으로 내보내지 않는다)', () => {
    const all: GridCell[] = []
    for (let col = 0; col < SIZE.cols; col++) {
      for (let row = 0; row < SIZE.rows; row++) all.push({ col, row })
    }
    expect(firstFreeCell(taken(...all), SIZE)).toEqual({
      col: SIZE.cols - 1,
      row: SIZE.rows - 1,
    })
  })
})

describe('placeShortcuts', () => {
  const base = resolveLayout(DESKTOP_ICON_ORDER, DEFAULT_ICON_CELLS, {}, SIZE)

  it('내장 아이콘의 칸을 하나도 건드리지 않는다', () => {
    const after = placeShortcuts([shortcutIdOf('reading')], base, {}, SIZE)
    for (const id of DESKTOP_ICON_ORDER) expect(after[id]).toEqual(base[id])
  })

  it('첫 빈 칸에 놓이고, 이미 놓인 아이콘과 겹치지 않는다', () => {
    const ids = [shortcutIdOf('reading'), shortcutIdOf('movie')]
    const after = placeShortcuts(ids, base, {}, SIZE)
    const cells = Object.values(after).map(cellKey)
    expect(new Set(cells).size).toBe(cells.length)
    /*
     * 바로 가기는 **열 우선 첫 빈 칸**에 차례로 놓인다.
     * ⚠️ 열·행을 상수로도, "프로그램 열 맨 아래"로도 적지 않는다 — 프로그램이 늘어
     * 0열이 꽉 차면 다음 열로 넘어가는 것이 정상이고(2026-08-08 증기 추가 때 실제로 그랬다),
     * 그때마다 테스트가 깨지면 규칙이 아니라 오늘의 배치를 지키게 된다.
     * 기준은 `firstFreeCell`이고 그 함수 자체는 위에서 따로 검증한다.
     */
    const occupied = new Set(Object.values(base).map(cellKey))
    const first = firstFreeCell(occupied, SIZE)
    expect(after[ids[0]]).toEqual(first)
    expect(after[ids[1]]).toEqual(firstFreeCell(new Set([...occupied, cellKey(first)]), SIZE))
  })

  it('옮긴 칸이 있으면 첫 빈 칸 대신 그 칸을 쓴다', () => {
    const id = shortcutIdOf('reading')
    const after = placeShortcuts([id], base, { [id]: { col: 5, row: 4 } }, SIZE)
    expect(after[id]).toEqual({ col: 5, row: 4 })
  })

  it('옮긴 칸이 차 있으면 가장 가까운 빈 칸으로 밀린다(맞바꾸지 않는다)', () => {
    const id = shortcutIdOf('reading')
    const occupied = base[DESKTOP_ICON_ORDER[0]]
    const after = placeShortcuts([id], base, { [id]: occupied }, SIZE)
    expect(after[id]).not.toEqual(occupied)
    expect(after[DESKTOP_ICON_ORDER[0]]).toEqual(occupied)
  })

  it('판 밖의 칸에 저장돼 있어도 화면 안으로 끌어들인다', () => {
    const id = shortcutIdOf('reading')
    const after = placeShortcuts([id], base, { [id]: { col: 99, row: 99 } }, SIZE)
    expect(after[id].col).toBeLessThan(SIZE.cols)
    expect(after[id].row).toBeLessThan(SIZE.rows)
  })
})
