import {
  FOLLOWERS_BY_GRADE,
  FOLLOWER_CAP,
  LIKES_BY_GRADE,
  PAYOUT_INTERVAL_DAYS,
  WON_PER_FOLLOWER,
  PLUS_MULTIPLIER,
  RETWEETS_PER_LIKE,
  WEEKLY_INCOME_CAP,
  artTitle,
} from '../data/artworks'
import {
  DEFAULT_FOLLOWING,
  TWEET_ACCOUNTS,
  REPLIES_SHOWN,
  REPLY_LINES,
  TWEET_MAX_LENGTH,
  findAccount,
  followersFrom,
  myTweetStats,
} from '../data/tweets'
import { albumPhotos } from './delivery'
import { artGrade, findArtwork } from './artwork'
import { canRun, clampStats, runActivity, settleRecovery, subscribed } from './turn'
import { findActivity } from '../data/activities'

/** 유료 구독 id(`data/subscriptions.ts`). ⚠️ **관계는 정산 → 구독 한 방향으로만 적는다.** */
export const PLUS_SUBSCRIPTION_ID = 'twitter-plus'
import type { Artwork, GameState, MyPost, TwitterState } from '../types/game'
import type { Tweet } from '../data/tweets'

/**
 * 트위터 — 그림 업로드와 주간 정산.
 *
 * ## 무엇이 달라졌나
 * 원래 팔로워는 `followersFrom(reputation)`으로 **파생**되는 읽기 전용 값이었다(장식).
 * 그림을 올려 팔로워를 얻게 되면서 재계산이 불가능해졌다 — 무엇을 언제 올렸는지에
 * 달려 있기 때문이다(`JobNotice`를 세이브에 남기는 것과 같은 이유). 그래서 **그림으로 번
 * 몫만** 저장하고 평판 몫은 그대로 파생시킨 뒤 `totalFollowers`가 둘을 더한다 —
 * 한쪽을 상태로 흡수해 버리면 평판이 올라도 팔로워가 안 느는 이상한 일이 생긴다.
 *
 * ## 왜 상한이 있는가
 * ⚠️ **`FOLLOWER_CAP`이 "판은 반드시 끝난다"를 지탱한다.** 상한이 없으면 그림을 계속
 * 올리는 것만으로 수입이 물가를 앞질러 게임이 안 끝난다. 정규직 급여가 물가 배율을
 * 안 타는 것과 정확히 같은 장치이고, `twitter.test.ts`가 데이터에서 직접 부등식을 지킨다.
 *
 * ## 의존 방향
 * `twitter.ts` → `turn.ts` (반대는 없다). `turn.ts`가 보는 것은 `paidDay` 날짜 하나뿐이고
 * (`nightPayoutPending`), 규칙은 전부 여기 있다 — `employment`·`bank`·`lottery`와 같다.
 */

/**
 * 아직 아무것도 안 올린 사람의 상태. `day`가 첫 정산 기준일이 된다.
 * ⚠️ **`Required<>`인 것이 규칙이다** — 나중에 붙은 필드는 세이브에 없을 수 있어
 * 타입에서 옵셔널이지만, 이 함수를 지나온 값은 전부 채워져 있다.
 */
export function emptyTwitter(day: number): Required<TwitterState> {
  return {
    gained: 0,
    postedIds: [],
    likes: 0,
    paidDay: day,
    following: DEFAULT_FOLLOWING,
    liked: [],
    retweeted: [],
    seenNotices: 0,
    posts: [],
  }
}

/**
 * ⚠️ **구세이브에 없는 필드를 여기서 메운다**(마이그레이션 대신 — 옵셔널 상태 규칙).
 * 빈 상태 위에 저장값을 덮으므로 필드가 늘어도 이 함수는 그대로다.
 */
export function twitterOf(state: GameState): Required<TwitterState> {
  return { ...emptyTwitter(state.day), ...(state.twitter ?? {}) }
}

