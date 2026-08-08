import { describe, it, expect } from 'vitest'
import {
  createInitialState,
  canRun,
  runActivity,
  skipSlot,
  STAMINA_CAP,
  GROWTH_STAT_CAP,
  growthCap,
  MENTAL_CAP,
  AD_BONUS_MONEY,
  canClaimAdBonus,
  claimAdBonus,
} from './turn'
import { ACTIVITIES, findActivity } from '../data/activities'
import { livingCostForDay } from './economy'
import { GROWTH_STAT_KEYS, INITIAL_STATS, STAT_NAMES } from '../types/game'
import type { GameState } from '../types/game'

const study = findActivity('study')!
const work = findActivity('work')!
const exercise = findActivity('exercise')!

/** 테스트용 상태 생성 헬퍼. */
const stateWith = (overrides: Partial<GameState>): GameState => ({
  ...createInitialState('테스터'),
  ...overrides,
})

describe('createInitialState', () => {
  it('플레이어 이름을 설정한다', () => {
    expect(createInitialState('김철수').playerName).toBe('김철수')
  })

  it('1일차 오전에 시작한다', () => {
    const s = createInitialState('김철수')
    expect(s.day).toBe(1)
    expect(s.slot).toBe('morning')
  })

  it('게임오버 상태가 아니다', () => {
    expect(createInitialState('김철수').gameOver).toBeNull()
  })
})

describe('canRun', () => {
  it('요구 스탯을 충족하면 실행 가능하다', () => {
    expect(canRun(createInitialState('t'), study)).toBe(true)
  })

  it('체력이 부족하면 실행 불가하다', () => {
    const s = stateWith({ stats: { ...createInitialState('t').stats, stamina: 5 } })
    expect(canRun(s, study)).toBe(false)
  })

  it('돈이 부족하면 실행 불가하다', () => {
    const social = findActivity('social')!
    const s = stateWith({ stats: { ...createInitialState('t').stats, money: 100 } })
    expect(canRun(s, social)).toBe(false)
  })

  /*
   * 아이템 잠금(`requiresItem`). 화면이 아니라 **여기서** 막혀야 스케줄러에 미리
   * 넣어 둔 예약도 같은 규칙을 받는다 — 그러지 않으면 회원권 없이 회원 요금으로 운동한다.
   */
  describe('requiresItem 잠금', () => {
    const gymMember = findActivity('gym-member')!
    const gymDay = findActivity('gym-day')!

    it('요구 아이템이 없으면 스탯이 충분해도 실행 불가하다', () => {
      const s = createInitialState('t')
      expect(canRun(s, gymMember)).toBe(false)
    })

    it('아이템을 보유하면 실행 가능해진다', () => {
      const s = stateWith({ inventory: [{ id: 'gym-pass', day: 1 }] })
      expect(canRun(s, gymMember)).toBe(true)
    })

    it('아이템이 있어도 스탯 조건은 따로 본다', () => {
      const s = stateWith({
        inventory: [{ id: 'gym-pass', day: 1 }],
        stats: { ...createInitialState('t').stats, stamina: 5 },
      })
      expect(canRun(s, gymMember)).toBe(false)
    })

    it('다른 아이템만 갖고 있으면 열리지 않는다', () => {
      const s = stateWith({ inventory: [{ id: 'laptop', day: 1 }] })
      expect(canRun(s, gymMember)).toBe(false)
    })

    it('잠금 덕분에 1일권이 지배당하지 않는다 — 회원권이 없는 동안 쓸 수 있는 쪽은 1일권뿐이다', () => {
      const s = createInitialState('t')
      expect(canRun(s, gymDay)).toBe(true)
      expect(canRun(s, gymMember)).toBe(false)
    })
  })

  it('게임오버 상태에서는 실행 불가하다', () => {
    expect(canRun(stateWith({ gameOver: 'bankrupt' }), study)).toBe(false)
  })
})

