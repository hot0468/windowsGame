import { describe, it, expect } from 'vitest'
import { migrateSave, selectPersistedState } from './gameStore'
import { createInitialState } from '../systems/turn'
import { INITIAL_STATS } from '../types/game'

const validSave = () => ({ state: createInitialState('테스터') })

describe('migrateSave — 정상 세이브', () => {
  it('진행 중 세이브를 그대로 복원한다', () => {
    const saved = validSave()
    const result = migrateSave(saved)
    expect(result.state?.playerName).toBe('테스터')
    expect(result.state?.day).toBe(1)
    expect(result.state?.gameOver).toBeNull()
  })

  it('진행 중인 스탯 값을 보존한다', () => {
    const saved = { state: { ...createInitialState('t'), day: 12, stats: { ...INITIAL_STATS, money: 777 } } }
    const result = migrateSave(saved)
    expect(result.state?.day).toBe(12)
    expect(result.state?.stats.money).toBe(777)
  })

  it('게임오버 세이브도 형식이 맞으면 복원한다', () => {
    const saved = { state: { ...createInitialState('t'), gameOver: 'bankrupt' as const } }
    expect(migrateSave(saved).state?.gameOver).toBe('bankrupt')
  })

  it('개명 전 세이브의 intelligence를 knowledge로 넘겨받는다', () => {
    // 스탯 개명(지능→지식) 이전 세이브: knowledge가 없고 intelligence만 있다.
    const { knowledge: _drop, ...rest } = INITIAL_STATS
    const legacyStats = { ...rest, intelligence: 55 }
    const saved = { state: { ...createInitialState('t'), stats: legacyStats } }
    const result = migrateSave(saved as never)
    expect(result.state?.stats.knowledge).toBe(55)
    expect('intelligence' in (result.state?.stats ?? {})).toBe(false)
  })

  it('두 키가 공존하면 새 키(knowledge)를 우선한다', () => {
    const saved = {
      state: {
        ...createInitialState('t'),
        stats: { ...INITIAL_STATS, knowledge: 70, intelligence: 55 },
      },
    }
    const result = migrateSave(saved as never)
    expect(result.state?.stats.knowledge).toBe(70)
  })
})

describe('migrateSave — 손상/부분 세이브 거부', () => {
  it('세이브가 없으면 null을 반환한다', () => {
    expect(migrateSave({ state: null }).state).toBeNull()
  })

  it('persisted 자체가 없으면 null을 반환한다', () => {
    expect(migrateSave(undefined).state).toBeNull()
    expect(migrateSave(null).state).toBeNull()
  })

  it('스탯이 통째로 빠지면 기본 스탯으로 채운다', () => {
    const saved = { state: { playerName: 'x', day: 3, slot: 'morning', recentActivities: [], seenEndingIds: [], gameOver: null } }
    const result = migrateSave(saved)
    expect(result.state?.stats.money).toBe(INITIAL_STATS.money)
    expect(result.state?.stats.mental).toBe(INITIAL_STATS.mental)
  })

  it('스탯 키가 일부만 있으면 나머지를 기본값으로 채운다', () => {
    const saved = { state: { ...createInitialState('t'), stats: { money: 50000 } } }
    const result = migrateSave(saved)
    expect(result.state?.stats.money).toBe(50000)
    // 빠진 키가 undefined로 남으면 clampStats가 NaN을 만든다.
    expect(result.state?.stats.maxStamina).toBe(INITIAL_STATS.maxStamina)
    expect(Number.isFinite(result.state?.stats.stamina)).toBe(true)
  })

  it('스탯이 숫자가 아니면 세이브를 버린다', () => {
    const saved = { state: { ...createInitialState('t'), stats: { ...INITIAL_STATS, money: 'a lot' } } }
    expect(migrateSave(saved).state).toBeNull()
  })

  it('스탯이 NaN이면 세이브를 버린다', () => {
    const saved = { state: { ...createInitialState('t'), stats: { ...INITIAL_STATS, mental: NaN } } }
    expect(migrateSave(saved).state).toBeNull()
  })

  it('스탯이 Infinity면 세이브를 버린다', () => {
    const saved = { state: { ...createInitialState('t'), stats: { ...INITIAL_STATS, stamina: Infinity } } }
    expect(migrateSave(saved).state).toBeNull()
  })

  it('날짜가 비정상이면 세이브를 버린다', () => {
    const saved = { state: { ...createInitialState('t'), day: 0 } }
    expect(migrateSave(saved).state).toBeNull()
  })

  it('복원된 스탯은 항상 모두 유한한 숫자다', () => {
    const saved = { state: { ...createInitialState('t'), stats: { knowledge: 5 } } }
    const stats = migrateSave(saved).state!.stats
    for (const v of Object.values(stats)) expect(Number.isFinite(v)).toBe(true)
  })

  it('망가진 배열 필드를 안전한 빈 배열로 만든다', () => {
    const saved = { state: { ...createInitialState('t'), recentActivities: 'nope', seenEndingIds: 3 } }
    const result = migrateSave(saved)
    expect(result.state?.recentActivities).toEqual([])
    expect(result.state?.seenEndingIds).toEqual([])
  })

  it('알 수 없는 gameOver 값은 진행 중으로 취급한다', () => {
    const saved = { state: { ...createInitialState('t'), gameOver: 'meteor' } }
    expect(migrateSave(saved).state?.gameOver).toBeNull()
  })

  it('어떤 입력에도 throw하지 않는다', () => {
    for (const bad of [0, '', 'string', [], { state: 1 }, { state: [] }, { state: { stats: null } }]) {
      expect(() => migrateSave(bad)).not.toThrow()
    }
  })
})

