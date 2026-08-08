import { describe, it, expect } from 'vitest'
import {
  activeSiteId,
  closeTab,
  createTabs,
  navigateActive,
  openTab,
  setActive,
  tabSiteId,
} from './browserTabs'
import { canGoBack } from './browserHistory'

/**
 * ⚠️ **이 파일은 탭이 깨뜨릴 수 있는 것만 덮는다.** 돈·턴·게임오버를 만들지 않으므로
 * 규칙을 뒤집는 증명까지는 하지 않는다(회귀 테스트 수준).
 */

describe('탭 열기', () => {
  it('사이트를 열면 탭이 하나 붙고 그 탭이 활성이 된다', () => {
    const s = openTab(createTabs('portal'), 'alba')
    expect(s.tabs.map(tabSiteId)).toEqual(['portal', 'alba'])
    expect(activeSiteId(s)).toBe('alba')
  })

  it('이미 열린 사이트는 새 탭을 만들지 않고 그 탭으로 간다', () => {
    let s = openTab(createTabs('portal'), 'alba')
    s = openTab(s, 'flea')
    const before = s.tabs.length
    s = openTab(s, 'alba')
    expect(s.tabs).toHaveLength(before)
    expect(activeSiteId(s)).toBe('alba')
  })

  it('탭 id는 닫고 열어도 겹치지 않는다', () => {
    let s = openTab(createTabs('portal'), 'alba')
    const albaId = s.activeId
    s = closeTab(s, albaId)!
    s = openTab(s, 'flea')
    expect(s.activeId).not.toBe(albaId)
  })
})

describe('탭 안 이동 (주소창)', () => {
  it('새 탭을 만들지 않고 그 탭을 바꾼다', () => {
    const s = navigateActive(createTabs('portal'), 'alba')
    expect(s.tabs).toHaveLength(1)
    expect(activeSiteId(s)).toBe('alba')
  })

  it('⚠️ 이 통로가 있어야 뒤로가 죽지 않는다', () => {
    // 모든 이동이 새 탭이면 탭마다 이력이 한 칸뿐이라 뒤로/앞으로가 영영 비활성이 된다.
    const opened = openTab(createTabs('portal'), 'alba')
    expect(canGoBack(opened.tabs[1].history)).toBe(false)
    const moved = navigateActive(createTabs('portal'), 'alba')
    expect(canGoBack(moved.tabs[0].history)).toBe(true)
  })
})

describe('탭 닫기', () => {
  it('마지막 탭을 닫으면 null이다 — 호출부가 창을 닫는다', () => {
    expect(closeTab(createTabs('portal'), 1)).toBeNull()
  })

  it('활성 탭을 닫으면 오른쪽 탭으로 간다', () => {
    let s = openTab(createTabs('portal'), 'alba')
    s = openTab(s, 'flea')
    s = setActive(s, s.tabs[1].id) // 가운데(alba)를 보는 중
    const next = closeTab(s, s.tabs[1].id)!
    expect(next.tabs.map(tabSiteId)).toEqual(['portal', 'flea'])
    expect(activeSiteId(next)).toBe('flea')
  })

  it('오른쪽이 없으면 왼쪽으로 간다', () => {
    let s = openTab(createTabs('portal'), 'alba')
    const next = closeTab(s, s.activeId)!
    expect(activeSiteId(next)).toBe('portal')
  })

  it('보고 있지 않은 탭을 닫아도 활성 탭은 그대로다', () => {
    let s = openTab(createTabs('portal'), 'alba')
    const next = closeTab(s, s.tabs[0].id)!
    expect(activeSiteId(next)).toBe('alba')
  })
})
