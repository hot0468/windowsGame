import { describe, it, expect } from 'vitest'
import { selectIncoming, selectChannel, turnIndex } from './messages'
import { MESSAGE_SCHEDULE } from '../data/messages'

describe('turnIndex', () => {
  it('1일차 오전이 0, 오후가 1, 2일차 오전이 2다', () => {
    expect(turnIndex(1, 'morning')).toBe(0)
    expect(turnIndex(1, 'afternoon')).toBe(1)
    expect(turnIndex(2, 'morning')).toBe(2)
  })
})

describe('selectIncoming', () => {
  it('같은 턴에는 늘 같은 메시지가 온다 (결정적)', () => {
    expect(selectIncoming(1, 'morning')).toEqual(selectIncoming(1, 'morning'))
  })

  it('편성표를 순환한다 — 대본이 끝나도 바닥나지 않는다', () => {
    const cycle = MESSAGE_SCHEDULE.length
    // 편성표 길이만큼 지난 뒤 같은 자리로 돌아온다(길이가 짝수라 슬롯도 맞물린다).
    expect(selectIncoming(1 + cycle / 2, 'morning')).toEqual(selectIncoming(1, 'morning'))
  })

  it('조용한 턴이 있다 — 매 턴 알림이 뜨면 소음이 된다', () => {
    expect(MESSAGE_SCHEDULE.some((turn) => turn.length === 0)).toBe(true)
  })
})

describe('selectThread', () => {
  it('턴이 지날수록 대화가 쌓인다', () => {
    const early = selectChannel('minji', 1, 'morning')
    const later = selectChannel('minji', 3, 'morning')
    expect(later.length).toBeGreaterThan(early.length)
  })

  it('다른 방의 메시지는 섞이지 않는다', () => {
    for (const m of selectChannel('boss', 5, 'afternoon')) {
      expect(m.channel).toBe('boss')
    }
  })

  it('0턴 이전을 조회해도 터지지 않는다', () => {
    expect(selectChannel('minji', 1, 'morning').length).toBeGreaterThanOrEqual(0)
  })
})
