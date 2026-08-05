import { describe, it, expect } from 'vitest'
import { search } from './search'
import { findSite } from '../data/sites'

describe('search', () => {
  it('사이트 제목으로 찾는다', () => {
    const r = search('알바몬')
    expect(r.sites.map((s) => s.id)).toContain('albamon')
  })

  it('주소 일부로도 찾는다', () => {
    expect(search('nutube').sites.map((s) => s.id)).toContain('youtube')
  })

  it('대소문자·앞뒤 공백을 무시한다', () => {
    expect(search('  NUTUBE  ').total).toBe(search('nutube').total)
  })

  it('기사 제목으로 찾는다', () => {
    expect(search('번아웃').news.length).toBeGreaterThan(0)
  })

  it('빈 검색어는 결과가 없다 — 전체 목록을 쏟지 않는다', () => {
    expect(search('   ').total).toBe(0)
  })

  it('없는 말은 0건이다', () => {
    expect(search('존재하지않는단어xyz').total).toBe(0)
  })

  it('결과의 사이트는 전부 실제로 이동할 수 있다 (죽은 링크 방지)', () => {
    for (const s of search('네이놈').sites) expect(findSite(s.id)).toBeDefined()
  })
})
