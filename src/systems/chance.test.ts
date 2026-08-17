import { describe, expect, it } from 'vitest'
import { CHANCE_DAYS_MAX, CHANCE_DAYS_MIN, CHANCE_EVENTS } from '../data/chance'
import { findActivity } from '../data/activities'
import {
  chanceMoneyBack,
  chanceNightDelta,
  chanceOf,
  chanceToday,
  dilemmaDue,
  dilemmaToday,
  nameSeed,
  resolveDilemma,
} from './chance'
import { createInitialState, growthCap, runActivity } from './turn'
import { previewActivity } from '../components/apps/activityPreview'
import { migrateSave } from '../store/gameStore'
import type { GameState, Stats } from '../types/game'

/**
 * 돌발 사건 — 지키는 것: ①결정성(같은 시드·같은 날 = 같은 사건) ②빈도 상하한
 * ③돈 잃는 사건은 잔액 1원을 남긴다(파산 불변식 — 뒤집어 증명)
 * ④미리보기와 실행이 같은 숫자다(mastery.test 판형) ⑤구세이브(시드 없음) 보정.
 */

/** 그 사건이 그날 뜨는 시드를 데이터에서 찾는다 — 무작위 없이 결정적으로 탐색한다. */
function seedFor(eventId: string, day: number): number {
  for (let s = 1; s < 500_000; s++) if (chanceOf(s, day)?.id === eventId) return s
  throw new Error(`시드를 못 찾음: ${eventId}`)
}

function at(seed: number, patch: Partial<Stats> = {}): GameState {
  const s = createInitialState('운수')
  return { ...s, seed, stats: { ...s.stats, ...patch } }
}

describe('결정성', () => {
  it('같은 시드·같은 날은 언제나 같은 사건이다', () => {
    for (let day = 1; day <= 100; day++) {
      expect(chanceOf(7, day)?.id).toBe(chanceOf(7, day)?.id)
    }
  })

  it('시드가 다르면 사건 달력도 다르다', () => {
    const calendar = (seed: number) =>
      Array.from({ length: 100 }, (_, i) => chanceOf(seed, i + 1)?.id ?? '').join('|')
    expect(calendar(1)).not.toBe(calendar(2))
  })

  it('Recovery 중에는 사건이 없다 — 주저앉은 며칠에 기회가 지나가면 벌이 두 번이다', () => {
    const seed = seedFor(CHANCE_EVENTS[0].id, 1)
    const down: GameState = {
      ...at(seed),
      recovery: { kind: 'burnout', startedDay: 1, daysLeft: 3 },
    }
    expect(chanceToday(at(seed))).not.toBeNull()
    expect(chanceToday(down)).toBeNull()
  })

  it('시드가 없으면(테스트 기본 상태) 사건이 없다', () => {
    expect(chanceToday(createInitialState('무시드'))).toBeNull()
  })
})

describe('빈도', () => {
  it(`시드 여럿 × 100일 창에서 사건 일수가 ${CHANCE_DAYS_MIN}~${CHANCE_DAYS_MAX}일에 하루 범위다`, () => {
    const seeds = 20
    let eventDays = 0
    for (let seed = 1; seed <= seeds; seed++) {
      for (let day = 1; day <= 100; day++) if (chanceOf(seed, day)) eventDays++
    }
    const total = seeds * 100
    expect(eventDays).toBeGreaterThanOrEqual(total / CHANCE_DAYS_MAX)
    expect(eventDays).toBeLessThanOrEqual(total / CHANCE_DAYS_MIN)
  })
})

describe('데이터', () => {
  it('기회가 가리키는 활동은 전부 실재한다 — 없는 활동의 기회는 거짓 문구가 된다', () => {
    for (const e of CHANCE_EVENTS.filter((e) => e.kind === 'boost')) {
      expect(findActivity(e.activityId!), e.id).toBeDefined()
      // 배율이나 할인 중 하나는 반드시 있다 — 둘 다 없으면 아무것도 안 하는 기회다.
      expect(e.gainRate !== undefined || e.costRatio !== undefined, e.id).toBe(true)
    }
  })
})