/**
 * 지금 팔로워 수 = **평판에서 온 몫 + 그림으로 번 몫**, 상한까지.
 *
 * ⚠️ 상한은 **합계**에 건다. 그림 몫에만 걸면 평판이 그 위에 얹혀 상한이 뚫리고,
 * 그러면 위의 "판은 반드시 끝난다"가 무너진다.
 */
export function totalFollowers(state: GameState): number {
  const base = followersFrom(state.stats.reputation)
  return Math.min(FOLLOWER_CAP, base + twitterOf(state).gained)
}

/** 이 그림을 올리면 늘어나는 팔로워. 등급이 낮으면 0이다(확인창이 미리 적는다). */
export function followerGain(work: Artwork): number {
  return FOLLOWERS_BY_GRADE[artGrade(work)]
}

/**
 * 이 그림이 받을 좋아요. **팔로워와 다른 축이다** — 팔로워는 상한이 걸린 수입의 축이고
 * 좋아요는 상한 없는 평가의 축이라 **웹툰 제의가 보는 값**이 이쪽이다.
 * ⚠️ F도 0이 아니다: 아무도 안 보는 그림은 없지만, 그 수로는 제의에 한참 못 미친다.
 */
export function likeGain(work: Artwork): number {
  return LIKES_BY_GRADE[artGrade(work)]
}

/**
 * 이 그림이 받을 리트윗. **좋아요에서 파생한다**(`RETWEETS_PER_LIKE`) — 저장하지 않는다.
 */
export function retweetGain(work: Artwork): number {
  return Math.floor(likeGain(work) * RETWEETS_PER_LIKE)
}

/** 이미 올린 그림인가. 같은 그림으로 팔로워를 반복해서 벌 수 없다. */
export function isPosted(state: GameState, artworkId: string): boolean {
  return twitterOf(state).postedIds.includes(artworkId)
}

/** 아직 안 올린 그림. 최근에 그린 것이 앞이다(고르는 화면이 스크롤을 덜 탄다). */
export function postableArtworks(state: GameState): Artwork[] {
  return (state.artworks ?? []).filter((a) => !isPosted(state, a.id)).reverse()
}

/** 지금 유료 구독 중인가. 화면과 정산이 같은 술어를 본다. */
export function hasPlus(state: GameState): boolean {
  return subscribed(state, PLUS_SUBSCRIPTION_ID)
}

/**
 * 이번 주에 들어올 정산금. 화면이 "얼마가 들어오나"를 미리 적을 수 있게 밖으로 뺀다.
 *
 * ⚠️ **천장(`WEEKLY_INCOME_CAP`)이 배율보다 뒤에 온다.** 순서를 뒤집어 천장을 먼저
 * 재고 곱하면 상한 일수입이 두 배가 되어 **생활비를 넘고 판이 끝나지 않는다**
 * (`data/artworks.ts`의 상수 주석 · `twitter.test.ts`의 부등식).
 */
export function weeklyIncome(state: GameState): number {
  const base = totalFollowers(state) * WON_PER_FOLLOWER * (hasPlus(state) ? PLUS_MULTIPLIER : 1)
  return Math.round(Math.min(base, WEEKLY_INCOME_CAP))
}

/** 다음 정산까지 남은 날. 아직 트위터를 시작하지 않았으면 undefined. */
export function daysToPayout(state: GameState): number | undefined {
  if (!state.twitter) return undefined
  return Math.max(0, state.twitter.paidDay + PAYOUT_INTERVAL_DAYS - state.day)
}

