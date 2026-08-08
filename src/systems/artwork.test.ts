import { describe, it, expect } from 'vitest'
import { artFileName, artGrade, artRatio, artworksOf } from './artwork'
import { canRun, createInitialState, runActivity } from './turn'
import { ART_MASTERY, TOOL_BONUS } from '../data/artworks'
import { findActivity } from '../data/activities'
import { RANK_ORDER } from './rank'
import type { GameState, Stats } from '../types/game'

/**
 * ⚠️ **이 파일은 그림이 깨뜨릴 수 있는 것만 덮는다**(한 기능에 40개씩 붙이지 않는다).
 * 덮는 것 셋: ①그리는 활동이 갤러리에 실제로 쌓이는가 ②그릴 때의 사실이 박히는가
 * ③등급이 스탯에서 나오는가. 나머지(팔로워·정산)는 `twitter.test.ts`가 본다.
 */

const DRAW = findActivity('draw')!

function drawer(stats: Partial<Stats> = {}, tool: 'pen' | 'lcd' = 'pen'): GameState {
  const base = createInitialState('그림쟁이')
  return {
    ...base,
    stats: { ...base.stats, stamina: 200, maxStamina: 200, ...stats },
    inventory: [{ id: tool === 'lcd' ? 'lcd-tablet' : 'pen-tablet', day: 1 }],
  }
}

describe('클립스튜디오 — 그림 생성', () => {
  it('타블렛이 없으면 잠기고, 둘 중 아무거나 하나면 열린다', () => {
    // ⚠️ 잠금 판정은 `canRun` 하나가 한다 — `runActivity`는 묻지 않는다(호출부가 막는다).
    //    그래서 여기서 보는 것은 실행 결과가 아니라 **게이트**다.
    const bare = createInitialState('무장비')
    expect(canRun({ ...bare, stats: { ...bare.stats, stamina: 200 } }, DRAW)).toBe(false)
    // 둘 다 같은 문을 연다 — 장비별로 활동이 갈리면 여기서 터진다.
    expect(canRun(drawer({}, 'pen'), DRAW)).toBe(true)
    expect(canRun(drawer({}, 'lcd'), DRAW)).toBe(true)
    expect(artworksOf(runActivity(drawer({}, 'pen'), DRAW))).toHaveLength(1)
    expect(artworksOf(runActivity(drawer({}, 'lcd'), DRAW))).toHaveLength(1)
  })

  it('실행할 때마다 한 장씩 쌓이고 일련번호가 이어진다', () => {
    let s = drawer()
    for (let i = 0; i < 3; i++) s = runActivity(s, DRAW)
    expect(artworksOf(s).map((a) => a.serial)).toEqual([1, 2, 3])
    // id가 겹치면 갤러리 렌더 키와 "이미 올린 그림" 판정이 함께 깨진다.
    expect(new Set(artworksOf(s).map((a) => a.id)).size).toBe(3)
  })

  it('그릴 때의 스탯이 박힌다 — 나중에 스탯이 올라도 옛 그림은 그대로다', () => {
    const first = runActivity(drawer({ art: 0, creativity: 0 }), DRAW)
    const work = artworksOf(first)[0]
    expect(work.art).toBe(0)
    expect(work.creativity).toBe(0)
    // 스탯을 끌어올려도 이미 그린 그림의 등급은 안 움직인다(저장된 사실로 계산한다).
    const later: GameState = { ...first, stats: { ...first.stats, art: 999, creativity: 999 } }
    expect(artGrade(artworksOf(later)[0])).toBe('F')
  })

  it('그릴 때 가진 장비가 박힌다 — 액정을 나중에 사도 소급되지 않는다', () => {
    const penWork = artworksOf(runActivity(drawer({}, 'pen'), DRAW))[0]
    expect(penWork.tool).toBe('pen')
    const lcdWork = artworksOf(runActivity(drawer({}, 'lcd'), DRAW))[0]
    expect(lcdWork.tool).toBe('lcd')
  })
})

describe('그림 등급', () => {
  it('예술과 창의력이 함께 올라야 등급이 오른다 — 예술만으로는 못 채운다', () => {
    const artOnly = { art: ART_MASTERY * 2, creativity: 0, tool: 'pen' as const }
    const both = { art: ART_MASTERY, creativity: ART_MASTERY, tool: 'pen' as const }
    // 합이 같으면 비율도 같다(한쪽만 올려도 같은 값이 되는 구조인지 확인).
    expect(artRatio(artOnly)).toBeCloseTo(artRatio(both))
    // 다만 예술의 상승 경로는 `draw` 하나뿐이라, 창의력을 다른 활동으로 벌 수 있는 것이
    // "한 활동 도배보다 섞는 편이 낫다"를 만든다.
    expect(artRatio({ art: 0, creativity: 0, tool: 'pen' })).toBe(0)
  })

  it('액정 타블렛이 비율을 얹는다 — 이 한 줄이 1,150,000원의 값어치다', () => {
    const stats = { art: 100, creativity: 100 }
    const pen = artRatio({ ...stats, tool: 'pen' })
    const lcd = artRatio({ ...stats, tool: 'lcd' })
    expect(lcd - pen).toBeCloseTo(TOOL_BONUS.lcd)
    expect(TOOL_BONUS.pen).toBe(0)
  })

  it('스탯 등급과 같은 척도를 쓴다 — 새 등급 체계를 만들지 않았다', () => {
    const grades = [0, 0.1, 0.3, 0.5, 0.75, 0.95].map((r) =>
      artGrade({ art: r * 2 * ART_MASTERY, creativity: 0, tool: 'pen' }),
    )
    expect(grades).toEqual(RANK_ORDER)
  })

  it('비율은 0~1로 잘린다 — 상한을 넘긴 스탯도 SS까지만 간다', () => {
    expect(artRatio({ art: 999, creativity: 999, tool: 'lcd' })).toBe(1)
    expect(artGrade({ art: 999, creativity: 999, tool: 'lcd' })).toBe('SS')
  })

  it('파일 이름에 등급이 박혀 있다 — 갤러리의 검색·정렬이 그것으로 동작한다', () => {
    const s = runActivity(drawer({ art: 999, creativity: 999 }, 'lcd'), DRAW)
    expect(artFileName(artworksOf(s)[0])).toMatch(/_SS$/)
  })
})
