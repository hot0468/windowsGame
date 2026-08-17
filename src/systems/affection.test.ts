import { describe, it, expect } from 'vitest'
import {
  affectionOf,
  creditAffection,
  decayAffection,
  hasRelationEnding,
  meetMentalBonus,
  relationEndingFor,
  reviveAffection,
  stageMessages,
  stageOf,
} from './affection'
import {
  AFFECTION_CAP,
  AFFECTION_DECAY_PER_DAY,
  AFFECTION_FLOOR,
  AFFECTION_FOR_ENDING,
  AFFECTION_GRACE_DAYS,
  AFFECTION_PER_MEET,
  CLOSE_MENTAL_BONUS,
  PEOPLE,
  personOfActivity,
  personOfThread,
} from '../data/relations'
import { ACTIVITIES } from '../data/activities'
import { THREADS } from '../data/messages'
import { ENDINGS } from '../data/endings'
import { createInitialState } from './turn'
import type { GameState } from '../types/game'

/**
 * ⚠️ **관계가 깨뜨릴 수 있는 것만 덮는다.** 이 축은 돈도 턴도 만들지 않으므로 증명을 붙일
 * 자리는 둘뿐이다: **부가엔딩이 본엔딩과 섞이지 않는가**(설계자 지시의 핵심)와
 * **문턱이 판 안에서 도달 가능한가**.
 */

function fresh(): GameState {
  return createInitialState('관계')
}

function withAffection(map: Record<string, number>): GameState {
  return { ...fresh(), affection: map }
}

describe('관계 데이터', () => {
  it('인물이 가리키는 대화방과 활동이 실재한다', () => {
    const threads = new Set(THREADS.map((t) => t.id))
    const activities = new Set(ACTIVITIES.map((a) => a.id))
    for (const p of PEOPLE) {
      expect(threads, `${p.id}의 대화방`).toContain(p.threadId)
      expect(activities, `${p.id}의 활동`).toContain(p.activityId)
    }
  })

  it('id·대화방·활동·아이콘이 서로 겹치지 않는다 — 겹치면 두 사람이 한 사람이 된다', () => {
    for (const key of ['id', 'threadId', 'activityId', 'icon'] as const) {
      const values = PEOPLE.map((p) => p[key])
      expect(new Set(values).size, key).toBe(values.length)
    }
  })

  it('⚠️ 관계엔딩은 `ENDINGS`에 없다 — 본엔딩의 부가엔딩이라 같은 층에 놓이면 배타가 된다', () => {
    const endingIds = new Set(ENDINGS.map((e) => e.id))
    for (const p of PEOPLE) expect(endingIds, p.id).not.toContain(p.id)
  })

  it('역방향 조회가 양쪽 다 같은 사람을 준다', () => {
    for (const p of PEOPLE) {
      expect(personOfThread(p.threadId)?.id).toBe(p.id)
      expect(personOfActivity(p.activityId)?.id).toBe(p.id)
    }
  })
})

describe('호감도', () => {
  it('만나면 오르고 상한에서 멈춘다', () => {
    const once = creditAffection(fresh(), 'social')
    expect(affectionOf(once, 'minji')).toBe(AFFECTION_PER_MEET)
    const full = creditAffection(withAffection({ minji: AFFECTION_CAP }), 'social')
    // ⚠️ 상한이면 **같은 객체**를 돌려준다 — 호출부가 `!==`로 "올랐는가"를 물을 수 있어야 한다.
    expect(affectionOf(full, 'minji')).toBe(AFFECTION_CAP)
  })

  it('관계와 무관한 활동은 상태를 그대로 돌려준다', () => {
    const s = fresh()
    expect(creditAffection(s, 'study')).toBe(s)
  })

  it('⚠️ 통로를 가리지 않는다 — 예약으로 나간 모임도 관계를 만든다', () => {
    // 판정 근거가 활동 id뿐이므로 대화방을 거치지 않아도 같은 결과다.
    expect(affectionOf(creditAffection(fresh(), 'club'), 'club')).toBe(AFFECTION_PER_MEET)
  })
})

