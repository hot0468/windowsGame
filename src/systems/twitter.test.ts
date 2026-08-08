import { describe, it, expect } from 'vitest'
import {
  advanceTwitter,
  followerGain,
  isPosted,
  postArtwork,
  postableArtworks,
  totalFollowers,
  weeklyIncome,
} from './twitter'
import { artworksOf } from './artwork'
import { createInitialState, nightPayoutPending, runActivity } from './turn'
import { getLivingCost } from './economy'
import {
  FOLLOWERS_BY_GRADE,
  FOLLOWER_CAP,
  PAYOUT_INTERVAL_DAYS,
  WON_PER_FOLLOWER,
} from '../data/artworks'
import { ECONOMY_TIERS } from '../data/economy'
import { HOUSINGS } from '../data/housing'
import { findActivity } from '../data/activities'
import { followersFrom } from '../data/tweets'
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
  const lastTier = ECONOMY_TIERS[ECONOMY_TIERS.length - 1]
  const cheapestRate = Math.min(...HOUSINGS.map((h) => h.rate))
  const cheapestLiving = lastTier.living * cheapestRate
  const maxDailyIncome = (FOLLOWER_CAP * WON_PER_FOLLOWER) / PAYOUT_INTERVAL_DAYS

  it('상한에서 벌어도 가장 싼 집의 마지막 물가 생활비를 못 넘는다', () => {
    expect(maxDailyIncome).toBeLessThan(cheapestLiving)
  })

  it('규칙을 뒤집으면 실패한다 — 상한을 두 배로 두면 생활비를 넘긴다', () => {
    // 이 줄이 통과해야 위 부등식이 "우연히 맞는 값"이 아님이 증명된다.
    const doubled = (FOLLOWER_CAP * 2 * WON_PER_FOLLOWER) / PAYOUT_INTERVAL_DAYS
    expect(doubled).toBeGreaterThan(cheapestLiving)
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
    expect(after.slot).not.toBe(s.slot)
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
    expect(after.stats.money).toBeLessThanOrEqual(0)
    expect(after.gameOver).toBe('bankrupt')
    // 생활비가 실제로 계속 나가는 판이라는 것도 함께 확인한다.
    expect(getLivingCost(broke)).toBeGreaterThan(0)
  })
})
