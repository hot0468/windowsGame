import { describe, it, expect } from 'vitest'
import { CALENDAR_PANEL_LAYOUT, dayOf, dateOf, monthGrid, weekdayOf } from './calendar'
import { SHELL } from './shell'

/**
 * 스탯창과 날짜칸은 둘 다 바탕화면 우상단에 고정된 패널이라 서로 겹치면 안 된다.
 * 실제로 겹친 적이 있다 — 날짜칸 폭을 176으로 잡았는데 공용 Window의 min-width가
 * 200이라 실제로는 200으로 그려졌고, 차이 24px 중 12px이 스탯창을 침범했다.
 */
describe('날짜칸 배치', () => {
  const STAT_PANEL_WIDTH = 320
  const RIGHT_MARGIN = 16

  it('요청 폭이 창 최소 폭보다 작지 않다', () => {
    // 작으면 렌더 폭과 계산 폭이 어긋나 옆 창을 침범한다.
    expect(CALENDAR_PANEL_LAYOUT.width).toBeGreaterThanOrEqual(SHELL.MIN_WINDOW_WIDTH)
  })

  it('statPanelReserve가 스탯창의 실제 점유 폭과 일치한다', () => {
    expect(CALENDAR_PANEL_LAYOUT.statPanelReserve).toBe(STAT_PANEL_WIDTH + RIGHT_MARGIN)
  })

  it('날짜칸 오른쪽 끝이 스탯창 왼쪽 끝을 넘지 않는다', () => {
    const viewport = 1264
    const { width, gap, statPanelReserve } = CALENDAR_PANEL_LAYOUT

    const statLeft = viewport - statPanelReserve
    const calLeft = Math.max(8, viewport - statPanelReserve - width - gap)
    // 실제 렌더 폭은 요청 폭과 최소 폭 중 큰 값이다.
    const calRight = calLeft + Math.max(width, SHELL.MIN_WINDOW_WIDTH)

    expect(calRight).toBeLessThanOrEqual(statLeft)
  })

  it('좁은 화면에서도 날짜칸이 화면 왼쪽 밖으로 나가지 않는다', () => {
    const viewport = 480
    const { width, gap, statPanelReserve } = CALENDAR_PANEL_LAYOUT
    const calLeft = Math.max(8, viewport - statPanelReserve - width - gap)
    expect(calLeft).toBeGreaterThanOrEqual(8)
  })
})

/**
 * 달력 격자. 빈칸이 요일을 맞추지 못하면 날짜가 통째로 한 칸씩 밀려 "지나온 날"이
 * 엉뚱한 요일에 쌓인다 — 격자를 보는 이유가 사라지는 종류의 어긋남이라 못 박아 둔다.
 */
describe('달력 격자', () => {
  it('빈칸 뒤 첫 칸이 그 달 1일이고, 자기 요일 자리에 앉는다', () => {
    for (const day of [1, 20, 45, 100, 300]) {
      const cells = monthGrid(day)
      const lead = cells.indexOf(cells.find((c) => c !== null)!)
      expect(cells.slice(0, lead).every((c) => c === null)).toBe(true)
      const first = cells[lead]!
      expect(dateOf(first).getDate()).toBe(1)
      expect(weekdayOf(first)).toBe(lead)
    }
  })

  it('그 달 날짜를 하루도 빠짐없이 이어 담는다', () => {
    const cells = monthGrid(40).filter((c): c is number => c !== null)
    const d = dateOf(40)
    expect(cells).toHaveLength(new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate())
    expect(cells.every((c, i) => c === cells[0] + i)).toBe(true)
    // 기준일이 이 달 안에 실제로 들어 있어야 오늘 칸을 칠할 수 있다.
    expect(cells).toContain(40)
  })

  it('일차와 날짜 환산이 서로의 역함수다', () => {
    for (const day of [1, 7, 99]) expect(dayOf(dateOf(day))).toBe(day)
  })
})
