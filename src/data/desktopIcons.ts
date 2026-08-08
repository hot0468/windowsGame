import { DESKTOP_ITEMS } from './desktopItems'
import type { GridCell } from '../types/game'

/**
 * 바탕화면 아이콘의 **기본 배치**(격자 좌표).
 *
 * ⚠️ 이건 콘텐츠다 — 컴포넌트가 아니라 `src/data/`에 있어야 한다.
 * (예전에는 `Desktop.tsx` 안의 `ICON_COLUMNS` 상수였다. 배치는 설계자가 정하는 것이라
 * 화면 코드에 섞여 있으면 "어디를 고쳐야 배치가 바뀌나"를 매번 찾아야 한다.)
 *
 * 규칙은 그대로다(설계자 지시): **왼쪽 열은 프로그램, 오른쪽 열은 폴더 — 폴더는 아웃룩 옆.**
 * 열 안의 순서는 `DESKTOP_ITEMS` 순서가 정한다.
 *
 * 플레이어가 끌어다 옮긴 위치는 여기가 아니라 `store/desktopIconStore.ts`가 들고 있고,
 * **옮긴 아이콘만** 저장된다 — 그래야 설계자가 나중에 기본 배치를 바꿨을 때
 * 한 번도 안 옮긴 사람에게는 새 기본 배치가 그대로 간다.
 */
/**
 * 오른쪽 열에 서는 것 = **모아 두고 넘겨 보는 것**.
 *
 * ⚠️ `kind === 'folder'`만으로 가르지 않는다 — 도감(`excel`)은 표라서 kind가 다르지만
 * 사진첩 옆에 서야 하는 같은 부류다(설계자 지시). 열을 가르는 기준은 창의 생김새가
 * 아니라 **무엇을 여는가**이므로, 새 도감류가 생기면 여기에 kind를 더한다.
 */
export const COLLECTION_KINDS: readonly string[] = ['folder', 'excel']

const DEFAULT_COLUMNS = [
  DESKTOP_ITEMS.filter((i) => !COLLECTION_KINDS.includes(i.kind)),
  DESKTOP_ITEMS.filter((i) => COLLECTION_KINDS.includes(i.kind)),
]

export const DEFAULT_ICON_CELLS: Readonly<Record<string, GridCell>> = Object.fromEntries(
  DEFAULT_COLUMNS.flatMap((column, col) =>
    column.map((item, row) => [item.id, { col, row }] as const),
  ),
)

/**
 * 배치를 계산할 때의 처리 순서.
 * 앞에 있는 아이콘이 자기 칸을 먼저 차지한다 — 화면이 좁아져 칸이 겹칠 때
 * 누가 밀려나는지가 결정적이어야 새로고침마다 배치가 달라지지 않는다.
 */
export const DESKTOP_ICON_ORDER: readonly string[] = DESKTOP_ITEMS.map((i) => i.id)
