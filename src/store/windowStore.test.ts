import { describe, it, expect, beforeEach } from 'vitest'
import { useWindowStore } from './windowStore'
import { LAYERS } from '../data/layers'

const reset = () =>
  useWindowStore.setState({ windows: [], topZ: LAYERS.WINDOW_BASE })

/** 창 하나를 여는 최소 인자. */
const stub = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  title: id,
  icon: 'fluent-color:globe-24',
  x: 0,
  y: 0,
  width: 320,
  kind: 'stub' as const,
  message: '준비 중',
  ...extra,
})

const win = (id: string) => useWindowStore.getState().windows.find((w) => w.id === id)!

describe('windowStore 전체 화면 창', () => {
  beforeEach(reset)

  it('maximized 초기값이 창에 그대로 보존된다', () => {
    useWindowStore.getState().open(stub('browser', { maximized: true }))
    expect(win('browser').maximized).toBe(true)
  })

  it('플래그를 주지 않은 창은 전체 화면이 아니다', () => {
    useWindowStore.getState().open(stub('messenger'))
    expect(win('messenger').maximized).toBe(false)
  })

  it('전체 화면 창도 다른 창과 똑같이 z-order에 참여한다', () => {
    const s = useWindowStore.getState()
    s.open(stub('browser', { maximized: true }))
    s.open(stub('messenger'))
    expect(win('browser').zIndex).toBeLessThan(win('messenger').zIndex)
    useWindowStore.getState().focus('browser')
    expect(win('browser').zIndex).toBeGreaterThan(win('messenger').zIndex)
  })

  it('전체 화면 창도 close로 정상적으로 닫힌다', () => {
    useWindowStore.getState().open(stub('browser', { maximized: true }))
    useWindowStore.getState().close('browser')
    expect(useWindowStore.getState().windows).toHaveLength(0)
  })
})

describe('windowStore 최대화/복원 토글', () => {
  beforeEach(reset)

  it('최대화하면 maximized가 켜진다', () => {
    useWindowStore.getState().open(stub('messenger', { x: 140, y: 96 }))
    useWindowStore.getState().toggleMaximize('messenger')
    expect(win('messenger').maximized).toBe(true)
  })

  it('복원하면 최대화 이전 좌표·크기로 정확히 돌아온다 (0,0으로 튀지 않는다)', () => {
    useWindowStore.getState().open(stub('messenger', { x: 140, y: 96, width: 340 }))
    useWindowStore.getState().toggleMaximize('messenger')
    useWindowStore.getState().toggleMaximize('messenger')

    const w = win('messenger')
    expect(w.maximized).toBe(false)
    expect(w.x).toBe(140)
    expect(w.y).toBe(96)
    expect(w.width).toBe(340)
  })

  it('드래그로 옮긴 뒤 최대화하면 복원 좌표는 옮긴 위치다', () => {
    useWindowStore.getState().open(stub('messenger', { x: 140, y: 96 }))
    useWindowStore.getState().move('messenger', 400, 250)
    useWindowStore.getState().toggleMaximize('messenger')
    useWindowStore.getState().toggleMaximize('messenger')

    expect(win('messenger').x).toBe(400)
    expect(win('messenger').y).toBe(250)
  })

  it('최대화 상태로 열린 창도 복원하면 열 때의 좌표로 돌아온다', () => {
    // 인터넷 창은 전체 화면으로 열리지만 이제 복원할 수 있어야 한다.
    useWindowStore.getState().open(stub('browser', { x: 148, y: 108, width: 480, maximized: true }))
    expect(win('browser').maximized).toBe(true)

    useWindowStore.getState().toggleMaximize('browser')
    const w = win('browser')
    expect(w.maximized).toBe(false)
    expect(w.x).toBe(148)
    expect(w.y).toBe(108)
    expect(w.width).toBe(480)
  })

  it('토글을 여러 번 반복해도 복원 좌표가 흔들리지 않는다', () => {
    useWindowStore.getState().open(stub('messenger', { x: 140, y: 96 }))
    for (let i = 0; i < 3; i++) {
      useWindowStore.getState().toggleMaximize('messenger')
      useWindowStore.getState().toggleMaximize('messenger')
    }
    expect(win('messenger').x).toBe(140)
    expect(win('messenger').y).toBe(96)
    expect(win('messenger').maximized).toBe(false)
  })

  it('한 창을 최대화해도 다른 창은 영향받지 않는다', () => {
    const s = useWindowStore.getState()
    s.open(stub('messenger', { x: 140, y: 96 }))
    s.open(stub('browser', { x: 168, y: 124 }))
    useWindowStore.getState().toggleMaximize('messenger')

    expect(win('browser').maximized).toBe(false)
    expect(win('browser').x).toBe(168)
    expect(win('browser').y).toBe(124)
  })
})

