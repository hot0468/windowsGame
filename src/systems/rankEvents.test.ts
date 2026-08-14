import { describe, it, expect } from 'vitest'
import {
  dueRankEvents,
  grantWish,
  markRankEvent,
  rankReached,
  reviveRankEvents,
  seenRankEvent,
  settleRankEvents,
  threadUnlockedByRank,
  offerUnlockedByRank,
  rankEventMessages,
} from './rankEvents'
import { RANK_EVENTS, WISH_AMOUNT, findRankEvent } from '../data/rankEvents'
import { RANK_THRESHOLDS } from './rank'
import { createInitialState, growthCap } from './turn'
import { rankOf } from './rank'
import { ACTIVITIES } from '../data/activities'
import { THREADS } from '../data/messages'
import { EVENTS } from '../data/events'
import { GROWTH_STAT_KEYS } from '../types/game'
import type { GameState, GrowthStatKey } from '../types/game'

/**
 * ⚠️ **랭크 이벤트가 깨뜨릴 수 있는 것만 덮는다.** 이 축에는 **스탯 +100**이 걸려 있어
 * 밸런스를 만드는 자리이므로, "한 번만 된다"에는 규칙을 뒤집어 실패를 확인하는 증명까지
 * 붙인다 — 나머지는 회귀 수준으로 둔다.
 */

/** 그 스탯을 그 등급에 딱 닿게 만든 판. */
function at(key: GrowthStatKey, rank: string): GameState {
  const base = createInitialState('등급')
  const min = RANK_THRESHOLDS.find((t) => t.rank === rank)!.min
  return { ...base, stats: { ...base.stats, [key]: Math.ceil(min * growthCap(key)) } }
}

