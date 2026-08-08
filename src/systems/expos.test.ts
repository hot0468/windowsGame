import { describe, it, expect } from 'vitest'
import {
  awardShortfalls,
  canJoin,
  canVisit,
  joinBlockers,
  joinExpo,
  visitBlockers,
  visitExpo,
  willAward,
} from './expos'
import { EXPOS, daysUntilOpen, findExpo, isOpen, openDayOf, openExpos } from '../data/expos'
import { createProject, drawIntoProject, openProjects } from './projects'
import { createInitialState } from './turn'
import { ACTIVITIES, findActivity } from '../data/activities'
import { findSite } from '../data/sites'
import { MIN_BOOK_PAGES } from '../data/contests'
import type { Expo } from '../data/expos'
import type { GameState } from '../types/game'

/**
 * ⚠️ **이 파일은 행사가 깨뜨릴 수 있는 것만 덮는다.** 행사는 **돈을 만들지 않고 쓰기만**
 * 하므로 "판은 반드시 끝난다" 쪽 증명은 없다 — 대신 **반쪽 상태 금지**(돈만 나가고 턴은
 * 안 가는)와 **개최 판정의 결정성**에 무게를 둔다.
 */

/** 그 행사가 열려 있는 첫날. 개최 판정을 쓰는 테스트가 날짜를 손으로 안 세게 한다. */
function openDayFor(expo: Expo): number {
  for (let d = 1; d <= expo.cycle * 2 + 2; d++) if (isOpen(expo, d)) return d
  throw new Error(`${expo.id}가 한 주기 안에 한 번도 안 열린다`)
}

/** 그 행사가 닫혀 있는 첫날. */
function shutDayFor(expo: Expo): number {
  for (let d = 1; d <= expo.cycle * 2 + 2; d++) if (!isOpen(expo, d)) return d
  throw new Error(`${expo.id}가 한 번도 안 닫힌다`)
}

function ready(day = 1): GameState {
  const base = createInitialState('구경꾼')
  return {
    ...base,
    day,
    stats: { ...base.stats, money: 900_000, stamina: 200 },
  }
}

/* ⚠️ **부스를 콕 집어 고른다.** 예전에는 "참여 활동이 있는 첫 행사"였는데, 대회
   (`expo-compete`)가 목록 앞에 들어오면서 그 선택자가 대회를 집었다 — 대회는 참가만으로는
   평판을 안 주므로(수상이 준다) 아래 단언의 뜻이 조용히 뒤집혔다. */
const BOOTH = EXPOS.find((e) => e.join?.activityId === 'expo-booth')!
const SITE_JOIN = EXPOS.find((e) => e.join?.siteId)!
const VISIT_ONLY = EXPOS.find((e) => !e.join)!

describe('개최 판정', () => {
  it('⚠️ 날짜의 순수 함수다 — 같은 날은 언제 물어도 같은 답이다', () => {
    for (const e of EXPOS) {
      for (const d of [1, 7, 30, 88]) expect(isOpen(e, d)).toBe(isOpen(e, d))
    }
  })

  it('한 주기 안에 반드시 한 번 열리고 한 번 닫힌다', () => {
    for (const e of EXPOS) {
      const days = Array.from({ length: e.cycle }, (_, i) => isOpen(e, i + 1))
      expect(days.filter(Boolean).length, `${e.id}의 개최일 수`).toBe(e.openDays)
      expect(days.some((x) => !x), `${e.id}가 계속 열려 있다`).toBe(true)
    }
  })

  it('열려 있으면 남은 날이 0이고 며칠째인지 나온다', () => {
    for (const e of EXPOS) {
      const d = openDayFor(e)
      expect(daysUntilOpen(e, d)).toBe(0)
      expect(openDayOf(e, d)).toBeGreaterThanOrEqual(1)
      expect(openDayOf(e, d)!).toBeLessThanOrEqual(e.openDays)
    }
  })

  it('닫혀 있으면 남은 날만큼 뒤에 실제로 열린다', () => {
    for (const e of EXPOS) {
      const d = shutDayFor(e)
      expect(openDayOf(e, d)).toBeUndefined()
      const left = daysUntilOpen(e, d)
      expect(left).toBeGreaterThan(0)
      expect(isOpen(e, d + left), `${e.id}: ${left}일 뒤에 안 열린다`).toBe(true)
    }
  })

  it('⚠️ 오프셋이 흩어져 있다 — 목록이 "전부 열림 / 전부 닫힘" 두 상태만 오가지 않는다', () => {
    const mixed = Array.from({ length: 40 }, (_, i) => openExpos(i + 1).length)
    expect(new Set(mixed).size).toBeGreaterThan(1)
    expect(Math.max(...mixed)).toBeLessThan(EXPOS.length)
  })
})

