import { describe, expect, it } from 'vitest'
import { GUIDES } from '../data/guide'
import { MAILBOX } from '../data/messages'
import { dueGuides, guideMessages, seenGuide, settleGuides } from './guide'
import { createInitialState } from './turn'
import type { GameState } from '../types/game'

/**
 * 첫 판 안내.
 *
 * ⚠️ **재는 것은 "한 번만 오는가" 하나다** — 편성표(`MESSAGE_SCHEDULE`)가 순환하는 탓에
 * 이 축을 따로 만들었으므로, 두 번 오면 만든 이유가 사라진다.
 */

const base = (): GameState => createInitialState('안내')

describe('한 번만 온다', () => {
  it('날짜가 되면 온다', () => {
    const s = { ...base(), day: GUIDES[0].day }
    expect(dueGuides(s).some((g) => g.id === GUIDES[0].id)).toBe(true)
  })

  it('아직 이르면 안 온다', () => {
    const later = GUIDES.find((g) => g.day > 1)!
    const s = { ...base(), day: 1 }
    expect(dueGuides(s).some((g) => g.id === later.id)).toBe(false)
  })

  /* ⚠️ 이 축의 전부다 — 편성표에 뒀다면 200일차에 "입주를 환영합니다"가 다시 온다. */
  it('받은 뒤에는 다시 오지 않는다', () => {
    const s = { ...base(), day: 999 }
    const first = settleGuides(s)
    expect(first.mails.length).toBeGreaterThan(0)
    expect(settleGuides(first.state).mails).toHaveLength(0)
  })

  it('며칠이 한 번에 흘러도 밀린 안내가 다 온다 — 하나만 주면 나머지가 영영 안 온다', () => {
    const s = { ...base(), day: 999 }
    expect(settleGuides(s).mails).toHaveLength(GUIDES.length)
  })

  it('주저앉은 동안에는 오지 않는다 — 회복 안내 위에 겹치면 둘 다 안 읽힌다', () => {
    const down: GameState = {
      ...base(),
      day: 999,
      recovery: { kind: 'bankrupt', startedDay: 1, daysLeft: 2 },
    }
    expect(dueGuides(down)).toHaveLength(0)
  })
})

describe('사서함에 남는다', () => {
  it('받은 것만 보인다', () => {
    const s = { ...base(), day: 999 }
    expect(guideMessages(s)).toHaveLength(0)
    const after = settleGuides(s).state
    expect(guideMessages(after)).toHaveLength(GUIDES.length)
  })

  it('사서함 채널로 간다 — 새 알림 창구를 만들지 않는다', () => {
    const after = settleGuides({ ...base(), day: 999 }).state
    for (const m of guideMessages(after)) expect(m.channel).toBe(MAILBOX.id)
  })

  it('기록이 남는다', () => {
    const after = settleGuides({ ...base(), day: 1 }).state
    expect(seenGuide(after, GUIDES[0].id)).toBe(true)
  })
})

describe('내용 규칙', () => {
  it('id·날짜가 겹치지 않는다 — 같은 날 둘이 오면 한 번에 몰려 안 읽는다', () => {
    const ids = GUIDES.map((g) => g.id)
    expect(new Set(ids).size).toBe(ids.length)
    const days = GUIDES.map((g) => g.day)
    expect(new Set(days).size).toBe(days.length)
  })

  it('날짜순으로 적혀 있다 — 순서가 곧 배우는 순서다', () => {
    const days = GUIDES.map((g) => g.day)
    expect([...days].sort((a, b) => a - b)).toEqual(days)
  })

  /* ⚠️ 사서함 본문은 줄바꿈이 접힌다(`Guide.text` 주석) — 넣으면 한 덩어리로 보인다. */
  it('본문에 줄바꿈이 없다', () => {
    for (const g of GUIDES) expect(g.text.includes('\\n'), g.id).toBe(false)
  })

  it('보내는 이와 제목이 비어 있지 않다', () => {
    for (const g of GUIDES) {
      expect(g.from, g.id).toBeTruthy()
      expect(g.subject, g.id).toBeTruthy()
    }
  })

  /* 넷을 넘기면 첫 주가 설명서가 된다 — 안내는 게임이 아니다. */
  it('안내가 너무 많지 않다', () => {
    expect(GUIDES.length).toBeLessThanOrEqual(5)
  })
})
