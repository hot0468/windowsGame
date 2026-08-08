import { MESSAGE_SCHEDULE, THREAD_LIMIT, THREADS, threadsOf } from '../data/messages'
import type { ChatAppId, Message, Thread } from '../data/messages'
import type { GameState, Slot, Stats } from '../types/game'

/**
 * 게임 시간(day, slot)을 0부터 세는 **턴 번호**로 바꾼다.
 * 1일차 오전 = 0, 1일차 오후 = 1, 2일차 오전 = 2 …
 *
 * 메시지 편성표가 이 번호 하나로 색인되므로, 날짜와 슬롯을 따로 다루는 코드가
 * 여기 말고는 생기지 않는다.
 */
export function turnIndex(day: number, slot: Slot): number {
  return (day - 1) * 2 + (slot === 'afternoon' ? 1 : 0)
}

/** 편성표는 순환한다 — 날짜 제한이 없는 게임이라 유한한 대본은 언젠가 바닥난다. */
function scheduleAt(turn: number): Message[] {
  if (turn < 0) return []
  return MESSAGE_SCHEDULE[turn % MESSAGE_SCHEDULE.length]
}

/**
 * 그 턴에 찍히는 시각 문구.
 *
 * ⚠️ `Date`를 쓰지 않는다 — 창을 열 때마다 시각이 바뀌면 결정성이 깨지고,
 * 게임 안의 시간(오전/오후 슬롯)과도 어긋난다. 오전은 09시대, 오후는 15시대로
 * 턴 안의 순번만큼 분을 밀어 준다.
 */
export function messageTime(turn: number, indexInTurn: number): string {
  const afternoon = turn % 2 === 1
  const hour = afternoon ? 15 : 9
  const minute = (indexInTurn * 17 + 8) % 60
  return `${afternoon ? '오후' : '오전'} ${hour}:${String(minute).padStart(2, '0')}`
}

/** 대화창에 뿌릴 한 줄. 원본 메시지에 시각을 붙인 표시용 형태다. */
export interface TimedMessage extends Message {
  time: string
  /**
   * 도착한 턴 번호. **정렬 키**다.
   *
   * ⚠️ 사서함에는 이제 두 출처가 섞인다: 편성표(결정적)와 **정규직 소식**(플레이어의
   * 선택에 달려 있어 다시 계산할 수 없다 — `systems/employment.ts`). 시각 문자열만으로는
   * 두 목록을 시간순으로 합칠 수 없어(같은 "오전 9:08"이 며칠에도 있다) 번호를 함께 준다.
   */
  turn: number
}

/**
 * 이 방이 지금 목록에 있는가.
 *
 * ⚠️ **판정은 여기 하나뿐이다.** 목록(메신저 창)·알림(토스트)·자동 진행 요약이 모두 이걸
 * 지나야 "없는 방의 알림이 뜨는" 어긋남이 안 생긴다 — 화면마다 자기 기준을 만들면
 * 반드시 한 곳이 빠진다(`canRun`이 활동에서 하는 일과 같은 자리다).
 */
export function threadVisible(thread: Thread, state: GameState): boolean {
  if (thread.requiresEmployment && !state.employment) return false
  if (thread.requiresWebtoon && state.webtoon?.status !== 'serializing') return false
  for (const [key, need] of Object.entries(thread.requires ?? {})) {
    if (state.stats[key as keyof Stats] < need) return false
  }
  return true
}

/** 이 앱에서 지금 보이는 방. 컴포넌트가 조건을 다시 적지 않는다. */
export function visibleThreadsOf(app: ChatAppId, state: GameState): Thread[] {
  return threadsOf(app).filter((t) => threadVisible(t, state))
}

/**
 * 이 채널의 메시지를 지금 보여 줘도 되는가.
 *
 * ⚠️ 채널은 방 id **또는** 사서함('outlook')이다 — 방이 아닌 채널은 늘 보인다
 * (메일은 조건 없이 오고, 없는 방으로 오해될 일도 없다).
 */
export function channelVisible(channel: string, state: GameState): boolean {
  const thread = THREADS.find((t) => t.id === channel)
  return thread ? threadVisible(thread, state) : true
}

/** 이 턴에 **새로 도착하는** 메시지. 토스트가 이걸 띄운다. */
export function selectIncoming(day: number, slot: Slot): Message[] {
  return scheduleAt(turnIndex(day, slot))
}

/**
 * 지금까지 이 채널(채팅방 또는 사서함)에 쌓인 메시지. 0턴부터 현재 턴까지 훑는다.
 *
 * 받은 메시지를 상태로 저장하지 않는 이유: 편성표가 결정적이라 (day, slot)만 있으면
 * 언제든 같은 목록을 다시 만들 수 있다. 세이브에 메시지 배열을 넣으면 편성표를
 * 고칠 때마다 기존 세이브와 어긋난다.
 */
export function selectChannel(channel: string, day: number, slot: Slot): TimedMessage[] {
  const now = turnIndex(day, slot)
  const out: TimedMessage[] = []
  for (let t = 0; t <= now; t++) {
    scheduleAt(t).forEach((m, i) => {
      if (m.channel === channel) out.push({ ...m, time: messageTime(t, i), turn: t })
    })
  }
  // 오래된 것부터 잘라 최근 것만 남긴다.
  return out.slice(-THREAD_LIMIT)
}

/** 목록 창의 한 줄에 쓰는 마지막 메시지. 없으면 undefined. */
export function lastMessage(channel: string, day: number, slot: Slot): TimedMessage | undefined {
  const all = selectChannel(channel, day, slot)
  return all[all.length - 1]
}
