import { describe, it, expect, beforeEach } from 'vitest'
import { resolveShell, shellForWidth } from './shell'
import { MOBILE_SHELL } from '../data/shell'
import { useShellStore } from '../store/shellStore'

const MAX = MOBILE_SHELL.MOBILE_MAX_WIDTH

describe('셸 폭 판정', () => {
  it('임계값 **이하**는 모바일이다 (경계 포함)', () => {
    expect(shellForWidth(MAX)).toBe('mobile')
    expect(shellForWidth(MAX - 1)).toBe('mobile')
    expect(shellForWidth(375)).toBe('mobile')
  })

  it('임계값을 1px이라도 넘으면 데스크톱이다', () => {
    expect(shellForWidth(MAX + 1)).toBe('desktop')
    expect(shellForWidth(1280)).toBe('desktop')
  })
})

describe('셸 수동 지정', () => {
  it('override가 폭을 이긴다 — 양방향으로', () => {
    // 넓은 화면에서 폰 모드
    expect(resolveShell(1280, 'mobile')).toBe('mobile')
    // 좁은 화면에서 바탕화면
    expect(resolveShell(375, 'desktop')).toBe('desktop')
  })

  it('override가 null이면 폭 판정으로 돌아온다', () => {
    expect(resolveShell(1280, null)).toBe('desktop')
    expect(resolveShell(375, null)).toBe('mobile')
  })
})

describe('shellStore', () => {
  beforeEach(() => useShellStore.setState({ override: null }))

  it('기본값은 자동(null)이다 — 아무것도 안 하면 폭이 정한다', () => {
    expect(useShellStore.getState().override).toBeNull()
  })

  it('setOverride → clearOverride로 자동 판정에 복귀한다', () => {
    useShellStore.getState().setOverride('mobile')
    expect(resolveShell(1280, useShellStore.getState().override)).toBe('mobile')

    useShellStore.getState().clearOverride()
    expect(useShellStore.getState().override).toBeNull()
    expect(resolveShell(1280, useShellStore.getState().override)).toBe('desktop')
  })

  it('두 셸 사이를 오갈 수 있다 — 한쪽에 갇히지 않는다', () => {
    useShellStore.getState().setOverride('mobile')
    useShellStore.getState().setOverride('desktop')
    expect(useShellStore.getState().override).toBe('desktop')
  })
})
