import { GUIDES } from '../data/guide'
import { MAILBOX } from '../data/messages'
import type { Guide } from '../data/guide'
import type { Message } from '../data/messages'
import type { GameState } from '../types/game'

/**
 * 첫 판 안내의 규칙. 문장은 전부 `data/guide.ts`에 있고 여기 있는 것은 **언제 오는가**뿐이다.
 *
 * ## ⚠️ 한 번만 온다
 * 편성표(`MESSAGE_SCHEDULE`)는 `turn % length`로 순환하므로 거기 넣으면 200일차에 다시
 * 온다. 그래서 **읽은 기록을 남기고**(`GameState.guides`) 다시 안 주는 쪽을 택했다 —
 * 랭크 이벤트와 같은 구조다.
 *
 * ## ⚠️ 새 게임에는 다시 온다
 * 기록을 `metaStore`(판을 넘어 남는 곳)가 아니라 **세이브**에 두는 것이 규칙이다.
 * 안내는 "이 판을 어떻게 시작하는가"이지 도감처럼 모으는 것이 아니고, 새 판을 여는 사람은
 * 대개 오랜만에 돌아온 사람이라 다시 읽을 자리가 있는 편이 낫다.
 */

/** 이미 받은 안내인가. */
export function seenGuide(state: GameState, id: string): boolean {
  return (state.guides ?? []).includes(id)
}

/**
 * 지금 도착해야 하는 안내들. **날짜가 됐고 아직 안 받은 것 전부.**
 *
 * ⚠️ 목록을 돌려주는 이유는 `dueRankEvents`와 같다: 자동 진행으로 며칠이 한 번에 흐르면
 * 두 통이 같은 밤에 밀려 있을 수 있는데, 하나만 주면 나머지가 영영 안 온다.
 * ⚠️ **주저앉은 동안에는 오지 않는다** — 회복 안내 위에 설명 메일이 겹치면 둘 다 안 읽힌다.
 */
export function dueGuides(state: GameState): Guide[] {
  if (state.recovery) return []
  return GUIDES.filter((g) => state.day >= g.day && !seenGuide(state, g.id))
}

/** 받았다고 기록한다. **이 함수가 곧 "다시 안 온다"의 전부다.** */
export function markGuide(state: GameState, id: string): GameState {
  if (seenGuide(state, id)) return state
  return { ...state, guides: [...(state.guides ?? []), id] }
}

/**
 * 도착한 안내를 기록하고, 띄울 메일을 함께 돌려준다.
 *
 * ⚠️ **`gameStore.afterTurn`이 부른다** — 턴을 넘기는 모든 통로가 지나는 자리라
 * 스케줄러·자동 진행으로 며칠을 밀어도 새지 않는다(랭크 이벤트와 같은 자리).
 */
export function settleGuides(state: GameState): { state: GameState; mails: Message[] } {
  const due = dueGuides(state)
  if (!due.length) return { state, mails: [] }
  let next = state
  for (const guide of due) next = markGuide(next, guide.id)
  return {
    state: next,
    mails: due.map((g) => ({
      id: `guide-${g.id}`,
      channel: MAILBOX.id,
      from: g.from,
      subject: g.subject,
      text: g.text,
    })),
  }
}

/**
 * 사서함이 그리는 안내 메일. **받은 것만** 보인다.
 *
 * ⚠️ 편성표 메일과 나란히 놓이므로 `Message` 형태 그대로다 — 안내용 자료구조를 하나 더
 * 만들면 사서함이 두 종류를 합치는 코드를 갖게 된다.
 * ⚠️ 보내는 이는 **데이터가 갖는다**(`Guide.from`) — 여기서 id로 짐작하면 안내를
 * 하나 더할 때 조용히 틀린 이름이 붙는다.
 */
export function guideMessages(state: GameState): Message[] {
  return GUIDES.filter((g) => seenGuide(state, g.id)).map((g) => ({
    id: `guide-${g.id}`,
    channel: MAILBOX.id,
    from: g.from,
    subject: g.subject,
    text: g.text,
  }))
}
