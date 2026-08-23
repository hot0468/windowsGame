import { DAY_END } from '../data/clock'
import { describe, expect, it } from 'vitest'
import {
  AUTO_STOPPED_BY_PLAYER,
  STOP_RULES,
  appendStep,
  endRun,
  findStop,
  moneyDangerLine,
  startRun,
} from './autoAdvance'
import { AUTO_MAX_SLOTS, MONEY_DANGER_DAYS } from '../data/autoAdvance'
import { SHOP_ITEMS } from '../data/items'
import { nextShock, livingCostForDay } from './economy'
import { createInitialState } from './turn'
import { setPlan } from './schedule'
import type { StopContext } from './autoAdvance'
import type { GameState } from '../types/game'

function base(over: Partial<GameState> = {}): GameState {
  return { ...createInitialState('테스터'), ...over }
}

/** 정지 조건이 하나도 안 걸리는 기본 문맥. 계획은 지금 슬롯에 하나 넣어 둔다. */
function ctx(over: Partial<StopContext> = {}): StopContext {
  const state = base({ plans: setPlan([], 1, 'morning', 'study') })
  return {
    state,
    arrivals: [],
    notices: [],
    skipped: [],
    messages: [],
    slots: 0,
    ...over,
  }
}

describe('정지 조건', () => {
  it('규칙 id는 중복되지 않는다', () => {
    const ids = STOP_RULES.map((r) => r.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('주저앉음이 가장 먼저 걸린다 — 모르는 사이 회복이 지나가면 안 된다', () => {
    expect(STOP_RULES[0].id).toBe('recovery')
    const stop = findStop(ctx({ state: base({ recovery: { kind: 'bankrupt', startedDay: 1, daysLeft: 3 } }) }))
    expect(stop?.id).toBe('recovery')
    expect(stop?.bad).toBe(true)
  })

  it('멈출 이유가 없으면 null', () => {
    expect(findStop(ctx())).toBeNull()
  })

  it('현재 슬롯에 예약이 없으면 멈춘다 (자동으로 건너뛰지 않는다)', () => {
    const stop = findStop(ctx({ state: base() }))
    expect(stop?.id).toBe('no-plan')
    // 사유를 못 대는 정지를 만들지 않는다.
    expect(stop?.text).toContain('1일차')
  })

  it('예약 실패는 사유와 함께 멈춘다', () => {
    const stop = findStop(
      ctx({ skipped: [{ day: 3, slot: 'morning', activityId: 'work', reason: '조건 미달' }] }),
    )
    expect(stop?.id).toBe('plan-failed')
    expect(stop?.text).toContain('조건 미달')
  })

  it('택배 도착에서 멈춘다', () => {
    // 실제 상품을 쓴다 — 가짜 아이콘 이름을 적으면 아이콘 서브셋 생성기가 그것까지 수집해
    // 빌드가 깨진다(생성기는 `src/`를 통째로 훑는다).
    const stop = findStop(ctx({ arrivals: [SHOP_ITEMS[0]] }))
    expect(stop?.id).toBe('delivery')
    expect(stop?.text).toContain(SHOP_ITEMS[0].name)
  })

  it('급여·해고 등 회사 소식에서 멈춘다', () => {
    const stop = findStop(
      ctx({
        notices: [{ id: 'p1', kind: 'payday', careerId: 'x', day: 3, slot: 'morning' }],
      }),
    )
    expect(stop?.id).toBe('job')
    expect(stop?.text).toContain('급여')
  })

  it('안전 상한에 닿으면 멈춘다 — 조건이 전부 실패해도 끝난다', () => {
    const stop = findStop(ctx({ slots: AUTO_MAX_SLOTS }))
    expect(stop?.id).toBe('limit')
  })
})

describe('소지금 위험선', () => {
  /** 그 날짜의 기본 상태(이사 안 한 사람)로 위험선을 잰다. */
  const lineOn = (day: number) => moneyDangerLine(base({ day }))

  it('하루 생활비 × 설정값이다', () => {
    expect(lineOn(1)).toBe(livingCostForDay(1) * MONEY_DANGER_DAYS)
  })

  /**
   * ⚠️ **위험선은 날짜가 아니라 상태를 본다**(2026-08-05 이사 신설).
   * 고시원으로 옮긴 플레이어는 생활비가 절반 이하이므로 위험선도 함께 내려가야 한다 —
   * 안 내려가면 실제로는 안전한 금액에서 계속 경고를 받고, 그러면 그 경고를 무시하게 된다.
   */
  it('싼 집으로 이사하면 위험선도 함께 내려간다', () => {
    const plain = base({ day: 1 })
    const cheap = { ...plain, housing: { id: 'gosiwon', movedDay: 1, deposit: 300_000 } }
    expect(moneyDangerLine(cheap)).toBeLessThan(moneyDangerLine(plain))
  })

  it('넘어가는 순간에만 멈춘다 (이미 아래였으면 안 멈춘다)', () => {
    const line = lineOn(1)
    const rich = base({ stats: { ...base().stats, money: line + 1 } })
    const poor = base({
      plans: setPlan([], 1, 'morning', 'study'),
      stats: { ...base().stats, money: line - 1 },
    })

    // 위 → 아래: 멈춘다
    expect(findStop(ctx({ before: rich, state: poor }))?.id).toBe('money')
    // 아래 → 아래: 안 멈춘다(멈추면 자동 진행을 다시 눌러도 한 슬롯도 못 간다)
    expect(findStop(ctx({ before: poor, state: poor }))).toBeNull()
    // 실행 전 점검(before 없음)에서도 안 멈춘다 — 같은 이유
    expect(findStop(ctx({ state: poor }))).toBeNull()
  })

  it('⚠️ 물가 급등이 시작되는 날에도 경고가 사라지지 않는다', () => {
    /* 급등 전날의 위험선 < 급등 첫날의 위험선(생활비가 며칠 오른다). 전날 기준으로는
       안전하고 급등 기준으로는 위험한 금액을 들고 하룻밤을 넘기면 **반드시 경고해야 한다**.
       ⚠️ 2026-08-22 전에는 이 자리가 "10일 주기 물가 구간"이었다 — 그 계단은 폐지됐다. */
    const shockDay = nextShock(1).start
    const prev = shockDay - 1
    expect(lineOn(shockDay)).toBeGreaterThan(lineOn(prev))
    const money = lineOn(prev) + 16000
    expect(money).toBeLessThan(lineOn(shockDay))

    const before = base({ day: prev, minute: DAY_END - 60, slot: 'afternoon' as const, stats: { ...base().stats, money } })
    const after = base({
      day: shockDay,
      slot: 'morning',
      plans: setPlan([], shockDay, 'morning', 'study'),
      stats: { ...base().stats, money: money - livingCostForDay(prev) },
    })
    expect(findStop(ctx({ before, state: after }))?.id).toBe('money')
  })
})

describe('진행 기록', () => {
  it('슬롯마다 무엇을 했는지·돈이 얼마 남았는지 쌓인다', () => {
    const before = base({ plans: setPlan([], 1, 'morning', 'study') })
    const after = base({
      day: 1,
      minute: DAY_END - 60, slot: 'afternoon' as const,
      stats: { ...before.stats, money: before.stats.money - 5000, knowledge: 20 },
    })
    let run = startRun(before)
    run = appendStep(run, ctx({ before, state: after }))

    expect(run.slots).toBe(1)
    expect(run.steps[0]).toMatchObject({ day: 1, slot: 'morning', label: '공부' })
    expect(run.moneyOut).toBe(5000)
    expect(run.moneyIn).toBe(0)
    // 오전 슬롯은 밤 정산을 지나지 않으므로 생활비가 없다.
    expect(run.livingPaid).toBe(0)
    expect(run.moneyAfter).toBe(after.stats.money)
  })

  it('⚠️ 오후 슬롯의 생활비를 되돌려 더한다 — 상계된 차액을 그대로 쓰면 "지출 0원"이 된다', () => {
    const living = livingCostForDay(1)
    const before = base({ minute: DAY_END - 60, slot: 'afternoon' as const, plans: setPlan([], 1, 'afternoon', 'work') })
    // 알바로 60,000 벌고 밤에 생활비가 나갔다 → 차액은 60,000 − living뿐이다.
    const after = base({
      day: 2,
      slot: 'morning',
      stats: { ...before.stats, money: before.stats.money + 60000 - living },
    })
    const run = appendStep(startRun(before), ctx({ before, state: after }))
    expect(run.moneyIn).toBe(60000)
    expect(run.moneyOut).toBe(living)
    expect(run.livingPaid).toBe(living)
    expect(run.moneyAfter - run.moneyBefore).toBe(run.moneyIn - run.moneyOut)
  })

  it('못 지킨 예약은 사유가 남고 활동 이름은 없다', () => {
    const before = base({ plans: setPlan([], 1, 'morning', 'work') })
    const after = base({ day: 1, minute: DAY_END - 60, slot: 'afternoon' as const })
    const run = appendStep(
      startRun(before),
      ctx({
        before,
        state: after,
        skipped: [{ day: 1, slot: 'morning', activityId: 'work', reason: '조건 미달' }],
      }),
    )
    expect(run.steps[0].label).toBeUndefined()
    expect(run.steps[0].skipped).toBe('조건 미달')
  })

  it('끝낼 때 스탯 증감을 뽑는다 — 행동력은 세지 않는다', () => {
    const before = base()
    const after = base({
      stats: { ...before.stats, knowledge: 30, stamina: 5, mental: 90 },
    })
    const run = endRun(appendStep(startRun(before), ctx({ before, state: after })), null)
    const keys = run.statDelta.map((d) => d.key)
    expect(keys).toContain('knowledge')
    expect(keys).toContain('mental')
    // 행동력(stamina)은 매일 회복되는 자원이라 증감이 언제나 잡음이다.
    expect(keys).not.toContain('stamina')
  })

  it('플레이어가 멈춘 것도 사유로 남는다', () => {
    const run = endRun(startRun(base()), AUTO_STOPPED_BY_PLAYER)
    expect(run.stop?.id).toBe('stopped')
    expect(run.stop?.text).toBeTruthy()
  })
})