describe('runActivity — 스탯 적용', () => {
  it('활동 효과를 스탯에 반영한다', () => {
    const before = createInitialState('t')
    const after = runActivity(before, study)
    expect(after.stats.knowledge).toBe(before.stats.knowledge + 6)
  })

  it('체력을 소모한다', () => {
    const before = createInitialState('t')
    const after = runActivity(before, study)
    expect(after.stats.stamina).toBe(before.stats.stamina - 15)
  })

  it('원본 상태를 변경하지 않는다', () => {
    const before = createInitialState('t')
    const snapshot = before.stats.knowledge
    runActivity(before, study)
    expect(before.stats.knowledge).toBe(snapshot)
  })

  it('체력은 0 아래로 내려가지 않는다', () => {
    const s = stateWith({ stats: { ...createInitialState('t').stats, stamina: 16 } })
    expect(runActivity(s, study).stats.stamina).toBe(1)
  })

  it('취침 회복으로도 체력은 상한을 넘지 않는다', () => {
    // 오후에 활동하면 취침 회복(`SLEEP_RECOVERY`)이 붙는다.
    // 체력이 이미 높으면 상한을 넘겨야 하는데, 클램핑이 이를 막는지 확인한다.
    const s = stateWith({
      slot: 'afternoon',
      stats: { ...createInitialState('t').stats, stamina: STAMINA_CAP },
    })
    const after = runActivity(s, findActivity('game')!)
    expect(after.stats.stamina).toBe(STAMINA_CAP)
  })

  it('상한을 넘긴 세이브 값도 상한으로 끌어내린다', () => {
    const s = stateWith({
      stats: { ...createInitialState('t').stats, stamina: 9999 },
    })
    expect(runActivity(s, study).stats.stamina).toBeLessThanOrEqual(STAMINA_CAP)
  })

  it('⚠️ 어떤 활동도 체력 상한을 올리지 못한다 — 상한은 모두에게 같다', () => {
    // 2026-08-08 통합: 예전에는 운동이 `maxStamina`(그릇)를 키웠고, 그래서 키울수록
    // 체력이 덜 묶였다. 상한을 고정으로 되돌리지 말 것.
    let s = createInitialState('t')
    for (let i = 0; i < 300; i++) {
      s = canRun(s, exercise) ? runActivity(s, exercise) : skipSlot(s)
      if (s.gameOver) break
      expect(s.stats.stamina).toBeLessThanOrEqual(STAMINA_CAP)
    }
  })

  it('운동은 이제 운동 스탯을 올린다 — 몸을 키운 결과가 가는 자리', () => {
    const s = createInitialState('t')
    expect(runActivity(s, exercise).stats.athletics).toBeGreaterThan(s.stats.athletics)
  })

  it('알바비에 물가 배율이 적용된다', () => {
    const early = runActivity(stateWith({ day: 1 }), work)
    const late = runActivity(stateWith({ day: 51 }), work)
    const earlyGain = early.stats.money - 300000
    const lateGain = late.stats.money - 300000
    expect(lateGain).toBeGreaterThan(earlyGain)
  })
})

