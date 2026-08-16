import { create } from 'zustand'

/**
 * 화면을 통째로 덮는 **장면**이 지금 떠 있는가.
 *
 * ## 왜 필요한가
 * 전체 화면 연출이 둘이 됐다 — 날 밝음(`Daybreak`)과 승급(`RankUp`). 오후 행동 하나가
 * **둘을 동시에 부른다**: 공부해서 지식이 B로 올랐고, 그 행동이 날짜를 넘겼다.
 * 각자 자기 타이머만 보고 뜨면 두 장면이 한 화면에 겹쳐 어느 쪽도 안 읽힌다.
 *
 * ## 규칙
 * ⚠️ **한 번에 하나만 뜬다.** 뒤에 오는 장면은 앞 장면이 사라질 때까지 기다린다
 * (`Daybreak`가 실행 결과 창을 기다리는 것과 같은 장치 — 알림을 없애는 것이 아니라
 * **순서를 주는 것**이다).
 *
 * ⚠️ **승급이 날 밝음보다 먼저다.** 승급은 방금 한 행동의 결과이고 날이 밝는 것은
 * 그 다음에 일어나는 일이라, 뒤집으면 원인과 결과가 거꾸로 읽힌다.
 * 순서를 정하는 곳은 여기가 아니라 `Daybreak`의 대기 조건 한 줄이다 —
 * 이 스토어는 "지금 무엇이 떠 있나"만 답한다(판단을 두 곳에 적지 않는다).
 *
 * ⚠️ **게임 상태가 아니다.** 세이브에 남지 않고 새로 고치면 사라진다
 * (`gameStore.arrivals`·`skippedPlans`와 같은 휘발 상태의 부류다).
 */
export type SceneKind = 'rankup' | 'daybreak'

type SceneStore = {
  /** 지금 떠 있는 장면. 아무것도 안 떠 있으면 `null`. */
  scene: SceneKind | null
  /** 장면을 연다. 이미 다른 장면이 떠 있으면 **아무 일도 하지 않는다**(먼저 온 것이 이긴다). */
  openScene: (kind: SceneKind) => void
  /**
   * 그 장면을 닫는다.
   * ⚠️ **자기 장면일 때만 닫는다** — 종류를 안 보고 지우면, 늦게 끝난 장면의 정리 타이머가
   * 이미 다음 장면이 차지한 자리를 비워 그 장면이 영영 안 닫히는 상태가 된다.
   */
  closeScene: (kind: SceneKind) => void
}

export const useSceneStore = create<SceneStore>((set, get) => ({
  scene: null,
  openScene: (kind) => {
    if (get().scene === null) set({ scene: kind })
  },
  closeScene: (kind) => {
    if (get().scene === kind) set({ scene: null })
  },
}))
