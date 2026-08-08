import { describe, it, expect } from 'vitest'
import {
  acceptOffer,
  advanceWebtoon,
  daysToDeadline,
  declineOffer,
  drawWebtoon,
  hasOffer,
  isSerializing,
  offerEarned,
  pagesLeft,
  webtoonMessages,
} from './webtoon'
import { createInitialState, nightPayoutPending } from './turn'
import {
  CONTEST_WINS_FOR_OFFER,
  DEADLINE_DAYS,
  EPISODE_PAY,
  LIKES_FOR_OFFER,
  MISSES_TO_END,
  MISS_REPUTATION_PENALTY,
  WEEKLY_PAGES,
} from '../data/webtoon'
import { ECONOMY_TIERS } from '../data/economy'
import { MAILBOX } from '../data/messages'
import { ACTIVITIES } from '../data/activities'
import type { GameState } from '../types/game'

/**
 * ⚠️ **이 파일은 연재가 깨뜨릴 수 있는 것만 덮는다.** 원고료가 돈을 만들므로 마감 정산과
 * "물가를 못 이긴다"에는 증명을 붙이고 나머지는 회귀 수준으로 둔다.
 */

function ready(): GameState {
  const base = createInitialState('작가')
  return {
    ...base,
    inventory: [{ id: 'pen-tablet', day: 1 }],
    stats: { ...base.stats, money: 500_000, stamina: 200, maxStamina: 200, reputation: 50 },
  }
}

/** 제의가 온 판. 밤 정산이 만드는 것과 같은 모양이다. */
function offered(): GameState {
  const s = { ...ready(), twitter: { gained: 0, postedIds: [], likes: LIKES_FOR_OFFER, paidDay: 1 } }
  return advanceWebtoon(s)
}

/** 연재 중인 판. */
function serializing(): GameState {
  return acceptOffer(offered())
}

describe('제의', () => {
  it('조건을 못 채우면 제의가 안 온다', () => {
    const s = ready()
    expect(offerEarned(s)).toBe(false)
    expect(advanceWebtoon(s)).toBe(s)
  })

  it('⚠️ 좋아요가 쌓이면 제의가 온다 (팔로워가 아니라 좋아요다)', () => {
    const s: GameState = {
      ...ready(),
      twitter: { gained: 0, postedIds: [], likes: LIKES_FOR_OFFER, paidDay: 1 },
    }
    expect(offerEarned(s)).toBe(true)
    const after = advanceWebtoon(s)
    expect(hasOffer(after)).toBe(true)
    expect(after.webtoon!.offeredDay).toBe(s.day)
  })

  it('공모전 입상으로도 제의가 온다 (둘 중 하나)', () => {
    const s: GameState = {
      ...ready(),
      contests: { entries: [], wins: CONTEST_WINS_FOR_OFFER, earned: 0 },
    }
    expect(offerEarned(s)).toBe(true)
    expect(hasOffer(advanceWebtoon(s))).toBe(true)
  })

  it('제의는 메일로 온다 — 새 알림 창구를 만들지 않는다', () => {
    const s = offered()
    const mails = webtoonMessages(s)
    expect(mails).toHaveLength(1)
    expect(mails[0].channel).toBe(MAILBOX.id)
  })

  it('⚠️ 첫 마감은 수락한 날부터다 — 미뤄 뒀다고 지난 마감을 떠안기지 않는다', () => {
    const late: GameState = { ...offered(), day: 30 }
    const on = acceptOffer(late)
    expect(on.webtoon!.dueDay).toBe(30 + DEADLINE_DAYS)
    expect(daysToDeadline(on)).toBe(DEADLINE_DAYS)
    expect(pagesLeft(on)).toBe(WEEKLY_PAGES)
  })

  it('⚠️ 거절하면 끝이고 되돌아오지 않는다', () => {
    const s = declineOffer(offered())
    expect(s.webtoon!.status).toBe('ended')
    expect(hasOffer(s)).toBe(false)
    // 조건을 다시 만족해도 제의가 새로 오지 않는다.
    expect(advanceWebtoon(s)).toBe(s)
  })
})

