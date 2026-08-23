import { describe, it, expect } from 'vitest'
import {
  advanceTwitter,
  followerGain,
  isPosted,
  postArtwork,
  postableArtworks,
  totalFollowers,
  weeklyIncome,
  hasPlus,
  followedHandles,
  hasReacted,
  likeGain,
  markNoticesSeen,
  noticeText,
  retweetGain,
  myPosts,
  myTweets,
  postTweet,
  repliesTo,
  toggleReaction,
  tweetNotices,
  unreadNotices,
  PLUS_SUBSCRIPTION_ID,
} from './twitter'
import { artworksOf } from './artwork'
import { createInitialState, nightPayoutPending, runActivity } from './turn'
import { getLivingCost } from './economy'
import {
  FOLLOWERS_BY_GRADE,
  FOLLOWER_CAP,
  PAYOUT_INTERVAL_DAYS,
  WON_PER_FOLLOWER,
  PLUS_MULTIPLIER,
  WEEKLY_INCOME_CAP,
} from '../data/artworks'
import { BASE_LIVING_COST, INCOME_CAP_RATIO } from '../data/economy'
import { findActivity } from '../data/activities'
import {
  DEFAULT_FOLLOWING,
  REPLIES_SHOWN,
  TWEETS,
  TWEET_MAX_LENGTH,
  followersFrom,
} from '../data/tweets'
import { recordEvent } from './delivery'
import type { GameState } from '../types/game'

/**
 * ⚠️ **이 파일은 트위터가 깨뜨릴 수 있는 것만 덮는다.** 그중 첫 describe 하나는
 * **돈·게임오버를 만드는 불변식**이라 규칙을 뒤집어 실패를 확인하는 증명까지 한다
 * (`bank.test.ts`의 이율 부등식과 같은 급) — 나머지는 회귀 테스트 수준으로 둔다.
 */

const DRAW = findActivity('draw')!

/** 그림을 n장 그린 상태. 스탯을 올려 두어 등급이 F가 아니게 만든다. */
function withArtworks(n: number, day = 1): GameState {
  const base = createInitialState('그림쟁이')
  let s: GameState = {
    ...base,
    day,
    stats: { ...base.stats, stamina: 200, art: 400, creativity: 400 },
    inventory: [{ id: 'lcd-tablet', day: 1 }],
  }
  for (let i = 0; i < n; i++) s = runActivity(s, DRAW)
  // 그리느라 흘러간 날짜를 되돌린다 — 여기서 보고 싶은 것은 정산 주기이지 턴이 아니다.
  return { ...s, day, slot: 'morning', stats: { ...s.stats, stamina: 200 } }
}

describe('⚠️ 불변식 — 트위터 수입만으로는 살 수 없다', () => {
  /*
   * 이 게임은 **물가 상승으로 반드시 끝난다**(설계 문서). 팔로워 수입이 생활비를 넘기는
   * 순간 판이 무한해지므로, 상한에서의 하루 수입이 **가장 싼 집의 마지막 물가 구간
   * 생활비보다 작아야 한다.** 정규직 급여가 물가 배율을 안 타는 것과 같은 장치다.
   */
  const ceiling = BASE_LIVING_COST * INCOME_CAP_RATIO.passive
  const maxDailyIncome = (FOLLOWER_CAP * WON_PER_FOLLOWER) / PAYOUT_INTERVAL_DAYS

  it('상한에서 벌어도 하루 수입이 생활비 1.5배를 넘지 않는다', () => {
    expect(maxDailyIncome).toBeLessThan(ceiling)
  })

  it('규칙을 뒤집으면 실패한다 — 상한을 두 배로 두면 생활비를 넘긴다', () => {
    // 이 줄이 통과해야 위 부등식이 "우연히 맞는 값"이 아님이 증명된다.
    const doubled = (FOLLOWER_CAP * 2 * WON_PER_FOLLOWER) / PAYOUT_INTERVAL_DAYS
    expect(doubled).toBeGreaterThan(ceiling)
  })

  it('팔로워 상한은 평판 몫까지 합친 총합에 걸린다', () => {
    const s = withArtworks(0)
    // 평판이 만점이어도, 그림으로 아무리 벌어도 상한을 넘지 않는다.
    const maxed: GameState = {
      ...s,
      stats: { ...s.stats, reputation: 100 },
      twitter: { gained: 10_000_000, postedIds: [], likes: 0, paidDay: 1 },
    }
    expect(totalFollowers(maxed)).toBe(FOLLOWER_CAP)
    expect(followersFrom(100)).toBeGreaterThan(0) // 평판 몫이 실제로 존재한다
  })
})

