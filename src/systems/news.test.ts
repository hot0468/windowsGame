import { describe, it, expect } from 'vitest'
import { buildPriceRiseNotice, selectNews } from './news'
import { NEWS_POOL, NEWS_VISIBLE_COUNT } from '../data/news'
import { getNextTier } from './economy'

describe('buildPriceRiseNotice', () => {
  it('다음 인상 구간의 생활비와 남은 일수를 문장에 담는다', () => {
    const next = getNextTier(1)
    const item = buildPriceRiseNotice(1)
    expect(item.kind).toBe('notice')
    expect(item.headline).toContain(`${next.day - 1}일 뒤`)
    expect(item.headline).toContain(next.living.toLocaleString('ko-KR'))
  })

  it('구간이 바뀌면 예고 내용도 바뀐다', () => {
    // 1일차와 11일차는 서로 다른 다음 구간을 바라본다.
    expect(buildPriceRiseNotice(1).headline).not.toBe(buildPriceRiseNotice(11).headline)
  })

  it('표를 넘어선 날짜에서도 예고가 사라지지 않는다', () => {
    // getNextTier가 외삽으로 항상 값을 주므로 후반에도 압박이 유지되어야 한다.
    const item = buildPriceRiseNotice(300)
    expect(item.headline).toContain('물가 인상 예고')
    expect(getNextTier(300).day).toBeGreaterThan(300)
  })

  it('인상 당일 직전에는 "1일 뒤"로 예고한다', () => {
    expect(buildPriceRiseNotice(10).headline).toContain('1일 뒤')
  })
})

describe('selectNews', () => {
  it('노출 칸 수만큼 항목을 반환한다', () => {
    expect(selectNews({ day: 1 })).toHaveLength(NEWS_VISIBLE_COUNT)
  })

  it('첫 항목은 항상 게임 상태에서 파생된 예고다', () => {
    for (const day of [1, 7, 25, 88, 400]) {
      expect(selectNews({ day }).at(0)!.kind).toBe('notice')
    }
  })

  it('같은 날에는 항상 같은 목록을 준다 (탐색 재시도로 뉴스가 바뀌지 않는다)', () => {
    expect(selectNews({ day: 17 })).toEqual(selectNews({ day: 17 }))
  })

  it('날짜가 바뀌면 분위기 기사 목록이 달라진다', () => {
    const a = selectNews({ day: 3 }).slice(1).map((n) => n.id)
    const b = selectNews({ day: 4 }).slice(1).map((n) => n.id)
    expect(a).not.toEqual(b)
  })

  it('한 목록 안에서 같은 기사가 중복되지 않는다', () => {
    for (let day = 1; day <= 60; day++) {
      const ids = selectNews({ day }).map((n) => n.id)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })

  it('풀 항목만 회전한다 — 예고 외에는 데이터에 없는 기사가 끼어들지 않는다', () => {
    const poolIds = new Set(NEWS_POOL.map((n) => n.id))
    for (const item of selectNews({ day: 42 }).slice(1)) {
      expect(poolIds.has(item.id)).toBe(true)
    }
  })

  it('풀은 노출 칸 수를 채우고도 남는다 (매일 같은 목록 방지)', () => {
    expect(NEWS_POOL.length).toBeGreaterThan(NEWS_VISIBLE_COUNT)
  })
})