describe('돈 잃는 사건 — 파산 불변식', () => {
  const loser = CHANCE_EVENTS.find((e) => e.kind === 'minor' && (e.effects?.money ?? 0) < 0)!

  it('전제: 돈을 잃는 소소한 사건이 데이터에 있다', () => {
    expect(loser).toBeDefined()
  })

  it('잔액에서 최소 1원을 남기고만 뺀다 — 뒤집으면(그대로 빼면) 잔액이 1원 밑이다', () => {
    const state = at(seedFor(loser.id, 1))
    const balance = 5000
    // 규칙 뒤집기: 자르지 않고 그대로 빼면 파산선(1원)을 뚫는다 — 그래서 클램프가 규칙이다.
    expect(balance + (loser.effects!.money ?? 0)).toBeLessThan(1)
    const delta = chanceNightDelta(state, balance)
    expect(balance + delta.money).toBe(1)
  })

  it('잔액이 넉넉하면 정의된 값 그대로 뺀다', () => {
    const state = at(seedFor(loser.id, 1))
    expect(chanceNightDelta(state, 1_000_000).money).toBe(loser.effects!.money)
  })
})

describe('미리보기 = 실행 (mastery.test 판형)', () => {
  it('상승분 배율(오늘만 기회)이 미리보기와 실행에서 같은 숫자다', () => {
    const boost = CHANCE_EVENTS.find((e) => e.kind === 'boost' && e.gainRate !== undefined)!
    const activity = findActivity(boost.activityId!)!
    // 오전 슬롯이라 취침 정산 없이 활동 효과만 남는다. 멘탈은 상한(100)에서 내린다 —
    // 상한에 걸리면 실행 쪽만 잘려 "미리보기와 같다"가 클램프 때문에 깨진다.
    const state = at(seedFor(boost.id, 1), { money: 500_000, mental: 50 })
    const preview = previewActivity(state, activity)
    const after = runActivity(state, activity)
    for (const row of preview.rows) {
      expect(after.stats[row.key] - state.stats[row.key], String(row.key)).toBe(row.value)
    }
    // 배율이 실제로 붙은 판이다 — 0끼리 같은 것을 "동기화"로 읽으면 안 된다.
    const boosted = preview.rows.find((r) => r.value > (activity.effects[r.key] ?? 0))
    expect(boosted).toBeDefined()
  })

  it('비용 할인(반값)이 미리보기와 실행에서 같은 숫자다', () => {
    const sale = CHANCE_EVENTS.find((e) => e.kind === 'boost' && e.costRatio !== undefined)!
    const activity = findActivity(sale.activityId!)!
    const rawCost = activity.effects.money ?? 0
    expect(rawCost).toBeLessThan(0) // 전제: 할인 대상은 유료 활동이다
    const state = at(seedFor(sale.id, 1), { money: 500_000, mental: 50 })
    const row = previewActivity(state, activity).rows.find((r) => r.key === 'money')!
    const after = runActivity(state, activity)
    expect(after.stats.money - state.stats.money).toBe(row.value)
    expect(row.value).toBeGreaterThan(rawCost) // 할인이 실제로 붙었다
  })

  it('사건이 없는 날은 배율도 할인도 없다', () => {
    // 사건 없는 날을 찾는다 — 빈도가 5.5일에 하루라 반드시 있다.
    let seed = 1
    while (chanceOf(seed, 1)) seed++
    const state = at(seed, { money: 500_000, mental: 50 })
    const work = findActivity('work')!
    expect(chanceMoneyBack(state, work)).toBe(0)
    const preview = previewActivity(state, work)
    const after = runActivity(state, work)
    for (const row of preview.rows) {
      expect(after.stats[row.key] - state.stats[row.key], String(row.key)).toBe(row.value)
    }
  })
})

