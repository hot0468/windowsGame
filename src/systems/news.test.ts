import { describe, it, expect } from 'vitest'
import { buildPriceNotice, selectNews } from './news'
import { NEWS_POOL, NEWS_VISIBLE_COUNT } from '../data/news'
import { activeShock, nextShock, shockIncoming } from './economy'
import { SHOCK_NOTICE_DAYS } from '../data/economy'

/*
 * ⚠️ **평시에는 물가 뉴스가 없다**(2026-08-22). 예전에는 "N일 뒤 물가 인상"이 매일 첫 줄에
 * 박혀 있었는데, 늘 떠 있는 경고는 진짜 사건이 왔을 때도 배경으로 읽힌다.
 */
describe('buildPriceNotice', () => {
  it('조용한 날에는 물가 소식이 없다', () => {
    const quiet = [1, 5, 10].filter((d) => !activeShock(d) && !shockIncoming(d))
    expect(quiet.length).toBeGreaterThan(0)
    for (const day of quiet) expect(buildPriceNotice(day)).toBeNull()
  })

  it('사건이 다가오면 남은 날을 적어 예고한다', () => {
    const w = nextShock(1)
    const item = buildPriceNotice(w.start - SHOCK_NOTICE_DAYS)!
    expect(item.kind).toBe('notice')
    expect(item.headline).toContain(`${SHOCK_NOTICE_DAYS}일 뒤`)
    expect(item.headline).toContain(w.shock.name)
  })

  it('사건 중에는 진행 중인 사건과 남은 날을 적는다', () => {
    const w = nextShock(1)
    const item = buildPriceNotice(w.start)!
    expect(item.headline).toContain(w.shock.headline)
    expect(item.headline).toContain(`${w.shock.days}일 남음`)
  })

  it('끝난 다음 날에는 다시 조용해진다 — 사건은 지나간다', () => {
    const w = nextShock(1)
    const after = w.end + 1
    if (!shockIncoming(after)) expect(buildPriceNotice(after)).toBeNull()
  })
})

describe('selectNews', () => {
  it('노출 칸 수만큼 항목을 반환한다', () => {
    expect(selectNews({ day: 1 })).toHaveLength(NEWS_VISIBLE_COUNT)
  })

  it('물가 사건이 있는 날에만 첫 항목이 그 소식이다', () => {
    for (const day of [1, 7, 25, 88, 400]) {
      const first = selectNews({ day }).at(0)!
      const noisy = !!buildPriceNotice(day)
      expect(first.kind === 'notice' && !NEWS_POOL.some((n) => n.id === first.id)).toBe(noisy)
    }
  })

  it('같은 날에는 항상 같은 목록을 준다 (탐색 재시도로 뉴스가 바뀌지 않는다)', () => {
    expect(selectNews({ day: 17 })).toEqual(selectNews({ day: 17 }))
  })

  it('날짜가 바뀌면 분위기 기사 목록이 달라진다', () => {
    const a = selectNews({ day: 3 }).map((n) => n.id)
    const b = selectNews({ day: 4 }).map((n) => n.id)
    expect(a).not.toEqual(b)
  })

  it('한 목록 안에서 같은 기사가 중복되지 않는다', () => {
    for (let day = 1; day <= 60; day++) {
      const ids = selectNews({ day }).map((n) => n.id)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })

  it('풀 항목만 회전한다 — 물가 소식 외에는 데이터에 없는 기사가 끼어들지 않는다', () => {
    const poolIds = new Set(NEWS_POOL.map((n) => n.id))
    const notice = buildPriceNotice(42)
    for (const item of selectNews({ day: 42 })) {
      if (notice && item.id === notice.id) continue
      expect(poolIds.has(item.id)).toBe(true)
    }
  })

  it('풀은 노출 칸 수를 채우고도 남는다 (매일 같은 목록 방지)', () => {
    expect(NEWS_POOL.length).toBeGreaterThan(NEWS_VISIBLE_COUNT)
  })
})
