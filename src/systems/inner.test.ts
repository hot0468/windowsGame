import { describe, expect, it } from 'vitest'
import { innerLine } from './inner'
import { createInitialState } from './turn'
import { CATEGORY_LINES, DRAINED_LINES, DRAINED_MENTAL, TIRED_LINES, TIRED_STAMINA } from '../data/inner'
import { ACTIVITIES, findActivity } from '../data/activities'
import type { GameState } from '../types/game'

/**
 * 내면 감상.
 *
 * ⚠️ **연출이라 규칙을 만들지 않는다** — 재는 것은 ①상태와 어긋나는 말을 하지 않는가
 * ②같은 말이 연달아 나오지 않는가 둘뿐이다.
 */

const base = (): GameState => createInitialState('감상')
const study = findActivity('study')!

describe('상태와 어긋나는 말을 하지 않는다', () => {
  it('체력이 바닥이면 몸이 먼저 말한다', () => {
    const s = base()
    const tired: GameState = { ...s, stats: { ...s.stats, stamina: TIRED_STAMINA } }
    expect(TIRED_LINES).toContain(innerLine(tired, study))
  })

  /* 순서가 규칙이다: 몸 → 마음 → 갈래. 둘 다 낮으면 몸이 이긴다. */
  it('둘 다 낮으면 몸이 이긴다', () => {
    const s = base()
    const both: GameState = {
      ...s,
      stats: { ...s.stats, stamina: TIRED_STAMINA, mental: DRAINED_MENTAL },
    }
    expect(TIRED_LINES).toContain(innerLine(both, study))
  })

  it('멘탈만 낮으면 마음이 말한다', () => {
    const s = base()
    const drained: GameState = { ...s, stats: { ...s.stats, mental: DRAINED_MENTAL } }
    expect(DRAINED_LINES).toContain(innerLine(drained, study))
  })

  it('멀쩡하면 갈래가 말한다', () => {
    expect(CATEGORY_LINES.study).toContain(innerLine(base(), study))
  })
})

describe('같은 말이 연달아 나오지 않는다', () => {
  it('턴이 넘어가면 다른 문장이 나온다', () => {
    const s = base()
    const morning = innerLine(s, study)
    const afternoon = innerLine({ ...s, slot: 'afternoon' }, study)
    expect(morning).not.toBe(afternoon)
  })
})

describe('모든 활동이 할 말을 갖는다', () => {
  /* 갈래가 여섯인데 문장이 없는 갈래가 있으면 그 활동만 조용히 아무 말도 안 한다. */
  it('갈래마다 문장이 있다', () => {
    for (const a of ACTIVITIES) {
      expect(innerLine(base(), a), `${a.id}(${a.category})`).toBeTruthy()
    }
  })
})
