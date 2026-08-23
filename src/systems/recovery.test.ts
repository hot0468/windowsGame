import { describe, expect, it } from 'vitest'
import { BURNOUT_RELIEF, RECOVERY_DAYS, RECOVERY_EXIT_FEE } from '../data/recovery'
import { getLivingCost } from './economy'
import {
  bankruptRelief,
  buyOutRecovery,
  canBuyOutRecovery,
  detectRecovery,
  enterRecovery,
  reviveRecovery,
  settleRecovery,
  tickRecovery,
} from './recovery'
import { canRun, createInitialState, skipSlot, sleepNow } from './turn'
import { findActivity } from '../data/activities'
import type { GameState } from '../types/game'

/**
 * 강제 회복 기간.
 *
 * ⚠️ **불변식 증명은 "빠져나올 수 있는가"에만 쓴다**(CLAUDE.md 검증 분량 규칙 — 돈·턴·
 * 게임오버를 만드는 불변식). 이 장치는 게임오버를 대신하므로, **못 빠져나오면 그것이
 * 곧 되살아난 게임오버**다. 나머지는 회귀 테스트 하나씩으로 끝낸다.
 */

const base = (): GameState => createInitialState('테스터')

describe('회복 판정', () => {
  it('돈이 0이면 파산, 멘탈이 0이면 번아웃', () => {
    expect(detectRecovery({ ...base().stats, money: 0 })).toBe('bankrupt')
    expect(detectRecovery({ ...base().stats, mental: 0 })).toBe('burnout')
    expect(detectRecovery(base().stats)).toBeNull()
  })

  it('둘 다 바닥나면 파산이 이긴다 — 더 무거운 쪽을 먼저 건다', () => {
    expect(detectRecovery({ ...base().stats, money: 0, mental: 0 })).toBe('bankrupt')
  })
})

describe('빠져나올 수 있는가 — 되살아난 게임오버를 막는다', () => {
  it('파산으로 걸리면 구제금이 들어온다', () => {
    const st = { ...base(), stats: { ...base().stats, money: 0 } }
    const s = enterRecovery(st, 'bankrupt')
    expect(s.stats.money).toBe(bankruptRelief(st))
    expect(s.stats.money).toBeGreaterThan(0)
  })

  it('번아웃으로 걸리면 멘탈이 돌아온다', () => {
    const s = enterRecovery({ ...base(), stats: { ...base().stats, mental: 0 } }, 'burnout')
    expect(s.stats.mental).toBe(BURNOUT_RELIEF)
  })

  /* ⚠️ 이 게임에서 가장 중요한 한 줄이다. 구제금이 하루치 생활비에 못 미치면 회복이
     끝나는 그 밤에 다시 0이 되어 영원히 못 나온다 — 이름만 다른 게임오버다.
     ⚠️ **후반 날짜로도 재는 것이 핵심이다**: 정액 150,000원이던 시절 초반에는
     멀쩡했고 101일차에서만 깨졌다. */
  it('구제금이 회복 기간 내내 생활비를 넘는다 — 어느 날짜에서도 갇히지 않는다', () => {
    for (const day of [1, 51, 101, 301, 1001]) {
      const st = { ...base(), day }
      expect(bankruptRelief(st), `${day}일차`).toBeGreaterThan(getLivingCost(st) * RECOVERY_DAYS)
    }
  })

  it('날이 지나면 반드시 풀린다', () => {
    let r = enterRecovery(base(), 'burnout').recovery
    for (let i = 0; i < RECOVERY_DAYS; i++) r = tickRecovery(r)
    expect(r).toBeNull()
  })

  /* ⚠️ **화면에서도 갇히면 안 된다.** 로직이 멀쩡해도 [건너뛰기] 버튼이 잠겨 있으면
     플레이어는 못 빠져나온다 — 실제로 그렇게 짰다가 잡았다(CalendarPanel·MobileStatSheet가
     `gameOver !== null`로 막고 있었다). 그 두 화면은 아래 `canRun`/`skipSlot` 조합을
     그대로 따르므로, 여기서 **활동은 막히고 넘기기는 통한다**를 못 박아 둔다. */
  it('활동은 막히지만 턴은 넘길 수 있다 — 탈출구가 잠기지 않는다', () => {
    const s = enterRecovery(base(), 'burnout')
    expect(canRun(s, findActivity('work')!), '주저앉았는데 활동이 된다').toBe(false)
    expect(skipSlot(s), '턴을 넘길 수 없으면 회복이 영영 안 끝난다').not.toBe(s)
  })

  /* ⚠️ **강제된 행동에 벌을 주지 않는다.** 회복 중에는 넘기기가 유일하게 할 수 있는
     일인데, 그것을 연속 실행으로 세면 번아웃 효율이 바닥을 쳐 블루스크린이 매 턴 뜬다.
     실측이 잡은 버그다(회복 탈출 중 3초 정지가 반복됐다). */
  it('주저앉은 동안 넘긴 턴은 번아웃 이력에 안 쌓인다', () => {
    let s = enterRecovery(base(), 'bankrupt')
    const before = s.recentActivities.length
    for (let i = 0; i < 5; i++) s = skipSlot(s)
    expect(s.recentActivities.length).toBe(before)
  })

  it('실제 플레이로도 풀린다 — 자러 가면 회복이 끝난다', () => {
    let s = enterRecovery({ ...base(), stats: { ...base().stats, mental: 0 } }, 'burnout')
    /* ⚠️ 2026-08-22 분 단위 전환: 회복은 **하루가 끝날 때** 하루씩 준다. 시계를 조금씩
       미는 것으로는 안 줄어들므로, 자러 가기(`sleepNow`)가 유일한 탈출구다. */
    for (let i = 0; i < RECOVERY_DAYS + 2 && s.recovery; i++) s = sleepNow(s)
    expect(s.recovery).toBeNull()
  })
})

