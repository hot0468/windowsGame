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
  canDeliver,
  deliverBlockers,
  deliverGig,
  gigProgress,
  takeBlockers,
  takeGig,
} from './gigs'
import { createInitialState, runActivity } from './turn'
import { GIGS, MISS_REPUTATION_PENALTY, TOOL_STEPS, findGig } from '../data/gigs'
import { ACTIVITIES, findActivity } from '../data/activities'
import { BASE_LIVING_COST, INCOME_CAP_RATIO } from '../data/economy'
import { rankOfWork, worksOf } from './works'
import { BASE_GAIN, SKILL_GAIN } from '../data/works'
import { RANK_ORDER } from './rankScale'
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
    /* ⚠️ 자원을 계속 채운다 — 30번을 켜면 15일이 지나 생활비로 파산하는데, 이 파일이
       보려는 것은 생계가 아니라 **작업물과 납품**이다. */
    s = runActivity(
      { ...s, stats: { ...s.stats, stamina: 200, mental: 100, money: 5_000_000 } },
      TOOL,
    )
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
    /* ⚠️ 계약에 진척이 없다(2026-08-22) — 진척은 작업물이 갖는다. */
    expect(gigProgress(after).done).toBe(0)
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
    const over: GameState = { ...s, recovery: { kind: 'bankrupt', startedDay: 1, daysLeft: 3 } }
    expect(takeGig(over, FREE.id)).toBe(over)
  })
})

describe('작업과 납품', () => {
  /* ⚠️ **도구를 켜면 작업물이 생기고 보강된다**(2026-08-22 재설계) — 예전에는 계약의
     업무량 숫자만 올랐다. 스탯이 낮으면 게이지가 천천히 차므로 **횟수가 아니라 등급**이
     끝을 정한다. */
  it('도구를 켜면 그 일감의 작업물이 생긴다', () => {
    let s = takeGig(ready(), FREE.id)
    s = work(s, 1)
    const works = gigProgress(s).works
    expect(works).toHaveLength(1)
    expect(works[0].gigId).toBe(FREE.id)
  })

  it('⚠️ 의뢰 작업물은 F에서 시작한다 — 남이 시킨 것은 처음부터 잘 나오지 않는다', () => {
    const s = work(takeGig(ready(), FREE.id), 1)
    expect(rankOfWork(gigProgress(s).works[0])).toBe('F')
  })

  it('계속 켜면 등급이 올라 요구 등급에 닿는다', () => {
    let s = takeGig(ready(), FREE.id)
    s = work(s, 30)
    expect(gigProgress(s).done).toBe(FREE.wants.count)
    expect(canDeliver(s)).toBe(true)
  })

  it('⚠️ 다 채워도 회신 전에는 돈이 안 들어온다 — 회신이 장식이 되면 안 된다', () => {
    const filled = work(takeGig(ready(), FREE.id), 30)
    /* 회신 전에는 계약이 살아 있고 번 것이 0이다 — 도구를 아무리 켜도 돈은 안 들어온다. */
    expect(activeContract(filled)).toBeDefined()
    expect(gigsOf(filled).earned).toBe(0)
    const paid = deliverGig(filled)
    expect(paid.stats.money - filled.stats.money).toBe(FREE.pay)
    expect(activeContract(paid)).toBeUndefined()
    expect(isDone(paid, FREE.id)).toBe(true)
    expect(gigsOf(paid).earned).toBe(FREE.pay)
  })

  it('모자란 채로 회신하면 아무 일도 없고 사유가 나온다', () => {
    const half = work(takeGig(ready(), FREE.id), 1)
    expect(canDeliver(half)).toBe(false)
    expect(deliverBlockers(half)[0]).toContain(FREE.wants.rank)
    expect(deliverGig(half)).toBe(half)
  })

  it('다른 도구로는 그 일감이 안 채워진다', () => {
    const other = ACTIVITIES.find((a) => a.toolId && a.toolId !== FREE.tool)!
    const taken = takeGig(ready(), FREE.id)
    const after = runActivity(taken, other)
    expect(gigProgress(after).done).toBe(0)
    expect(gigProgress(after).works).toHaveLength(0)
  })

  it('받아 둔 일이 없어도 도구는 켤 수 있다 — 개인 작업물이 남는다', () => {
    const s = ready()
    const after = runActivity(s, TOOL)
    expect(after.gigs).toBeUndefined()
    expect(worksOf(after)).toHaveLength(1)
    expect(worksOf(after)[0].gigId).toBeUndefined()
  })

  it('같은 일감을 두 번 받을 수 없다', () => {
    const done = deliverGig(work(takeGig(ready(), FREE.id), 30))
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
  /* 회당 보수 = 보수 ÷ **최소 세션 수**(등급 하나에 필요한 보강 횟수 × 개수). 실력이
     최고여도 이보다 빨리는 못 끝낸다. */
  const minSessions = (g: (typeof GIGS)[number]) =>
    Math.max(1, Math.ceil(RANK_ORDER.indexOf(g.wants.rank) / (BASE_GAIN + SKILL_GAIN)) * g.wants.count)
  const best = GIGS.reduce((a, g) => (g.pay / minSessions(g) > a.pay / minSessions(a) ? g : a))
  const perTurn = best.pay / minSessions(best)
  const ceiling = BASE_LIVING_COST * INCOME_CAP_RATIO.gig

  it('가장 좋은 일감도 하루 수입이 생활비 8배를 넘지 않는다', () => {
    // 하루는 슬롯 둘이므로 "회당 보수 × 2"가 하루 최대 수입이다.
    expect(perTurn * 2).toBeLessThan(ceiling)
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
      expect(g.wants.count).toBeGreaterThan(0)
      expect(RANK_ORDER).toContain(g.wants.rank)
      /* ⚠️ 기한은 **최소 세션 수의 절반**(하루 두 슬롯)보다 넉넉해야 한다 — 최고 실력으로도
         못 끝내는 기한이면 그 일감은 선택지가 아니라 함정이다. */
      expect(g.days, `${g.id}의 기한이 너무 짧다`).toBeGreaterThanOrEqual(minSessions(g) / 2)
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
