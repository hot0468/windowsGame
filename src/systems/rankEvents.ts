import { RANK_EVENTS, WISH_AMOUNT, findRankEvent } from '../data/rankEvents'
import { RANK_ORDER } from './rank'
import { rankOf } from './rank'
import { clampStats } from './turn'
import { recordEvent } from './delivery'
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

/**
 * 대가를 스탯에 얹는다.
 *
 * ⚠️ **소지금은 가진 것 안에서만 빠진다**(최소 1원은 남는다). `clampStats`가 돈은 안
 * 자르므로 그냥 빼면 잔액이 음수가 되고, 파산 판정이 `money <= 0`이라 **단발 이벤트가
 * 파산을 직접 만든다** — 이 게임은 물가로 끝나기로 돼 있어서 종결 사유가 흐려진다
 * (생활비는 음수를 허용하는데, 그쪽은 판을 끝내는 것이 제 일이라 규칙이 다르다).
 * "지갑을 잃었다"는 있던 만큼만 잃는 것이 어차피 참이기도 하다.
 */
function applyDelta(stats: GameState['stats'], delta: Partial<GameState['stats']>) {
  const next = { ...stats }
  for (const [key, value] of Object.entries(delta)) {
    const k = key as keyof typeof next
    next[k] += k === 'money' ? Math.max(value as number, -(next.money - 1)) : (value as number)
  }
  return next
}

/** 이미 겪은 이벤트인가. */
export function seenRankEvent(state: GameState, id: string): boolean {
  return (state.rankEvents ?? []).includes(id)
}

/**
 * 지금 그 이벤트의 문턱을 넘었는가.
 *
 * ⚠️ **`below`면 부등호가 뒤집힌다**(그 등급 **이하**). 낮은 스탯의 대가가 그쪽이고,
 * 그때는 **날짜 문턱(`afterDay`)이 실질 조건이다** — 시작값이 0이라 판이 열리는 순간
 * 모든 스탯이 F이기 때문이다.
 */
export function rankReached(state: GameState, event: RankEvent): boolean {
  if (event.afterDay !== undefined && state.day < event.afterDay) return false
  const now = RANK_ORDER.indexOf(rankOf(event.key, state.stats[event.key]))
  const need = RANK_ORDER.indexOf(event.rank)
  return event.below ? now <= need : now >= need
}

/**
 * 지금 일어나야 하는 이벤트들. **아직 안 겪었고 문턱을 넘은 것 전부.**
 *
 * ⚠️ 목록을 돌려주는 이유: 자동 진행으로 며칠이 한 번에 흐르면 두 이벤트가 같은 밤에
 * 함께 열릴 수 있다. 하나만 돌려주면 나머지가 다음 밤까지 밀리고, 그 사이 세이브를
 * 지우면 영영 사라진다.
 */
export function dueRankEvents(state: GameState): RankEvent[] {
  if (state.recovery) return []
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
    /* `thread`·`offer`는 **나타나는 것 자체가 이벤트 전부**라 이 자리에서 찍는다.
       `event`(단발)도 같다 — 도감에 한 줄 남기는 것이 곧 그 이벤트다. */
    if (event.kind === 'window') continue
    next = markRankEvent(next, event.id)
    /* ⚠️ 단발은 **이벤트 도감에도** 남긴다(`recordEvent`) — 랭크 기록은 "다시 안 뜬다"의
       근거일 뿐이고, 플레이어가 되돌아볼 자리는 사진첩 하나다(새 창구를 만들지 않는다). */
    if (event.kind === 'event') next = recordEvent(next, event.target)
    /* ⚠️ **대가는 여기서 한 번만 치른다.** 기록(`markRankEvent`)이 곧 사용권이라 등급이
       나중에 올라도 되돌려 주지 않고, 내려가도 두 번 물리지 않는다(소원과 같은 규칙).
       상한·하한은 `clampStats`가 자른다 — 돈이 음수가 되지 않는 것도 그쪽이다. */
    if (event.effects) {
      next = { ...next, stats: clampStats(applyDelta(next.stats, event.effects)) }
    }
  }
  return next
}

