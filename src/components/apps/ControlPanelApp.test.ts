import { describe, expect, it } from 'vitest'
import { installNote, installedPrograms } from './ControlPanelApp'
import { desktopEntries } from '../../data/desktopItems'

/**
 * ⚠️ **제어판 목록이 지키는 것은 하나다: 여기 있는 것은 전부 "설치된 프로그램"이다.**
 *
 * 목록을 바탕화면과 같은 출처에서 파생시키는 이유가 그것이라, 거르는 조건이 낡으면
 * 폴더·활동 창이 "제거할 수 있는 프로그램"처럼 줄에 선다. 지우는 손이 닿는 목록이므로
 * 무엇이 실리는지를 못 박아 둔다.
 */
describe('설치된 프로그램 목록', () => {
  const entriesWith = (subs: string[] = [], items: string[] = []) =>
    desktopEntries([], items, false, subs)

  it('폴더·활동 창·시스템 창은 프로그램이 아니다', () => {
    const kinds = installedPrograms(entriesWith()).map((p) => p.kind)
    expect(kinds).not.toContain('folder')
    expect(kinds).not.toContain('excel')
    expect(kinds).not.toContain('exe')
    expect(kinds).not.toContain('settings')
    expect(kinds).not.toContain('controlpanel')
  })

  it('구독을 끊으면 그 프로그램은 목록에서 사라진다 — 아이콘과 같은 판정이다', () => {
    const off = installedPrograms(entriesWith()).map((p) => p.id)
    const on = installedPrograms(entriesWith(['adobe'])).map((p) => p.id)
    expect(off).not.toContain('photoshop')
    expect(on).toEqual(expect.arrayContaining(['photoshop', 'premiere', 'audition']))
  })

  /* ⚠️ [제거]가 붙는 기준이 곧 `requiresSubscription`이다 — 이 줄이 뒤집히면
     되돌릴 수 없는(가입비를 다시 내야 하는) 버튼이 엉뚱한 프로그램에 붙는다. */
  it('제거할 수 있는 것은 구독이 깐 것뿐이다', () => {
    const programs = installedPrograms(entriesWith(['adobe'], ['pen-tablet']))
    const removable = programs.filter((p) => p.requiresSubscription).map((p) => p.id)
    expect(removable).toEqual(['photoshop', 'premiere', 'audition'])
    expect(installNote(programs.find((p) => p.id === 'clipstudio')!)).toContain('장비')
  })
})
