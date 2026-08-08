import { describe, expect, it } from 'vitest'
import { STREAM_REVIEWS, TWEET_ACCOUNTS } from '../data/tweets'
import { STREAM_TOPICS } from '../data/videos'
import {
  CHANNEL_NAME_MAX,
  channelOf,
  renameChannel,
  reviewTier,
  startStream,
  streamReviews,
} from './channel'
import { createInitialState } from './turn'
import type { GameState, Stats } from '../types/game'

/** ⚠️ 상태를 손으로 짓지 않는다(`steam.test.ts`와 같은 이유). */
function state(over: Omit<Partial<GameState>, 'stats'> & { stats?: Partial<Stats> } = {}): GameState {
  const s = createInitialState('테스터')
  return { ...s, ...over, stats: { ...s.stats, ...(over.stats ?? {}) } }
}

/** 방송에는 장비(`requiresItem: 'streamkit'`)와 행동력이 필요하다. */
function ready(over: Parameters<typeof state>[0] = {}): GameState {
  return state({ inventory: [{ id: 'streamkit', day: 1 }], ...over })
}

const TOPIC = STREAM_TOPICS[0]

describe('시청자 반응 데이터', () => {
  it('반응은 기존 계정만 쓴다 — 세계가 둘로 갈라지지 않는다', () => {
    const handles = new Set(TWEET_ACCOUNTS.map((a) => a.handle))
    for (const r of STREAM_REVIEWS) expect(handles.has(r.handle)).toBe(true)
  })

  it('단계마다 반응이 있다 — 빈 단계가 있으면 그 구간에서 검색이 죽는다', () => {
    for (const tier of [0, 1, 2]) {
      expect(STREAM_REVIEWS.filter((r) => r.tier === tier).length).toBeGreaterThan(0)
    }
  })

  it('⚠️ 반응은 숫자를 갖지 않는다 — 크기는 채널에서 파생한다', () => {
    for (const r of STREAM_REVIEWS) {
      expect('likes' in r).toBe(false)
      expect('views' in r).toBe(false)
    }
  })

  it('모든 반응이 채널 이름을 부른다 — 이름 검색에 안 걸리면 볼 방법이 없다', () => {
    for (const r of STREAM_REVIEWS) expect(r.body).toContain('{name}')
  })
})

describe('채널 이름', () => {
  it('짓기 전에는 플레이어 이름이 곧 채널 이름이다', () => {
    expect(channelOf(state()).name).toBe('테스터')
  })

  it('이름을 바꿔도 턴은 흐르지 않는다', () => {
    const before = state()
    const after = renameChannel(before, '심야책방')
    expect(after.channel?.name).toBe('심야책방')
    expect(after.day).toBe(before.day)
    expect(after.slot).toBe(before.slot)
    expect(after.stats).toEqual(before.stats)
  })

  it('빈 이름은 거절한다 — 이름이 사라지면 검색이 모든 글에 걸린다', () => {
    const before = renameChannel(state(), '심야책방')
    expect(renameChannel(before, '   ')).toBe(before)
  })

  it('길이 상한에서 자른다', () => {
    const long = renameChannel(state(), '가'.repeat(CHANNEL_NAME_MAX + 10))
    expect(long.channel?.name.length).toBe(CHANNEL_NAME_MAX)
  })

  it('이름을 지어도 켠 횟수는 0이다 — 반응은 방송한 사람에게만 생긴다', () => {
    const named = renameChannel(state(), '심야책방')
    expect(named.channel?.streams).toBe(0)
    expect(streamReviews(named)).toEqual([])
  })
})

describe('방송 켜기', () => {
  it('1턴을 쓰고 켠 횟수와 주제를 남긴다', () => {
    const before = ready()
    const after = startStream(before, TOPIC)
    expect(after.channel).toEqual({ name: '테스터', streams: 1, topic: TOPIC.id })
    expect(after.slot === before.slot && after.day === before.day).toBe(false)
    expect(after.stats.money).toBeGreaterThan(before.stats.money)
  })

  it('지은 이름은 방송해도 그대로다', () => {
    const named = renameChannel(ready(), '심야책방')
    expect(startStream(named, TOPIC).channel?.name).toBe('심야책방')
  })

  it('⚠️ 장비가 없으면 아무 일도 없다 — 반쪽 상태(기록만 늘어남)를 만들지 않는다', () => {
    const noKit = state()
    expect(startStream(noKit, TOPIC)).toBe(noKit)
  })

  it('⚠️ 행동력이 모자라면 아무 일도 없다', () => {
    const tired = ready({ stats: { stamina: 1 } })
    expect(startStream(tired, TOPIC)).toBe(tired)
  })
})

describe('시청자 반응', () => {
  it('켠 횟수만큼 늘고, 그 단계의 풀이 상한이다', () => {
    let s = ready({ stats: { stamina: 999, maxStamina: 999 } })
    s = startStream(s, TOPIC)
    expect(streamReviews(s)).toHaveLength(1)
    s = startStream(s, TOPIC)
    expect(streamReviews(s)).toHaveLength(2)

    const pool = STREAM_REVIEWS.filter((r) => r.tier === reviewTier(s)).length
    const many = { ...s, channel: { ...s.channel!, streams: 99 } }
    expect(streamReviews(many)).toHaveLength(pool)
  })

  it('본문에 채널 이름과 마지막 방송 주제가 박힌다', () => {
    const s = startStream(renameChannel(ready(), '심야책방'), TOPIC)
    const body = streamReviews(s)
      .map((t) => t.body)
      .join(' ')
    expect(body).toContain('심야책방')
    expect(body).not.toContain('{name}')
    expect(body).not.toContain('{topic}')
  })

  it('평판이 오르면 어조가 바뀐다 — 무명과 화제의 반응이 섞이지 않는다', () => {
    const low = startStream(ready({ stats: { reputation: 0 } }), TOPIC)
    const high = { ...low, stats: { ...low.stats, reputation: 100 } }
    expect(reviewTier(low)).toBe(0)
    expect(reviewTier(high)).toBe(2)
    expect(streamReviews(low)[0].body).not.toBe(streamReviews(high)[0].body)
  })

  it('반응 크기는 구독자에서 파생한다 — 무명 채널에 만 단위 좋아요가 안 달린다', () => {
    const low = startStream(ready({ stats: { reputation: 0 } }), TOPIC)
    const high = startStream(ready({ stats: { reputation: 100 } }), TOPIC)
    expect(streamReviews(high)[0].likes).toBeGreaterThan(streamReviews(low)[0].likes)
  })

  it('내 후기는 팔로잉 타임라인에 안 뜬다', () => {
    const s = startStream(ready(), TOPIC)
    for (const t of streamReviews(s)) expect(t.following).toBe(false)
  })

  it('같은 상태면 같은 반응이다(결정성)', () => {
    const s = startStream(ready(), TOPIC)
    expect(streamReviews(s)).toEqual(streamReviews(s))
  })
})
