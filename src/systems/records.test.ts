import { describe, expect, it } from 'vitest'
import { allRecords, brokenRecords } from './records'
import { createInitialState, growthCap, runActivity } from './turn'
import { findActivity } from '../data/activities'
import type { GameState } from '../types/game'

/**
 * 개인 기록.
 *
 * ⚠️ **재는 것은 "갱신을 잡아내는가" 하나다**(CLAUDE.md 검증 분량 규칙). 이 장치가
 * 하는 일이 그것뿐이고, 문구·순서는 깨져도 게임이 틀어지지 않는다.
 */

const base = (): GameState => createInitialState('기록')

describe('기록 목록', () => {
  it('아무것도 안 한 판에도 목록은 나온다 — 빈 화면을 만들지 않는다', () => {
    const rows = allRecords(base())
    expect(rows.length).toBeGreaterThan(0)
    for (const r of rows) expect(r.label).toBeTruthy()
  })

  it('아직 없는 기록은 무엇을 하면 되는지 말한다', () => {
    const art = allRecords(base()).find((r) => r.id === 'best-art')!
    expect(art.value).toBeUndefined()
    expect(art.hint).toBeTruthy()
  })
})

describe('갱신 판정', () => {
  /* ⚠️ **없던 기록이 처음 생기는 것**만 무조건 알린다 — 판을 열 때부터 값이 있는
     기록(스탯·잔고)은 여기 해당하지 않는다(그쪽은 아래 표시 변화 규칙을 탄다). */
  it('없던 기록이 처음 생기면 잡힌다 — 장치가 있다는 것을 알려야 한다', () => {
    const before = base()
    expect(allRecords(before).find((r) => r.id === 'longest-job')!.value).toBeUndefined()
    const after: GameState = { ...before, careerLog: { 'hanul-call': 1 } }
    expect(brokenRecords(before, after).some((r) => r.id === 'longest-job')).toBe(true)
  })

  it('첫 행동 한 번으로는 스탯 기록이 안 뜬다 — 매 턴 축하는 소음이다', () => {
    const before = base()
    const after = runActivity(before, findActivity('study')!)
    expect(brokenRecords(before, after).some((r) => r.id === 'top-stat')).toBe(false)
  })

  /* ⚠️ 실측으로 두 번 고친 자리다 — 매 행동 축하가 뜨면 그건 축하가 아니라 소음이다.
     같은 등급 안에서 숫자만 오르는 것은 화면에 뜨는 말이 안 바뀌므로 알릴 것도 없다. */
  it('같은 등급 안에서 숫자만 오르면 알리지 않는다', () => {
    const s = base()
    const grown: GameState = { ...s, stats: { ...s.stats, knowledge: 300 } }
    const barely: GameState = { ...grown, stats: { ...grown.stats, knowledge: 330 } }
    expect(brokenRecords(grown, barely).some((r) => r.id === 'top-stat')).toBe(false)
  })

  it('등급이 넘어가면 알린다', () => {
    const s = base()
    const grown: GameState = { ...s, stats: { ...s.stats, knowledge: 300 } }
    const jumped: GameState = { ...grown, stats: { ...grown.stats, knowledge: 600 } }
    expect(brokenRecords(grown, jumped).some((r) => r.id === 'top-stat')).toBe(true)
  })

  it('아무것도 안 바뀌면 갱신도 없다', () => {
    const s = base()
    expect(brokenRecords(s, s)).toHaveLength(0)
  })

  /* ⚠️ 처음 생긴 기록도 갱신이다 — 아니면 "기록"이라는 장치가 있는 줄도 모른다. */
  it('0에서 처음 생긴 것도 갱신이다', () => {
    const before = base()
    const after: GameState = {
      ...before,
      careerLog: { 'hanul-call': 1 },
    }
    expect(brokenRecords(before, after).some((r) => r.id === 'longest-job')).toBe(true)
  })

  it('값이 내려가면 갱신이 아니다', () => {
    const before = base()
    const poorer: GameState = { ...before, stats: { ...before.stats, money: 0 } }
    expect(brokenRecords(before, poorer).some((r) => r.id === 'money')).toBe(false)
  })
})

describe('상한이 다른 스탯을 공평하게 본다', () => {
  /* 절대값으로 고르면 상한 100짜리(평판·도덕·예의범절)는 영영 1등이 못 된다. */
  it('평판 만점이 지식 소량보다 높은 기록이다', () => {
    const s = base()
    const rep: GameState = {
      ...s,
      stats: { ...s.stats, reputation: growthCap('reputation'), knowledge: 20 },
    }
    expect(allRecords(rep).find((r) => r.id === 'top-stat')!.value).toContain('평판')
  })
})