describe('부가엔딩', () => {
  it(`문턱(${AFFECTION_FOR_ENDING})을 넘겨야 붙는다`, () => {
    expect(hasRelationEnding(withAffection({ minji: AFFECTION_FOR_ENDING - 1 }), 'minji')).toBe(
      false,
    )
    expect(hasRelationEnding(withAffection({ minji: AFFECTION_FOR_ENDING }), 'minji')).toBe(true)
  })

  it('아무도 못 넘겼으면 부가엔딩이 없다', () => {
    expect(relationEndingFor(fresh())).toBeUndefined()
  })

  it('⚠️ 여럿이 넘겨도 가장 높은 한 사람만 나온다 — 셋을 붙이면 엔딩이 명단이 된다', () => {
    const s = withAffection({ minji: 70, family: 95, club: 60 })
    expect(relationEndingFor(s)!.id).toBe('family')
  })

  it('동점이면 목록 순서가 가른다 (무작위 금지 — 같은 세이브가 다른 답을 말하면 안 된다)', () => {
    const s = withAffection({ minji: 80, family: 80 })
    expect(relationEndingFor(s)!.id).toBe(PEOPLE.find((p) => p.id === 'minji')!.id)
    expect(relationEndingFor(s)!.id).toBe(relationEndingFor(s)!.id)
  })

  it('⚠️ 문턱이 판 안에서 도달 가능하다 — 아무도 볼 수 없는 부가엔딩은 버그다', () => {
    const meets = Math.ceil(AFFECTION_FOR_ENDING / AFFECTION_PER_MEET)
    // 한 번 만나는 데 1턴이고 하루 2턴이므로 한 사람은 meets/2일이면 채운다.
    // 판은 88~101일 남짓이라(설계 결정) 셋을 다 채워도 판 안에 들어와야 한다.
    expect((meets * PEOPLE.length) / 2).toBeLessThan(88)
    // 그러면서도 "아무 선택 없이 셋 다 열리는" 수준은 아니어야 한다(24턴 = 12일 이상).
    expect(meets * PEOPLE.length).toBeGreaterThanOrEqual(20)
  })

  /* ⚠️ **감쇠가 이 도달성을 깨지 않는가**(2026-08-14). 셋을 번갈아 만들면 한 사람을
     다시 보기까지 `PEOPLE.length`턴 = 1.5일이라 유예(5일) 안이다 — 유예를 이보다 짧게
     잡으면 **로테이션 플레이가 영영 문턱을 못 넘는다.** 그 관계를 여기서 못 박는다. */
  it('⚠️ 셋을 번갈아 만나는 플레이가 감쇠에 걸리지 않는다', () => {
    const daysPerCycle = PEOPLE.length / 2 // 하루 2턴
    expect(daysPerCycle).toBeLessThanOrEqual(AFFECTION_GRACE_DAYS)
  })
})

describe('⚠️ 안 만나면 멀어진다 (2026-08-14)', () => {
  const met = (day: number, value: number): GameState => ({
    ...createInitialState('관계'),
    day,
    affection: { minji: value },
    lastMet: { minji: 1 },
  })

  it('유예 안에는 안 식는다 — 매일 만나야 하는 게임이 되면 안 된다', () => {
    const s = met(1 + AFFECTION_GRACE_DAYS, 60)
    expect(decayAffection(s).affection!.minji).toBe(60)
  })

  it('유예를 넘기면 하루에 그만큼 식는다', () => {
    const s = met(1 + AFFECTION_GRACE_DAYS + 3, 60)
    expect(decayAffection(s).affection!.minji).toBe(60 - 3 * AFFECTION_DECAY_PER_DAY)
  })

  /* ⚠️ 이 셋이 이 축의 불변식이다 — 하나라도 깨지면 관계가 사라지거나 벌이 된다. */
  it('바닥 아래로는 안 내려간다 — 만난 적 있는 사람이 남이 되면 안 된다', () => {
    const s = met(500, 100)
    expect(decayAffection(s).affection!.minji).toBe(AFFECTION_FLOOR)
  })

  it('바닥보다 낮은 값은 **올려 주지 않는다** — 한 번 만난 사람이 공짜로 가까워지면 안 된다', () => {
    const s = met(500, AFFECTION_PER_MEET)
    expect(decayAffection(s).affection!.minji).toBe(AFFECTION_PER_MEET)
  })

  it('만나면 그날로 기록돼 다시 식지 않는다', () => {
    const s = { ...met(50, 60), lastMet: { minji: 1 } }
    const after = creditAffection(s, 'social')
    expect(after.lastMet!.minji).toBe(50)
    expect(decayAffection(after).affection!.minji).toBe(after.affection!.minji)
  })

  /* ⚠️ 상한에서도 날짜를 찍어야 한다 — 안 찍으면 가장 친한 사람이 가장 빨리 식는다. */
  it('호감도가 상한이어도 만난 날은 찍힌다', () => {
    const s = { ...met(50, AFFECTION_CAP), lastMet: { minji: 1 } }
    expect(creditAffection(s, 'social').lastMet!.minji).toBe(50)
  })

  it('만난 기록이 없는 옛 세이브는 열자마자 식지 않는다', () => {
    const s: GameState = { ...createInitialState('옛세이브'), day: 300, affection: { minji: 60 } }
    expect(decayAffection(s).affection!.minji).toBe(60)
  })

  /* ⚠️ **문턱을 되찾을 수 있어야 한다** — 못 되찾으면 방치가 곧 영구 상실이다. */
  it('바닥까지 식어도 네 번 만나면 문턱을 되찾는다', () => {
    const meets = Math.ceil((AFFECTION_FOR_ENDING - AFFECTION_FLOOR) / AFFECTION_PER_MEET)
    expect(AFFECTION_FLOOR + meets * AFFECTION_PER_MEET).toBeGreaterThanOrEqual(AFFECTION_FOR_ENDING)
    expect(meets).toBeLessThanOrEqual(5)
  })

  it('바닥이 문턱보다 낮다 — 같거나 높으면 방치해도 부가엔딩이 유지된다', () => {
    expect(AFFECTION_FLOOR).toBeLessThan(AFFECTION_FOR_ENDING)
  })
})