describe('이벤트 정의', () => {
  it('가리키는 대화방·제안·도감 항목이 실재한다', () => {
    const threads = new Set(THREADS.map((t) => t.id))
    const options = new Set(THREADS.flatMap((t) => t.offer?.options.map((o) => o.id) ?? []))
    const events = new Set(EVENTS.map((e) => e.id))
    for (const e of RANK_EVENTS) {
      if (e.kind === 'thread') expect(threads, e.id).toContain(e.target)
      if (e.kind === 'offer') expect(options, e.id).toContain(e.target)
      // 도감에 없는 id를 기록하면 사진첩에 이름 없는 칸이 생긴다.
      if (e.kind === 'event') expect(events, e.id).toContain(e.target)
    }
  })

  it('⚠️ 랭크로 열리는 방에는 권유 메시지가 짝으로 있다 — 없으면 빈 방만 뜬다', () => {
    // 실측으로 잡았던 버그다: 방은 생겼는데 "아직 대화가 없습니다"만 남았다.
    let s = createInitialState('등급')
    s = { ...s, rankEvents: RANK_EVENTS.map((e) => e.id) }
    const channels = new Set(rankEventMessages(s).map((m) => m.channel))
    for (const e of RANK_EVENTS.filter((x) => x.kind === 'thread')) {
      expect(channels, `${e.target} 방에 첫 마디가 없다`).toContain(e.target)
    }
  })

  it('⚠️ 주간 예약 요일이 서로 겹치지 않는다 — 겹치면 한쪽이 조용히 밀려난다', () => {
    const weekdays = THREADS.flatMap(
      (t) => t.offer?.options.flatMap((o) => (o.weekly ? [o.weekly.weekday] : [])) ?? [],
    )
    expect(new Set(weekdays).size, `요일 충돌: ${weekdays.join(',')}`).toBe(weekdays.length)
  })

  it('⚠️ 랭크로 열리는 제안은 겪기 전에는 안 보인다', () => {
    const model = RANK_EVENTS.find((e) => e.kind === 'offer')!
    const before = createInitialState('등급')
    expect(offerUnlockedByRank(before, model.target)).toBe(false)
    expect(offerUnlockedByRank(markRankEvent(before, model.id), model.target)).toBe(true)
    // 랭크와 무관한 기존 선택지는 undefined다("잠겨 있다"와 구분된다).
    expect(offerUnlockedByRank(before, 'salon-once')).toBeUndefined()
  })

  it('단발 이벤트는 도감에도 남는다 — 되돌아볼 자리가 사진첩 하나다', () => {
    const single = RANK_EVENTS.find((e) => e.kind === 'event')!
    const after = settleRankEvents(at(single.key, single.rank))
    expect(seenRankEvent(after, single.id)).toBe(true)
    expect((after.events ?? []).some((x) => x.id === single.target)).toBe(true)
  })

  it('id가 겹치지 않는다', () => {
    const ids = RANK_EVENTS.map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('⚠️ 아무도 볼 수 없는 이벤트가 없다 — 문턱까지 실제로 올릴 활동이 있어야 한다', () => {
    for (const e of RANK_EVENTS) {
      const sources = ACTIVITIES.filter((a) => (a.effects[e.key] ?? 0) > 0)
      expect(sources.length, `${e.id}: ${e.key}를 올리는 활동이 없다`).toBeGreaterThan(0)
      /* 문턱까지 몇 턴인가. 하루 2슬롯이고 판은 88~101일이라(설계 결정) 그 안에 들어와야
         한다 — 주 공급원 하나만으로 재는 것은 **평범하게 특화한 플레이**를 재려는 것이다. */
      const best = Math.max(...sources.map((a) => a.effects[e.key] ?? 0))
      const need = RANK_THRESHOLDS.find((t) => t.rank === e.rank)!.min * growthCap(e.key)
      expect(Math.ceil(need / best) / 2, `${e.id}: 문턱까지 너무 오래 걸린다`).toBeLessThan(88)
    }
  })
})

describe('판정과 기록', () => {
  it('문턱에 닿으면 일어나고, 그 아래면 안 일어난다', () => {
    const crew = findRankEvent('running-crew')!
    expect(rankReached(at('athletics', 'C'), crew)).toBe(true)
    expect(rankReached(createInitialState('맨몸'), crew)).toBe(false)
  })

  it('더 높은 등급에서도 일어난다 — 문턱은 "이상"이다', () => {
    const crew = findRankEvent('running-crew')!
    expect(rankReached(at('athletics', 'SS'), crew)).toBe(true)
  })

  it('겪은 뒤에는 목록에서 빠진다', () => {
    const s = at('athletics', 'C')
    expect(dueRankEvents(s).map((e) => e.id)).toContain('running-crew')
    expect(dueRankEvents(markRankEvent(s, 'running-crew')).map((e) => e.id)).not.toContain(
      'running-crew',
    )
  })

  it('게임오버면 아무 이벤트도 일어나지 않는다', () => {
    const over: GameState = { ...at('athletics', 'SS'), recovery: { kind: 'bankrupt', startedDay: 1, daysLeft: 3 } }
    expect(dueRankEvents(over)).toEqual([])
  })

  it('⚠️ 등급이 내려가도 기록은 남는다 — 지우면 오르내리기로 무한 반복 수령이 된다', () => {
    const marked = markRankEvent(at('athletics', 'C'), 'running-crew')
    const dropped: GameState = { ...marked, stats: { ...marked.stats, athletics: 0 } }
    expect(seenRankEvent(dropped, 'running-crew')).toBe(true)
    expect(threadUnlockedByRank(dropped, 'running-crew')).toBe(true)
  })

  it('⚠️ 턴이 지나면 대화방 이벤트가 기록된다 — 안 찍으면 방이 한 번도 열리지 않는다', () => {
    const s = at('athletics', 'C')
    expect(threadUnlockedByRank(s, 'running-crew')).toBe(false)
    const settled = settleRankEvents(s)
    expect(threadUnlockedByRank(settled, 'running-crew')).toBe(true)
    // ⚠️ 창 이벤트는 찍지 않는다 — 창을 닫기만 한 사람이 기회를 잃으면 안 된다.
    const starry = settleRankEvents(at('sensitivity', 'A'))
    expect(seenRankEvent(starry, 'shooting-star')).toBe(false)
  })

  it('랭크로 열리는 방이 아니면 undefined다 — "잠겨 있다"와 구분된다', () => {
    expect(threadUnlockedByRank(createInitialState('x'), 'minji')).toBeUndefined()
    expect(threadUnlockedByRank(createInitialState('x'), 'running-crew')).toBe(false)
  })
})

describe('⚠️ 소원 — 한 번만 된다', () => {
  const star = findRankEvent('shooting-star')!

  /** 감수성 A에 닿은 판. */
  function starry(): GameState {
    return at('sensitivity', 'A')
  }

  it('감수성 A에 닿으면 창이 열릴 이벤트가 생긴다', () => {
    expect(rankOf('sensitivity', starry().stats.sensitivity)).toBe('A')
    expect(dueRankEvents(starry()).map((e) => e.id)).toContain(star.id)
    expect(star.kind).toBe('window')
  })

  it(`고른 스탯이 ${WISH_AMOUNT} 오른다`, () => {
    const s = starry()
    const after = grantWish(s, 'knowledge')
    expect(after.stats.knowledge).toBe(s.stats.knowledge + WISH_AMOUNT)
  })

  it('⚠️ 턴도 돈도 쓰지 않는다 — 일어난 일이지 고른 행동이 아니다', () => {
    const s = starry()
    const after = grantWish(s, 'knowledge')
    expect(after.day).toBe(s.day)
    expect(after.slot).toBe(s.slot)
    expect(after.stats.money).toBe(s.stats.money)
  })

  it('⚠️ 두 번째 소원은 아무 일도 하지 않는다 (규칙을 뒤집으면 무한 성장이 된다)', () => {
    const once = grantWish(starry(), 'knowledge')
    const twice = grantWish(once, 'knowledge')
    expect(twice).toBe(once)
    // 기록이 곧 사용권이다 — 빌지 않고 창만 닫았다면 기록도 없어야 한다(다시 뜬다).
    expect(seenRankEvent(once, star.id)).toBe(true)
    expect(seenRankEvent(starry(), star.id)).toBe(false)
  })

  it('상한 있는 스탯은 상한에서 멈춘다 — 화면이 적는 값과 같다', () => {
    const after = grantWish(starry(), 'reputation')
    expect(after.stats.reputation).toBe(growthCap('reputation'))
  })

  it('감수성 A에 닿기 전에는 빌 수 없다', () => {
    const s = createInitialState('무감')
    expect(grantWish(s, 'knowledge')).toBe(s)
  })
})

describe('세이브 보정', () => {
  it('모르는 id와 중복을 버린다', () => {
    expect(reviveRankEvents(['running-crew', 'running-crew', '없는것'])).toEqual(['running-crew'])
    expect(reviveRankEvents('문자열')).toBeUndefined()
    expect(reviveRankEvents([])).toBeUndefined()
  })
})

describe('랭크 이벤트가 스탯을 고르게 덮는다', () => {
  /*
   * ⚠️ **이 축의 값은 "올릴 이유"다.** 어느 스탯에도 이벤트가 없으면 그 스탯은 올려도
   * 아무 일이 안 일어나고, 그런 스탯이 하나라도 있으면 플레이어는 그것을 버린다
   * (음악이 실제로 그랬다 — 2026-08-08 설계자 지적).
   */
  it('성장 스탯마다 랭크 이벤트가 최소 하나 있다', () => {
    const covered = new Set(RANK_EVENTS.map((e) => e.key))
    const missing = GROWTH_STAT_KEYS.filter((k) => !covered.has(k))
    expect(missing, `이벤트가 없는 스탯: ${missing.join(', ')}`).toHaveLength(0)
  })

  it('문턱은 전부 도달 가능한 값이다 — 아무도 못 보는 이벤트는 버그다', () => {
    for (const e of RANK_EVENTS) {
      // 그 등급에 딱 닿는 판을 만들어, 상한 안의 값인지 확인한다.
      const need = Math.ceil(RANK_THRESHOLDS.find((t) => t.rank === e.rank)!.min * growthCap(e.key))
      expect(need, `${e.id}(${e.key} ${e.rank})`).toBeLessThanOrEqual(growthCap(e.key))
      // 그 스탯을 올리는 활동이 실제로 있어야 도달할 방법이 있다.
      expect(
        ACTIVITIES.some((a) => (a.effects[e.key] ?? 0) > 0),
        `${e.key}를 올리는 활동이 없다`,
      ).toBe(true)
    }
  })
})

describe('⚠️ 낮은 스탯의 대가', () => {
  const penalties = RANK_EVENTS.filter((e) => e.below)

  it('대가는 전부 날짜 문턱을 갖는다 — 없으면 1일차 밤에 통째로 터진다', () => {
    for (const e of penalties) {
      expect(e.afterDay, `${e.id}에 afterDay가 없다`).toBeGreaterThan(0)
    }
  })

  it('규칙을 뒤집으면 실패한다 — 날짜 문턱을 지우면 첫날에 전부 발동한다', () => {
    // 이 줄이 통과해야 위 규칙이 "우연히 맞는 값"이 아님이 증명된다.
    const fresh = createInitialState('맨몸')
    const naked = penalties.map((e) => ({ ...e, afterDay: undefined }))
    expect(naked.every((e) => rankReached(fresh, e))).toBe(true)
    // 날짜 문턱이 있으면 첫날에는 하나도 안 뜬다.
    expect(dueRankEvents(fresh).some((e) => e.below)).toBe(false)
  })

  it('문턱 날짜를 넘기면 대가를 한 번만 치른다', () => {
    const e = penalties[0]
    const before: GameState = { ...createInitialState('맨몸'), day: e.afterDay! }
    const after = settleRankEvents(before)
    const key = Object.keys(e.effects!)[0] as keyof GameState['stats']
    expect(after.stats[key]).toBeLessThan(before.stats[key])
    // 같은 판을 다시 정산해도 두 번 물리지 않는다.
    expect(settleRankEvents(after).stats[key]).toBe(after.stats[key])
  })

  it('스탯을 올려 두면 대가가 오지 않는다', () => {
    const e = penalties[0]
    const rich: GameState = {
      ...createInitialState('노력'),
      day: e.afterDay! + 10,
      stats: { ...createInitialState('노력').stats, [e.key]: growthCap(e.key) },
    }
    expect(dueRankEvents(rich).some((x) => x.id === e.id)).toBe(false)
  })

  it('대가로 소지금이 음수가 되지 않는다 — 파산 판정이 흐려진다', () => {
    const e = RANK_EVENTS.find((x) => x.below && x.effects?.money)!
    const broke: GameState = {
      ...createInitialState('빈손'),
      day: e.afterDay!,
      stats: { ...createInitialState('빈손').stats, money: 1000 },
    }
    expect(settleRankEvents(broke).stats.money).toBeGreaterThanOrEqual(0)
  })
})