describe('회복 중 다시 걸리지 않는다', () => {
  it('이미 회복 중이면 날짜가 초기화되지 않는다', () => {
    const s = enterRecovery(base(), 'burnout')
    const again = enterRecovery({ ...s, recovery: { ...s.recovery!, daysLeft: 1 } }, 'bankrupt')
    expect(again.recovery!.daysLeft).toBe(1)
    expect(again.recovery!.kind).toBe('burnout')
  })

  it('구제금이 회복 중에 계속 들어오지 않는다', () => {
    const s = enterRecovery({ ...base(), stats: { ...base().stats, money: 0 } }, 'bankrupt')
    const poor = { ...s, stats: { ...s.stats, money: 0 } }
    expect(settleRecovery(poor).stats.money).toBe(0)
  })
})

describe('돈으로 털고 일어나기', () => {
  it('번아웃은 돈을 내면 즉시 풀린다', () => {
    const s = enterRecovery(
      { ...base(), stats: { ...base().stats, money: RECOVERY_EXIT_FEE } },
      'burnout',
    )
    const out = buyOutRecovery(s)
    expect(out.recovery).toBeNull()
    expect(out.stats.money).toBe(0)
  })

  /* 돈이 없어서 걸린 상태를 돈으로 푸는 길은 성립하지 않는다. */
  it('파산은 돈으로 풀 수 없다', () => {
    const s = enterRecovery(
      { ...base(), stats: { ...base().stats, money: RECOVERY_EXIT_FEE * 10 } },
      'bankrupt',
    )
    expect(canBuyOutRecovery(s)).toBe(false)
    expect(buyOutRecovery(s).recovery).not.toBeNull()
  })

  it('못 낼 돈이면 상태가 그대로다 — 반쪽 상태를 만들지 않는다', () => {
    const s = enterRecovery({ ...base(), stats: { ...base().stats, money: 10 } }, 'burnout')
    expect(buyOutRecovery(s)).toBe(s)
  })
})

describe('세이브 보정', () => {
  it('못 믿을 값은 통째로 버린다', () => {
    expect(reviveRecovery(null)).toBeNull()
    expect(reviveRecovery({ kind: 'bankrupt', startedDay: 1, daysLeft: NaN })).toBeNull()
    expect(reviveRecovery({ kind: '없는사유', startedDay: 1, daysLeft: 2 })).toBeNull()
  })

  it('멀쩡한 값은 살리되 기간 상한을 넘지 않는다', () => {
    const r = reviveRecovery({ kind: 'burnout', startedDay: 3, daysLeft: 999 })
    expect(r).toEqual({ kind: 'burnout', startedDay: 3, daysLeft: RECOVERY_DAYS })
  })
})
