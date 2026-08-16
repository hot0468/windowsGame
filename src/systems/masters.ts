import { MASTERS, MASTER_GIFT_RATIO, MASTER_MENTAL, findMaster } from '../data/masters'
import { RANK_ORDER, rankOf } from './rank'
import { clampStats, growthCap, inventoryOf, owns } from './turn'
import type { Master } from '../data/masters'
import type { GameState, GrowthStatKey } from '../types/game'

/**
 * 스탯 마스터 규칙 — **찾아오는 것과 받는 것은 다른 일이다.**
 *
 * ## 의존 방향
 * ⚠️ `turn.ts`의 `clampStats`·`growthCap`·`inventoryOf`만 쓴다(`rank.ts`는 순수 판정).
 * 턴을 넘기지 않으므로 밸런스 시뮬레이션은 이 축을 몰라도 그대로 성립한다
 * (`rankEvents.ts`와 같은 자리·같은 이유).
 *
 * ## ⚠️ 판정은 "지금 등급이 A 이상인가"다
 * "방금 A가 됐는가"가 아니다. 후자는 **직전 상태**를 들고 있어야 하는데, 그 값을 세이브에
 * 두면 자동 진행·스케줄러가 며칠을 한 번에 흘릴 때 중간 등급이 통째로 사라져 스승이
 * 영영 안 온다(`rankEvents.ts`가 같은 함정을 같은 방식으로 피한다).
 *
 * ## ⚠️ 기록은 **받을 때** 찍는다
 * 방이 열리는 것은 아무것도 기록하지 않는다 — 그래서 안 받고 두면 선물이 방에 그대로
 * 남는다(카톡 선물함과 같다). 방이 열릴 때 찍으면 **읽기만 한 사람이 선물을 통째로
 * 잃는다**(별똥별이 창을 열 때 안 찍는 것과 같은 판단).
 */

/** 이미 선물을 받은 스승인가. */
export function seenMaster(state: GameState, id: string): boolean {
  return (state.masters ?? []).includes(id)
}

/** 지금 그 스승의 문턱을 넘었는가. */
export function masterReached(state: GameState, master: Master): boolean {
  const now = RANK_ORDER.indexOf(rankOf(master.key, state.stats[master.key]))
  return now >= RANK_ORDER.indexOf(master.rank)
}

/**
 * 그 스승의 카톡 방이 보이는가.
 *
 * ⚠️ **한 번 열리면 계속 보인다**(랭크 이벤트 방과 같은 규칙): 등급이 나중에 내려가도
 * 선물을 이미 받았다면 방은 남는다 — 대화가 있었던 사람이 연락처에서 사라지지 않는다.
 */
export function masterArrived(state: GameState, master: Master): boolean {
  return seenMaster(state, master.id) || masterReached(state, master)
}

/**
 * 지금 카톡에 연락이 와 있는 스승들.
 *
 * ⚠️ 목록을 돌려주는 이유는 `dueRankEvents`와 같다: 자동 진행으로 며칠이 한 번에 흐르면
 * 둘이 같은 밤에 함께 연락할 수 있고, 하나만 돌려주면 나머지가 다음 밤까지 밀린다.
 */
export function arrivedMasters(state: GameState): Master[] {
  if (state.gameOver) return []
  return MASTERS.filter((m) => masterArrived(state, m))
}

/**
 * **선물이 아직 방에 남아 있는 스승들.** 연락은 왔는데 아직 안 받은 것.
 *
 * ⚠️ 안 받고 두면 사라지지 않는다 — 카톡 선물함과 같다. 그래서 "기회를 놓쳤다"가 없다.
 */
export function dueMasters(state: GameState): Master[] {
  if (state.gameOver) return []
  return MASTERS.filter((m) => !seenMaster(state, m.id) && masterReached(state, m))
}

/**
 * 그 방이 스승의 방인가, 열렸는가.
 *
 * ⚠️ **`threadUnlockedByRank`와 같은 모양·같은 이유다** — 조건을 `Thread`에 적지 않는다
 * (문턱은 `data/masters.ts` 한 곳). `undefined`는 "스승의 방이 아니다"이므로 그때만
 * 통과시킨다(조건 없는 기존 방이 사라지면 안 된다).
 */
export function threadUnlockedByMaster(state: GameState, threadId: string): boolean | undefined {
  const master = findMaster(threadId)
  if (!master) return undefined
  return masterArrived(state, master)
}