describe('친해지면 다른 말을 한다', () => {
  it('단계가 호감도에 따라 갈린다', () => {
    const at = (v: number): GameState => ({ ...createInitialState('단계'), affection: { minji: v } })
    expect(stageOf(at(0), 'minji')).toBe('far')
    expect(stageOf(at(AFFECTION_FLOOR + 1), 'minji')).toBe('near')
    expect(stageOf(at(AFFECTION_FOR_ENDING), 'minji')).toBe('close')
  })

  it('가까워지면 방에 말이 생기고, 서먹하면 없다', () => {
    const far: GameState = { ...createInitialState('말'), affection: {} }
    expect(stageMessages(far).some((m) => m.channel === 'minji')).toBe(false)
    const close: GameState = { ...createInitialState('말'), affection: { minji: AFFECTION_FOR_ENDING } }
    expect(stageMessages(close).some((m) => m.channel === 'minji')).toBe(true)
  })

  /* 단계가 바뀌면 **다른 말**이라야 한다 — 같으면 이 축이 아무 일도 안 한 것이다. */
  it('단계가 오르면 말이 바뀐다', () => {
    const line = (v: number) =>
      stageMessages({ ...createInitialState('말'), affection: { minji: v } }).find(
        (m) => m.channel === 'minji',
      )?.text
    expect(line(AFFECTION_FLOOR + 1)).not.toBe(line(AFFECTION_FOR_ENDING))
  })

  /* close의 말은 날짜에 따라 돌아간다(서사 비트) — 안 돌면 60을 채운 뒤 방이 박제된다. */
  it('가까운 사람의 말은 날짜가 흐르면 바뀐다', () => {
    const at = (day: number) =>
      stageMessages({
        ...createInitialState('비트'),
        day,
        affection: { minji: AFFECTION_FOR_ENDING },
      }).find((m) => m.channel === 'minji')?.text
    const seen = new Set([at(1), at(6), at(11), at(16)])
    expect(seen.size).toBeGreaterThan(1)
  })

  it('가리키는 방이 실재한다 — 없는 방의 말은 아무 데도 안 뜬다', () => {
    const s: GameState = {
      ...createInitialState('말'),
      affection: Object.fromEntries(PEOPLE.map((p) => [p.id, AFFECTION_FOR_ENDING])),
    }
    const threads = new Set(PEOPLE.map((p) => p.threadId))
    for (const m of stageMessages(s)) expect(threads).toContain(m.channel)
  })
})

describe('관계가 보상을 준다', () => {
  it('가까운 사람을 만나면 멘탈이 더 돌아온다', () => {
    const close: GameState = { ...createInitialState('보상'), affection: { minji: AFFECTION_FOR_ENDING } }
    expect(meetMentalBonus(close, 'social')).toBe(CLOSE_MENTAL_BONUS)
  })

  it('아직 안 가까우면 보너스가 없다 — 유지해야 유지되는 값이다', () => {
    const near: GameState = { ...createInitialState('보상'), affection: { minji: AFFECTION_FLOOR } }
    expect(meetMentalBonus(near, 'social')).toBe(0)
  })

  it('관계와 무관한 활동은 보너스가 없다', () => {
    const close: GameState = { ...createInitialState('보상'), affection: { minji: AFFECTION_FOR_ENDING } }
    expect(meetMentalBonus(close, 'study')).toBe(0)
  })
})

describe('세이브 보정', () => {
  it('못 믿을 칸만 버리고 나머지는 살린다', () => {
    expect(reviveAffection({ minji: NaN, family: 30 })).toEqual({ family: 30 })
    expect(reviveAffection({ minji: -5 })).toBeUndefined()
    expect(reviveAffection(undefined)).toBeUndefined()
  })

  it('모르는 인물은 버리고 상한을 넘긴 값은 자른다', () => {
    expect(reviveAffection({ 없는사람: 50, minji: 999 })).toEqual({ minji: AFFECTION_CAP })
  })
})