describe('원고와 마감', () => {
  it('원고를 치면 1턴이 가고 진행도가 오른다', () => {
    const s = serializing()
    const after = drawWebtoon(s)
    expect(after.webtoon!.progress).toBe(1)
    expect(after.slot).not.toBe(s.slot)
    // ⚠️ 갤러리에 그림이 안 생긴다 — 남의 원고라 내 작품집이 아니다.
    expect(after.artworks ?? []).toHaveLength(0)
  })

  it('연재 중이 아니면 원고를 못 친다', () => {
    const s = ready()
    expect(drawWebtoon(s)).toBe(s)
    // 수락 전(제의만 온 상태)에도 못 친다 — **같은 객체**로 견줘야 뜻이 성립한다.
    const waiting = offered()
    expect(drawWebtoon(waiting)).toBe(waiting)
  })

  it('⚠️ 마감을 채우면 그 밤에 원고료가 들어오고 다음 주가 시작된다', () => {
    let s = serializing()
    for (let i = 0; i < WEEKLY_PAGES; i++) {
      s = drawWebtoon({ ...s, stats: { ...s.stats, stamina: 200, mental: 100, money: 500_000 } })
    }
    const due = s.webtoon!.dueDay
    const money = s.stats.money
    const paid = advanceWebtoon({ ...s, day: due + 1 })
    expect(paid.stats.money).toBe(money + EPISODE_PAY)
    expect(paid.webtoon!.episodes).toBe(1)
    expect(paid.webtoon!.progress).toBe(0)
    expect(paid.webtoon!.dueDay).toBe(due + DEADLINE_DAYS)
    expect(isSerializing(paid)).toBe(true)
  })

  it('⚠️ 못 채우면 위약금이 아니라 평판을 깎는다', () => {
    const s = serializing()
    const due = s.webtoon!.dueDay
    const missed = advanceWebtoon({ ...s, day: due + 1 })
    expect(missed.stats.reputation).toBe(s.stats.reputation - MISS_REPUTATION_PENALTY)
    // ⚠️ 돈을 물리면 "수락하지 않는 것이 언제나 안전"이 되어 연재가 함정이 된다.
    expect(missed.stats.money).toBe(s.stats.money)
    expect(missed.webtoon!.missed).toBe(1)
  })

  it(`⚠️ ${MISSES_TO_END}번 놓치면 연재가 끝나고 다시 제의가 오지 않는다`, () => {
    let s = serializing()
    for (let i = 0; i < MISSES_TO_END; i++) {
      s = advanceWebtoon({ ...s, day: s.webtoon!.dueDay + 1 })
    }
    expect(s.webtoon!.status).toBe('ended')
    expect(isSerializing(s)).toBe(false)
    expect(advanceWebtoon(s)).toBe(s)
  })

  it('⚠️ 며칠이 한 번에 흘러도 밀린 주가 사라지지 않는다 (커서가 따라잡는다)', () => {
    const s = serializing()
    const due = s.webtoon!.dueDay
    // 한 장도 안 치고 3주가 지났다 — 두 번째 미달에서 연재가 끝난다.
    const after = advanceWebtoon({ ...s, day: due + DEADLINE_DAYS * 3 })
    expect(after.webtoon!.missed).toBe(MISSES_TO_END)
    expect(after.webtoon!.status).toBe('ended')
  })

  it('⚠️ 원고료가 남은 밤은 게임오버 판정을 미룬다', () => {
    let s = serializing()
    for (let i = 0; i < WEEKLY_PAGES; i++) {
      s = drawWebtoon({ ...s, stats: { ...s.stats, stamina: 200, mental: 100, money: 500_000 } })
    }
    // 마감이 지난 시점 — 아직 `advanceWebtoon`이 돌기 전이다.
    expect(nightPayoutPending({ ...s, day: s.webtoon!.dueDay + 1 })).toBe(true)
    // 연재 중이 아니면 미루지 않는다.
    expect(nightPayoutPending(ready())).toBe(false)
  })
})

describe('⚠️ 불변식 — 연재가 물가를 이기지 못한다', () => {
  const lastLiving = ECONOMY_TIERS[ECONOMY_TIERS.length - 1].living

  it('원고료만으로는 마지막 물가 구간의 한 주를 못 넘긴다', () => {
    // 한 주는 7일이고 원고료는 주 1회다. 생활비는 매일 나간다.
    expect(EPISODE_PAY).toBeLessThan(lastLiving * DEADLINE_DAYS)
  })

  it('규칙을 뒤집으면 실패한다 — 원고료를 네 배로 하면 부등식이 깨진다', () => {
    expect(EPISODE_PAY * 4).toBeGreaterThan(lastLiving * DEADLINE_DAYS)
  })

  it('⚠️ 원고 활동은 돈을 한 푼도 안 주고 물가 배율도 안 탄다', () => {
    const act = ACTIVITIES.find((a) => a.id === 'draw-webtoon')!
    expect(act.effects.money).toBeUndefined()
    expect(act.scalesWithWage).toBeFalsy()
  })

  it('⚠️ 원고는 갤러리에 남지 않는다 — 공모전에도 회지에도 못 쓴다', () => {
    const act = ACTIVITIES.find((a) => a.id === 'draw-webtoon')!
    expect(act.producesArt).toBeFalsy()
  })

  it('⚠️ 개인 작업과 번아웃 키를 함께 쓴다 — 번갈아 그려 피해 갈 수 없다', () => {
    const draw = ACTIVITIES.find((a) => a.id === 'draw')!
    const webtoon = ACTIVITIES.find((a) => a.id === 'draw-webtoon')!
    expect(webtoon.burnoutKey).toBe(draw.burnoutKey)
  })
})
