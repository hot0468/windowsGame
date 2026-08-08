import { describe, it, expect } from 'vitest'
import {
  abandonGig,
  activeContract,
  advanceGigs,
  canTake,
  daysLeft,
  gigsOf,
  isDone,
  openGigs,
  takeBlockers,
  takeGig,
} from './gigs'
import { createInitialState, runActivity } from './turn'
import { GIGS, MISS_REPUTATION_PENALTY, TOOL_STEPS, WORK_PER_SESSION, findGig } from '../data/gigs'
import { ACTIVITIES, findActivity } from '../data/activities'
import { ECONOMY_TIERS } from '../data/economy'
import type { GameState } from '../types/game'

/**
 * ⚠️ **이 파일은 외주가 깨뜨릴 수 있는 것만 덮는다.** 납품 보수가 돈을 만들므로
 * 기한·납품·마감에는 증명을 붙이고, 나머지는 회귀 테스트 수준으로 둔다.
 */

/** 조건 없는 일감(VS 코드). 판을 시작하자마자 받을 수 있는 유일한 것. */
const FREE = GIGS.find((g) => !g.requiresItem)!
const TOOL = ACTIVITIES.find((a) => a.toolId === FREE.tool)!

function ready(day = 1): GameState {
  const base = createInitialState('외주쟁이')
  return { ...base, day, stats: { ...base.stats, money: 500_000, stamina: 200 } }
}

/** 도구를 n번 켠다. 사이사이 행동력을 채운다 — 여기서 보려는 건 체력이 아니다. */
function work(state: GameState, n: number): GameState {
  let s = state
  for (let i = 0; i < n; i++) {
    s = runActivity({ ...s, stats: { ...s.stats, stamina: 200 } }, TOOL)
  }
  return s
}

describe('수주', () => {
  it('받으면 기한이 걸리고 턴도 돈도 안 움직인다', () => {
    const before = ready()
    const after = takeGig(before, FREE.id)
    const c = activeContract(after)!
    expect(c.gigId).toBe(FREE.id)
    expect(c.dueDay).toBe(before.day + FREE.days)
    expect(c.progress).toBe(0)
    // ⚠️ 계약은 시간을 쓰는 일이 아니다(은행 거래와 같은 규칙).
    expect(after.day).toBe(before.day)
    expect(after.slot).toBe(before.slot)
    expect(after.stats.money).toBe(before.stats.money)
  })

  it('⚠️ 한 번에 하나만 받는다', () => {
    const one = takeGig(ready(), FREE.id)
    const other = GIGS.find((g) => g.id !== FREE.id && !g.requiresItem)
    if (other) expect(takeGig(one, other.id)).toBe(one)
    expect(takeBlockers(one, GIGS[1])).toContain(
      '이미 받아 둔 일이 있습니다 — 한 번에 하나만 받습니다',
    )
  })

  it('자격이 없으면 못 받고 사유가 나온다', () => {
    const gated = GIGS.find((g) => g.requiresItem)!
    const s = ready()
    expect(canTake(s, gated)).toBe(false)
    expect(takeBlockers(s, gated)).toContain('자격 요건을 갖추지 못했습니다')
    // 가지고 있으면 열린다 — 잠금이 실제로 작동하는지 본다.
    const held = { ...s, inventory: [{ id: gated.requiresItem!, day: 1 }] }
    expect(canTake(held, gated)).toBe(true)
  })

  it('없는 일감·게임오버에는 아무 일도 없다', () => {
    const s = ready()
    expect(takeGig(s, 'nope')).toBe(s)
    const over: GameState = { ...s, gameOver: 'bankrupt' }
    expect(takeGig(over, FREE.id)).toBe(over)
  })
})

describe('작업과 납품', () => {
  it('도구를 켤 때마다 업무량이 오른다', () => {
    let s = takeGig(ready(), FREE.id)
    s = work(s, 1)
    expect(activeContract(s)!.progress).toBe(WORK_PER_SESSION)
  })

  it('⚠️ 다 채우면 그 자리에서 보수가 들어오고 계약이 닫힌다', () => {
    const taken = takeGig(ready(), FREE.id)
    const done = work(taken, FREE.workload)
    expect(activeContract(done)).toBeUndefined()
    expect(isDone(done, FREE.id)).toBe(true)
    expect(gigsOf(done).earned).toBe(FREE.pay)
    // 보수가 실제로 소지금에 들어왔는지는 "일 안 하고 같은 턴을 보낸 판"과 비교한다.
    const idle = work({ ...taken, gigs: { done: [], missed: 0, earned: 0 } }, FREE.workload)
    expect(done.stats.money - idle.stats.money).toBe(FREE.pay)
  })

  it('다른 도구로는 안 채워진다', () => {
    const other = ACTIVITIES.find((a) => a.toolId && a.toolId !== FREE.tool)!
    const taken = takeGig(ready(), FREE.id)
    // ⚠️ 구독 잠금은 `canRun`이 보고 여기서는 반영만 본다 — `runActivity`는 판정을 안 한다.
    const after = runActivity(taken, other)
    expect(activeContract(after)!.progress).toBe(0)
  })

  it('받아 둔 일이 없어도 도구는 켤 수 있다 (스탯만 오르는 연습)', () => {
    const s = ready()
    const after = runActivity(s, TOOL)
    expect(after.gigs).toBeUndefined()
    expect(after.day + (after.slot === 'afternoon' ? 0 : 1)).toBeGreaterThanOrEqual(s.day)
  })

  it('같은 일감을 두 번 받을 수 없다', () => {
    const done = work(takeGig(ready(), FREE.id), FREE.workload)
    expect(canTake(done, FREE)).toBe(false)
    expect(takeBlockers(done, FREE)).toContain('이미 납품한 일감입니다')
    expect(openGigs(done).map((g) => g.id)).not.toContain(FREE.id)
  })
})

