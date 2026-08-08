import { describe, it, expect } from 'vitest'
import { isOutdoor, weatherEfficiency, weatherOf } from './weather'
import { OUTDOOR_ACTIVITY_IDS, SNOW_MONTHS, WEATHERS } from '../data/weather'
import { dateOf } from '../data/calendar'
import { ACTIVITIES } from '../data/activities'
import { weekendCallOn } from './drive'
import { CAREERS } from '../data/careers'

/**
 * ⚠️ **날씨가 깨뜨릴 수 있는 것만 덮는다.** 계수가 활동 결과에 곱해지므로 결정성과
 * 보정 범위에는 증명을 붙이고, 나머지는 회귀 수준으로 둔다.
 */

const DAYS = Array.from({ length: 400 }, (_, i) => i + 1)

describe('날씨는 날짜의 순수 함수다', () => {
  it('같은 날은 늘 같고 날짜가 바뀌면 갈린다', () => {
    expect(weatherOf(12).id).toBe(weatherOf(12).id)
    expect(new Set(DAYS.slice(0, 30).map((d) => weatherOf(d).id)).size).toBeGreaterThan(1)
  })

  it('네 종류가 전부 실제로 나온다 — 나오지 않는 날씨는 죽은 데이터다', () => {
    const seen = new Set(DAYS.map((d) => weatherOf(d).id))
    for (const id of Object.keys(WEATHERS)) expect(seen, id).toContain(id)
  })

  it('⚠️ 눈은 겨울에만 오고, 겨울에 비는 오지 않는다', () => {
    for (const day of DAYS) {
      const month = dateOf(day).getMonth() + 1
      const id = weatherOf(day).id
      if (id === 'snow') expect(SNOW_MONTHS, `${day}일차`).toContain(month)
      if (id === 'rain') expect(SNOW_MONTHS, `${day}일차`).not.toContain(month)
    }
  })

  it('⚠️ 주말 호출과 같은 날에 몰리지 않는다 — 두 굴림이 같은 상수를 쓰면 한 기능처럼 읽힌다', () => {
    // 대기업(주말 확률 65%)으로 재 본다. 상관계수가 아니라 **완전 일치가 아님**만 본다.
    const big = CAREERS[CAREERS.length - 1].id
    const rainyWeekendCalls = DAYS.filter((d) => weekendCallOn(d, big) && weatherOf(d).id === 'rain')
    const rainyWeekendQuiet = DAYS.filter(
      (d) => !weekendCallOn(d, big) && weatherOf(d).id === 'rain',
    )
    expect(rainyWeekendCalls.length).toBeGreaterThan(0)
    expect(rainyWeekendQuiet.length).toBeGreaterThan(0)
  })
})

describe('보정', () => {
  it('야외 목록이 실재하는 활동을 가리킨다', () => {
    const ids = new Set(ACTIVITIES.map((a) => a.id))
    for (const id of OUTDOOR_ACTIVITY_IDS) expect(ids, id).toContain(id)
  })

  it('⚠️ 출근은 야외가 아니다 — 결근·해고 압박과 곱해지면 밸런스가 흔들린다', () => {
    expect(isOutdoor('commute')).toBe(false)
  })

  it('실내 활동은 어떤 날에도 계수가 1이다', () => {
    for (const day of DAYS.slice(0, 60)) expect(weatherEfficiency(day, 'study')).toBe(1)
  })

  it('⚠️ 보정폭이 ±15%를 넘지 않는다 — 판이 날씨 운으로 흔들리면 안 된다', () => {
    for (const w of Object.values(WEATHERS)) {
      // 부동소수 오차(1 − 0.85 = 0.15000000000000002)를 피해 백분율로 잰다.
      expect(Math.round(Math.abs(w.outdoorEfficiency - 1) * 100), w.id).toBeLessThanOrEqual(15)
    }
  })

  it('맑은 날이 절반을 넘는다 — 기본이 페널티면 날씨는 규칙이 아니라 세금이다', () => {
    const clear = DAYS.filter((d) => weatherOf(d).id === 'clear').length
    expect(clear / DAYS.length).toBeGreaterThan(0.5)
  })
})