describe('그림 업로드', () => {
  it('올리면 팔로워가 늘고 1턴이 지나간다', () => {
    const s = withArtworks(1)
    const work = artworksOf(s)[0]
    const after = postArtwork(s, work.id)
    expect(after).not.toBe(s)
    expect(after.twitter!.gained).toBe(followerGain(work))
    // `sns` 활동을 태우므로 슬롯이 넘어간다 — 게시가 공짜면 그림이 곧 무한 수입이 된다.
    expect(after.minute + after.day * 1440).toBeGreaterThan(s.minute + s.day * 1440)
  })

  it('같은 그림은 두 번 올릴 수 없다', () => {
    const s = withArtworks(1)
    const id = artworksOf(s)[0].id
    const once = postArtwork(s, id)
    expect(isPosted(once, id)).toBe(true)
    expect(postableArtworks(once)).toHaveLength(0)
    // 두 번째 시도는 상태를 그대로 돌려준다(반쪽 상태도 안 남는다).
    expect(postArtwork(once, id)).toBe(once)
  })

  it('등급이 F인 그림은 팔로워를 한 명도 못 준다', () => {
    expect(FOLLOWERS_BY_GRADE.F).toBe(0)
    // 등급이 높을수록 단조 증가해야 "실력을 올릴 이유"가 성립한다.
    const gains = ['F', 'C', 'B', 'A', 'S', 'SS'].map(
      (g) => FOLLOWERS_BY_GRADE[g as keyof typeof FOLLOWERS_BY_GRADE],
    )
    expect(gains).toEqual([...gains].sort((a, b) => a - b))
  })

  it('없는 그림 id는 아무 일도 일으키지 않는다', () => {
    const s = withArtworks(1)
    expect(postArtwork(s, 'art-999')).toBe(s)
  })
})

describe('주간 정산', () => {
  it('이레가 차기 전에는 한 푼도 안 들어온다', () => {
    const posted = postArtwork(withArtworks(1), 'art-1')
    const before = { ...posted, day: posted.twitter!.paidDay + PAYOUT_INTERVAL_DAYS - 1 }
    expect(advanceTwitter(before)).toBe(before)
  })

  it('이레가 차면 팔로워에 비례한 돈이 소지금으로 들어온다', () => {
    const posted = postArtwork(withArtworks(1), 'art-1')
    const due = { ...posted, day: posted.twitter!.paidDay + PAYOUT_INTERVAL_DAYS }
    const paid = advanceTwitter(due)
    expect(paid.stats.money - due.stats.money).toBe(weeklyIncome(due))
    // 커서가 밀려 같은 주를 두 번 정산하지 않는다.
    expect(advanceTwitter(paid)).toBe(paid)
  })

  it('며칠이 한 번에 흘러도 밀린 주를 전부 따라잡는다', () => {
    const posted = postArtwork(withArtworks(1), 'art-1')
    const due = { ...posted, day: posted.twitter!.paidDay + PAYOUT_INTERVAL_DAYS * 3 }
    const paid = advanceTwitter(due)
    expect(paid.stats.money - due.stats.money).toBe(weeklyIncome(due) * 3)
  })

  it('올린 적 없는 사람의 세이브는 부풀리지 않는다', () => {
    const s = withArtworks(1)
    // 그림만 그리고 아무것도 안 올렸으면 정산 커서 자체가 없다.
    expect(s.twitter).toBeUndefined()
    const later = { ...s, day: 100 }
    expect(advanceTwitter(later)).toBe(later)
    expect(nightPayoutPending(later)).toBe(false)
  })

  it('⚠️ 정산 직전 밤에는 파산 판정을 미룬다 — 돈을 쥔 채 굶어 죽지 않는다', () => {
    const posted = postArtwork(withArtworks(1), 'art-1')
    const eve: GameState = { ...posted, day: posted.twitter!.paidDay + PAYOUT_INTERVAL_DAYS }
    expect(nightPayoutPending(eve)).toBe(true)
    // 정산 커서가 아직 안 찬 날에는 미루지 않는다(무직·무거래면 그 자리에서 판정된다).
    expect(nightPayoutPending({ ...eve, day: eve.twitter!.paidDay })).toBe(false)
  })

  it('정산금이 들어와도 생활비를 못 대면 파산은 그대로 온다', () => {
    const posted = postArtwork(withArtworks(1), 'art-1')
    const broke: GameState = {
      ...posted,
      day: posted.twitter!.paidDay + PAYOUT_INTERVAL_DAYS,
      // 이번 주 수입보다 더 크게 마이너스를 만든다 — 정산 뒤에도 0 이하다.
      stats: { ...posted.stats, money: -weeklyIncome(posted) - 1 },
    }
    const after = advanceTwitter(broke)
    /* ⚠️ 주저앉으면 구제금이 들어오므로 잔액이 아니라 회복 진입으로 판정한다. */
    expect(after.recovery?.kind).toBe('bankrupt')
    expect(after.recovery?.kind).toBe('bankrupt')
    // 생활비가 실제로 계속 나가는 판이라는 것도 함께 확인한다.
    expect(getLivingCost(broke)).toBeGreaterThan(0)
  })
})

