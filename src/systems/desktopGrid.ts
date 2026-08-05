import { DESKTOP_GRID, SHELL } from '../data/shell'
import type { GridCell } from '../types/game'

/**
 * 바탕화면 아이콘 격자 계산. **순수 함수만** 둔다(systems 규칙).
 *
 * 여기 모은 이유: 스냅·빈 칸 찾기·경계 클램프는 전부 off-by-one이 나기 쉬운 계산인데
 * 컴포넌트 안에 있으면 눈으로만 확인하게 된다. 특히 "저장된 칸이 지금 화면에 없다"는
 * 경우는 화면을 실제로 줄여 보지 않으면 영영 발견되지 않는다 —
 * 그 조건이 곧 **아이콘이 영영 안 보이게 되는** 버그다.
 */

/** 격자 한 판의 크기(칸 수). 뷰포트가 줄면 함께 줄어든다. */
export interface GridSize {
  cols: number
  rows: number
}

/** `Set`에 담기 위한 칸 식별자. */
export function cellKey(cell: GridCell): string {
  return `${cell.col},${cell.row}`
}

/**
 * 지금 화면에 실제로 존재하는 칸 수.
 *
 * 마지막 칸은 **아이콘이 통째로 들어가야** 인정한다 — 폭은 아이콘 폭(84)으로,
 * 높이는 칸 높이로 잰다. 오른쪽 끝은 아이콘이 화면 밖으로 잘리지 않아야 하고,
 * 아래 끝은 작업 표시줄(SHELL.TASKBAR_HEIGHT) 밑으로 들어가면 안 된다.
 * 화면이 아무리 작아도 최소 1칸은 남긴다(0칸이면 아이콘을 놓을 자리가 사라진다).
 */
export function gridSize(viewportWidth: number, viewportHeight: number): GridSize {
  const { PAD, CELL_WIDTH, CELL_HEIGHT, ICON_WIDTH } = DESKTOP_GRID
  const usableWidth = viewportWidth - PAD * 2 - ICON_WIDTH
  const usableHeight = viewportHeight - SHELL.TASKBAR_HEIGHT - PAD - CELL_HEIGHT
  return {
    cols: Math.max(1, Math.floor(usableWidth / CELL_WIDTH) + 1),
    rows: Math.max(1, Math.floor(usableHeight / CELL_HEIGHT) + 1),
  }
}

/** 칸 → 아이콘 좌상단 픽셀 좌표. */
export function cellOrigin(cell: GridCell): { x: number; y: number } {
  const { PAD, CELL_WIDTH, CELL_HEIGHT } = DESKTOP_GRID
  return {
    x: PAD + cell.col * CELL_WIDTH,
    y: PAD + cell.row * CELL_HEIGHT,
  }
}

/** 판 밖으로 나간 칸을 안으로 끌어들인다. 음수 칸도 여기서 걸린다. */
export function clampCell(cell: GridCell, size: GridSize): GridCell {
  return {
    col: Math.min(Math.max(0, cell.col), size.cols - 1),
    row: Math.min(Math.max(0, cell.row), size.rows - 1),
  }
}

/**
 * 아이콘 좌상단 픽셀 좌표 → 가장 가까운 칸(경계 클램프 포함).
 *
 * `round`라서 칸의 절반을 넘긴 순간 다음 칸으로 넘어간다 — 실제 윈도우의 "격자에 맞춤"과 같다.
 */
export function snapToCell(x: number, y: number, size: GridSize): GridCell {
  const { PAD, CELL_WIDTH, CELL_HEIGHT } = DESKTOP_GRID
  return clampCell(
    {
      col: Math.round((x - PAD) / CELL_WIDTH),
      row: Math.round((y - PAD) / CELL_HEIGHT),
    },
    size,
  )
}