/**
 * 그 제안 선택지가 랭크 이벤트로 열리는 것인가. 열리는 것이면 **겪은 뒤에만** 보인다.
 *
 * ⚠️ `threadUnlockedByRank`와 같은 모양·같은 이유다 — 문턱은 `data/rankEvents.ts` 한 곳이고
 * `OfferOption`에 조건을 달지 않는다. `undefined`는 "랭크로 열리는 선택지가 아니다"이므로
 * 그때만 통과시킨다(조건 없는 기존 선택지가 사라지면 안 된다).
 */
export function offerUnlockedByRank(state: GameState, optionId: string): boolean | undefined {
  const event = RANK_EVENTS.find((e) => e.kind === 'offer' && e.target === optionId)
  if (!event) return undefined
  return seenRankEvent(state, event.id)
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
  if (!event || state.recovery) return state
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
  /* ⚠️ **방마다 한 줄씩 짝이 있어야 한다**(위 주석의 실측 버그) — 방을 새로 열면서
     여기에 말을 안 붙이면 "아직 대화가 없습니다"만 뜬다. `rankEvents.test.ts`가 지킨다. */
  const lines: Record<string, { from: string; text: string }> = {
    'running-crew': {
      from: '크루장 유진',
      text: '천변에서 몇 번 뵀어요! 저희 수요일 저녁마다 10km 도네요. 회비도 없고 그냥 같이 뛰기만 하면 됩니다. 같이 하실래요?',
    },
    'raid-party': {
      from: '길드원 도현',
      text: '어제 그 판 보고 연락드려요. 저희 고정팟 자리가 하나 비는데 들어오실래요? 매주 같은 시간에 두 시간만 돕니다. 디스코드 주소 보내 둘게요.',
    },
    'book-club': {
      from: '모임지기',
      text: '독서모임 오픈카톡입니다. 매주 한 권 읽고 한 시간 이야기해요. 발제는 돌아가면서 하는데 처음 오시면 안 시킵니다.',
    },
    neighbors: {
      from: '3층 은재',
      text: '늘봄빌라 이웃 오픈채팅이에요. 재활용 요일이랑 택배 얘기가 대부분인데, 가끔 이렇게 밥도 먹습니다. 부담 갖지 마시고 오세요.',
    },
    'invest-club': {
      from: '스터디장 상혁',
      text: '월요일마다 각자 본 것 하나씩 발표하는 모임입니다. 종목 추천은 안 하고 왜 그렇게 봤는지만 이야기해요. 회비는 없습니다.',
    },
    'band-recruit': {
      from: '건반 치는 재훈',
      text: '올려 두신 곡 잘 들었어요. 저희 셋인데 한 자리가 비어서요. 금요일 저녁마다 합주실 잡아 두는데 한번 와 보실래요? 맞춰 보면 아실 거예요.',
    },
    devcrew: {
      from: '해온소프트 김실장',
      text: '작업하신 것 보고 연락드립니다. 저희가 굴리는 사이트 몇 개 유지보수를 건별로 맡길 데를 찾고 있어요. 급한 것만 가끔 드릴 텐데 괜찮으실까요?',
    },
    academy: {
      from: '한빛학원 실장',
      text: '이력 보고 연락드렸습니다. 주 1회 특강 맡아 주실 수 있을까요? 강의료는 회당 정산이고 준비 자료는 저희가 드립니다.',
    },
  }
  return RANK_EVENTS.filter(
    (e) => e.kind === 'thread' && seenRankEvent(state, e.id) && lines[e.target],
  ).map((e) => ({
    id: `rank-${e.id}`,
    channel: e.target,
    from: lines[e.target].from,
    text: lines[e.target].text,
  }))
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
