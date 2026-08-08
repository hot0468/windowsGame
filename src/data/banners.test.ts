import { describe, expect, it } from 'vitest'
import { BANNERS, bannersFor } from './banners'
import { findSite } from './sites'

/**
 * 배너 (2026-08-08 이동용 배너 신설).
 *
 * ⚠️ 배너는 셋 중 하나다: **광고**(누르면 보상) / **이동용**(누르면 그 사이트로) / **공지**.
 * 이 파일이 막는 사고 둘:
 *  ① **한 배너가 보상과 이동을 겸하는 것** — "이 배너는 무엇인가"가 두 가지가 되고,
 *    하루 한 번이라는 보상 상한이 이동 때문에 소모된다.
 *  ② **갈 데 없는 링크** — `siteId` 오타 하나가 눌러도 아무 일 없는 배너를 만든다.
 */
describe('배너', () => {
  it('id가 겹치지 않는다', () => {
    const ids = BANNERS.map((b) => b.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('⚠️ 보상과 이동을 겸하는 배너는 없다', () => {
    for (const b of BANNERS) {
      expect(b.reward === true && b.siteId !== undefined, `${b.id}가 광고이면서 이동용이다`).toBe(
        false,
      )
    }
  })

  it('⚠️ 이동용 배너의 siteId는 실제 사이트다 (죽은 링크 방지)', () => {
    for (const b of BANNERS) {
      if (b.siteId) expect(findSite(b.siteId), `${b.id}의 siteId '${b.siteId}'`).toBeDefined()
    }
  })

  it('가로 띠는 이동용 배너 둘이다 — 이 자리는 광고가 아니라 두 사이트의 입구다', () => {
    const wide = bannersFor('wide')
    expect(wide.map((b) => b.siteId)).toEqual(['farsea', 'no24'])
    for (const b of wide) expect(b.reward).toBeUndefined()
  })

  it('옆 배너존은 여전히 광고다 — 보상 경로가 사라지면 안 된다', () => {
    const side = bannersFor('side')
    expect(side.some((b) => b.reward === true)).toBe(true)
    for (const b of side) expect(b.siteId).toBeUndefined()
  })

  it('자리를 합치면 배너 전체가 된다 — 어떤 배너도 화면에서 사라지지 않는다', () => {
    const shown = [...bannersFor('side'), ...bannersFor('wide')].map((b) => b.id)
    expect(shown.sort()).toEqual(BANNERS.map((b) => b.id).sort())
  })

  it('모든 배너가 그라데이션과 문구를 갖는다 (빈 판 방지)', () => {
    for (const b of BANNERS) {
      expect(b.gradient).toMatch(/gradient/)
      expect(b.brand.length).toBeGreaterThan(0)
      expect(b.headline.length).toBeGreaterThan(0)
    }
  })
})