/**
 * 목표 칸이 비어 있으면 그대로, 차 있으면 **가장 가까운 빈 칸**을 준다.
 *
 * ⚠️ **자리 맞바꾸기(swap)를 하지 않는 이유:** 맞바꾸면 내가 건드리지 않은 아이콘이
 * 화면 반대편으로 날아간다. 직접 조작의 약속은 "내가 잡은 것만 움직인다"이고,
 * 실제 윈도우도 점유된 칸에 놓으면 옆의 빈 칸으로 밀어 넣지 자리를 바꾸지 않는다.
 *
 * 거리는 **칸이 아니라 픽셀**로 잰다 — 칸이 가로로 넓어(90×80) 칸 거리로 재면
 * 눈에는 위아래가 더 가까운데 좌우 칸이 뽑힌다.
 *
 * 판이 꽉 차 빈 칸이 하나도 없으면 목표 칸을 그대로 돌려준다(겹치더라도 사라지진 않는다).
 */
export function nearestFreeCell(
  target: GridCell,
  taken: ReadonlySet<string>,
  size: GridSize,
): GridCell {
  const start = clampCell(target, size)
  if (!taken.has(cellKey(start))) return start

  const { CELL_WIDTH, CELL_HEIGHT } = DESKTOP_GRID
  let best: GridCell | null = null
  let bestScore = Infinity

  for (let row = 0; row < size.rows; row++) {
    for (let col = 0; col < size.cols; col++) {
      const cell = { col, row }
      if (taken.has(cellKey(cell))) continue
      const dx = (col - start.col) * CELL_WIDTH
      const dy = (row - start.row) * CELL_HEIGHT
      // 같은 거리면 위쪽 → 왼쪽 순으로 고른다(결정적이어야 테스트가 성립한다).
      const score = dx * dx + dy * dy
      if (score < bestScore) {
        bestScore = score
        best = cell
      }
    }
  }
  return best ?? start
}

/**
 * 최종 배치를 만든다: 기본 배치 위에 사용자가 옮긴 칸을 덮고, 경계를 넘거나
 * 겹치는 것을 정리한다.
 *
 * ⚠️ **이 함수가 "저장된 칸이 지금 화면에 없다"를 흡수한다.** 1920 폭에서 12번 열에
 * 둔 아이콘을 1024 폭에서 열면 그 칸은 존재하지 않는다 — 클램프하지 않으면
 * 아이콘이 화면 밖에 그려져 다시 잡을 수도, 열 수도 없다.
 * 클램프하면 여러 아이콘이 같은 칸으로 몰리므로 겹침 해소가 뒤따라야 한다.
 *
 * ⚠️ **사용자가 옮긴 칸이 기본 칸을 이긴다**(2단계 배치). 한 번에 순회하면 목록에서
 * 앞선 아이콘의 *기본* 칸이 뒤에 있는 아이콘의 *직접 고른* 칸을 밀어낸다 —
 * "내가 여기 뒀는데"가 이유 없이 뒤집히는 것이 제일 나쁘다.
 *
 * @param order 처리 순서. 같은 단계 안에서는 앞에 있는 것이 먼저 칸을 차지한다
 *              (`DESKTOP_ITEMS` 순서를 넘겨 결정적으로 만든다).
 */
export function resolveLayout(
  order: readonly string[],
  defaults: Readonly<Record<string, GridCell>>,
  stored: Readonly<Record<string, GridCell>>,
  size: GridSize,
): Record<string, GridCell> {
  const taken = new Set<string>()
  const layout: Record<string, GridCell> = {}

  const put = (id: string, wanted: GridCell) => {
    const cell = nearestFreeCell(clampCell(wanted, size), taken, size)
    layout[id] = cell
    taken.add(cellKey(cell))
  }

  // 1단계: 사용자가 직접 옮긴 것.
  for (const id of order) {
    if (stored[id]) put(id, stored[id])
  }
  // 2단계: 나머지는 기본 배치로.
  for (const id of order) {
    if (!layout[id] && defaults[id]) put(id, defaults[id])
  }
  return layout
}
