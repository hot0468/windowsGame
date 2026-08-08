import { RANK_EVENTS, WISH_AMOUNT, findRankEvent } from '../data/rankEvents'
import { RANK_ORDER } from './rank'
import { rankOf } from './rank'
import { clampStats } from './turn'
import type { RankEvent } from '../data/rankEvents'
import type { GameState, GrowthStatKey } from '../types/game'

/**
 * 랭크 이벤트 규칙.
 *
 * ## 의존 방향
 * ⚠️ `turn.ts`의 `clampStats`만 쓴다(`rank.ts`는 순수 판정). 턴을 넘기지 않으므로
 * 밸런스 시뮬레이션은 이 축을 몰라도 그대로 성립한다.
 *
 * ## ⚠️ 판정은 "지금 등급이 문턱 이상인가"다
 * "방금 올랐는가"가 아니다. 전자는 상태만 보면 답이 나오지만 후자는 **직전 상태**를
 * 들고 있어야 한다 — 그 값을 세이브에 두면 자동 진행·스케줄러가 며칠을 한 번에 흘릴 때
 * 중간 등급이 통째로 사라져 이벤트가 조용히 누락된다(급여·연재 커서와 같은 함정).
 */

/** 이미 겪은 이벤트인가. */
export function seenRankEvent(state: GameState, id: string): boolean {
  return (state.rankEvents ?? []).includes(id)
}

/** 지금 그 이벤트의 등급 문턱을 넘었는가. */
export function rankReached(state: GameState, event: RankEvent): boolean {
  const now = rankOf(event.key, state.stats[event.key])
  return RANK_ORDER.indexOf(now) >= RANK_ORDER.indexOf(event.rank)
}

/**
 * 지금 일어나야 하는 이벤트들. **아직 안 겪었고 문턱을 넘은 것 전부.**
 *
 * ⚠️ 목록을 돌려주는 이유: 자동 진행으로 며칠이 한 번에 흐르면 두 이벤트가 같은 밤에
 * 함께 열릴 수 있다. 하나만 돌려주면 나머지가 다음 밤까지 밀리고, 그 사이 세이브를
 * 지우면 영영 사라진다.
 */
export function dueRankEvents(state: GameState): RankEvent[] {
  if (state.gameOver) return []
  return RANK_EVENTS.filter((e) => !seenRankEvent(state, e.id) && rankReached(state, e))
}

/**
 * 겪었다고 기록한다. **이 함수가 곧 "다시 뜨지 않는다"의 전부다.**
 * ⚠️ 등급이 내려가도 기록은 지우지 않는다 — 지우면 오르내리기로 무한 반복 수령이 된다.
 */
export function markRankEvent(state: GameState, id: string): GameState {
  if (seenRankEvent(state, id)) return state
  return { ...state, rankEvents: [...(state.rankEvents ?? []), id] }
}

/**
 * **문턱을 넘은 대화방 이벤트를 기록한다.** 턴이 넘어갈 때마다 한 번 지난다.
 *
 * ⚠️ **창 이벤트(`kind: 'window'`)는 여기서 찍지 않는다.** 창은 열리는 것으로 끝이 아니라
 * 안에서 무언가를 했을 때 기록되어야 하고(`grantWish`), 여기서 찍으면 창을 닫기만 한
 * 사람이 기회를 잃는다. 대화방은 반대다 — **나타나는 것 자체가 이벤트 전부**라 그 자리에서
 * 찍어야 한다. 안 찍으면 `threadUnlockedByRank`가 볼 기록이 영영 안 생겨 **방이 한 번도
 * 열리지 않는다**(실제로 있던 버그다).
 *
 * ⚠️ 기록이 곧 "한 번 열리면 계속 보인다"의 근거다: 나중에 등급이 내려가도 방은 남는다.
 */
export function settleRankEvents(state: GameState): GameState {
  let next = state
  for (const event of dueRankEvents(state)) {
    if (event.kind !== 'thread') continue
    next = markRankEvent(next, event.id)
  }
  return next
}

