import { cellKey, clampCell, nearestFreeCell } from './desktopGrid'
import type { GridSize } from './desktopGrid'
import type { GridCell } from '../types/game'

/**
 * 플레이어가 만든 **활동 바로 가기**의 순수 규칙(id 생성 · 빈 칸 찾기).
 *
 * 화면 코드에 두지 않는 이유는 `desktopGrid.ts`와 같다: 빈 칸 찾기와 id 규칙은
 * 눈으로 보면 맞는 것처럼 보이고, **틀렸을 때만 아이콘이 겹치거나 사라진다.**
 * 여기 있으면 화면 없이 테스트로 못 박을 수 있다.
 */

/**
 * 바로 가기 id의 머리말.
 *
 * ⚠️ **콜론이 핵심이다.** 바로 가기는 내장 항목(`DESKTOP_ITEMS`)과 **같은 격자**에
 * 살면서 같은 id 공간(`desktopIconStore.cells`의 키)을 쓴다. 내장 id는 전부
 * 평범한 낱말(`browser`·`kakao`·`inventory`)이라 콜론이 들어가지 않으므로,
 * 머리말 하나로 충돌 가능성이 사라진다. (`desktopItems.test.ts`가 지킨다.)
 */
export const SHORTCUT_ID_PREFIX = 'shortcut:'

/**
 * 활동 id → 바로 가기 id. **활동 하나당 하나뿐이고 항상 같은 값이다** —
 * 일련번호(`shortcut-1`)를 쓰면 같은 활동을 두 번 등록했는지 알 수 없고,
 * 새로고침 때마다 번호가 밀려 옮겨 둔 위치와 어긋난다.
 */
export function shortcutIdOf(activityId: string): string {
  return `${SHORTCUT_ID_PREFIX}${activityId}`
}

export function isShortcutId(id: string): boolean {
  return id.startsWith(SHORTCUT_ID_PREFIX)
}

/** 바로 가기 id → 활동 id. 바로 가기가 아니면 null. */
export function activityIdOfShortcut(id: string): string | null {
  return isShortcutId(id) ? id.slice(SHORTCUT_ID_PREFIX.length) : null
}

/**
 * 격자에서 **처음으로 비어 있는 칸**. 새 바로 가기가 놓이는 자리다.
 *
 * ⚠️ **열 우선(위→아래, 그다음 오른쪽 열)으로 훑는다.** 실제 윈도우가 새 아이콘을
 * 놓는 순서이고, 이 게임의 기본 배치도 열 단위다(왼쪽 열 프로그램 / 오른쪽 열 폴더).
 * 행 우선으로 훑으면 새 바로 가기가 프로그램 열과 폴더 열 **사이사이**에 끼어
 * 두 열의 성격이 무너진다.
 *
 * 판이 꽉 차 빈 칸이 하나도 없으면 마지막 칸을 돌려준다 — 겹치더라도
 * 화면 밖으로 사라지지는 않는다(`nearestFreeCell`과 같은 판단).
 */
export function firstFreeCell(taken: ReadonlySet<string>, size: GridSize): GridCell {
  for (let col = 0; col < size.cols; col++) {
    for (let row = 0; row < size.rows; row++) {
      const cell = { col, row }
      if (!taken.has(cellKey(cell))) return cell
    }
  }
  return { col: size.cols - 1, row: size.rows - 1 }
}

/**
 * 이미 배치된 판(`resolveLayout`의 결과) 위에 바로 가기를 얹는다.
 *
 * ⚠️ **내장 아이콘을 먼저 다 놓은 뒤에 얹는 것이 요점이다.** 한 판에 섞어 돌리면
 * 바로 가기 하나가 내장 아이콘의 기본 칸을 차지해 **기본 배치가 통째로 밀린다** —
 * 플레이어가 만든 것이 원래 있던 것을 밀어내면 안 된다.
 *
 * 바로 가기도 옮길 수 있으므로 규칙은 내장 아이콘과 같다:
 * **옮긴 칸이 있으면 그 칸**(차 있으면 가장 가까운 빈 칸), 없으면 첫 빈 칸.
 *
 * @param ids 바로 가기 id를 **만든 순서대로**. 앞의 것이 먼저 칸을 차지한다.
 */
export function placeShortcuts(
  ids: readonly string[],
  base: Readonly<Record<string, GridCell>>,
  stored: Readonly<Record<string, GridCell>>,
  size: GridSize,
): Record<string, GridCell> {
  const layout: Record<string, GridCell> = { ...base }
  const taken = new Set(Object.values(base).map(cellKey))

  for (const id of ids) {
    const wanted = stored[id]
    const cell = wanted
      ? nearestFreeCell(clampCell(wanted, size), taken, size)
      : firstFreeCell(taken, size)
    layout[id] = cell
    taken.add(cellKey(cell))
  }
  return layout
}
