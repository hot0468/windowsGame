import { describe, expect, it } from 'vitest'
import {
  cellKey,
  cellOrigin,
  clampCell,
  gridSize,
  nearestFreeCell,
  resolveLayout,
  snapToCell,
} from './desktopGrid'
import { DESKTOP_GRID, SHELL } from '../data/shell'
import { COLLECTION_KINDS, DEFAULT_ICON_CELLS, DESKTOP_ICON_ORDER } from '../data/desktopIcons'
import { DESKTOP_ITEMS } from '../data/desktopItems'
import type { GridCell } from '../types/game'

/** 실측 기준 뷰포트(1264×805 헤드리스 크롬). */
const VW = 1264
const VH = 805
const SIZE = gridSize(VW, VH)

const taken = (...cells: GridCell[]) => new Set(cells.map(cellKey))

describe('gridSize', () => {
  it('마지막 칸은 아이콘이 통째로 들어갈 때만 인정한다', () => {
    // 가로: 12 + col*90 + 84 <= 1264 → col <= 12.8 → 13칸
    // 세로: 12 + row*80 + 80 <= 805-44 → row <= 8.36 → 9칸
    expect(SIZE).toEqual({ cols: 13, rows: 9 })
  })

  it('마지막 칸의 아이콘이 작업 표시줄을 침범하지 않는다', () => {
    const last = cellOrigin({ col: SIZE.cols - 1, row: SIZE.rows - 1 })
    expect(last.y + DESKTOP_GRID.CELL_HEIGHT).toBeLessThanOrEqual(VH - SHELL.TASKBAR_HEIGHT)
    expect(last.x + DESKTOP_GRID.ICON_WIDTH).toBeLessThanOrEqual(VW)
  })

  it('화면이 아무리 작아도 최소 한 칸은 남긴다', () => {
    // 0칸이면 놓을 자리가 없어 아이콘을 그릴 수도 클램프할 수도 없다.
    expect(gridSize(100, 60)).toEqual({ cols: 1, rows: 1 })
    expect(gridSize(0, 0)).toEqual({ cols: 1, rows: 1 })
  })

  it('화면이 넓어지면 열이 늘어난다', () => {
    expect(gridSize(1920, 1080).cols).toBeGreaterThan(SIZE.cols)
    expect(gridSize(1920, 1080).rows).toBeGreaterThan(SIZE.rows)
  })
})

describe('cellOrigin', () => {
  it('원점은 격자 여백이다', () => {
    expect(cellOrigin({ col: 0, row: 0 })).toEqual({ x: 12, y: 12 })
  })

  it('기존 flex 배치의 실측값을 재현한다', () => {
    // 예전 배치(1264×805 실측): 왼쪽 열 x=12, 오른쪽 열 x=102, 행 간격 80.19
    expect(cellOrigin({ col: 1, row: 0 })).toEqual({ x: 102, y: 12 })
    expect(cellOrigin({ col: 0, row: 4 })).toEqual({ x: 12, y: 332 })
  })
})

describe('snapToCell', () => {
  it('칸 한가운데를 넘기면 다음 칸으로 붙는다', () => {
    // col 경계는 (x-12)/90 = 0.5 → x = 57
    expect(snapToCell(56, 12, SIZE).col).toBe(0)
    expect(snapToCell(58, 12, SIZE).col).toBe(1)
    // row 경계는 (y-12)/80 = 0.5 → y = 52
    expect(snapToCell(12, 51, SIZE).row).toBe(0)
    expect(snapToCell(12, 53, SIZE).row).toBe(1)
  })

  it('정확히 칸 위치면 그 칸이다', () => {
    expect(snapToCell(102, 172, SIZE)).toEqual({ col: 1, row: 2 })
  })

  it('화면 밖으로 끌어도 판 안으로 가둔다', () => {
    expect(snapToCell(-500, -500, SIZE)).toEqual({ col: 0, row: 0 })
    expect(snapToCell(99999, 99999, SIZE)).toEqual({ col: SIZE.cols - 1, row: SIZE.rows - 1 })
  })

  it('작업 표시줄 위로 놓으려 해도 마지막 행을 넘지 못한다', () => {
    // 작업 표시줄 한복판(y = 805-20)에 떨어뜨린 경우
    const cell = snapToCell(12, VH - 20, SIZE)
    expect(cell.row).toBe(SIZE.rows - 1)
    expect(cellOrigin(cell).y + DESKTOP_GRID.CELL_HEIGHT).toBeLessThanOrEqual(
      VH - SHELL.TASKBAR_HEIGHT,
    )
  })
})

