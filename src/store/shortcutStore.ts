import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * 플레이어가 바탕화면에 만들어 둔 **활동 바로 가기** 목록.
 *
 * 실제 윈도우의 "바로 가기 만들기"와 같은 것이다 — 자주 쓰는 것을 손 닿는 데 두는 일.
 * 담는 것은 **활동 id뿐**이다: 이름·아이콘·수치는 전부 `data/activities.ts`가 갖고 있고,
 * 여기에 다시 적으면 활동을 고쳤을 때 바로 가기만 옛 값을 보여 준다.
 *
 * **왜 `gameStore`가 아닌가:** `desktopIconStore`(아이콘 위치)·`browserStore`(즐겨찾기)와
 * 같은 판단이다. 바탕화면에 무엇을 둘지는 **판(세이브)이 아니라 사람**에게 속한다 —
 * 실제 윈도우에서도 게임을 새로 시작한다고 바탕화면 바로 가기가 지워지지 않는다.
 * `gameStore.reset()`이 이걸 비우면 새 판마다 다시 등록해야 하고, 그건 "자주 쓰는 것을
 * 손 닿는 데 둔다"는 이 기능의 존재 이유를 지운다.
 *
 * ⚠️ **판을 넘어 남아도 안전한 근거:** 바로 가기는 활동을 **가리키기만** 한다.
 * 더블클릭하면 그때의 세이브를 상대로 `canRun`을 다시 묻고, 안 되면 실행하지 않는다 —
 * 지난 판에서 만든 바로 가기가 새 판의 제약을 건너뛸 길이 없다.
 *
 * ⚠️ **위치는 여기 없다.** 바로 가기도 다른 아이콘과 똑같이 끌어서 옮기고, 옮긴 칸은
 * `desktopIconStore`에 남는다(id 하나로 두 스토어가 이어진다). 위치 규칙을 두 벌로
 * 만들면 "바로 가기만 격자에 안 붙는" 종류의 버그가 생긴다.
 */
interface ShortcutStore {
  /** 등록한 활동 id. **만든 순서**이며 그 순서대로 빈 칸을 차지한다. */
  activityIds: string[]
  /** 등록한다. 이미 있으면 아무 일도 하지 않는다(중복 아이콘을 만들지 않는다). */
  add: (activityId: string) => void
  /** 지운다. 내장 아이콘에는 이 길이 없다 — 지울 수 있는 건 만든 것뿐이다. */
  remove: (activityId: string) => void
}

export const useShortcutStore = create<ShortcutStore>()(
  persist(
    (set) => ({
      activityIds: [],

      add: (activityId) =>
        set((s) =>
          s.activityIds.includes(activityId)
            ? s
            : { activityIds: [...s.activityIds, activityId] },
        ),

      remove: (activityId) =>
        set((s) => ({ activityIds: s.activityIds.filter((id) => id !== activityId) })),
    }),
    {
      name: 'windows-game-shortcuts',
      version: 1,
    },
  ),
)
