import { describe, it, expect } from 'vitest'
import {
  createWork,
  gainOf,
  isTopRank,
  meetsRank,
  personalWorks,
  rankOfWork,
  refineWork,
  skillRatio,
  startRank,
  worksForGig,
  worksOf,
} from './works'
import { BASE_GAIN, SKILL_GAIN, WORK_MASTERY } from '../data/works'
import { createInitialState } from './turn'
import type { GameState } from '../types/game'

/**
 * ⚠️ **작업물은 등급을 저장한다**(그림과 반대다) — 보강해서 올린 결과라 잃으면 플레이어가
 * 쓴 턴이 사라진다. 이 파일이 지키는 것: ①스탯이 시작 등급과 상승률을 정한다
 * ②게이지가 차면 등급이 오른다 ③아무리 못해도 언젠가는 오른다.
 */
const base = createInitialState('작업자')

function withStats(art: number, creativity: number): GameState {
  return { ...base, stats: { ...base.stats, art, creativity } }
}

describe('시작 등급', () => {
  it('스탯이 0이면 F에서 시작한다', () => {
    expect(startRank(withStats(0, 0), 'photoshop')).toBe('F')
  })

  it('실력이 높으면 처음부터 높은 등급으로 나온다', () => {
    expect(startRank(withStats(WORK_MASTERY, WORK_MASTERY), 'photoshop')).toBe('SS')
  })

  it('개인 작업물은 지금 실력에서, 의뢰 작업물은 F에서 시작한다', () => {
    const s = withStats(WORK_MASTERY, WORK_MASTERY)
    const personal = worksOf(createWork(s, 'photoshop'))[0]
    const gig = worksOf(createWork(s, 'photoshop', 'some-gig'))[0]
    expect(rankOfWork(personal)).toBe('SS')
    expect(rankOfWork(gig)).toBe('F')
  })
})

describe('보강', () => {
  it('⚠️ 스탯이 0이어도 게이지가 찬다 — 못하는 사람은 느린 것이지 못 하는 것이 아니다', () => {
    expect(gainOf(withStats(0, 0), 'photoshop')).toBe(BASE_GAIN)
    let s = createWork(withStats(0, 0), 'photoshop', 'g')
    const id = worksOf(s)[0].id
    for (let i = 0; i < Math.ceil(1 / BASE_GAIN); i++) s = refineWork(s, id)
    expect(rankOfWork(worksOf(s)[0])).toBe('C')
  })

  it('실력이 높을수록 한 번에 더 오른다', () => {
    const slow = gainOf(withStats(0, 0), 'photoshop')
    const fast = gainOf(withStats(WORK_MASTERY, WORK_MASTERY), 'photoshop')
    expect(fast).toBeGreaterThan(slow)
    expect(fast).toBe(BASE_GAIN + SKILL_GAIN)
  })

  it('⚠️ 한 번에 두 등급은 안 오른다 — 게이지가 장식이 되면 안 된다', () => {
    expect(BASE_GAIN + SKILL_GAIN).toBeLessThan(2)
    const s = withStats(WORK_MASTERY, WORK_MASTERY)
    let after = createWork(s, 'photoshop', 'g')
    const id = worksOf(after)[0].id
    after = refineWork(after, id)
    expect(worksOf(after)[0].rankIndex).toBeLessThanOrEqual(1)
  })

  it('최고 등급에서는 더 안 오르고 게이지가 가득 찬 채 멈춘다', () => {
    let s = withStats(WORK_MASTERY, WORK_MASTERY)
    s = createWork(s, 'photoshop')
    const id = worksOf(s)[0].id
    for (let i = 0; i < 10; i++) s = refineWork(s, id)
    const w = worksOf(s)[0]
    expect(isTopRank(w)).toBe(true)
    expect(w.progress).toBe(1)
    // 더 눌러도 상태가 그대로다(반쪽 변경 금지).
    expect(refineWork(s, id)).toBe(s)
  })

  it('없는 작업물은 아무 일도 없다', () => {
    const s = createWork(base, 'vscode')
    expect(refineWork(s, 'nope')).toBe(s)
  })
})

describe('찾기', () => {
  it('의뢰 작업물과 개인 작업물이 갈린다', () => {
    let s = createWork(base, 'vscode', 'gig-1')
    s = createWork(s, 'vscode')
    expect(worksForGig(s, 'gig-1')).toHaveLength(1)
    expect(personalWorks(s, 'vscode')).toHaveLength(1)
  })

  it('요구 등급 판정은 등급 순서를 그대로 쓴다', () => {
    const s = createWork(withStats(WORK_MASTERY, WORK_MASTERY), 'photoshop')
    const w = worksOf(s)[0]
    expect(meetsRank(w, 'A')).toBe(true)
    const rookie = worksOf(createWork(withStats(0, 0), 'photoshop'))[0]
    expect(meetsRank(rookie, 'C')).toBe(false)
  })

  it('실력 비율은 0~1 안에 갇힌다', () => {
    expect(skillRatio(withStats(0, 0), 'photoshop')).toBe(0)
    expect(skillRatio(withStats(9999, 9999), 'photoshop')).toBe(1)
  })
})