/**
 * 그림을 올린다. **1턴을 쓴다**(`sns` 활동이 비용을 갖는다).
 *
 * ⚠️ **조건이 하나라도 안 되면 상태를 그대로 돌려준다** — 반쪽 상태(팔로워는 늘었는데
 * 턴은 안 쓴, 또는 그 반대)를 남기지 않는다(`takeCourse`·`takeExam`과 같은 규칙).
 *
 * ⚠️ **팔로워는 활동을 실행하기 전에 계산하고 실행한 뒤에 얹는다.** `runActivity`가
 * 턴을 넘기며 새 상태를 만들기 때문이고, 그림의 등급은 그릴 때 박힌 값이라
 * 실행 전후로 달라지지 않는다.
 *
 * ⚠️ **`paidDay`는 여기서 처음 잡힌다** — 올린 적 없는 사람에게 정산 커서를 미리 만들어
 * 두면 아무것도 안 한 사람에게도 밤마다 `nightPayoutPending`이 참이 된다.
 */
export function postArtwork(state: GameState, artworkId: string): GameState {
  if (state.recovery) return state
  const work = findArtwork(state, artworkId)
  if (!work || isPosted(state, artworkId)) return state

  const activity = findActivity('sns')
  if (!activity || !canRun(state, activity)) return state

  const gain = followerGain(work)
  const likes = likeGain(work)
  const before = twitterOf(state)
  const next = runActivity(state, activity)
  // 실행이 막혔으면(게임오버 등) 아무것도 얹지 않는다.
  if (next === state) return state

  return {
    ...next,
    twitter: {
      ...before,
      gained: before.gained + gain,
      likes: before.likes + likes,
      postedIds: [...before.postedIds, artworkId],
      /* ⚠️ **그림도 내 타임라인에 한 줄 남는다** — "내가 올린 것"이 한 종류로 읽혀야
         한다. 본문을 여기서 짓는 것은 고를 것이 그림뿐이라 쓸 글이 없기 때문이다. */
      posts: [
        ...before.posts,
        {
          id: `me-${state.day}-${before.posts.length}`,
          day: state.day,
          body: `「${artTitle(work.serial)}」 올립니다.`,
          artworkId,
        },
      ],
    },
  }
}

/**
 * 밤 정산 — **이레마다 팔로워 수에 비례한 돈이 소지금으로 들어온다**(설계자 지시: 주 1회).
 *
 * ⚠️ **커서(`paidDay`)를 7씩 밀며 밀린 주를 따라잡는다.** 스케줄러 연쇄·자동 진행으로
 * 며칠이 한 번에 흐를 수 있으므로 "한 번만 준다"로 두면 그 사이의 주가 통째로 사라진다
 * (`advanceEmployment`의 급여 루프와 같은 장치). 반대로 커서를 안 두면 같은 주를
 * 매 슬롯 정산해 무한히 돈이 나온다.
 *
 * ⚠️ **금액은 정산하는 시점의 팔로워로 계산한다** — 그 주 내내의 평균이 아니다.
 * 계산할 근거(주중의 팔로워 이력)를 저장하지 않기 때문이고, 저장할 만한 값도 아니다.
 *
 * ⚠️ **마지막 줄이 `settleRecovery`다**(`advanceBank`·`advanceLottery`와 같다) —
 * 밤에 돈을 넣는 함수는 넣은 뒤 판정을 다시 물어야 "정산금을 쥔 채 굶어 죽는" 판이 안 난다.
 *
 * ⚠️ `state.twitter`가 없으면 **아무것도 하지 않는다**(올린 적 없는 사람의 세이브를
 * 부풀리지 않는다 — `advanceBank`와 같은 규칙).
 */
export function advanceTwitter(state: GameState): GameState {
  const twitter = state.twitter
  if (!twitter || state.recovery) return state

  let paidDay = twitter.paidDay
  let money = state.stats.money
  let paid = 0
  // 상한(`FOLLOWER_CAP`)이 걸린 값이라 주가 밀려도 총액이 발산하지 않는다.
  const perWeek = weeklyIncome(state)
  while (state.day - paidDay >= PAYOUT_INTERVAL_DAYS) {
    paidDay += PAYOUT_INTERVAL_DAYS
    money += perWeek
    paid += perWeek
  }
  if (paid === 0) return state

  return settleRecovery({
    ...state,
    stats: clampStats({ ...state.stats, money }),
    twitter: { ...twitter, paidDay },
  })
}

