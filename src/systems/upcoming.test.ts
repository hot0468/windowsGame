import { describe, it, expect } from 'vitest'
import { CONTESTS, entryOpen } from '../data/contests'
import { SHOWN, WITHIN_DAYS, upcoming } from './upcoming'
import { createInitialState } from './turn'
import type { GameState } from '../types/game'

/**
 * ⚠️ **이 축은 상태를 만들지 않는다**(전부 날짜의 순수 함수이거나 이미 저장된 기록의 파생).
 * 그래서 규칙을 뒤집는 증명은 붙이지 않고, **조용히 사라지거나 조용히 도배되는 것**만 잡는다.
 */

const day = (n: number): GameState => ({ ...createInitialState('테스터'), day: n })

describe('다가오는 일정', () => {
  it('가까운 순으로 오고 최대 개수를 넘지 않는다', () => {
    for (let d = 1; d <= 60; d++) {
      const items = upcoming(day(d))
      expect(items.length, `${d}일차`).toBeLessThanOrEqual(SHOWN)
      const days = items.map((i) => i.inDays)
      expect([...days].sort((a, b) => a - b), `${d}일차 정렬`).toEqual(days)
    }
  })

  /** ⚠️ 먼 것까지 적으면 열여섯 줄이 늘 떠 있어 **아무것도 다가오지 않는 것과 같아진다.** */
  it('창 밖의 것은 안 나온다', () => {
    for (let d = 1; d <= 60; d++) {
      for (const item of upcoming(day(d))) {
        expect(item.inDays, `${d}일차 ${item.label}`).toBeGreaterThanOrEqual(0)
        expect(item.inDays, `${d}일차 ${item.label}`).toBeLessThanOrEqual(WITHIN_DAYS)
      }
    }
  })

  it('문장과 id가 비어 있지 않고 한 화면 안에서 겹치지 않는다', () => {
    for (let d = 1; d <= 60; d++) {
      const items = upcoming(day(d))
      for (const i of items) {
        expect(i.label.length, `${d}일차`).toBeGreaterThan(0)
        expect(i.id.length, `${d}일차`).toBeGreaterThan(0)
      }
      expect(new Set(items.map((i) => i.id)).size, `${d}일차 id 중복`).toBe(items.length)
    }
  })

  /** ⚠️ 그때 읽혀야 하는 것은 엔딩이지 다음 주 일정이 아니다. */
  it('게임이 끝났으면 비어 있다', () => {
    expect(upcoming({ ...day(10), gameOver: 'bankrupt' })).toEqual([])
  })

  /**
   * 마감이 실제로 줄에 오르는지 — 이 축을 만든 이유 그 자체다.
   * 접수 중이고 아직 안 낸 공모전이 있으면 그 마감이 언젠가는 목록에 떠야 한다.
   */
  it('공모전 마감이 목록에 오른다', () => {
    const found = Array.from({ length: 60 }, (_, i) => i + 1).some((d) =>
      upcoming(day(d)).some((i) => i.id.startsWith('due-')),
    )
    expect(found, '60일을 훑어도 마감 줄이 한 번도 안 뜬다').toBe(true)
  })

  /** ⚠️ 마감이 지난 공모전은 목록에서 빠져야 한다(닫힌 것을 재촉하면 거짓말이 된다). */
  it('접수 중이 아닌 공모전의 마감은 안 뜬다', () => {
    for (let d = 1; d <= 60; d++) {
      for (const item of upcoming(day(d))) {
        if (!item.id.startsWith('due-')) continue
        const contest = CONTESTS.find((c) => `due-${c.id}` === item.id)!
        expect(entryOpen(contest, d), `${d}일차 ${contest.id}`).toBe(true)
      }
    }
  })
})
