import { describe, it, expect } from 'vitest'
import { SEASONS, seasonOf } from '../data/season'
import { daysLeftInSeason, isSeasonStart, nextSeasonStart } from './season'
import { dateOf } from '../data/calendar'

/*
 * ⚠️ **계절은 저장하지 않는다** — 날짜의 순수 함수다(날씨·행사 개최와 같은 규칙).
 * 여기가 지키는 것: ①달력이 적는 달과 계절이 어긋나지 않는다 ②되돌아온다(1년 주기).
 */
describe('계절', () => {
  it('1일차는 봄이다 — 달력이 3월 1일에 시작한다', () => {
    expect(seasonOf(1).id).toBe('spring')
  })

  it('달력의 달과 어긋나지 않는다', () => {
    for (let day = 1; day <= 400; day++) {
      const month = dateOf(day).getMonth() + 1
      expect(seasonOf(day).months).toContain(month)
    }
  })

  it('네 계절이 1년 안에 모두 돌아온다', () => {
    const seen = new Set(Array.from({ length: 365 }, (_, i) => seasonOf(i + 1).id))
    expect(seen.size).toBe(SEASONS.length)
  })

  it('계절 첫날은 어제와 계절이 다른 날뿐이다', () => {
    let starts = 0
    /* 1일차가 봄의 첫날이므로 그 다음 전환은 여름·가을·겨울, 그리고 366일차의 봄이다. */
    for (let day = 2; day <= 366; day++) {
      if (isSeasonStart(day)) {
        starts++
        expect(seasonOf(day).id).not.toBe(seasonOf(day - 1).id)
      }
    }
    expect(starts).toBe(4)
  })

  it('남은 날만큼 뒤에 실제로 계절이 바뀐다', () => {
    for (const day of [1, 40, 100, 200, 300]) {
      const left = daysLeftInSeason(day)
      expect(seasonOf(day + left).id).not.toBe(seasonOf(day).id)
      expect(seasonOf(day + left - 1).id).toBe(seasonOf(day).id)
    }
  })

  it('다음 그 계절의 첫날을 알려 준다 — "내년 여름까지 기다린다"를 적을 수 있어야 한다', () => {
    for (const s of SEASONS) {
      const start = nextSeasonStart(1, s.id)
      expect(seasonOf(start).id).toBe(s.id)
      expect(isSeasonStart(start)).toBe(true)
    }
  })
})
