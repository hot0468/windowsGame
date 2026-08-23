import { describe, it, expect } from 'vitest'
import { ADOBE_APPS, DOC_NAMES, adobeGigIds, docFor, findAdobeApp } from './adobeApps'
import { findActivity } from './activities'
import { DESKTOP_ITEMS } from './desktopItems'
import { GIGS } from './gigs'

/**
 * ⚠️ **이 파일은 프로그램 창이 깨뜨릴 수 있는 것만 덮는다.** 화면 문구·색은 연출이라
 * 테스트하지 않고, **화면이 아무것도 못 그리게 되는 연결**만 못 박는다.
 */
describe('어도비 프로그램 창', () => {
  it('세 프로그램이 실재하는 활동을 가리킨다', () => {
    // 없는 id를 가리키면 창이 ▶ 없이 열려 아무것도 할 수 없는 껍데기가 된다.
    for (const app of ADOBE_APPS) {
      expect(findActivity(app.activityId), app.id).toBeDefined()
    }
  })

  it('바탕화면 항목의 kind가 프로그램 id와 같다', () => {
    /* `appForWindow`가 `w.kind`를 그대로 `program`으로 넘긴다 — 둘이 어긋나면
       창은 열리는데 `findAdobeApp`이 못 찾아 **빈 창**이 뜬다. */
    for (const app of ADOBE_APPS) {
      const item = DESKTOP_ITEMS.find((i) => i.id === app.id)
      expect(item, app.id).toBeDefined()
      expect(item!.kind).toBe(app.id)
      expect(findAdobeApp(item!.kind)).toBeDefined()
    }
  })

  it('⚠️ 어도비 일감 전부에 문서 이름이 있다', () => {
    /* 빠지면 그 일을 받은 동안 빈 문서 이름이 떠서 **다른 일감이 같은 화면**이 된다
       — 창을 만든 이유가 사라지는 자리라 여기서 막는다. */
    for (const gigId of adobeGigIds()) {
      expect(DOC_NAMES[gigId], gigId).toBeDefined()
    }
  })

  it('문서 이름은 일감마다 다르다', () => {
    const names = Object.values(DOC_NAMES)
    expect(new Set(names).size).toBe(names.length)
  })

  it('받아 둔 일이 없으면 빈 문서를 연다 — 프로그램은 일이 없어도 열린다', () => {
    const ps = findAdobeApp('photoshop')!
    expect(docFor(ps, undefined)).toBe(ps.scratch)
    // 다른 도구의 일감을 받아 둔 경우도 마찬가지다(그 일은 이 프로그램에서 못 한다).
    const other = GIGS.find((g) => g.tool === 'vscode')!
    expect(docFor(ps, other.id)).toBe(ps.scratch)
  })
})