describe('스탯 상한', () => {
  it('성장 스탯은 999를 상한으로 하고, 다섯 곳이 함께 갱신돼 있다', () => {
    expect(GROWTH_STAT_CAP).toBe(999)
    /* ⚠️ **개수를 박지 않는다**(2026-08-08 음악 신설). 스탯을 하나 늘릴 때마다 이 숫자만
       고치게 되는데, 정작 잡고 싶은 사고는 "`STAT_NAMES`·`INITIAL_STATS` 갱신을 빠뜨리는 것"
       이다 — 그건 개수가 아니라 **맞물림**을 봐야 잡힌다(`Record<keyof Stats, …>`가 빌드에서
       먼저 터지지만, 키 목록에 안 넣는 실수는 빌드가 못 잡는다). */
    expect(GROWTH_STAT_KEYS.length).toBeGreaterThanOrEqual(12)
    for (const key of GROWTH_STAT_KEYS) {
      expect(STAT_NAMES[key], `${key}의 한국어 라벨`).toBeTruthy()
      expect(INITIAL_STATS[key], `${key}의 시작값`).toBeDefined()
    }
  })

  it('상한을 넘긴 성장 스탯은 각자의 상한으로 끌어내린다', () => {
    // 평판·도덕만 100이고 나머지는 999다 — growthCap()이 스탯별 상한의 단일 출처다.
    const base = createInitialState('t').stats
    const inflated = { ...base }
    for (const key of GROWTH_STAT_KEYS) inflated[key] = 99999
    const after = runActivity(stateWith({ stats: inflated }), study)
    for (const key of GROWTH_STAT_KEYS) {
      expect(after.stats[key]).toBe(growthCap(key))
    }
  })

  it('성장 스탯은 상한 직전에서 활동해도 999를 넘지 않는다', () => {
    // 공부는 knowledge +6이므로 998에서 실행하면 1004가 되어야 하지만 상한에 걸린다.
    const s = stateWith({ stats: { ...createInitialState('t').stats, knowledge: 998 } })
    expect(runActivity(s, study).stats.knowledge).toBe(GROWTH_STAT_CAP)
  })

  it('평판·도덕만 상한이 100이고 나머지 성장 스탯은 999다', () => {
    // 표시(스탯창 게이지)와 클램프가 같은 growthCap()을 보므로 여기만 지키면 어긋나지 않는다.
    expect(growthCap('reputation')).toBe(100)
    expect(growthCap('morality')).toBe(100)
    expect(growthCap('knowledge')).toBe(GROWTH_STAT_CAP)
    // 상한 위로 저장돼 있어도 클램프가 끌어내린다.
    const s = stateWith({
      stats: { ...createInitialState('t').stats, reputation: 500, morality: 500 },
    })
    const after = runActivity(s, study).stats
    expect(after.reputation).toBe(100)
    expect(after.morality).toBe(100)
  })

  it('성장 스탯은 0 아래로 내려가지 않는다', () => {
    // 게임은 knowledge -1이다. 0에서 실행해도 음수가 되면 안 된다.
    const s = stateWith({ stats: { ...createInitialState('t').stats, knowledge: 0 } })
    expect(runActivity(s, findActivity('game')!).stats.knowledge).toBe(0)
  })

  /*
   * ⚠️ 이 테스트는 뒤집혔다(2026-08-04). 예전에는 "신규 스탯 8종은 어떤 활동으로도
   * 오르지 않는다"를 지켰다 — 활동이 5종뿐이던 시절의 의도였다. 활동 8종을 추가해
   * 10종 전부에 육성 경로가 생겼으므로, 이제 지켜야 할 것은 정반대다.
   * "무엇이 안 오르나"는 `data/activities.test.ts`가 목록 순회로 훨씬 촘촘히 본다.
   */
  it('신규 스탯 8종도 0에서 시작하지만 이제는 오른다', () => {
    const newKeys = [
      'sensitivity',
      'reputation',
      'morality',
      'creativity',
      'sociability',
      'vocabulary',
      'athletics',
      'gaming',
    ] as const
    const fresh = createInitialState('t')
    for (const key of newKeys) expect(fresh.stats[key]).toBe(0)

    // 각 스탯을 올리는 활동을 하나씩 골라 실제로 실행해 본다.
    // 데이터에서 찾으므로 활동 id가 바뀌어도 따라간다.
    for (const key of newKeys) {
      const s = stateWith({ stats: { ...fresh.stats, money: 500000 } })
      // ⚠️ **새 판에서 바로 할 수 있는** 활동으로 고른다(2026-08-05).
      // 알바 4종처럼 스탯 조건이 걸린 활동이 먼저 걸리면 첫 판에서는 실행할 수 없는데,
      // 그건 데이터가 틀린 게 아니라 의도다. 여기서 지켜야 하는 것은 "그 스탯을 올리는
      // 활동이 있다"가 아니라 **"시작하자마자 올릴 길이 있다"**이다.
      const activity = ACTIVITIES.find(
        (a) => (a.effects[key] ?? 0) > 0 && !a.requiresItem && canRun(s, a),
      )
      expect(activity, `${key}를 새 판에서 올릴 수 있는 활동이 없다`).toBeDefined()
      expect(runActivity(s, activity!).stats[key]).toBeGreaterThan(0)
    }
  })

  it('멘탈 상한은 100으로 유지된다', () => {
    expect(MENTAL_CAP).toBe(100)
    // 게임은 멘탈 +18이다. 100에서 실행해도 상한을 넘으면 안 된다.
    const s = stateWith({ stats: { ...createInitialState('t').stats, mental: 100 } })
    expect(runActivity(s, findActivity('game')!).stats.mental).toBe(MENTAL_CAP)
  })

  it('멘탈 상한은 성장 스탯 상한과 별개다', () => {
    expect(MENTAL_CAP).toBeLessThan(GROWTH_STAT_CAP)
    const s = stateWith({ stats: { ...createInitialState('t').stats, mental: 9999 } })
    expect(runActivity(s, study).stats.mental).toBe(MENTAL_CAP)
  })

  it('체력 상한은 성장 스탯 상한에 휩쓸리지 않는다', () => {
    expect(STAMINA_CAP).toBeLessThan(GROWTH_STAT_CAP)
    const s = stateWith({
      stats: { ...createInitialState('t').stats, stamina: GROWTH_STAT_CAP },
    })
    expect(runActivity(s, study).stats.stamina).toBeLessThanOrEqual(STAMINA_CAP)
  })
})