/**
 * 스승이 카톡으로 보내온 첫 마디.
 *
 * ⚠️ **편성표(`MESSAGE_SCHEDULE`)에 넣을 수 없다** — 편성표는 (날짜, 슬롯)으로 색인되는데
 * 이 연락이 오는 날은 플레이어가 언제 등급에 닿느냐에 달렸다. 그래서
 * `rankEventMessages`·`weekendCallMessages`와 같은 **파생 메시지**다: 저장하지 않고
 * 매번 만든다(`ChatApp`의 `derivedMessages`가 합친다).
 *
 * ⚠️ **말이 없으면 방만 뜬다** — 그것은 "연락이 왔다"가 아니라 "방이 생겼다"이고,
 * 화면에는 "아직 대화가 없습니다"만 남는다(랭크 이벤트 방에서 실제로 났던 버그).
 */
export function masterMessages(
  state: GameState,
): { id: string; channel: string; from: string; text: string }[] {
  return arrivedMasters(state).map((m) => ({
    id: `master-${m.id}`,
    channel: m.id,
    from: m.name,
    text: m.line,
  }))
}

/**
 * 그 스승이 올려 주는 값.
 *
 * ⚠️ **상한의 비율이다**(`MASTER_GIFT_RATIO`). 고정값으로 두면 상한이 100인
 * 평판·도덕·예의범절에서만 선물이 세 배로 커진다 — 랭크가 절대값이 아니라 비율로
 * 판정하는 것과 같은 이유이고, 상한을 손봐도 이 값이 저절로 따라온다.
 * ⚠️ **최소 1이다** — 0을 주면 "가르침을 받았는데 아무것도 안 올랐다"가 된다.
 */
export function giftAmount(key: GrowthStatKey): number {
  return Math.max(1, Math.round(growthCap(key) * MASTER_GIFT_RATIO))
}

/**
 * 선물을 받는다 — 그 스탯이 오르고, 멘탈이 조금 차고, 기념품이 인벤토리에 들어온다.
 *
 * ⚠️ **턴을 쓰지 않는다**(찾아온 것은 플레이어가 고른 행동이 아니다 — 별똥별과 같다).
 * ⚠️ **한 번만 된다**: 기록이 곧 사용권이라 여기서 함께 찍는다.
 * ⚠️ **문턱을 여기서 다시 본다.** "아직 안 받았나"만 보면 방을 거치지 않고 이 함수를
 * 부르는 통로 하나가 게이트를 통째로 지나간다(`grantWish`가 같은 이유로 같은 검사를 한다).
 * ⚠️ **상한은 `clampStats`가 자른다** — 이미 A에 닿은 스탯이라 999 근처면 잘릴 수 있고,
 * 그때는 멘탈과 기념품만 남는다(그래도 받은 것이 있으므로 빈손이 아니다).
 * ⚠️ **돈은 만지지 않는다**(`data/masters.ts`의 규칙) — 여기서 한 줄 더하면 그 규칙이 깨진다.
 */
export function receiveGift(state: GameState, id: string): GameState {
  const master = findMaster(id)
  if (!master || state.gameOver) return state
  if (seenMaster(state, id) || !masterReached(state, master)) return state

  const inventory = [...inventoryOf(state)]
  /* ⚠️ 같은 물건을 두 번 넣지 않는다(`collect`와 같은 방어) — 인벤토리는 목록이라
     중복이 들어가면 탐색기에 같은 줄이 둘 뜬다. 여기서는 "한 번만" 규칙 덕에 닿을 일이
     없지만, 손으로 고친 세이브가 그 규칙 밖에서 들어올 수 있다. */
  if (!owns(state, master.gift)) inventory.push({ id: master.gift, day: state.day })

  return {
    ...state,
    stats: clampStats({
      ...state.stats,
      [master.key]: state.stats[master.key] + giftAmount(master.key),
      mental: state.stats.mental + MASTER_MENTAL,
    }),
    inventory,
    masters: [...(state.masters ?? []), id],
  }
}

/**
 * 세이브 보정. 모르는 id는 버린다 — 스승을 지운 뒤에도 남아 있으면 개수가 흔들린다
 * (`reviveRankEvents`와 같은 규칙).
 */
export function reviveMasters(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const ids = raw.filter((v): v is string => typeof v === 'string' && !!findMaster(v))
  return ids.length ? [...new Set(ids)] : undefined
}

export { MASTERS, MASTER_MENTAL, findMaster }