describe('참관', () => {
  it('⚠️ 1턴이 가고 입장료가 나간다', () => {
    const day = openDayFor(VISIT_ONLY)
    const s = ready(day)
    const after = visitExpo(s, VISIT_ONLY.id)
    expect(after).not.toBe(s)
    expect(after.slot).not.toBe(s.slot)
    // 활동 자체는 돈을 안 만지므로 차액이 곧 입장료다.
    expect(s.stats.money - after.stats.money).toBe(VISIT_ONLY.fee)
  })

  it('⚠️ 안 열린 날에는 아무 일도 없다 (반쪽 상태 금지)', () => {
    const s = ready(shutDayFor(VISIT_ONLY))
    expect(canVisit(s, VISIT_ONLY)).toBe(false)
    expect(visitBlockers(s, VISIT_ONLY)).toContain('오늘은 열리지 않는 행사입니다')
    expect(visitExpo(s, VISIT_ONLY.id)).toBe(s)
  })

  it('입장료가 모자라면 못 가고 사유가 나온다', () => {
    const paid = EXPOS.find((e) => e.fee > 0)!
    const s = { ...ready(openDayFor(paid)), stats: { ...ready().stats, money: paid.fee } }
    expect(canVisit(s, paid)).toBe(false)
    expect(visitBlockers(s, paid).join()).toContain('입장료')
    expect(visitExpo(s, paid.id)).toBe(s)
  })

  it('없는 행사·게임오버에는 아무 일도 없다', () => {
    const s = ready(openDayFor(VISIT_ONLY))
    expect(visitExpo(s, 'nope')).toBe(s)
    const over: GameState = { ...s, gameOver: 'bankrupt' }
    expect(visitExpo(over, VISIT_ONLY.id)).toBe(over)
  })
})

describe('참여', () => {
  it('⚠️ 부스 참여는 1턴 + 참가비이고 돈을 한 푼도 안 준다', () => {
    const s = ready(openDayFor(BOOTH))
    const after = joinExpo(s, BOOTH.id)
    expect(after).not.toBe(s)
    expect(after.slot).not.toBe(s.slot)
    expect(s.stats.money - after.stats.money).toBe(BOOTH.join!.fee ?? 0)
    expect(after.stats.reputation).toBeGreaterThan(s.stats.reputation)
  })

  it('⚠️ 참관만 받는 행사는 참여가 막히고 사유가 그 사실을 말한다', () => {
    const s = ready(openDayFor(VISIT_ONLY))
    expect(canJoin(s, VISIT_ONLY)).toBe(false)
    expect(joinBlockers(s, VISIT_ONLY)).toContain('참관만 받는 행사입니다')
    expect(joinExpo(s, VISIT_ONLY.id)).toBe(s)
  })

  it('⚠️ 사이트로 보내는 참여는 여기서 실행되지 않는다 — 판매 통로가 둘이 되면 안 된다', () => {
    const s = ready(openDayFor(SITE_JOIN))
    expect(SITE_JOIN.join!.activityId).toBeUndefined()
    expect(joinExpo(s, SITE_JOIN.id)).toBe(s)
  })

  it('코미콘 참여는 팔 회지가 있어야 열린다', () => {
    const day = openDayFor(SITE_JOIN)
    const empty = ready(day)
    expect(joinBlockers(empty, SITE_JOIN).join()).toContain(`${MIN_BOOK_PAGES}장 이상`)

    let s = createProject(empty)
    const id = openProjects(s)[0].id
    for (let i = 0; i < MIN_BOOK_PAGES; i++) {
      s = drawIntoProject(
        { ...s, day, inventory: [{ id: 'pen-tablet', day: 1 }], stats: { ...s.stats, stamina: 200, mental: 100, money: 900_000 } },
        id,
      )
    }
    expect(joinBlockers({ ...s, day }, SITE_JOIN)).toEqual([])
  })
})

describe('⚠️ 불변식 — 행사는 수입원이 아니다', () => {
  it('참관·참여 활동은 돈을 한 푼도 안 주고 물가 배율도 안 탄다', () => {
    for (const a of ACTIVITIES.filter((x) => x.burnoutKey === 'expo')) {
      expect(a.effects.money, `${a.id}이 돈을 준다`).toBeUndefined()
      expect(a.scalesWithWage, `${a.id}에 물가 배율이 붙었다`).toBeFalsy()
    }
  })

  it('행사 활동은 번아웃 키를 함께 쓴다 — 참관·참여를 번갈아 해 피해 갈 수 없다', () => {
    const keys = new Set(
      EXPOS.flatMap((e) => [e.visitActivityId, e.join?.activityId])
        .filter((x): x is string => !!x)
        .map((id) => findActivity(id)?.burnoutKey),
    )
    expect(keys).toEqual(new Set(['expo']))
  })

  it('행사가 가리키는 활동·사이트가 실제로 있다', () => {
    for (const e of EXPOS) {
      expect(findActivity(e.visitActivityId), `${e.id}의 참관 활동이 없다`).toBeDefined()
      expect(findExpo(e.id)).toBeDefined()
      expect(e.fee).toBeGreaterThanOrEqual(0)
      expect(e.openDays).toBeGreaterThan(0)
      expect(e.openDays).toBeLessThan(e.cycle)
      const j = e.join
      if (!j) continue
      // ⚠️ 활동과 사이트는 배타다 — 둘 다 있으면 어느 쪽이 참인지 알 수 없다.
      expect(!!j.activityId !== !!j.siteId, `${e.id}의 참여가 활동/사이트를 둘 다 갖는다`).toBe(true)
      if (j.activityId) expect(findActivity(j.activityId)).toBeDefined()
      if (j.siteId) expect(findSite(j.siteId), `${e.id}가 없는 사이트를 가리킨다`).toBeDefined()
    }
  })

  it('무료로 갈 수 있는 행사가 하나는 있다 — 목록이 통째로 닫힌 문이 아니다', () => {
    expect(EXPOS.filter((e) => e.fee === 0).length).toBeGreaterThan(0)
  })
})

