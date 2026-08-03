import { describe, it, expect } from 'vitest'
import {
  canGoBack,
  canGoForward,
  createHistory,
  currentSiteId,
  goBack,
  goForward,
  navigate,
} from './browserHistory'

describe('browserHistory', () => {
  it('처음에는 홈 한 칸뿐이라 뒤로도 앞으로도 갈 수 없다', () => {
    const h = createHistory('never')
    expect(currentSiteId(h)).toBe('never')
    expect(canGoBack(h)).toBe(false)
    expect(canGoForward(h)).toBe(false)
  })

  it('이동하면 뒤로 갈 수 있게 된다', () => {
    const h = navigate(createHistory('never'), 'shopping')
    expect(currentSiteId(h)).toBe('shopping')
    expect(canGoBack(h)).toBe(true)
    expect(canGoForward(h)).toBe(false)
  })

  it('뒤로 간 뒤 앞으로 가면 원래 자리로 돌아온다', () => {
    const h = navigate(createHistory('never'), 'shopping')
    const back = goBack(h)
    expect(currentSiteId(back)).toBe('never')
    expect(canGoForward(back)).toBe(true)
    expect(currentSiteId(goForward(back))).toBe('shopping')
  })

  it('뒤로 간 상태에서 새로 이동하면 앞으로 이력이 잘린다', () => {
    let h = navigate(createHistory('never'), 'shopping')
    h = navigate(h, 'sns')
    h = goBack(h) // shopping
    h = navigate(h, 'bank')
    expect(h.entries).toEqual(['never', 'shopping', 'bank'])
    expect(canGoForward(h)).toBe(false)
  })

  it('같은 사이트를 다시 눌러도 이력이 늘지 않는다', () => {
    const h = navigate(createHistory('never'), 'shopping')
    const again = navigate(h, 'shopping')
    expect(again).toBe(h)
    expect(again.entries).toHaveLength(2)
  })

  it('경계에서 뒤로/앞으로를 눌러도 상태가 망가지지 않는다', () => {
    const home = createHistory('never')
    expect(goBack(home)).toBe(home)
    expect(goForward(home)).toBe(home)
  })

  it('원본을 변형하지 않는다 (systems 규칙)', () => {
    const h = createHistory('never')
    const moved = navigate(h, 'sns')
    expect(h.entries).toEqual(['never'])
    expect(h.index).toBe(0)
    expect(moved).not.toBe(h)
  })
})