/**
 * 그 대화방이 랭크 이벤트로 열리는 방인가. 열리는 방이면 **겪은 뒤에만** 보인다.
 *
 * ⚠️ **관계는 이벤트 → 대화방 한 방향이다**(`Thread`에 랭크 조건을 달지 않는다) —
 * 양쪽에 적으면 문턱이 두 곳에 생기고 한쪽만 고쳐도 아무 테스트가 안 터진다.
 */
export function threadUnlockedByRank(state: GameState, threadId: string): boolean | undefined {
  const event = RANK_EVENTS.find((e) => e.kind === 'thread' && e.target === threadId)
  if (!event) return undefined
  return seenRankEvent(state, event.id)
}

/**
 * 소원을 빈다 — 고른 스탯을 `WISH_AMOUNT`만큼 올린다.
 *
 * ⚠️ **턴을 쓰지 않는다**(별똥별을 보는 일이다). 그리고 **한 번만 된다**: 이벤트 기록이
 * 곧 사용권이라 여기서 함께 찍는다 — 창이 닫히기만 하고 기록이 안 남으면 다시 열려서
 * 같은 소원을 계속 빌 수 있다.
 * ⚠️ 상한은 `clampStats`가 자른다(평판·도덕·예의범절은 100에서 멈춘다).
 */
export function grantWish(state: GameState, key: GrowthStatKey): GameState {
  const event = findRankEvent('shooting-star')
  /* ⚠️ **문턱까지 여기서 다시 본다**(`rankReached`). "아직 안 빌었나"만 보면 창을 열지
     않고도 이 함수를 부를 수 있는 통로 하나가 게이트를 통째로 지나간다 — 손으로 고친
     세이브가 그 구멍으로 들어오면 시작부터 스탯 +100이다(`canRun`이 아이템·정규직 조건까지
     보는 것과 같은 이유이고, 실제로 테스트가 잡은 구멍이다). */
  if (!event || state.gameOver) return state
  if (seenRankEvent(state, event.id) || !rankReached(state, event)) return state
  return markRankEvent(
    {
      ...state,
      stats: clampStats({ ...state.stats, [key]: state.stats[key] + WISH_AMOUNT }),
    },
    event.id,
  )
}

/**
 * 랭크 이벤트로 열린 대화방의 **권유 메시지.**
 *
 * ⚠️ **편성표(`MESSAGE_SCHEDULE`)에 넣을 수 없다.** 편성표는 (날짜, 슬롯)으로 색인되는데
 * 이 방이 열리는 날은 플레이어가 언제 등급에 닿느냐에 달렸다 — 고정 색인에 넣으면 아직
 * 안 열린 방의 말이 먼저 도착한다. 그래서 `weekendCallMessages`·`webtoonMessages`와 같은
 * **파생 메시지**다: 저장하지 않고 매번 만든다.
 *
 * ⚠️ **말이 없으면 방만 뜬다.** 그것은 "권유가 왔다"가 아니라 "방이 생겼다"이고,
 * 실제로 화면에 "아직 대화가 없습니다"만 남는다(실측으로 잡았다).
 */
export function rankEventMessages(
  state: GameState,
): { id: string; channel: string; from: string; text: string }[] {
  if (!seenRankEvent(state, 'running-crew')) return []
  return [
    {
      id: 'rank-running-crew',
      channel: 'running-crew',
      from: '크루장 유진',
      text: '천변에서 몇 번 뵀어요! 저희 수요일 저녁마다 10km 도네요. 회비도 없고 그냥 같이 뛰기만 하면 됩니다. 같이 하실래요?',
    },
  ]
}

/**
 * 세이브 보정. 모르는 id는 버린다 — 이벤트를 지운 뒤에도 남아 있으면 도감·판정의
 * 개수가 흔들린다(`reviveAffection`과 같은 규칙).
 */
export function reviveRankEvents(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const ids = raw.filter((v): v is string => typeof v === 'string' && !!findRankEvent(v))
  return ids.length ? [...new Set(ids)] : undefined
}

export { RANK_EVENTS, WISH_AMOUNT }