/* ── 팔로우 · 좋아요 · 리트윗 ──────────────────────────────────────────
 *
 * ⚠️ **셋 다 턴도 돈도 안 쓴다**("탐색은 무료" — 즐겨찾기·구독과 같은 부류다).
 * 대신 **죽은 컨트롤이 아니다**: 팔로우는 '팔로잉' 탭이 보는 목록을 실제로 바꾸고,
 * 좋아요·리트윗은 그 트윗의 숫자를 실제로 1 올린다.
 *
 * ⚠️ **셋은 같은 모양이라 토글 하나로 처리한다** — 목록 셋에 각각 함수를 만들면
 * 같은 코드가 세 벌이 되고 한 곳만 고치는 사고가 난다.
 */

export type TweetReaction = 'follow' | 'like' | 'retweet'

const REACTION_FIELD: Record<TweetReaction, 'following' | 'liked' | 'retweeted'> = {
  follow: 'following',
  like: 'liked',
  retweet: 'retweeted',
}

/**
 * 지금 팔로우 중인 계정. 아직 아무것도 안 눌렀으면 데이터의 씨앗(`DEFAULT_FOLLOWING`)이다.
 * ⚠️ **탭도 버튼도 이 함수만 본다** — `Tweet.following` 플래그를 직접 읽지 말 것.
 */
export function followedHandles(state: GameState): string[] {
  return twitterOf(state).following
}

/** 이 반응을 이미 눌렀는가. 버튼의 눌림 상태(`aria-pressed`)와 숫자 +1이 같은 것을 본다. */
export function hasReacted(state: GameState, kind: TweetReaction, key: string): boolean {
  return twitterOf(state)[REACTION_FIELD[kind]].includes(key)
}

/** 눌렀으면 빼고 안 눌렀으면 넣는다. `key`는 팔로우면 핸들, 나머지는 트윗 id다. */
export function toggleReaction(state: GameState, kind: TweetReaction, key: string): GameState {
  const twitter = twitterOf(state)
  const field = REACTION_FIELD[kind]
  const list = twitter[field]
  const next = list.includes(key) ? list.filter((v) => v !== key) : [...list, key]
  return { ...state, twitter: { ...twitter, [field]: next } }
}

/* ── 알림 ───────────────────────────────────────────────────────────
 *
 * ⚠️ **알림은 저장하지 않는다 — 올린 그림에서 전부 파생시킨다**(`streamReviews`와 같은
 * 규칙). 저장하면 그림 등급이 정하는 수치와 알림 내용이 갈라진다. 그래서 세이브에 남는
 * 것은 "어디까지 봤나"(`seenNotices`) 하나뿐이다.
 *
 * ⚠️ **계정을 새로 만들지 않는다** — 알림에 뜨는 사람은 타임라인의 그 계정들이다
 * (`TWEET_ACCOUNTS` 재사용).
 */

/**
 * 알림의 종류. **`TweetReaction`(내가 누르는 것)보다 하나 넓다** — 답글은 내가 누르는
 * 토글이 아니라 남이 남기는 것이라 반응 목록에 들어가지 않는다.
 */
export type NoticeKind = TweetReaction | 'reply'

export interface TweetNotice {
  id: string
  kind: NoticeKind
  /** 앞에 이름을 적을 계정 핸들. 1~2명이고 나머지는 `others`로 샌다. */
  actors: string[]
  /** "외 N명"의 N. 0이면 그 줄을 안 그린다. */
  others: number
  /** 무엇에 대한 반응인가(내 그림 제목). 팔로우 알림은 인용할 글이 없다. */
  about?: string
  day: number
}