/** 유료 구독 중인 판. `subscribed`가 보는 것은 세이브의 키 유무뿐이다. */
function withPlus(state: GameState): GameState {
  return {
    ...state,
    subscriptions: {
      active: { [PLUS_SUBSCRIPTION_ID]: { startedDay: 1, billedDay: 1 } },
      paid: 0,
    },
  }
}

describe('⚠️ 불변식 — 유료 구독도 물가를 이기지 못한다', () => {
  const ceiling = BASE_LIVING_COST * INCOME_CAP_RATIO.passive

  it('구독하면 상한 아래에서는 정말 두 배로 들어온다', () => {
    // 팔로워를 상한의 10% 수준으로 두어 천장에 닿지 않게 한다.
    const s = withArtworks(0)
    const few: GameState = {
      ...s,
      twitter: { gained: FOLLOWER_CAP / 10, postedIds: [], likes: 0, paidDay: 1 },
    }
    expect(hasPlus(few)).toBe(false)
    expect(weeklyIncome(withPlus(few))).toBe(weeklyIncome(few) * PLUS_MULTIPLIER)
  })

  it('⚠️ 천장에 닿으면 구독 여부가 같아진다 — 배율이 천장을 올리지 않는다', () => {
    const s = withArtworks(0)
    const maxed: GameState = {
      ...s,
      stats: { ...s.stats, reputation: 100 },
      twitter: { gained: 10_000_000, postedIds: [], likes: 0, paidDay: 1 },
    }
    expect(totalFollowers(maxed)).toBe(FOLLOWER_CAP)
    expect(weeklyIncome(maxed)).toBe(WEEKLY_INCOME_CAP)
    expect(weeklyIncome(withPlus(maxed))).toBe(weeklyIncome(maxed))
  })

  it('구독해도 상한 일수입이 가장 싼 집의 마지막 물가 생활비를 못 넘는다', () => {
    expect(WEEKLY_INCOME_CAP / PAYOUT_INTERVAL_DAYS).toBeLessThan(ceiling)
  })

  it('⚠️ 규칙을 뒤집으면 실패한다 — 천장까지 배율을 태우면 생활비를 넘긴다', () => {
    // 이 줄이 통과해야 "천장을 배율 뒤에 두는 것"이 우연이 아님이 증명된다.
    const uncapped = (WEEKLY_INCOME_CAP * PLUS_MULTIPLIER) / PAYOUT_INTERVAL_DAYS
    expect(uncapped).toBeGreaterThan(ceiling)
  })

  it('구독하지 않은 판의 정산금은 예전과 같다 — 기존 밸런스를 건드리지 않았다', () => {
    const s = withArtworks(0)
    const some: GameState = {
      ...s,
      twitter: { gained: 5_000, postedIds: [], likes: 0, paidDay: 1 },
    }
    expect(weeklyIncome(some)).toBe(Math.round(totalFollowers(some) * WON_PER_FOLLOWER))
  })
})

/**
 * 팔로우·좋아요·리트윗과 알림. **덮는 것은 이 변경이 깨뜨릴 수 있는 것뿐이다** —
 * 토글이 목록을 실제로 바꾸는가, 구세이브가 살아남는가, 알림 수치가 그림 등급과 맞는가.
 */
describe('팔로우 · 좋아요 · 리트윗', () => {
  it('구세이브(필드 없음)도 씨앗 팔로우 목록을 그대로 쓴다', () => {
    const s = withArtworks(0)
    const old: GameState = {
      ...s,
      // 옛 세이브에는 아래 네 필드가 아예 없다.
      twitter: { gained: 0, postedIds: [], likes: 0, paidDay: 1 },
    }
    expect(followedHandles(old)).toEqual(DEFAULT_FOLLOWING)
    expect(DEFAULT_FOLLOWING.length).toBeGreaterThan(0)
  })

  it('토글하면 목록에 들고 나며, 턴도 돈도 안 쓴다', () => {
    const s = withArtworks(0)
    const target = TWEETS.find((t) => !DEFAULT_FOLLOWING.includes(t.handle))!
    const on = toggleReaction(s, 'follow', target.handle)
    expect(hasReacted(on, 'follow', target.handle)).toBe(true)
    expect(on.day).toBe(s.day)
    expect(on.slot).toBe(s.slot)
    expect(on.stats).toEqual(s.stats)

    const off = toggleReaction(on, 'follow', target.handle)
    expect(hasReacted(off, 'follow', target.handle)).toBe(false)
  })

  it('세 반응은 서로 다른 목록이다 — 좋아요가 리트윗을 건드리지 않는다', () => {
    const s = toggleReaction(withArtworks(0), 'like', 'tw-1')
    expect(hasReacted(s, 'like', 'tw-1')).toBe(true)
    expect(hasReacted(s, 'retweet', 'tw-1')).toBe(false)
  })
})