describe('windowStore 최소화/복원', () => {
  beforeEach(reset)

  it('최소화해도 창은 목록에 남는다 (작업 표시줄 항목이 사라지면 안 된다)', () => {
    useWindowStore.getState().open(stub('messenger'))
    useWindowStore.getState().minimize('messenger')

    expect(useWindowStore.getState().windows).toHaveLength(1)
    expect(win('messenger').minimized).toBe(true)
  })

  it('새로 연 창은 최소화 상태가 아니다', () => {
    useWindowStore.getState().open(stub('messenger'))
    expect(win('messenger').minimized).toBe(false)
  })

  it('activate가 최소화된 창을 복원하고 앞으로 가져온다', () => {
    const s = useWindowStore.getState()
    s.open(stub('messenger'))
    s.open(stub('browser'))
    useWindowStore.getState().minimize('messenger')
    useWindowStore.getState().activate('messenger')

    expect(win('messenger').minimized).toBe(false)
    expect(win('messenger').zIndex).toBeGreaterThan(win('browser').zIndex)
  })

  it('최소화되지 않은 창의 activate는 앞으로 가져오기만 한다', () => {
    const s = useWindowStore.getState()
    s.open(stub('messenger'))
    s.open(stub('browser'))
    useWindowStore.getState().activate('messenger')

    expect(win('messenger').minimized).toBe(false)
    expect(win('messenger').zIndex).toBeGreaterThan(win('browser').zIndex)
  })

  it('최소화는 좌표와 최대화 상태를 건드리지 않는다', () => {
    useWindowStore.getState().open(stub('messenger', { x: 140, y: 96 }))
    useWindowStore.getState().toggleMaximize('messenger')
    useWindowStore.getState().minimize('messenger')

    const w = win('messenger')
    expect(w.maximized).toBe(true)
    expect(w.restore).toEqual({ x: 140, y: 96, width: 320 })
  })

  it('최소화된 창을 다시 열면(아이콘 더블클릭) 복원된다', () => {
    useWindowStore.getState().open(stub('messenger'))
    useWindowStore.getState().minimize('messenger')
    // open은 이미 열린 창이면 새로 열지 않고 activate로 넘긴다.
    useWindowStore.getState().open(stub('messenger'))

    expect(useWindowStore.getState().windows).toHaveLength(1)
    expect(win('messenger').minimized).toBe(false)
  })

  it('최소화된 창도 close로 닫힌다', () => {
    useWindowStore.getState().open(stub('messenger'))
    useWindowStore.getState().minimize('messenger')
    useWindowStore.getState().close('messenger')
    expect(useWindowStore.getState().windows).toHaveLength(0)
  })

  it('closeAll은 최소화된 창까지 전부 닫는다', () => {
    const s = useWindowStore.getState()
    s.open(stub('messenger'))
    s.open(stub('browser'))
    useWindowStore.getState().minimize('messenger')
    useWindowStore.getState().closeAll()
    expect(useWindowStore.getState().windows).toHaveLength(0)
  })
})

/**
 * 사이트 이동 요청.
 *
 * ⚠️ **탭 목록이 `BrowserApp`의 `useState`에 살기 때문에 이 채널이 존재한다.** 창을 여는
 * 것만으로는 목적지를 못 정하고(`open`은 이미 열린 창이면 앞으로 가져오기만 한다),
 * 요청을 남겨 두면 창을 새로 열 때마다 그 사이트로 끌려간다. 그래서 **소비하고 비운다**.
 */
describe('windowStore 사이트 이동 요청', () => {
  beforeEach(() => useWindowStore.setState({ windows: [], topZ: LAYERS.WINDOW_BASE, pendingSite: null }))

  it('브라우저 창을 열면서 목적지를 함께 남긴다', () => {
    useWindowStore.getState().openSite('adobe')
    expect(win('browser-browser').kind).toBe('browser')
    expect(useWindowStore.getState().pendingSite).toBe('adobe')
  })

  it('브라우저가 이미 열려 있어도 창을 늘리지 않고 목적지만 바꾼다', () => {
    useWindowStore.getState().openSite('adobe')
    useWindowStore.getState().clearPendingSite()
    useWindowStore.getState().openSite('gmong')
    expect(useWindowStore.getState().windows.filter((w) => w.kind === 'browser')).toHaveLength(1)
    expect(useWindowStore.getState().pendingSite).toBe('gmong')
  })

  it('같은 사이트를 두 번 눌러도 요청이 다시 선다 — 비운 뒤라야 효과가 다시 난다', () => {
    useWindowStore.getState().openSite('adobe')
    useWindowStore.getState().clearPendingSite()
    expect(useWindowStore.getState().pendingSite).toBeNull()
    useWindowStore.getState().openSite('adobe')
    expect(useWindowStore.getState().pendingSite).toBe('adobe')
  })
})
