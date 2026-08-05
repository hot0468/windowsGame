import { describe, expect, it } from 'vitest'
import { MENU_MARGIN, clampMenuPosition } from './contextMenu'

const VIEWPORT = { width: 1264, height: 805 }
const MENU = { width: 180, height: 80 }

describe('clampMenuPosition', () => {
  it('자리가 넉넉하면 커서 오른쪽·아래로 그대로 펼친다', () => {
    expect(clampMenuPosition({ x: 100, y: 100 }, MENU, VIEWPORT)).toEqual({ x: 100, y: 100 })
  })

  it('오른쪽이 모자라면 커서 왼쪽으로 뒤집는다', () => {
    const p = clampMenuPosition({ x: 1200, y: 100 }, MENU, VIEWPORT)
    expect(p.x).toBe(1200 - MENU.width)
  })

  it('아래가 모자라면 커서 위로 뒤집는다', () => {
    const p = clampMenuPosition({ x: 100, y: 780 }, MENU, VIEWPORT)
    expect(p.y).toBe(780 - MENU.height)
  })

  it('뒤집어도 안 들어가면 가장자리에 붙이되 화면 밖으로 내보내지 않는다', () => {
    const tiny = { width: 100, height: 60 }
    const p = clampMenuPosition({ x: 10, y: 10 }, MENU, tiny)
    expect(p.x).toBeGreaterThanOrEqual(0)
    expect(p.y).toBeGreaterThanOrEqual(0)
  })

  it('어느 모서리에서 눌러도 메뉴가 잘리지 않는다', () => {
    const corners = [
      { x: 0, y: 0 },
      { x: VIEWPORT.width, y: 0 },
      { x: 0, y: VIEWPORT.height },
      { x: VIEWPORT.width, y: VIEWPORT.height },
    ]
    for (const c of corners) {
      const p = clampMenuPosition(c, MENU, VIEWPORT)
      expect(p.x).toBeGreaterThanOrEqual(MENU_MARGIN)
      expect(p.y).toBeGreaterThanOrEqual(MENU_MARGIN)
      expect(p.x + MENU.width).toBeLessThanOrEqual(VIEWPORT.width - MENU_MARGIN)
      expect(p.y + MENU.height).toBeLessThanOrEqual(VIEWPORT.height - MENU_MARGIN)
    }
  })
})
