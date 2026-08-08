import { describe, it, expect } from 'vitest'
import { DESKTOP_ITEMS } from './desktopItems'
import { ACTIVITIES, findActivity } from './activities'
import { SHELL } from './shell'

describe('바탕화면 항목', () => {
  it('onDesktop 활동이 빠짐없이 항목으로 올라간다', () => {
    const onDesktopIds = ACTIVITIES.filter((a) => a.onDesktop).map((a) => a.id)
    const exeIds = DESKTOP_ITEMS.filter((i) => i.kind === 'exe').map((i) => i.activityId)
    // ⚠️ 예전에는 **같은 집합**이었지만 이제 `exe` 항목이 둘로 갈린다:
    //    ①`onDesktop`에서 파생된 항상 보이는 것 ②`requiresItem`으로 잠긴 조건부 것.
    //    그래서 등호가 아니라 포함 관계다 — `onDesktop` 활동은 여전히 하나도 안 빠진다.
    for (const id of onDesktopIds) expect(exeIds).toContain(id)
  })

  it('onDesktop에서 안 온 exe 항목은 반드시 조건부다', () => {
    // ⚠️ 이 단언이 위 등호를 대신한다. 조건 없이 손으로 얹은 `exe` 항목은
    // "누르면 잠금 사유만 적는 죽은 아이콘"이 되므로 만들면 안 된다.
    const onDesktopIds = ACTIVITIES.filter((a) => a.onDesktop).map((a) => a.id)
    const extra = DESKTOP_ITEMS.filter(
      (i) => i.kind === 'exe' && !onDesktopIds.includes(i.activityId!),
    )
    for (const item of extra) {
      expect(item.requiresItem, `${item.id}이 조건 없이 얹혀 있다`).toBeTruthy()
    }
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
    // stub으로 먼저 올렸다가 구현되면서 전용 kind로 바뀌었다.
    expect(browser!.kind).toBe('browser')
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

  it('브라우저는 전체 화면 상태로 열리도록 데이터에서 선언한다', () => {
    const browser = DESKTOP_ITEMS.find((i) => i.id === 'browser')
    expect(browser!.openMaximized).toBe(true)
  })

  it('전체 화면으로 여는 항목도 복원용 폭을 갖는다', () => {
    // openMaximized는 초기 상태일 뿐이라 플레이어가 복원할 수 있다.
    // 그때 width가 0이면 창이 사라져 보이므로 반드시 의미 있는 값이어야 한다.
    for (const item of DESKTOP_ITEMS.filter((i) => i.openMaximized)) {
      expect(item.width).toBeGreaterThan(0)
    }
  })

  it('전체 화면 열기는 옵트인이다 — 나머지 항목은 기존 플로팅 동작을 유지한다', () => {
    for (const item of DESKTOP_ITEMS.filter((i) => i.id !== 'browser')) {
      expect(item.openMaximized).toBeFalsy()
    }
  })
})

describe('셸 레이아웃 수치', () => {
  it('작업 표시줄 높이는 CSS(.taskbar height)와 같은 44px다', () => {
    // Desktop.css의 .taskbar height / .desktop-icons height와 짝이다. 함께 바꿔야 한다.
    expect(SHELL.TASKBAR_HEIGHT).toBe(44)
  })

  it('타이틀 바가 작업 표시줄에 완전히 가려지지 않도록 두 값 모두 양수다', () => {
    expect(SHELL.TITLE_BAR_HEIGHT).toBeGreaterThan(0)
    expect(SHELL.TASKBAR_HEIGHT).toBeGreaterThan(0)
  })
})
