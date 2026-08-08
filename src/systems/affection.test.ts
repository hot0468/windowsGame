import { describe, it, expect } from 'vitest'
import {
  affectionOf,
  creditAffection,
  hasRelationEnding,
  relationEndingFor,
  reviveAffection,
} from './affection'
import {
  AFFECTION_CAP,
  AFFECTION_FOR_ENDING,
  AFFECTION_PER_MEET,
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
