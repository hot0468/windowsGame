import { describe, it, expect } from 'vitest'
import {
  CRASH_STAMINA,
  advanceRansom,
  minutesToMidnight,
  ransomRisk,
  shouldCrash,
} from './collapse'
import { RANSOM_MENTAL_FLOOR, RANSOM_RISK } from '../data/collapse'
import { DAY_END } from '../data/clock'
import { createInitialState } from './turn'
import { isInfected } from './malware'
import type { GameState } from '../types/game'

const base = createInitialState('무너짐')
const withStats = (stamina: number, mental: number, seed = 7): GameState => ({
  ...base,
  seed,
  stats: { ...base.stats, stamina, mental },
})

/*
 * ⚠️ **둘 다 판을 끝내지 않는다**(완전한 게임오버 없음) — 뺏는 것은 시간과 돈이다.
 */
describe('강제 종료 — 체력이 바닥나면', () => {
  it('체력이 0이면 꺼진다', () => {
    expect(shouldCrash(withStats(CRASH_STAMINA, 50))).toBe(true)
  })

  it('체력이 남아 있으면 안 꺼진다', () => {
    expect(shouldCrash(withStats(1, 50))).toBe(false)
  })

  it('⚠️ 회복 기간에는 다시 꺼지지 않는다 — 벌이 겹치면 빠져나올 수가 없다', () => {
    const down: GameState = {
      ...withStats(0, 0),
      recovery: { kind: 'burnout', startedDay: 1, daysLeft: 3 },
    }
    expect(shouldCrash(down)).toBe(false)
  })

  it('자정까지 남은 시간은 항상 1분 이상이다 — 0이면 하루가 안 넘어간다', () => {
    expect(minutesToMidnight({ ...base, minute: DAY_END - 30 })).toBe(30)
    expect(minutesToMidnight({ ...base, minute: DAY_END })).toBe(1)
  })
})

describe('랜섬웨어 — 멘탈이 바닥나면', () => {
  it('멘탈이 성하면 위험이 0이다 — 아무 때나 걸리면 규칙이 아니라 세금이다', () => {
    expect(ransomRisk(withStats(100, RANSOM_MENTAL_FLOOR + 1))).toBe(0)
    expect(ransomRisk(withStats(100, 100))).toBe(0)
  })

  it('바닥일수록 위험이 커진다', () => {
    const low = ransomRisk(withStats(100, 0))
    const mid = ransomRisk(withStats(100, RANSOM_MENTAL_FLOOR / 2))
    expect(low).toBe(RANSOM_RISK)
    expect(low).toBeGreaterThan(mid)
    expect(mid).toBeGreaterThan(0)
  })

  it('이미 감염됐으면 다시 굴리지 않는다', () => {
    const sick = { ...withStats(100, 0), malware: { day: 1 } }
    expect(ransomRisk(sick)).toBe(0)
    expect(advanceRansom(sick)).toBe(sick)
  })

  it('⚠️ 무작위가 아니다 — 같은 씨앗·같은 날은 언제나 같은 결과다', () => {
    const s = withStats(100, 0)
    const a = advanceRansom(s)
    const b = advanceRansom(s)
    expect(isInfected(a)).toBe(isInfected(b))
  })

  it('멘탈이 0인 날이 이어지면 언젠가는 걸린다 — 확률이 장식이 아니다', () => {
    let hit = false
    for (let day = 1; day <= 60 && !hit; day++) {
      hit = isInfected(advanceRansom({ ...withStats(100, 0), day }))
    }
    expect(hit).toBe(true)
  })

  it('멘탈이 성한 날은 60일을 굴려도 안 걸린다', () => {
    for (let day = 1; day <= 60; day++) {
      expect(isInfected(advanceRansom({ ...withStats(100, 80), day }))).toBe(false)
    }
  })
})