/* ── 대회 수상 ─────────────────────────────────────────────────────────── */

const BODY = findExpo('bodybuilding')!
const MARATHON = findExpo('marathon')!

/** 그 스탯들을 요건 이상으로 채운 판. */
function strong(day: number, stats: Partial<GameState['stats']>): GameState {
  const base = ready(day)
  return { ...base, stats: { ...base.stats, ...stats } }
}

describe('대회 수상', () => {
  it('요건을 다 채우면 상을 받고 평판이 오른다', () => {
    const s = strong(openDayFor(MARATHON), { athletics: 200 })
    expect(willAward(s, MARATHON)).toBe(true)
    const after = joinExpo(s, MARATHON.id)
    expect(after.stats.reputation).toBe(s.stats.reputation + MARATHON.join!.award!.reputation)
  })

  it('미달이면 참가만 하고 상은 없다 — 턴과 참가비는 그대로 나간다', () => {
    const s = strong(openDayFor(MARATHON), { athletics: 10 })
    expect(willAward(s, MARATHON)).toBe(false)
    const after = joinExpo(s, MARATHON.id)
    expect(after).not.toBe(s)
    expect(after.slot).not.toBe(s.slot)
    expect(after.stats.reputation).toBe(s.stats.reputation)
    expect(s.stats.money - after.stats.money).toBe(MARATHON.join!.fee ?? 0)
  })

  it('⚠️ 보디빌딩은 운동만 높아서는 못 받는다 — 매력까지 봐야 한다(설계자 지시)', () => {
    const onlyBody = strong(openDayFor(BODY), { athletics: 999, charm: 0 })
    expect(willAward(onlyBody, BODY)).toBe(false)
    // 모자란 것을 **글자로** 말한다(무작위가 없는 이유가 이것이다).
    expect(awardShortfalls(onlyBody, BODY).join(' ')).toContain('매력')
    const both = strong(openDayFor(BODY), { athletics: 999, charm: 999 })
    expect(willAward(both, BODY)).toBe(true)
  })

  it('⚠️ 마라톤과 갈린다 — 같은 몸으로 한쪽은 받고 한쪽은 못 받는다', () => {
    const runner = { athletics: 400, charm: 0 }
    expect(willAward(strong(openDayFor(MARATHON), runner), MARATHON)).toBe(true)
    expect(willAward(strong(openDayFor(BODY), runner), BODY)).toBe(false)
  })

  it('⚠️ 판정은 참가 전 스탯으로 한다 — 활동이 올려 주는 운동이 섞이면 안 된다', () => {
    const compete = findActivity('expo-compete')!
    const gain = compete.effects.athletics ?? 0
    expect(gain).toBeGreaterThan(0)
    // 요건보다 딱 `gain`만큼 모자란 판: 실행 뒤 스탯으로 재면 통과해 버린다.
    const just = strong(openDayFor(MARATHON), {
      athletics: MARATHON.join!.award!.requires.athletics! - gain,
    })
    expect(willAward(just, MARATHON)).toBe(false)
    expect(joinExpo(just, MARATHON.id).stats.reputation).toBe(just.stats.reputation)
  })

  it('⚠️ 상은 돈을 한 푼도 주지 않는다 — 행사는 수입원이 아니다', () => {
    for (const e of EXPOS) {
      if (!e.join?.award) continue
      const s = strong(openDayFor(e), { athletics: 999, charm: 999 })
      const after = joinExpo(s, e.id)
      // 나간 돈은 참가비뿐이다(들어온 돈이 있으면 차액이 참가비보다 작아진다).
      expect(s.stats.money - after.stats.money, e.id).toBe(e.join.fee ?? 0)
    }
  })

  it('상이 없는 참여는 수상 판정이 늘 빈 목록이다', () => {
    expect(awardShortfalls(ready(1), BOOTH)).toEqual([])
    expect(willAward(ready(1), BOOTH)).toBe(false)
  })
})
