import { describe, expect, it } from 'vitest'
import { OUTFIT_BONUS, OUTFIT_ITEMS, findItem, outfitsFor } from '../data/items'
import { findActivity } from '../data/activities'
import { createInitialState, outfitBonusFor, outfitFor, runActivity } from './turn'
import { previewActivity } from '../components/apps/activityPreview'
import type { GameState, Stats } from '../types/game'

/**
 * TPO 옷 — **가지고 있으면 성장 상승분이 조금 커진다**(2026-08-08 무진장).
 *
 * ⚠️ 이 묶음이 지키는 것은 넷이다:
 *  ① 맞는 옷이 있을 때만 커진다
 *  ② **돈·행동력·멘탈은 그대로다**(경제·비용 축을 건드리면 밸런스 시뮬레이션이 흔들린다)
 *  ③ **미리보기와 실행이 같은 숫자다**(다르면 화면이 거짓말을 한다)
 *  ④ **겹쳐 쌓이지 않는다**(다 사면 배수가 되는 구조 금지)
 */
function state(over: Omit<Partial<GameState>, 'stats'> & { stats?: Partial<Stats> } = {}): GameState {
  const s = createInitialState('테스터')
  return { ...s, ...over, stats: { ...s.stats, money: 500000, ...(over.stats ?? {}) } }
}

/** 그 옷을 이미 받은 상태. 배송을 거치지 않고 인벤토리에 바로 넣는다. */
const wearing = (...itemIds: string[]) =>
  state({ inventory: itemIds.map((id) => ({ id, day: 1 })) })

describe('옷 데이터', () => {
  it('옷은 도착 효과를 갖지 않는다 — 값어치는 TPO 보너스다', () => {
    // 여기에 스탯까지 붙이면 "옷을 사면 그 자리에서 사람이 나아진다"는 이상한 말이 된다.
    for (const item of OUTFIT_ITEMS) expect(item.effects, item.id).toEqual({})
  })

  it('옷이 가리키는 활동은 실제로 있다 (죽은 보너스 방지)', () => {
    for (const item of OUTFIT_ITEMS) {
      for (const id of item.outfit!.fits) {
        expect(findActivity(id), `${item.id}가 없는 활동 ${id}을(를) 가리킨다`).toBeDefined()
      }
    }
  })

  it('활동 쪽에서도 뒤집어 찾을 수 있다', () => {
    expect(outfitsFor('gym-member').map((i) => i.id)).toEqual(['sportswear'])
    expect(outfitsFor('study')).toEqual([])
  })
})

describe('보너스 판정', () => {
  const gym = findActivity('gym-member')!

  it('맞는 옷이 없으면 0이다', () => {
    expect(outfitBonusFor(state(), 'gym-member')).toBe(0)
    expect(outfitFor(state(), 'gym-member')).toBeUndefined()
  })

  it('맞는 옷을 가지고 있으면 보너스가 붙는다', () => {
    expect(outfitBonusFor(wearing('sportswear'), 'gym-member')).toBe(OUTFIT_BONUS)
  })

  it('엉뚱한 옷은 아무 일도 하지 않는다 (TPO가 맞아야 한다)', () => {
    expect(outfitBonusFor(wearing('suit'), 'gym-member')).toBe(0)
    expect(outfitFor(wearing('suit'), 'commute')?.id).toBe('suit')
  })

  it('⚠️ 겹쳐 쌓이지 않는다 — 옷을 다 사도 보너스는 한 번이다', () => {
    const all = wearing(...OUTFIT_ITEMS.map((i) => i.id))
    expect(outfitBonusFor(all, 'gym-member')).toBe(OUTFIT_BONUS)
  })

  it('가지고만 있으면 된다 — 입고 벗는 상태가 없다', () => {
    // 인벤토리에 있으면 끝이다. 착용 필드가 생기면 이 테스트가 먼저 알려 준다.
    expect(findItem('sportswear')).toBeDefined()
    expect(outfitBonusFor(wearing('sportswear'), gym.id)).toBeGreaterThan(0)
  })
})

describe('실행 결과', () => {
  const gym = findActivity('gym-member')!

  it('운동복을 가진 채 헬스장에 가면 체력 상승분이 커진다', () => {
    const plain = runActivity(state({ inventory: [{ id: 'gym-pass', day: 1 }] }), gym)
    const dressed = runActivity(wearing('gym-pass', 'sportswear'), gym)
    expect(dressed.stats.maxStamina).toBeGreaterThan(plain.stats.maxStamina)
    // "소량"이다 — 활동 한 회분(+6)을 통째로 더 주는 것이 아니다.
    expect(dressed.stats.maxStamina - plain.stats.maxStamina).toBeLessThanOrEqual(2)
  })

  it('⚠️ 돈·행동력·멘탈은 그대로다 — 옷이 경제와 비용을 건드리지 않는다', () => {
    const work = findActivity('work')!
    const plain = runActivity(state(), work)
    // 알바에 맞는 옷은 없지만, 있더라도 money가 움직여선 안 된다는 것을 정장으로 확인한다.
    const commute = findActivity('job-interview')!
    const bare = runActivity(state({ application: undefined }), commute)
    const suited = runActivity(wearing('suit'), commute)
    expect(suited.stats.money).toBe(bare.stats.money)
    expect(suited.stats.stamina).toBe(bare.stats.stamina)
    expect(suited.stats.mental).toBe(bare.stats.mental)
    expect(plain.stats.money).toBeGreaterThan(0)
  })

  it('⚠️ 상승분이 1이어도 최소 +1은 붙는다 (정장을 사도 아무 변화가 없으면 거짓말이다)', () => {
    const interview = findActivity('job-interview')!
    const bare = runActivity(state(), interview)
    const suited = runActivity(wearing('suit'), interview)
    expect(suited.stats.sociability - bare.stats.sociability).toBe(1)
  })

  it('⚠️ 미리보기와 실행이 같은 숫자를 말한다', () => {
    const dressed = wearing('gym-pass', 'sportswear')
    const preview = previewActivity(dressed, gym)
    const after = runActivity(dressed, gym)
    const row = preview.rows.find((r) => r.key === 'maxStamina')!
    expect(after.stats.maxStamina - dressed.stats.maxStamina).toBe(row.value)
    expect(preview.outfit).toBe('기능성 운동복')
  })

  it('옷이 없으면 미리보기에 옷 이름이 없다', () => {
    expect(previewActivity(state({ inventory: [{ id: 'gym-pass', day: 1 }] }), gym).outfit)
      .toBeUndefined()
  })
})