describe('clampCell', () => {
  it('음수 칸과 판 밖 칸을 안으로 끌어들인다', () => {
    expect(clampCell({ col: -3, row: -1 }, SIZE)).toEqual({ col: 0, row: 0 })
    expect(clampCell({ col: 99, row: 99 }, SIZE)).toEqual({ col: 12, row: 8 })
  })
})

describe('nearestFreeCell', () => {
  it('비어 있으면 그대로 둔다', () => {
    expect(nearestFreeCell({ col: 3, row: 3 }, taken(), SIZE)).toEqual({ col: 3, row: 3 })
  })

  it('차 있으면 가장 가까운 빈 칸으로 밀어 넣는다 (맞바꾸지 않는다)', () => {
    // 칸은 90 넓고 80 높다 → 세로 이웃(80)이 가로 이웃(90)보다 가깝다.
    const result = nearestFreeCell({ col: 3, row: 3 }, taken({ col: 3, row: 3 }), SIZE)
    expect(result).toEqual({ col: 3, row: 2 })
  })

  it('거리는 칸이 아니라 픽셀로 잰다', () => {
    // 위·아래를 막으면 좌우로 간다. 같은 거리면 위쪽·왼쪽이 먼저다(결정적).
    const result = nearestFreeCell(
      { col: 3, row: 3 },
      taken({ col: 3, row: 3 }, { col: 3, row: 2 }, { col: 3, row: 4 }),
      SIZE,
    )
    expect(result).toEqual({ col: 2, row: 3 })
  })

  it('판이 꽉 차면 목표 칸을 그대로 준다 (아이콘을 잃지 않는다)', () => {
    const tiny = { cols: 1, rows: 1 }
    expect(nearestFreeCell({ col: 0, row: 0 }, taken({ col: 0, row: 0 }), tiny)).toEqual({
      col: 0,
      row: 0,
    })
  })

  it('판 밖을 목표로 줘도 판 안의 빈 칸을 준다', () => {
    const result = nearestFreeCell({ col: 999, row: 999 }, taken(), SIZE)
    expect(result).toEqual({ col: SIZE.cols - 1, row: SIZE.rows - 1 })
  })
})

