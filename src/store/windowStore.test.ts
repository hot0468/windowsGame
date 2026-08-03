import { describe, it, expect, beforeEach } from 'vitest'
import { useWindowStore } from './windowStore'
import { LAYERS } from '../data/layers'

const reset = () =>
  useWindowStore.setState({ windows: [], topZ: LAYERS.WINDOW_BASE })

/** 창 하나를 여는 최소 인자. */
const stub = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  title: id,
  icon: 'fluent-emoji-flat:globe-with-meridians',
  x: 0,
  y: 0,
  width: 320,
  kind: 'stub' as const,
  message: '준비 중',
  ...extra,
})

describe('windowStore 전체 화면 창', () => {
  beforeEach(reset)

  it('maximized 플래그가 창에 그대로 보존된다', () => {
    useWindowStore.getState().open(stub('browser', { maximized: true }))
    expect(useWindowStore.getState().windows[0].maximized).toBe(true)
  })

  it('플래그를 주지 않은 창은 전체 화면이 아니다', () => {
    useWindowStore.getState().open(stub('messenger'))
    expect(useWindowStore.getState().windows[0].maximized).toBeFalsy()
  })

  it('전체 화면 창도 다른 창과 똑같이 z-order에 참여한다', () => {
    const s = useWindowStore.getState()
    s.open(stub('browser', { maximized: true }))
    s.open(stub('messenger'))
    const front = () => useWindowStore.getState().windows.find((w) => w.id === 'browser')!
    const back = () => useWindowStore.getState().windows.find((w) => w.id === 'messenger')!
    expect(front().zIndex).toBeLessThan(back().zIndex)
    useWindowStore.getState().focus('browser')
    expect(front().zIndex).toBeGreaterThan(back().zIndex)
  })

  it('전체 화면 창도 close로 정상적으로 닫힌다', () => {
    useWindowStore.getState().open(stub('browser', { maximized: true }))
    useWindowStore.getState().close('browser')
    expect(useWindowStore.getState().windows).toHaveLength(0)
  })
})
