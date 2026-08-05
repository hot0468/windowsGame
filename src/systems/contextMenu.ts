/**
 * 오른쪽 클릭 메뉴가 **화면 밖으로 나가지 않게** 하는 순수 계산.
 *
 * 컴포넌트 안에 두지 않는 이유: 이 계산이 틀리면 화면 오른쪽·아래 끝에서 누른 메뉴가
 * 잘려서 항목을 고를 수 없다. 그런데 그 상황은 **가장자리에서 눌러 봐야만** 드러나므로
 * 눈으로 확인하는 것에 맡길 수 없다(`desktopGrid.ts`와 같은 판단).
 */

export interface Size {
  width: number
  height: number
}

export interface Point {
  x: number
  y: number
}

/** 뷰포트 가장자리에서 띄우는 최소 여백(px). 4px 리듬(`--sp-1`). */
export const MENU_MARGIN = 4

/**
 * 커서 위치에서 펼칠 메뉴의 실제 좌표.
 *
 * ⚠️ **넘칠 때는 잘라 붙이는 게 아니라 반대쪽으로 뒤집는다** — 실제 윈도우가 그렇게 한다.
 * 오른쪽이 모자라면 커서 **왼쪽**으로 펼치고, 아래가 모자라면 커서 **위**로 펼친다.
 * 뒤집어도 안 들어갈 만큼 화면이 작으면 그때 가장자리에 붙인다(0보다 작아지지 않는다).
 */
export function clampMenuPosition(cursor: Point, menu: Size, viewport: Size): Point {
  let x = cursor.x
  let y = cursor.y

  if (x + menu.width + MENU_MARGIN > viewport.width) x = cursor.x - menu.width
  if (y + menu.height + MENU_MARGIN > viewport.height) y = cursor.y - menu.height

  return {
    x: Math.max(MENU_MARGIN, Math.min(x, viewport.width - menu.width - MENU_MARGIN)),
    y: Math.max(MENU_MARGIN, Math.min(y, viewport.height - menu.height - MENU_MARGIN)),
  }
}