describe('resolveLayout', () => {
  it('저장된 것이 없으면 기본 배치 그대로다', () => {
    /*
     * ⚠️ **판 크기를 기본 배치에서 파생시킨다.** 예전에는 뷰포트에서 나온 `SIZE`를 썼는데,
     * 프로그램 열이 늘어나 기본 배치가 그 판보다 길어지는 순간 `resolveLayout`이
     * 마지막 아이콘을 다음 열로 끌어들여 이 단언이 깨졌다(설정 앱을 더할 때 실제로 터졌다).
     * 여기서 확인하려는 것은 "판이 좁을 때 어떻게 되는가"가 아니라 **"저장된 것이 없으면
     * 손대지 않는다"**이므로, 판은 기본 배치가 다 들어가는 크기여야 한다.
     */
    const cells = Object.values(DEFAULT_ICON_CELLS)
    const fits = {
      cols: Math.max(...cells.map((c) => c.col)) + 1,
      rows: Math.max(...cells.map((c) => c.row)) + 1,
    }
    const layout = resolveLayout(DESKTOP_ICON_ORDER, DEFAULT_ICON_CELLS, {}, fits)
    expect(layout).toEqual(DEFAULT_ICON_CELLS)
  })

  it('기본 배치는 설계자 규칙을 지킨다 — 왼쪽 열 프로그램 / 오른쪽 열 모아 보는 것', () => {
    // ⚠️ 목록(`COLLECTION_KINDS`)을 여기 다시 적지 않는다 — 두 곳에 적으면 새 도감류가
    //    생겼을 때 한쪽만 고치고도 통과한다.
    for (const item of DESKTOP_ITEMS) {
      expect(DEFAULT_ICON_CELLS[item.id].col).toBe(COLLECTION_KINDS.includes(item.kind) ? 1 : 0)
    }
  })

  it('기본 배치에는 겹치는 칸이 없다', () => {
    const keys = Object.values(DEFAULT_ICON_CELLS).map(cellKey)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('저장된 칸이 기본 배치를 덮는다', () => {
    const layout = resolveLayout(
      DESKTOP_ICON_ORDER,
      DEFAULT_ICON_CELLS,
      { browser: { col: 5, row: 6 } },
      SIZE,
    )
    expect(layout.browser).toEqual({ col: 5, row: 6 })
    expect(layout.kakao).toEqual(DEFAULT_ICON_CELLS.kakao)
  })

  it('저장된 칸이 지금 뷰포트에 없으면 안으로 끌어들인다 (아이콘이 사라지지 않는다)', () => {
    // 1920 폭에서 12번 열에 뒀다가 1024 폭에서 열었을 때.
    const narrow = gridSize(1024, 600)
    const layout = resolveLayout(
      DESKTOP_ICON_ORDER,
      DEFAULT_ICON_CELLS,
      { browser: { col: 18, row: 14 } },
      narrow,
    )
    expect(layout.browser.col).toBeLessThan(narrow.cols)
    expect(layout.browser.row).toBeLessThan(narrow.rows)
    // 화면 안에 실제로 그려진다.
    const origin = cellOrigin(layout.browser)
    expect(origin.x + DESKTOP_GRID.ICON_WIDTH).toBeLessThanOrEqual(1024)
    expect(origin.y + DESKTOP_GRID.CELL_HEIGHT).toBeLessThanOrEqual(600 - SHELL.TASKBAR_HEIGHT)
  })

  it('사용자가 옮긴 칸이 다른 아이콘의 기본 칸을 이긴다', () => {
    // outlook을 브라우저의 기본 자리(0,0)로 옮겼다면 브라우저가 비켜야 한다.
    const layout = resolveLayout(
      DESKTOP_ICON_ORDER,
      DEFAULT_ICON_CELLS,
      { outlook: { col: 0, row: 0 } },
      SIZE,
    )
    expect(layout.outlook).toEqual({ col: 0, row: 0 })
    expect(layout.browser).not.toEqual({ col: 0, row: 0 })
  })

  it('좁아져 여럿이 같은 칸으로 몰려도 서로 겹치지 않는다', () => {
    const narrow = gridSize(400, 500)
    const layout = resolveLayout(
      DESKTOP_ICON_ORDER,
      DEFAULT_ICON_CELLS,
      Object.fromEntries(DESKTOP_ICON_ORDER.map((id) => [id, { col: 9, row: 9 }])),
      narrow,
    )
    const keys = Object.values(layout).map(cellKey)
    // 판이 아이콘 수보다 작지 않은 한 전부 다른 칸을 갖는다.
    expect(narrow.cols * narrow.rows).toBeGreaterThanOrEqual(DESKTOP_ICON_ORDER.length)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('같은 입력이면 같은 배치가 나온다 (새로고침마다 달라지지 않는다)', () => {
    const stored = { outlook: { col: 0, row: 0 }, kakao: { col: 0, row: 0 } }
    const a = resolveLayout(DESKTOP_ICON_ORDER, DEFAULT_ICON_CELLS, stored, SIZE)
    const b = resolveLayout(DESKTOP_ICON_ORDER, DEFAULT_ICON_CELLS, stored, SIZE)
    expect(a).toEqual(b)
    // 둘 다 옮긴 칸이므로 목록 순서가 앞선 쪽이 차지한다.
    expect(a.kakao).toEqual({ col: 0, row: 0 })
    expect(a.outlook).not.toEqual({ col: 0, row: 0 })
    // 밀려난 쪽도 판 안에 있다.
    expect(a.outlook.col).toBeLessThan(SIZE.cols)
    expect(a.outlook.row).toBeLessThan(SIZE.rows)
  })

  it('모든 바탕화면 항목이 배치를 갖는다 (조용히 사라지는 아이콘이 없다)', () => {
    const layout = resolveLayout(DESKTOP_ICON_ORDER, DEFAULT_ICON_CELLS, {}, gridSize(320, 240))
    for (const item of DESKTOP_ITEMS) {
      expect(layout[item.id]).toBeDefined()
    }
  })
})