describe('딜레마 (세 번째 부류)', () => {
  const dilemmas = CHANCE_EVENTS.filter((e) => e.kind === 'dilemma')

  it('데이터 — 선택지 둘, 돈은 3만원 이하, 도덕 폭은 ±3 이내(상한 100 규칙)', () => {
    expect(dilemmas.length).toBeGreaterThan(0)
    for (const d of dilemmas) {
      expect(d.choices?.length, d.id).toBe(2)
      for (const c of d.choices!) {
        expect(Math.abs(c.effects.money ?? 0), `${d.id}/${c.label}`).toBeLessThanOrEqual(30_000)
        expect(Math.abs(c.effects.morality ?? 0), `${d.id}/${c.label}`).toBeLessThanOrEqual(3)
      }
    }
  })

  it('같은 시드·같은 날은 같은 딜레마다', () => {
    const seed = seedFor(dilemmas[0].id, 1)
    expect(chanceOf(seed, 1)?.id).toBe(dilemmas[0].id)
    expect(dilemmaToday(at(seed))?.id).toBe(dilemmas[0].id)
  })

  it('돈 손실은 잔액 1원을 남기고 자른다 — 뒤집으면(그대로 빼면) 파산선(1원) 밑이다', () => {
    const d = dilemmas.find((e) => e.choices!.some((c) => (c.effects.money ?? 0) < 0))!
    expect(d, '돈을 잃는 선택지가 있는 딜레마가 데이터에 있다').toBeDefined()
    const idx = d.choices!.findIndex((c) => (c.effects.money ?? 0) < 0)
    const state = at(seedFor(d.id, 1), { money: 5000 })
    // 규칙 뒤집기: 자르지 않고 그대로 빼면 1원 밑이다 — 그래서 클램프가 규칙이다.
    expect(5000 + d.choices![idx].effects.money!).toBeLessThan(1)
    expect(resolveDilemma(state, idx).stats.money).toBe(1)
  })

  it('결정 커서가 찍히면 그날은 다시 묻지 않는다', () => {
    const state = at(seedFor(dilemmas[0].id, 1))
    expect(dilemmaDue(state)).toBe(true)
    const after = resolveDilemma(state, 0)
    expect(after.dilemmaDecidedDay).toBe(state.day)
    expect(dilemmaDue(after)).toBe(false)
    expect(resolveDilemma(after, 1)).toBe(after) // 같은 날 두 번째 결정도 안 된다
  })

  it('도덕이 상한(growthCap)을 넘지 않는다 — 리터럴 100이 상한과 어긋나면 여기서 잡힌다', () => {
    const d = dilemmas.find((e) => e.choices!.some((c) => (c.effects.morality ?? 0) > 0))!
    const idx = d.choices!.findIndex((c) => (c.effects.morality ?? 0) > 0)
    const cap = growthCap('morality')
    const state = at(seedFor(d.id, 1), { morality: cap - 1 })
    expect(resolveDilemma(state, idx).stats.morality).toBe(cap)
  })

  it('구세이브 보정 — 결정 커서는 숫자만 통과한다', () => {
    const ok = { ...createInitialState('철수'), dilemmaDecidedDay: 7 }
    expect(migrateSave({ state: ok }).state!.dilemmaDecidedDay).toBe(7)
    const broken = { ...createInitialState('철수'), dilemmaDecidedDay: '7' as unknown as number }
    expect(migrateSave({ state: broken }).state!.dilemmaDecidedDay).toBeUndefined()
  })
})

describe('구세이브 보정', () => {
  it('시드가 없으면 이름에서 결정적으로 메운다 — 같은 세이브는 몇 번을 불러도 같은 시드다', () => {
    const legacy = { ...createInitialState('철수') }
    const revived = migrateSave({ state: legacy }).state!
    expect(revived.seed).toBe(nameSeed('철수'))
    expect(migrateSave({ state: legacy }).state!.seed).toBe(revived.seed)
  })

  it('저장된 시드는 그대로 보존한다', () => {
    const saved = { ...createInitialState('철수'), seed: 12345 }
    expect(migrateSave({ state: saved }).state!.seed).toBe(12345)
  })

  it('시드가 숫자가 아니면 버리고 이름으로 메운다', () => {
    const broken = { ...createInitialState('철수'), seed: Number.NaN }
    expect(migrateSave({ state: broken }).state!.seed).toBe(nameSeed('철수'))
  })
})