describe('알림', () => {
  it('그림을 올리면 팔로우·리트윗·좋아요 알림이 그 그림 수치대로 생긴다', () => {
    const s = withArtworks(1)
    const work = artworksOf(s)[0]
    const after = postArtwork(s, work.id)
    const notices = tweetNotices(after)
    const total = (kind: 'follow' | 'retweet' | 'like') => {
      const n = notices.find((x) => x.kind === kind)!
      return n.actors.length + n.others
    }
    expect(total('follow')).toBe(followerGain(work))
    expect(total('retweet')).toBe(retweetGain(work))
    expect(total('like')).toBe(likeGain(work))
    // ⚠️ 이름 + "외 N명"의 합이 실제 수치와 같아야 한다 — 어긋나면 화면이 거짓을 말한다.
    expect(notices.every((n) => n.actors.length >= 1)).toBe(true)
  })

  it('올린 적이 없으면 알림도 없다', () => {
    expect(tweetNotices(withArtworks(1))).toEqual([])
  })

  it('[알림]을 열면 안 읽은 수가 0이 된다', () => {
    const s = withArtworks(1)
    const after = postArtwork(s, artworksOf(s)[0].id)
    expect(unreadNotices(after)).toBeGreaterThan(0)
    expect(unreadNotices(markNoticesSeen(after))).toBe(0)
  })

  it('알림 문구는 반응 종류마다 다르다', () => {
    const one = { id: 'x', kind: 'follow' as const, actors: ['jachwi_log'], others: 0, day: 1 }
    expect(noticeText(one)).toContain('팔로우')
    expect(noticeText({ ...one, kind: 'retweet' })).toContain('리트윗')
    expect(noticeText({ ...one, kind: 'like', others: 5 })).toContain('외 5명')
  })
})

/**
 * 내가 쓴 글. **덮는 것은 이 변경이 깨뜨릴 수 있는 것뿐이다** — 빈 글이 턴을 태우지
 * 않는가, 안 겪은 사진이 붙지 않는가, 반응 수가 팔로워를 따라 자라는가.
 */
describe('내가 쓴 글', () => {
  it('올리면 타임라인 맨 위에 뜨고 1턴이 지나간다', () => {
    const s = withArtworks(0)
    const after = postTweet(s, '오늘은 아무것도 안 했다.')
    expect(after).not.toBe(s)
    expect(myPosts(after)[0].body).toBe('오늘은 아무것도 안 했다.')
    // `sns` 활동을 태우므로 시간이 흐른다 — 게시가 공짜면 안 된다.
    expect(after.minute + after.day * 1440).toBeGreaterThan(s.minute + s.day * 1440)
  })

  it('빈 글은 턴을 태우지 않는다', () => {
    const s = withArtworks(0)
    expect(postTweet(s, '   ')).toBe(s)
  })

  it('사진만 있어도 올라간다', () => {
    const s = recordEvent(withArtworks(0), 'first-order')
    expect(myPosts(postTweet(s, '', 'first-order'))[0].photoId).toBe('first-order')
  })

  it('안 겪은 사진은 안 붙는다 — 사진첩에 없는 것이 올라가면 화면이 거짓을 말한다', () => {
    const s = withArtworks(0)
    // 본문이 있으니 글은 올라가되 첨부만 빠진다.
    expect(myPosts(postTweet(s, '겪은 적 없음', 'gym-member'))[0].photoId).toBeUndefined()
    // 본문도 비었으면 남길 것이 아무것도 없으므로 턴도 안 쓴다.
    expect(postTweet(s, '', 'gym-member')).toBe(s)
  })

  it('길이를 넘긴 글은 잘려서 저장된다 — 화면만 막으면 붙여넣기가 새어 든다', () => {
    const s = postTweet(withArtworks(0), 'ㅋ'.repeat(TWEET_MAX_LENGTH + 50))
    expect(myPosts(s)[0].body.length).toBe(TWEET_MAX_LENGTH)
  })

  it('그림을 올려도 내 타임라인에 한 줄 남는다', () => {
    const s = withArtworks(1)
    const after = postArtwork(s, artworksOf(s)[0].id)
    expect(myPosts(after)[0].artworkId).toBe(artworksOf(s)[0].id)
  })

  it('반응 수는 저장값이 아니라 팔로워 파생이다 — 계정이 크면 옛 글도 함께 자란다', () => {
    const small = postTweet(withArtworks(0), '안녕')
    const big: GameState = { ...small, stats: { ...small.stats, reputation: 100 } }
    const likesOf = (s: GameState) => myTweets(s, 'me')[0].tweet.likes
    expect(likesOf(big)).toBeGreaterThan(likesOf(small))
    expect(totalFollowers(big)).toBeGreaterThan(totalFollowers(small))
  })

  it('⚠️ 글은 팔로워를 직접 만들지 않는다 — 늘어난 몫은 `sns`가 올린 평판에서 온다', () => {
    const s = withArtworks(0)
    const after = postTweet(s, '글 하나')
    // 저장되는 팔로워(그림으로 번 몫)는 그대로다. 상한 부등식이 지키는 값이 이쪽이다.
    expect(after.twitter!.gained).toBe(0)
    // 총 팔로워가 는 것은 `sns` 활동의 평판 +5 때문이고, 그 경로는 원래부터 있었다.
    expect(totalFollowers(after)).toBe(followersFrom(after.stats.reputation))
  })
})

