import { describe, it, expect } from 'vitest'
import { DESKTOP_ITEMS } from './desktopItems'
import { ACTIVITIES, findActivity } from './activities'

describe('바탕화면 항목', () => {
  it('onDesktop 활동이 빠짐없이 항목으로 올라간다', () => {
    const onDesktopIds = ACTIVITIES.filter((a) => a.onDesktop).map((a) => a.id)
    const exeIds = DESKTOP_ITEMS.filter((i) => i.kind === 'exe').map((i) => i.activityId)
    expect(exeIds.sort()).toEqual(onDesktopIds.sort())
  })

  it('exe 항목의 activityId는 실제 활동을 가리킨다', () => {
    for (const item of DESKTOP_ITEMS.filter((i) => i.kind === 'exe')) {
      expect(item.activityId).toBeDefined()
      expect(findActivity(item.activityId!)).toBeDefined()
    }
  })

  it('id가 중복되지 않는다 (창 id 충돌 방지)', () => {
    const ids = DESKTOP_ITEMS.map((i) => `${i.kind}-${i.id}`)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('브라우저는 활동이 아니다 — 가짜 활동으로 등록되지 않았다', () => {
    const browser = DESKTOP_ITEMS.find((i) => i.id === 'browser')
    expect(browser).toBeDefined()
    expect(browser!.kind).toBe('stub')
    expect(browser!.activityId).toBeUndefined()
    // 활동 목록에 browser가 섞이면 번아웃 이력·엔딩 판정에 없는 id가 들어간다.
    expect(findActivity('browser')).toBeUndefined()
  })

  it('stub 항목은 안내 문구를 갖는다 (빈 창 방지)', () => {
    for (const item of DESKTOP_ITEMS.filter((i) => i.kind === 'stub')) {
      expect(item.stubMessage && item.stubMessage.length).toBeGreaterThan(0)
    }
  })

  it('모든 항목이 아이콘 이름과 창 폭을 갖는다', () => {
    for (const item of DESKTOP_ITEMS) {
      expect(item.icon).toMatch(/^[a-z0-9-]+:[a-z0-9-]+$/)
      expect(item.width).toBeGreaterThan(0)
    }
  })
})
