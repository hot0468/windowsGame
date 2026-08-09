import { describe, expect, it } from 'vitest'
import { GIGS } from './gigs'
import { SCRATCH, VS_PROJECTS, projectFor } from './vscode'

/**
 * ⚠️ **연출이 깨뜨릴 수 있는 것만 덮는다.** 이 축은 턴·돈·업무량을 하나도 안 만들므로
 * 규칙을 뒤집는 증명은 필요 없다 — 화면이 없는 파일을 열거나 빈 목록을 그리는 것만 막는다.
 */
describe('VS 코드 창이 그릴 것', () => {
  const all = [SCRATCH, ...Object.values(VS_PROJECTS)]

  it('열린 파일은 반드시 목록에 있다 — 없으면 탐색기에 없는 탭이 뜬다', () => {
    for (const p of all) {
      expect(p.files.map((f) => f.name), p.folder).toContain(p.open)
    }
  })

  it('파일과 코드가 비어 있지 않다', () => {
    for (const p of all) {
      expect(p.files.length, p.folder).toBeGreaterThan(0)
      expect(p.code.length, p.folder).toBeGreaterThan(0)
    }
  })

  it('⚠️ VS 코드 일감은 빠짐없이 자기 화면을 갖는다 — 없으면 남의 코드가 뜬다', () => {
    for (const gig of GIGS.filter((g) => g.tool === 'vscode')) {
      expect(VS_PROJECTS[gig.id], `${gig.id}의 화면이 없다`).toBeDefined()
    }
  })

  it('모르는 일감과 일감 없음은 연습 폴더로 떨어진다', () => {
    expect(projectFor(undefined)).toBe(SCRATCH)
    expect(projectFor('없는-일감')).toBe(SCRATCH)
  })

  it('일감마다 폴더 이름이 다르다 — 같으면 두 일이 한 화면이 된다', () => {
    const folders = all.map((p) => p.folder)
    expect(new Set(folders).size).toBe(folders.length)
  })
})