describe('답글과 글 알림', () => {
  /** 반응이 붙을 만큼 큰 계정. 팔로워가 작으면 리트윗·답글이 0이라 알림도 안 생긴다. */
  const known = (): GameState => {
    const s = withArtworks(0)
    return { ...s, stats: { ...s.stats, reputation: 80 } }
  }

  it('글에도 좋아요·리트윗·답글 알림이 온다 — 다만 팔로우 알림은 없다', () => {
    const after = postTweet(known(), '오늘의 기록')
    const kinds = tweetNotices(after).map((n) => n.kind)
    expect(kinds).toContain('like')
    expect(kinds).toContain('retweet')
    expect(kinds).toContain('reply')
    // ⚠️ 팔로워를 직접 만드는 것은 그림뿐이다 — 글에 팔로우 알림이 뜨면 화면이 거짓말한다.
    expect(kinds).not.toContain('follow')
  })

  it('그림 알림은 등급이, 글 알림은 팔로워가 정한다', () => {
    const s = withArtworks(1)
    const work = artworksOf(s)[0]
    const after = postArtwork(s, work.id)
    const like = tweetNotices(after).find((n) => n.kind === 'like')!
    expect(like.actors.length + like.others).toBe(likeGain(work))
    // 그림에는 팔로우 알림이 있다(등급이 팔로워를 준다).
    expect(tweetNotices(after).map((n) => n.kind)).toContain('follow')
  })

  it('내가 쓴 답글은 알림을 만들지 않는다 — 알림이 내 말로 도배된다', () => {
    const s = postTweet(known(), '원본')
    const before = tweetNotices(s).length
    const replied = postTweet(s, '내 답글', undefined, myPosts(s)[0].id)
    expect(tweetNotices(replied).length).toBe(before)
  })

  it('답글은 타임라인에 안 뜨고 스레드에만 뜬다', () => {
    const s = postTweet(known(), '원본')
    const target = myPosts(s)[0].id
    const replied = postTweet(s, '내 답글', undefined, target)
    // 홈 타임라인에는 원본 하나뿐이다.
    expect(myTweets(replied, 'me').map(({ tweet }) => tweet.id)).toEqual([target])
    const thread = myTweets(replied, 'me')[0].tweet
    expect(repliesTo(replied, thread).some((r) => r.body === '내 답글')).toBe(true)
  })

  it('스레드에 그리는 답글은 상한까지고, 계정도 문구도 겹치지 않는다', () => {
    const s = known()
    const many = TWEETS.find((t) => t.replies > REPLIES_SHOWN)!
    const rows = repliesTo(s, many)
    expect(rows.length).toBe(REPLIES_SHOWN)
    expect(new Set(rows.map((r) => r.handle)).size).toBe(REPLIES_SHOWN)
    expect(new Set(rows.map((r) => r.body)).size).toBe(REPLIES_SHOWN)
    // ⚠️ 실제 답글 수는 그대로 둔다 — 숫자를 줄이면 화면이 거짓을 말한다.
    expect(many.replies).toBeGreaterThan(rows.length)
  })
})