/**
 * 알림·답글을 만든 계정을 고른다. **난수를 쓰지 않는다**(뉴스·트윗 시각과 같은 결정성
 * 규칙) — 씨앗에서 자리를 잡고 연속으로 집으므로 같은 글이면 늘 같은 사람이 뜬다.
 */
function pickActors(seed: number, count: number): string[] {
  const n = TWEET_ACCOUNTS.length
  return Array.from(
    { length: Math.min(count, n) },
    (_, i) => TWEET_ACCOUNTS[(Math.abs(seed) * 7 + i) % n].handle,
  )
}

/** 문자열에서 결정적인 씨앗을 뽑는다. 글 id가 곧 그 글의 배우 배치를 정한다. */
function seedOf(text: string): number {
  let h = 0
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) % 100_000
  return h
}

/** 이름을 몇 명까지 적나. 실제 X와 같다 — 셋 이상이면 한 명 + "외 N명", 둘이면 두 명. */
function noticeFrom(
  kind: NoticeKind,
  postId: string,
  day: number,
  total: number,
  about?: string,
): TweetNotice | null {
  if (total <= 0) return null
  const actors = pickActors(seedOf(postId) + kind.length, total >= 3 ? 1 : total)
  return { id: `tw-${kind}-${postId}`, kind, actors, others: total - actors.length, about, day }
}

/**
 * 내가 올린 글 하나가 받는 반응 수.
 *
 * ⚠️ **그림이냐 글이냐로 갈린다.** 그림은 **등급**이 정하고(팔로워까지 준다 — 상한이
 * 걸린 수입의 축), 글·사진은 **팔로워**가 정한다(표시 전용이고 팔로워를 안 만든다).
 * 두 축을 하나로 합치면 "아무 글이나 올려도 팔로워가 는다"가 되어 그림을 그릴 이유가 사라진다.
 */
function reactionsFor(
  state: GameState,
  post: MyPost,
): { follows: number; retweets: number; likes: number; replies: number } {
  const work = post.artworkId ? findArtwork(state, post.artworkId) : undefined
  if (work) {
    const likes = likeGain(work)
    return {
      follows: followerGain(work),
      retweets: retweetGain(work),
      likes,
      replies: Math.floor(likes * 0.09),
    }
  }
  const stats = myTweetStats(totalFollowers(state))
  return { follows: 0, retweets: stats.retweets, likes: stats.likes, replies: stats.replies }
}

/**
 * 내 계정에 온 알림 — **최신이 앞이다.**
 *
 * 내가 올린 글 하나가 팔로우·리트윗·좋아요·답글 네 줄을 만든다. **수치가 0인 줄은 뺀다** —
 * 글에는 팔로우 알림이 없고(팔로워를 만드는 것은 그림뿐이다), 작은 계정의 글에는
 * 리트윗·답글이 없다(실제로 아무도 안 했으니 맞는 말이다).
 *
 * ⚠️ **내가 쓴 답글은 알림을 만들지 않는다** — 남의 스레드에 남긴 한 줄까지 알림이 되면
 * 알림 목록이 내 말로 도배된다(실제 X도 답글의 반응은 따로 세지 않는다).
 */
export function tweetNotices(state: GameState): TweetNotice[] {
  return myPosts(state)
    .filter((post) => !post.replyTo)
    .flatMap((post) => {
      const n = reactionsFor(state, post)
      const about = postSummary(state, post)
      return [
        noticeFrom('follow', post.id, post.day, n.follows, about),
        noticeFrom('reply', post.id, post.day, n.replies, about),
        noticeFrom('retweet', post.id, post.day, n.retweets, about),
        noticeFrom('like', post.id, post.day, n.likes, about),
      ].filter((x): x is TweetNotice => !!x)
    })
}

