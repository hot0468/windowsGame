import { findActivity } from '../data/activities'
import { STREAM_REVIEWS, countLabel } from '../data/tweets'
import { STREAM_TOPICS, subscribersFrom } from '../data/videos'
import { RANK_ORDER, rankOf } from './rank'
import { canRun, runActivity } from './turn'
import type { StreamTopic } from '../data/videos'
import type { Tweet } from '../data/tweets'
import type { ChannelState, GameState } from '../types/game'

/**
 * 개인방송 채널 — 이름 짓기와 시청자 반응.
 *
 * ⚠️ **실행하는 활동은 `stream` 하나다**(증기·미디북스와 같은 규칙). 주제는 무엇을 하며
 * 두 시간을 보내는가만 정하고 수치는 갖지 않는다 — 여기서 하는 일은 활동이 못 넘기는
 * 값 둘(켠 횟수·마지막 주제)을 얹는 것뿐이다(`playGame`과 정확히 같은 모양).
 *
 * ## 왜 반응을 저장하지 않는가
 * 시청자 반응은 **채널 상태의 파생값이다** — 켠 적이 있는가(존재), 얼마나 켰는가(개수),
 * 평판이 어디쯤인가(어조). 저장해 버리면 평판이 떨어져도 "화제의 채널" 트윗이 남아
 * 화면이 게임과 다른 말을 한다. 뉴스(`selectNews`)가 날짜에서 목록을 만드는 것과 같다.
 *
 * ⚠️ **`Math.random` 금지**(systems 공통) — 같은 상태면 같은 반응이 나온다.
 */

/** 너튜브가 실행하는 활동. 컴포넌트가 id를 적지 않도록 여기서 한 번만 적는다. */
export const STREAM_ACTIVITY_ID = 'stream'

/**
 * 채널 이름 길이 상한. 타임라인 한 줄·채널 머리 양쪽에 흐르는 값이라 묶는다
 * (이름이 길면 반응 문장이 이름으로만 차서 무슨 말인지 읽히지 않는다).
 */
export const CHANNEL_NAME_MAX = 16

/** 지금 채널. 이름을 지은 적 없으면 **플레이어 이름이 곧 채널 이름이다**(빈 화면 금지). */
export function channelOf(state: GameState): ChannelState {
  return state.channel ?? { name: state.playerName, streams: 0 }
}

/**
 * 채널 이름을 바꾼다. **턴을 쓰지 않는다** — 타이핑은 행동이 아니다("탐색은 무료"와 같은 결).
 * 빈 이름은 거절한다(이름이 사라지면 트위터 검색이 모든 글에 걸린다).
 */
export function renameChannel(state: GameState, raw: string): GameState {
  const name = raw.trim().slice(0, CHANNEL_NAME_MAX)
  if (!name) return state
  return { ...state, channel: { ...channelOf(state), name } }
}

/**
 * 방송을 켠다. 1턴을 쓰고 켠 횟수와 주제를 남긴다.
 *
 * ⚠️ 조건(`canRun` — 행동력·장비)을 못 넘기면 **상태를 그대로 돌려준다**
 * (`playGame`과 같은 규칙 — 턴은 안 갔는데 방송 기록만 늘어나는 반쪽 상태 금지).
 */
export function startStream(state: GameState, topic: StreamTopic): GameState {
  const activity = findActivity(STREAM_ACTIVITY_ID)
  if (!activity || !canRun(state, activity)) return state

  const after = runActivity(state, activity)
  if (after === state) return state

  const channel = channelOf(after)
  return { ...after, channel: { ...channel, streams: channel.streams + 1, topic: topic.id } }
}

/**
 * 지금 채널 크기에 어울리는 반응 단계(0 무명 / 1 알려짐 / 2 화제).
 *
 * ⚠️ **판정은 평판 등급이 한다**(`rankOf`) — 구독자 수는 어차피 평판 파생이고,
 * 여기서 구독자 수로 다시 자르면 임계값이 두 곳이 된다.
 */
export function reviewTier(state: GameState): 0 | 1 | 2 {
  const i = RANK_ORDER.indexOf(rankOf('reputation', state.stats.reputation))
  if (i <= 1) return 0 // F·C
  return i <= 3 ? 1 : 2 // B·A / S·SS
}

/**
 * 내 방송에 대한 시청자 반응. **트위터에서 채널 이름을 검색했을 때만 쓰인다.**
 *
 * ⚠️ **켠 적이 없으면 빈 배열이다** — 방송한 적 없는 사람의 방송 후기는 거짓말이다.
 * 개수는 켠 횟수만큼 늘고(그 단계의 풀이 상한), 어조는 `reviewTier`가 정한다.
 *
 * ⚠️ **좋아요·조회수는 구독자 수에서 파생한다**(`data/tweets.ts`가 숫자를 안 갖는 이유).
 * 뒤로 갈수록 작아지는 것은 목록이 반응 큰 순으로 읽히게 하기 위함이다.
 */
export function streamReviews(state: GameState): Tweet[] {
  const channel = state.channel
  if (!channel || channel.streams <= 0) return []

  const tier = reviewTier(state)
  const topic = STREAM_TOPICS.find((t) => t.id === channel.topic)
  const subs = subscribersFrom(state.stats.reputation)

  return STREAM_REVIEWS.filter((r) => r.tier === tier)
    .slice(0, channel.streams)
    .map((r, i) => {
      const likes = Math.round(subs / (i + 2))
      return {
        id: `review-${tier}-${i}`,
        handle: r.handle,
        body: r.body
          .replace(/\{name\}/g, channel.name)
          .replace(/\{topic\}/g, topic?.label ?? '개인방송'),
        // 내 방송 후기는 내가 팔로우한 계정의 글이 아니다 — '팔로잉' 탭에는 안 뜬다.
        following: false,
        replies: Math.round(likes / 14),
        retweets: Math.round(likes / 8),
        likes,
        views: countLabel(likes * 7),
      }
    })
}