describe('runActivity — 슬롯과 날짜 전환', () => {
  it('오전 활동 후 오후로 넘어가고 날짜는 그대로다', () => {
    const after = runActivity(createInitialState('t'), study)
    expect(after.slot).toBe('afternoon')
    expect(after.day).toBe(1)
  })

  it('오후 활동 후 다음 날 오전이 된다', () => {
    const after = runActivity(stateWith({ slot: 'afternoon' }), study)
    expect(after.slot).toBe('morning')
    expect(after.day).toBe(2)
  })
})

describe('runActivity — 취침 정산', () => {
  it('하루가 끝나면 생활비가 차감된다', () => {
    const before = stateWith({ slot: 'afternoon' })
    const after = runActivity(before, study)
    const activityMoney = 0
    expect(after.stats.money).toBe(before.stats.money + activityMoney - livingCostForDay(1))
  })

  it('하루가 끝나면 체력이 회복된다', () => {
    const before = stateWith({
      slot: 'afternoon',
      stats: { ...createInitialState('t').stats, stamina: 50 },
    })
    const after = runActivity(before, study)
    expect(after.stats.stamina).toBeGreaterThan(50 - 15)
  })

  it('오전 활동에는 생활비가 차감되지 않는다', () => {
    const before = createInitialState('t')
    const after = runActivity(before, study)
    expect(after.stats.money).toBe(before.stats.money)
  })
})

describe('runActivity — 번아웃', () => {
  it('활동 이력에 기록된다', () => {
    expect(runActivity(createInitialState('t'), study).recentActivities).toEqual(['study'])
  })

  it('연속 실행하면 효율이 떨어져 스탯 상승폭이 줄어든다', () => {
    const fresh = createInitialState('t')
    const firstGain = runActivity(fresh, study).stats.knowledge - fresh.stats.knowledge

    const repeated = stateWith({ recentActivities: ['study', 'study', 'study'] })
    const repeatedGain =
      runActivity(repeated, study).stats.knowledge - repeated.stats.knowledge

    expect(repeatedGain).toBeLessThan(firstGain)
  })

  it('연속 실행하면 멘탈이 추가로 소모된다', () => {
    const fresh = createInitialState('t')
    const freshLoss = fresh.stats.mental - runActivity(fresh, study).stats.mental

    const repeated = stateWith({ recentActivities: ['study', 'study', 'study'] })
    const repeatedLoss = repeated.stats.mental - runActivity(repeated, study).stats.mental

    expect(repeatedLoss).toBeGreaterThan(freshLoss)
  })
})

describe('runActivity — 게임오버 판정', () => {
  it('소지금이 0 이하가 되면 파산이다', () => {
    const before = stateWith({
      slot: 'afternoon',
      stats: { ...createInitialState('t').stats, money: 1000 },
    })
    expect(runActivity(before, study).gameOver).toBe('bankrupt')
  })

  it('멘탈이 0 이하가 되면 번아웃이다', () => {
    const before = stateWith({ stats: { ...createInitialState('t').stats, mental: 3 } })
    expect(runActivity(before, study).gameOver).toBe('burnout')
  })

  it('진행 가능한 상태에서는 게임오버가 아니다', () => {
    expect(runActivity(createInitialState('t'), study).gameOver).toBeNull()
  })

  it('게임오버 상태에서 활동해도 상태가 바뀌지 않는다', () => {
    const over = stateWith({ gameOver: 'bankrupt' })
    expect(runActivity(over, study)).toBe(over)
  })
})