describe('selectPersistedState — 끝난 게임 세이브 정리', () => {
  it('진행 중인 세이브는 저장한다', () => {
    const state = createInitialState('테스터')
    expect(selectPersistedState(state).state).toBe(state)
  })

  it('파산으로 끝난 세이브는 저장하지 않는다', () => {
    const state = { ...createInitialState('t'), gameOver: 'bankrupt' as const }
    expect(selectPersistedState(state).state).toBeNull()
  })

  it('번아웃으로 끝난 세이브는 저장하지 않는다', () => {
    const state = { ...createInitialState('t'), gameOver: 'burnout' as const }
    expect(selectPersistedState(state).state).toBeNull()
  })

  it('세이브가 없으면 그대로 null이다', () => {
    expect(selectPersistedState(null).state).toBeNull()
  })

  it('저장된 세이브를 다시 복원하면 항상 이어할 수 있다', () => {
    // 저장 → 복원 왕복 후 gameOver가 남아 있으면 잠금화면이 이어하기를 못 준다.
    const dead = { ...createInitialState('t'), gameOver: 'bankrupt' as const }
    const restored = migrateSave(selectPersistedState(dead))
    expect(restored.state).toBeNull()

    const alive = createInitialState('살아있음')
    expect(migrateSave(selectPersistedState(alive)).state?.gameOver).toBeNull()
  })
})

/**
 * 정규직 상태의 세이브 왕복 (2026-08-05).
 *
 * ⚠️ **이 상태는 돈을 만든다.** 없는 공고를 가리키거나 숫자가 NaN인 채로 통과하면
 * 급여가 NaN이 되고, `NaN <= 0`이 false라 파산 판정이 영영 안 걸린다 —
 * 스탯 검증이 막는 것과 정확히 같은 형태의 사고다.
 */
