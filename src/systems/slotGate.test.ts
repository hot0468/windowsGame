import { describe, it, expect } from 'vitest'
import { ACTIVITIES, findActivity } from '../data/activities'
import { blockReasons } from '../components/apps/activityPreview'
import { canRun, createInitialState } from './turn'
import type { GameState, Stats } from '../types/game'

function state(over: Omit<Partial<GameState>, 'stats'> & { stats?: Partial<Stats> } = {}): GameState {
  const s = createInitialState('테스터')
  return { ...s, ...over, stats: { ...s.stats, ...(over.stats ?? {}) } }
}

/**
 * ⚠️ **슬롯 제약이 깨뜨릴 수 있는 것만 덮는다**: 반대 슬롯 통과(스케줄러가 새는 자리),
 * 사유 침묵(왜 못 하는지 모름), 그리고 **하루가 통째로 막히는 것**.
 */
describe('슬롯 제약', () => {
  const gated = ACTIVITIES.filter((a) => a.requiresSlot)

  it('제약이 붙은 활동이 있고, 그 슬롯에서만 열린다', () => {
    expect(gated.length).toBeGreaterThan(0)
    for (const a of gated) {
      const rich = { stamina: 999, money: 9_999_999 }
      const ok = state({ slot: a.requiresSlot, stats: rich, inventory: [] })
      const no = state({
        slot: a.requiresSlot === 'morning' ? 'afternoon' : 'morning',
        stats: rich,
        inventory: [],
      })
      // 반대 슬롯이면 **반드시** 막힌다(다른 조건이 붙어 있어도 이건 독립이다).
      expect(canRun(no, a), `${a.id}가 반대 슬롯에서 열린다`).toBe(false)
      // 맞는 슬롯에서는 슬롯 때문에 막히지는 않는다(다른 조건은 별개다).
      expect(blockReasons(ok, a).some((r) => r.includes('에만 할 수 있습니다'))).toBe(false)
    }
  })

  it('⚠️ 반대 슬롯이면 사유를 글자로 말한다 — 언제 되는지까지 적는다', () => {
    for (const a of gated) {
      const no = state({ slot: a.requiresSlot === 'morning' ? 'afternoon' : 'morning' })
      const said = blockReasons(no, a).find((r) => r.includes('에만 할 수 있습니다'))
      expect(said, `${a.id}의 슬롯 사유가 없다`).toBeDefined()
    }
  })

  it('⚠️ 출근에는 안 붙는다 — 결근 감사·주말 호출이 "그날 안에 한 번"을 전제한다', () => {
    expect(findActivity('commute')!.requiresSlot).toBeUndefined()
  })

  it('⚠️ 조건 없는 알바(편의점)에는 안 붙는다 — 첫날 돈 벌 길이 좁아진다', () => {
    expect(findActivity('work')!.requiresSlot).toBeUndefined()
  })

  it('⚠️ 어느 슬롯에도 할 것이 남는다 — 하루의 절반이 통째로 막히면 안 된다', () => {
    for (const slot of ['morning', 'afternoon'] as const) {
      const open = ACTIVITIES.filter((a) => !a.requiresSlot || a.requiresSlot === slot)
      expect(open.length, `${slot}에 할 수 있는 활동이 너무 적다`).toBeGreaterThan(
        ACTIVITIES.length / 2,
      )
    }
  })

  it('⚠️ 멘탈 회복처가 두 슬롯 다에 있다 — 한쪽 슬롯에서 쉴 길이 사라지면 안 된다', () => {
    for (const slot of ['morning', 'afternoon'] as const) {
      const healers = ACTIVITIES.filter(
        (a) => (a.effects.mental ?? 0) > 0 && (!a.requiresSlot || a.requiresSlot === slot),
      )
      expect(healers.length, `${slot}에 멘탈 회복처가 없다`).toBeGreaterThan(0)
    }
  })
})