/** 알림이 인용할 한 줄. 그림이면 제목, 아니면 본문(길면 자른다). */
function postSummary(state: GameState, post: MyPost): string {
  const work = post.artworkId ? findArtwork(state, post.artworkId) : undefined
  if (work) return `「${artTitle(work.serial)}」`
  if (post.body) return post.body.length > 28 ? `${post.body.slice(0, 28)}…` : post.body
  return '사진'
}

/** 안 읽은 알림 개수. 좌 네비 [알림]의 뱃지가 이 값이다. */
export function unreadNotices(state: GameState): number {
  return Math.max(0, tweetNotices(state).length - twitterOf(state).seenNotices)
}

/** 알림을 열었다. 뱃지를 지운다(상태를 바꾸지만 턴은 안 쓴다 — 읽는 것은 무료다). */
export function markNoticesSeen(state: GameState): GameState {
  const twitter = twitterOf(state)
  const total = tweetNotices(state).length
  if (twitter.seenNotices === total) return state
  return { ...state, twitter: { ...twitter, seenNotices: total } }
}

/** 알림 한 줄의 문장. **화면 셋(알림 목록·토스트)이 같은 문구를 쓴다.** */
export function noticeText(notice: TweetNotice): string {
  const name = findAccount(notice.actors[0])?.name ?? notice.actors[0]
  const second = notice.actors[1] ? `님과 ${findAccount(notice.actors[1])?.name ?? notice.actors[1]}` : ''
  const others = notice.others > 0 ? `님 외 ${notice.others.toLocaleString('ko-KR')}명` : '님'
  const who = `${name}${second}${others}`
  if (notice.kind === 'follow') return `${who}이 회원님을 팔로우했습니다`
  if (notice.kind === 'retweet') return `${who}이 회원님의 게시물을 리트윗했습니다`
  if (notice.kind === 'reply') return `${who}이 회원님의 게시물에 답글을 남겼습니다`
  return `${who}이 회원님의 게시물을 좋아합니다`
}

/* ── 내가 쓴 글 ──────────────────────────────────────────────────────
 *
 * ⚠️ **규칙이 바뀐 자리다**(2026-08-22 설계자 지시). 원래 작성창에는 입력칸이 없었다 —
 * 받은 글이 게임 어디에도 안 쓰여 장식이었기 때문이다. 이제 **내 글이 타임라인에
 * 그대로 남으므로** 쓰이는 값이 됐고, 그래서 본문을 저장한다.
 *
 * ⚠️ **글은 팔로워를 만들지 않는다.** 팔로워를 주는 것은 여전히 그림뿐이고(그 상한이
 * "판은 반드시 끝난다"를 지탱한다), 내 글에 붙는 숫자는 팔로워에서 파생한 **표시 전용**이다.
 */

/** 내가 올린 글. **최신이 앞이다**(저장은 민 순서 그대로라 여기서 뒤집는다). */
export function myPosts(state: GameState): MyPost[] {
  return [...twitterOf(state).posts].reverse()
}

/**
 * 글을 올린다. **1턴을 쓴다**(`sns` 활동이 비용을 갖는다 — `postArtwork`와 같은 모양).
 *
 * ⚠️ **빈 글은 안 올라간다.** 사진이 붙어 있으면 본문이 비어도 되지만(사진만 올리는 것은
 * 실제 X에서도 된다), 둘 다 없으면 턴만 태우고 아무것도 안 남는 글이 된다.
 * ⚠️ **길이는 여기서 자른다** — 화면의 `maxLength`만 믿으면 붙여넣기로 넘어간 글이 남는다.
 */
export function postTweet(
  state: GameState,
  body: string,
  photoId?: string,
  replyTo?: string,
): GameState {
  if (state.recovery) return state
  const text = body.trim().slice(0, TWEET_MAX_LENGTH)
  // 안 겪은 사진은 붙일 수 없다(사진첩에 없는 것을 올리면 화면이 거짓을 말한다).
  const photo = photoId && albumPhotos(state).some((p) => p.event.id === photoId) ? photoId : undefined
  if (!text && !photo) return state

  const activity = findActivity('sns')
  if (!activity || !canRun(state, activity)) return state

  const before = twitterOf(state)
  const next = runActivity(state, activity)
  if (next === state) return state

  return {
    ...next,
    twitter: {
      ...before,
      posts: [
        ...before.posts,
        {
          id: `me-${state.day}-${before.posts.length}`,
          day: state.day,
          body: text,
          photoId: photo,
          replyTo,
        },
      ],
    },
  }
}