describe('마감', () => {
  it('기한 안에는 계약이 살아 있다', () => {
    const taken = takeGig(ready(), FREE.id)
    const onTime = { ...taken, day: taken.gigs!.active!.dueDay }
    expect(advanceGigs(onTime)).toBe(onTime)
    expect(daysLeft(onTime)).toBe(0)
  })

  it('⚠️ 기한을 넘기면 계약이 깨지고 평판이 깎인다', () => {
    const taken = { ...takeGig(ready(), FREE.id) }
    taken.stats = { ...taken.stats, reputation: 20 }
    const late = { ...taken, day: taken.gigs!.active!.dueDay + 1 }
    const after = advanceGigs(late)
    expect(activeContract(after)).toBeUndefined()
    expect(after.stats.reputation).toBe(20 - MISS_REPUTATION_PENALTY)
    expect(gigsOf(after).missed).toBe(1)
    // ⚠️ 위약금은 없다 — 돈을 물리면 "받지 않는 것이 언제나 안전"이 되어 함정이 된다.
    expect(after.stats.money).toBe(late.stats.money)
  })

  it('포기도 마감을 놓친 것과 같은 대가를 치른다', () => {
    const taken = takeGig(ready(), FREE.id)
    const withRep = { ...taken, stats: { ...taken.stats, reputation: 20 } }
    const after = abandonGig(withRep)
    expect(activeContract(after)).toBeUndefined()
    expect(after.stats.reputation).toBe(20 - MISS_REPUTATION_PENALTY)
    expect(gigsOf(after).missed).toBe(1)
  })

  it('받아 둔 일이 없으면 밤 정산이 아무것도 안 한다', () => {
    const s = ready(100)
    expect(advanceGigs(s)).toBe(s)
    expect(abandonGig(s)).toBe(s)
  })
})

describe('⚠️ 불변식 — 외주가 물가를 이기지 못한다', () => {
  /*
   * 보수는 `Gig.pay` 고정값이고 **물가 배율을 타지 않는다**(정규직 급여·트위터 정산과
   * 같은 장치). 마지막 물가 구간에서 "가장 좋은 일감만 계속 돌린다"고 해도 하루 수입이
   * 그때의 생활비를 압도하지 않아야 판이 끝난다.
   */
  const best = GIGS.reduce((a, g) => (g.pay / g.workload > a.pay / a.workload ? g : a))
  const perTurn = best.pay / best.workload
  const lastLiving = ECONOMY_TIERS[ECONOMY_TIERS.length - 1].living

  it('가장 좋은 일감도 회당 보수가 마지막 물가 생활비의 두 배를 넘지 않는다', () => {
    // 하루는 슬롯 둘이므로 "회당 보수 × 2"가 하루 최대 수입이다.
    expect(perTurn * 2).toBeLessThan(lastLiving * 2.2)
  })

  it('보수는 물가 배율을 타지 않는다 — 도구 활동이 돈을 한 푼도 안 준다', () => {
    for (const a of ACTIVITIES.filter((x) => x.toolId)) {
      expect(a.effects.money, `${a.id}이 돈을 준다`).toBeUndefined()
      expect(a.scalesWithWage, `${a.id}에 물가 배율이 붙었다`).toBeFalsy()
    }
  })

  it('일감이 가리키는 도구는 실제 활동이 있다', () => {
    for (const g of GIGS) {
      expect(
        ACTIVITIES.some((a) => a.toolId === g.tool),
        `${g.id}의 도구 ${g.tool}을 켤 활동이 없다`,
      ).toBe(true)
      expect(findGig(g.id)).toBeDefined()
      expect(g.workload).toBeGreaterThan(0)
      // ⚠️ 기한은 업무량보다 넉넉해야 한다 — 받자마자 실패가 확정되면 선택지가 아니다.
      expect(g.days, `${g.id}의 기한이 업무량보다 짧다`).toBeGreaterThanOrEqual(g.workload)
    }
  })

  it('도구 활동의 번아웃 키는 전부 같다 — 도구를 바꿔 가며 피해 갈 수 없다', () => {
    const keys = new Set(ACTIVITIES.filter((a) => a.toolId).map((a) => a.burnoutKey))
    expect(keys).toEqual(new Set(['gig']))
  })

  it('⚠️ 도구마다 작업 단계가 있고 개수가 같다 — 켜는 화면이 도구를 가리지 않는다', () => {
    /*
     * `ToolRun`이 이 목록을 순서대로 흘려 보여 준다. 개수가 갈리면 **같은 1턴인데 어떤
     * 도구는 더 오래 걸리는 것처럼** 보여 없는 규칙이 생긴다(단계는 연출이고 업무량은
     * `WORK_PER_SESSION` 하나가 정한다). 빈 목록이면 상태 줄이 `undefined`가 된다.
     */
    const lengths = new Set(Object.values(TOOL_STEPS).map((s) => s.length))
    expect(lengths.size, '도구마다 작업 단계 수가 다르다').toBe(1)
    for (const [tool, steps] of Object.entries(TOOL_STEPS)) {
      expect(steps.length, `${tool}에 작업 단계가 없다`).toBeGreaterThan(0)
      // 문구가 같아지면 세 프로그램이 한 프로그램으로 읽힌다.
      expect(new Set(steps).size).toBe(steps.length)
    }
  })

  it('조건 없는 일감이 정확히 하나 있다 — 그몽이 통째로 닫히지 않는다', () => {
    expect(GIGS.filter((g) => !g.requiresItem && findActivity(`tool-${g.tool}`)?.requiresSubscription === undefined)).toHaveLength(1)
  })
})
