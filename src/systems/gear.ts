import { GEARS, GEAR_WARN_LEFT, findGear } from '../data/gear'
import { findItem } from '../data/items'
import { requiredItemIds } from '../data/items'
import type { Activity } from '../types/game'
import type { GameState } from '../types/game'

/**
 * 장비 마모 규칙.
 *
 * ## 의존 방향
 * ⚠️ **아무 시스템도 부르지 않는다**(`data/`만 읽는다). `turn.ts`가 활동을 실행하며 이걸
 * 부르므로, 반대로 부르면 순환이 된다(`careerLog`와 같은 자리·같은 이유).
 *
 * ## ⚠️ 무작위 없음
 * 고장은 **사용 횟수**가 정한다. 몇 번 남았는지는 언제든 셀 수 있고 화면이 미리 적는다 —
 * "왜 하필 지금"에 답할 수 있어야 손실이 사고가 아니라 대가가 된다.
 */

/** 그 장비를 몇 번 썼는가. 기록이 없으면 0. */
export function usesOf(state: GameState, itemId: string): number {
  return state.gear?.[itemId] ?? 0
}

/** 고장까지 몇 번 남았는가. 닳지 않는 물건이면 undefined. */
export function usesLeft(state: GameState, itemId: string): number | undefined {
  const gear = findGear(itemId)
  if (!gear) return undefined
  return Math.max(0, gear.uses - usesOf(state, itemId))
}

/** 곧 고장 나는가. 화면이 미리 경고할 근거다. */
export function isWorn(state: GameState, itemId: string): boolean {
  const left = usesLeft(state, itemId)
  return left !== undefined && left <= GEAR_WARN_LEFT
}

/**
 * 이 활동이 닳게 하는 장비. **지금 들고 있는 것만** 돌려준다.
 *
 * ⚠️ `requiresItem`이 배열이면 "그중 아무거나 하나"라 여럿을 가질 수 있는데, 그때는
 * **가진 것 전부가 닳는다**고 하면 액정을 산 사람이 팬 타블렛까지 잃는다. 실제로 쓴 것
 * 하나만 닳아야 하고, 그 하나는 **더 좋은 쪽**이다(`artwork.ts`가 등급을 매길 때 쓰는 것과
 * 같은 우선순위 — 목록 뒤쪽이 상위다).
 */
export function gearUsedBy(state: GameState, activity: Activity): string | undefined {
  if (!activity.requiresItem) return undefined
  const owned = requiredItemIds(activity.requiresItem).filter((id) =>
    (state.inventory ?? []).some((i) => i.id === id),
  )
  if (!owned.length) return undefined
  // 뒤쪽이 상위 장비다(`data/items.ts` 배열 순서). 상위를 가졌으면 그것을 쓴다.
  const best = owned[owned.length - 1]
  return findGear(best) ? best : undefined
}

/** 고장 결과. `broken`이 있으면 그 장비가 인벤토리에서 빠졌다. */
export interface GearWear {
  state: GameState
  /** 이번에 고장 난 물건 id. 없으면 undefined. */
  broken?: string
}

/**
 * 활동 한 번을 장비에 새긴다. **고장 나면 인벤토리에서 뺀다.**
 *
 * ⚠️ **`sold`가 아니라 `broken`에 남긴다.** 둘 다 "다시 받아도 효과가 없다"의 근거지만
 * 뜻이 다르다 — 판 물건과 부서진 물건을 한 배열에 섞으면 나중에 "왜 이게 여기 있지"를
 * 아무도 답할 수 없다(중고마켓 화면이 판 목록을 읽을 수도 있다).
 * ⚠️ **닳지 않는 활동은 상태를 그대로 돌려준다** — 새 객체를 만들면 `runActivity`의
 * 비교(`next === state`)를 쓰는 자리들이 헛돈다.
 */
export function wearGear(state: GameState, activity: Activity): GearWear {
  const itemId = gearUsedBy(state, activity)
  if (!itemId) return { state }

  const gear = findGear(itemId)!
  const used = usesOf(state, itemId) + 1
  const next: GameState = { ...state, gear: { ...(state.gear ?? {}), [itemId]: used } }
  if (used < gear.uses) return { state: next }

  return {
    state: {
      ...next,
      inventory: (next.inventory ?? []).filter((i) => i.id !== itemId),
      broken: [...new Set([...(next.broken ?? []), itemId])],
      /* 고장 났으면 사용 기록도 지운다 — 다시 사면 **새 물건**이라 처음부터 센다.
         안 지우면 되사자마자 또 부서진다. */
      gear: Object.fromEntries(Object.entries(next.gear ?? {}).filter(([k]) => k !== itemId)),
    },
    broken: itemId,
  }
}

/**
 * 고장 소식. **저장하지 않고 매번 만든다**(`weekendCallMessages`와 같은 자리) —
 * 사실(`broken` 배열)만 남기고 문장은 여기서 만든다.
 *
 * ⚠️ **새 알림 창구를 만들지 않는다**: 아웃룩(`MAILBOX.id`)을 그대로 탄다.
 */
export function gearMessages(
  state: GameState,
): { id: string; channel: string; from: string; subject: string; text: string }[] {
  return (state.broken ?? []).flatMap((itemId) => {
    const item = findItem(itemId)
    if (!item) return []
    return [
      {
        id: `gear-broken-${itemId}`,
        channel: 'outlook',
        from: '하이마루 A/S 센터',
        subject: `[안내] ${item.name} 수리 불가`,
        text: `보내 주신 ${item.name}은 수리보다 새로 구입하시는 편이 낫다는 판정이 나왔습니다. 같은 제품을 다시 주문하실 수 있습니다 — 다만 처음 개봉할 때의 그 기분은 두 번 오지 않습니다.`,
      },
    ]
  })
}

/** 세이브 보정. 모르는 물건 id는 버린다. */
export function reviveGear(raw: unknown): Record<string, number> | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const out: Record<string, number> = {}
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (findGear(k) && Number.isFinite(v) && Number(v) >= 0) out[k] = Math.round(Number(v))
  }
  return Object.keys(out).length ? out : undefined
}

export { GEARS, GEAR_WARN_LEFT }
