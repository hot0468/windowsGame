import { describe, it, expect } from 'vitest'
import { findAccount, tweetAge, TWEET_ACCOUNTS, TWEETS } from './tweets'
import { TRENDING_TERMS } from './news'

describe('트윗 데이터', () => {
  it('모든 트윗이 실제로 있는 계정을 가리킨다', () => {
    for (const t of TWEETS) {
      expect(findAccount(t.handle), t.id).toBeDefined()
    }
    expect(new Set(TWEET_ACCOUNTS.map((a) => a.handle)).size).toBe(TWEET_ACCOUNTS.length)
    expect(new Set(TWEETS.map((t) => t.id)).size).toBe(TWEETS.length)
  })

  it('두 탭이 모두 보여 줄 것을 갖는다', () => {
    // 팔로잉 탭이 항상 비어 있으면 탭이 목록을 가르는 것이 아니라 지우는 것이 된다.
    expect(TWEETS.some((t) => t.following)).toBe(true)
    expect(TWEETS.some((t) => !t.following)).toBe(true)
  })

  it('트렌드는 눌러서 걸리는 곳이 있다 (TRENDING_TERMS 재사용이 끊기지 않았다)', () => {
    // ⚠️ 트렌드를 눌렀는데 빈 목록이 나오면 그 항목은 갈 데 없는 장식이 된다.
    for (const term of TRENDING_TERMS) {
      const hit = TWEETS.some((t) => t.body.includes(term.label))
      expect(hit, term.label).toBe(true)
    }
  })

  it('시각은 인덱스에서 파생한다 (Date를 쓰지 않는다)', () => {
    expect(tweetAge(0)).toBe(tweetAge(0))
    expect(tweetAge(1)).not.toBe(tweetAge(2))
  })
})