/**
 * 내 글을 타임라인 한 줄(`Tweet`)로 바꾼다. **최신이 앞이다.**
 *
 * ⚠️ **반응 수는 저장값이 아니라 파생값이다**(`myTweetStats`) — 팔로워가 늘면 옛 글의
 * 숫자도 함께 자란다. 저장하면 "계정이 커졌는데 반응은 그대로"가 된다.
 * ⚠️ `following: true`인 것은 **내 글이라 두 탭에 다 떠야 하기 때문이다**(실제 X와 같다).
 */
export function myTweets(state: GameState, handle: string): { tweet: Tweet; post: MyPost }[] {
  const stats = myTweetStats(totalFollowers(state))
  /* ⚠️ **답글은 홈 타임라인에 안 뜬다**(실제 X와 같다) — 스레드를 열어야 보인다. */
  return myPosts(state)
    .filter((post) => !post.replyTo)
    .map((post) => ({
      post,
      tweet: {
        id: post.id,
        handle,
        body: post.body,
        following: true,
        replies: stats.replies,
        retweets: stats.retweets,
        likes: stats.likes,
        views: stats.views,
      },
    }))
}

/* ── 스레드(답글) ───────────────────────────────────────────────────
 *
 * ⚠️ **답글은 홈 타임라인에 안 뜬다**(실제 X와 같다) — 트윗의 [답글]을 눌러 스레드를
 * 열어야 보인다. 그래서 `.tw-feed`는 `replyTo`가 없는 글만 그린다.
 *
 * ⚠️ **남의 답글은 저장하지 않는다 — 트윗 id에서 파생한다**(알림·시청자 반응과 같은
 * 규칙). 저장하면 팔로워가 늘어 답글 수가 바뀔 때 옛 스레드와 숫자가 갈린다.
 */

/** 스레드 한 줄. `handle`이 없으면 내가 쓴 답글이다. */
export interface Reply {
  id: string
  /** 남의 답글이면 그 계정 핸들. 내 답글이면 undefined. */
  handle?: string
  body: string
  /** 내 답글만 실제로 쓴 날을 안다. 남의 답글은 원본과 같은 자리에 걸린다. */
  day?: number
}

/**
 * 이 트윗에 달린 답글 — **남의 답글 먼저, 내 답글이 뒤다**(내가 마지막에 끼어든 모양).
 *
 * ⚠️ **`replies` 숫자는 그대로 두고 보여 주는 줄만 자른다**(`REPLIES_SHOWN`) — 숫자를
 * 줄이면 화면이 거짓을 말하고, 전부 펼치면 스레드가 타임라인을 밀어낸다(실제 X도 같다).
 * ⚠️ 한 스레드에 **같은 계정도 같은 문구도 두 번 안 나온다** — 인덱스를 어긋내며 집는다.
 */
export function repliesTo(state: GameState, tweet: Tweet): Reply[] {
  const seed = seedOf(tweet.id)
  const count = Math.min(tweet.replies, REPLIES_SHOWN)
  const npc = pickActors(seed, count).map((handle, i) => ({
    id: `re-${tweet.id}-${i}`,
    handle,
    body: REPLY_LINES[(seed + i * 5) % REPLY_LINES.length],
  }))
  const mine = twitterOf(state)
    .posts.filter((p) => p.replyTo === tweet.id)
    .map((p) => ({ id: p.id, body: p.body, day: p.day }))
  return [...npc, ...mine]
}