describe('migrateSave — 정규직', () => {
  const employed = () => ({
    state: {
      ...createInitialState('직장인'),
      day: 30,
      application: {
        careerId: 'nulbom-edu',
        appliedDay: 28,
        stage: 'screening' as const,
        dueDay: 31,
      },
      employment: {
        careerId: 'dasom-office',
        hiredDay: 20,
        paydayDay: 35,
        attendedDays: [21, 22],
        absences: 1,
        checkedDay: 29,
      },
      jobNotices: [
        {
          id: 'hired-dasom-office-20-morning',
          kind: 'hired' as const,
          careerId: 'dasom-office',
          day: 20,
          slot: 'morning' as const,
        },
      ],
    },
  })

  it('재직·지원·소식을 그대로 되돌린다 — 새로고침해도 절차가 이어진다', () => {
    const r = migrateSave(employed())
    expect(r.state?.employment?.careerId).toBe('dasom-office')
    expect(r.state?.employment?.attendedDays).toEqual([21, 22])
    expect(r.state?.employment?.absences).toBe(1)
    expect(r.state?.application?.stage).toBe('screening')
    expect(r.state?.jobNotices).toHaveLength(1)
  })

  it('정규직이 생기기 전의 세이브는 무직으로 읽힌다 — 마이그레이션이 필요 없다', () => {
    const r = migrateSave({ state: createInitialState('구버전') })
    expect(r.state?.employment).toBeUndefined()
    expect(r.state?.application).toBeUndefined()
    expect(r.state?.jobNotices).toBeUndefined()
    expect(r.state?.peakCareerId).toBeUndefined()
  })

  /* ── 최고 경력 (2026-08-05, 직업 엔딩) ─────────────────────────────────
   * 파산 엔딩이 이 값 하나로 갈린다. 없거나 깨진 세이브가 크래시를 내면 안 되고,
   * 없다고 해서 다니던 회사가 없던 일이 되어도 안 된다.
   */
  it('최고 경력을 그대로 되돌린다', () => {
    const save = employed() as { state: Record<string, unknown> }
    save.state.peakCareerId = 'cheongram-group'
    expect(migrateSave(save).state?.peakCareerId).toBe('cheongram-group')
  })

  it('필드가 없던 세이브는 재직 중인 회사로 메운다 — 다니는 회사가 있는데 무직으로 죽을 수는 없다', () => {
    const r = migrateSave(employed())
    expect(r.state?.peakCareerId).toBe('dasom-office')
  })

  it('없는 공고를 가리키면 버린다 — 그러면 그냥 파산 엔딩이 된다', () => {
    const save = employed() as { state: Record<string, unknown> }
    save.state.peakCareerId = '없는회사'
    save.state.employment = undefined
    expect(migrateSave(save).state?.peakCareerId).toBeUndefined()
  })

  it('최고 경력이 없는 옛 세이브도 크래시 없이 열린다', () => {
    const save = employed() as { state: Record<string, unknown> }
    save.state.employment = undefined
    expect(() => migrateSave(save)).not.toThrow()
    expect(migrateSave(save).state?.peakCareerId).toBeUndefined()
  })

  it('없는 공고를 가리키는 재직 상태는 버린다 — 급여를 만들 근거가 없다', () => {
    const save = employed()
    save.state.employment.careerId = '없는회사'
    expect(migrateSave(save).state?.employment).toBeUndefined()
  })

  it('숫자가 깨진 재직 상태는 버린다 — NaN 급여는 파산 판정을 무력화한다', () => {
    const save = employed()
    ;(save.state.employment as { paydayDay: number }).paydayDay = Number.NaN
    expect(migrateSave(save).state?.employment).toBeUndefined()
  })
})

/* ── 이사 · 복권 (2026-08-05) ──────────────────────────────────────────────
 *
 * ⚠️ **둘 다 돈을 만지는 상태라 검증이 다른 옵셔널 필드보다 빡빡하다**
 * (`reviveJob`·`reviveBank`와 같은 이유). 숫자가 NaN이면 그것이 소지금으로 흘러
 * `NaN <= 0`이 false가 되어 **파산이 영영 안 걸린다**.
 */