describe('skipSlot', () => {
  it('스탯 변화 없이 슬롯만 넘긴다', () => {
    const before = createInitialState('t')
    const after = skipSlot(before)
    expect(after.slot).toBe('afternoon')
    expect(after.stats.knowledge).toBe(before.stats.knowledge)
  })

  it('활동 이력에 기록되지 않아 번아웃 연속이 끊긴다', () => {
    const before = stateWith({ recentActivities: ['study'] })
    expect(skipSlot(before).recentActivities).toEqual(['study', 'rest'])
  })

  it('오후에 넘기면 취침 정산이 일어난다', () => {
    const before = stateWith({ slot: 'afternoon' })
    const after = skipSlot(before)
    expect(after.day).toBe(2)
    expect(after.stats.money).toBe(before.stats.money - livingCostForDay(1))
  })

  // 날짜칸 버튼 라벨이 "오전/오후 건너뛰기"인 근거.
  // 한 번 호출은 하루가 아니라 한 슬롯만 넘기므로 라벨도 슬롯 단위여야 한다.
  it('오전에 넘기면 하루가 끝나지 않아 생활비가 차감되지 않는다', () => {
    const before = createInitialState('t')
    const after = skipSlot(before)
    expect(after.day).toBe(1)
    expect(after.slot).toBe('afternoon')
    expect(after.stats.money).toBe(before.stats.money)
  })

  it('두 번 넘겨 하루를 통째로 보내면 생활비는 정확히 한 번만 빠진다', () => {
    const before = createInitialState('t')
    const after = skipSlot(skipSlot(before))
    expect(after.day).toBe(2)
    expect(after.slot).toBe('morning')
    expect(after.stats.money).toBe(before.stats.money - livingCostForDay(1))
  })

  it('게임오버 상태면 아무 일도 일어나지 않는다 (버튼 비활성화와 일치)', () => {
    const before = stateWith({ gameOver: 'bankrupt' })
    expect(skipSlot(before)).toBe(before)
  })
})

describe('광고 배너 보상', () => {
  it('하루 한 번만 받을 수 있다', () => {
    const s = createInitialState('t')
    expect(canClaimAdBonus(s)).toBe(true)

    const after = claimAdBonus(s)
    expect(after.stats.money).toBe(s.stats.money + AD_BONUS_MONEY)
    expect(canClaimAdBonus(after)).toBe(false)

    // 두 번째 호출은 아무것도 바꾸지 않는다 — 호출부에서 막지 않아도 안전해야 한다.
    expect(claimAdBonus(after)).toBe(after)
  })

  it('날이 바뀌면 다시 받을 수 있다', () => {
    const claimed = claimAdBonus(createInitialState('t'))
    expect(canClaimAdBonus({ ...claimed, day: claimed.day + 1 })).toBe(true)
  })

  it('턴을 소모하지 않는다 (탐색은 무료)', () => {
    const s = createInitialState('t')
    const after = claimAdBonus(s)
    expect(after.day).toBe(s.day)
    expect(after.slot).toBe(s.slot)
    expect(after.recentActivities).toEqual(s.recentActivities)
  })

  it('게임오버 상태에서는 받을 수 없다', () => {
    const s = { ...createInitialState('t'), gameOver: 'bankrupt' as const }
    expect(canClaimAdBonus(s)).toBe(false)
    expect(claimAdBonus(s)).toBe(s)
  })

  it('보상액이 하루 생활비를 흔들 만큼 크지 않다', () => {
    // 클릭이 생계 수단이 되면 "일해서 번다"는 축이 무너진다. 1% 미만을 지킨다.
    expect(AD_BONUS_MONEY).toBeLessThan(livingCostForDay(1) * 0.01)
  })
})
