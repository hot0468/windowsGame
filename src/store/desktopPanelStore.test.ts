import { describe, it, expect, beforeEach } from 'vitest'
import { useDesktopPanelStore } from './desktopPanelStore'
import { useWindowStore } from './windowStore'
import { LAYERS } from '../data/layers'

const panelZ = () => useDesktopPanelStore.getState().z
const raise = (id: 'stats' | 'calendar') => useDesktopPanelStore.getState().raise(id)

/** 테스트용 창을 열고 그 z를 돌려준다. */
function openWindow(id: string): number {
  useWindowStore.getState().open({
    id,
    title: id,
    // 아이콘 이름은 이 테스트의 관심사가 아니지만, 서브셋 생성기가 src/ 전체를 훑으므로
    // 실제로 앱이 쓰는 이름을 써야 픽스처 하나 때문에 아이콘 세트가 통째로 번들에 들어오지 않는다.
    icon: 'devicon:chrome',
    x: 0,
    y: 0,
    width: 300,
    kind: 'stub',
    message: '테스트',
  })
  return useWindowStore.getState().windows.find((w) => w.id === id)!.zIndex
}

beforeEach(() => {
  useDesktopPanelStore.getState().resetAll()
  useWindowStore.setState({ windows: [], topZ: LAYERS.WINDOW_BASE })
})

describe('레이어 상수 순서', () => {
  it('아이콘 < 바탕화면 패널 < 일반 창 < 올린 패널 < 작업 표시줄 < 엔딩 순이다', () => {
    expect(LAYERS.DESKTOP_ICON).toBeLessThan(LAYERS.DESKTOP_PANEL)
    expect(LAYERS.DESKTOP_PANEL).toBeLessThan(LAYERS.WINDOW_BASE)
    expect(LAYERS.WINDOW_BASE).toBeLessThan(LAYERS.DESKTOP_PANEL_RAISED)
    expect(LAYERS.DESKTOP_PANEL_RAISED).toBeLessThan(LAYERS.TASKBAR)
    expect(LAYERS.TASKBAR).toBeLessThan(LAYERS.ENDING)
  })
})

describe('바탕화면 패널 기본 z', () => {
  it('스탯창과 날짜칸은 바탕화면 레벨에서 시작한다', () => {
    expect(panelZ().stats).toBe(LAYERS.DESKTOP_PANEL)
    expect(panelZ().calendar).toBe(LAYERS.DESKTOP_PANEL)
  })

  it('일반 창은 바탕화면 패널을 덮는다 (설계 의도: 패널은 가려져야 한다)', () => {
    const z = openWindow('exe-social')
    expect(z).toBeGreaterThan(panelZ().stats)
    expect(z).toBeGreaterThan(panelZ().calendar)
  })

  it('바탕화면 패널은 바탕화면 아이콘보다 위다', () => {
    expect(panelZ().stats).toBeGreaterThan(LAYERS.DESKTOP_ICON)
  })
})

describe('raise — 작업 표시줄 버튼 동작', () => {
  it('겹쳐 있던 일반 창 위로 실제로 올라온다', () => {
    const z = openWindow('exe-social')
    expect(panelZ().stats).toBeLessThan(z)
    raise('stats')
    expect(panelZ().stats).toBeGreaterThan(z)
  })

  it('창을 여러 번 열고 포커스해도 올린 패널이 여전히 위다', () => {
    raise('stats')
    for (let i = 0; i < 50; i += 1) openWindow(`w-${i}`)
    const top = Math.max(...useWindowStore.getState().windows.map((w) => w.zIndex))
    expect(panelZ().stats).toBeGreaterThan(top)
  })

  it('나중에 올린 패널이 먼저 올린 패널보다 위로 온다', () => {
    raise('stats')
    raise('calendar')
    expect(panelZ().calendar).toBeGreaterThan(panelZ().stats)
    raise('stats')
    expect(panelZ().stats).toBeGreaterThan(panelZ().calendar)
  })

  it('올린 패널도 작업 표시줄과 엔딩 모달보다는 아래에 있다', () => {
    raise('stats')
    raise('calendar')
    raise('stats')
    expect(panelZ().stats).toBeLessThan(LAYERS.TASKBAR)
    expect(panelZ().calendar).toBeLessThan(LAYERS.TASKBAR)
    expect(LAYERS.TASKBAR).toBeLessThan(LAYERS.ENDING)
  })

  it('resetAll은 두 패널을 바탕화면 레벨로 되돌린다', () => {
    raise('stats')
    raise('calendar')
    useDesktopPanelStore.getState().resetAll()
    expect(panelZ().stats).toBe(LAYERS.DESKTOP_PANEL)
    expect(panelZ().calendar).toBe(LAYERS.DESKTOP_PANEL)
  })
})