describe('migrateSave — 이사', () => {
  const moved = () => ({
    state: {
      ...createInitialState('이사'),
      housing: { id: 'gosiwon', movedDay: 30, deposit: 2_100_000 },
    },
  })

  it('사는 집을 그대로 복원한다', () => {
    expect(migrateSave(moved()).state?.housing).toEqual({
      id: 'gosiwon',
      movedDay: 30,
      deposit: 2_100_000,
    })
  })

  it('⚠️ 왕복해도 값이 그대로다 — 세이브를 열 때마다 집이 바뀌면 안 된다', () => {
    const once = migrateSave(moved()).state!
    const twice = migrateSave({ state: once }).state!
    expect(twice.housing).toEqual(once.housing)
  })

  it('이사한 적 없는 옛 세이브는 필드가 없고 그대로 열린다 (마이그레이션 불필요)', () => {
    expect(migrateSave({ state: createInitialState('옛') }).state?.housing).toBeUndefined()
  })

  it('없는 매물을 가리키면 버린다 — 배율을 못 찾으면 생활비가 NaN이 된다', () => {
    const save = moved()
    save.state.housing.id = '없는방'
    expect(migrateSave(save).state?.housing).toBeUndefined()
  })

  it('보증금이 NaN이면 버린다 — 이사할 때 소지금으로 흘러 파산을 무력화한다', () => {
    const save = moved()
    save.state.housing.deposit = Number.NaN
    expect(migrateSave(save).state?.housing).toBeUndefined()
  })

  it('음수 보증금도 버린다', () => {
    const save = moved()
    save.state.housing.deposit = -1
    expect(migrateSave(save).state?.housing).toBeUndefined()
  })
})

describe('migrateSave — 복권', () => {
  const played = () => ({
    state: {
      ...createInitialState('복권'),
      lottery: {
        serial: 17,
        spent: 170_000,
        won: 30_000,
        pending: 20_000,
        tickets: [{ id: 'ticket-17', day: 5, amount: 20_000, prize: '5등' }],
      },
    },
  })

  it('복권 기록을 그대로 복원한다', () => {
    const l = migrateSave(played()).state?.lottery
    expect(l?.serial).toBe(17)
    expect(l?.pending).toBe(20_000)
    expect(l?.tickets).toHaveLength(1)
  })

  /**
   * ⚠️ **`serial`이 굴림의 시드다.** 세이브를 열 때 값이 달라지면 이미 산 표가
   * 전부 다시 굴러가고, 그 순간 "새로 고침"이 최적 전략이 된다(세이브 스커밍).
   */
  it('⚠️ 왕복해도 일련번호가 그대로다 — 새로 고침으로 재굴림할 수 없다', () => {
    const once = migrateSave(played()).state!
    const twice = migrateSave({ state: once }).state!
    expect(twice.lottery?.serial).toBe(17)
    expect(twice.lottery).toEqual(once.lottery)
  })

  it('산 적 없는 옛 세이브는 필드가 없고 그대로 열린다', () => {
    expect(migrateSave({ state: createInitialState('옛') }).state?.lottery).toBeUndefined()
  })

  it('일련번호가 깨지면 버린다 — 시드를 못 믿으면 기록 전체를 못 믿는다', () => {
    const save = played()
    save.state.lottery.serial = Number.NaN
    expect(migrateSave(save).state?.lottery).toBeUndefined()
  })

  it('당첨 대기금이 NaN이면 버린다 — 소지금으로 흘러 파산을 무력화한다', () => {
    const save = played()
    save.state.lottery.pending = Number.NaN
    expect(migrateSave(save).state?.lottery).toBeUndefined()
  })

  it('음수 대기금도 버린다', () => {
    const save = played()
    save.state.lottery.pending = -100
    expect(migrateSave(save).state?.lottery).toBeUndefined()
  })

  it('깨진 표 한 장은 그것만 걸러 낸다 (기록 전체를 버리지 않는다)', () => {
    const save = played()
    ;(save.state.lottery.tickets as unknown[]).push({ id: 42, day: 'x', amount: null })
    expect(migrateSave(save).state?.lottery?.tickets).toHaveLength(1)
  })
})
