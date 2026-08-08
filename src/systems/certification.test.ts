import { describe, it, expect } from 'vitest'
import {
  advanceCertification,
  blockReason,
  canTake,
  examsOf,
  pendingExam,
  takeExam,
} from './certification'
import { canRun, createInitialState } from './turn'
import { passes } from './employment'
import { CERTS, EXAM_ACTIVITY_ID, findCert } from '../data/certs'
import { ACTIVITIES, findActivity } from '../data/activities'
import { CAREERS } from '../data/careers'
import { findItem, requiredItemIds } from '../data/items'
import { SITES } from '../data/sites'
import type { GameState, Stats } from '../types/game'

/**
 * ⚠️ **이 파일은 O넷이 깨뜨릴 수 있는 것만 덮는다**(한 기능에 40개씩 붙이지 않는다).
 * 덮는 것 넷: ①종목 정의가 실제 아이템·활동을 가리키는가 ②판정이 응시 시점이 아니라
 * **발표일 시점의 스탯**을 보는가 ③자격증 없이는 상위 공고에 붙지 못하는가
 * ④자격증이 여는 활동이 실제로 잠겨 있는가.
 */

const exam = findActivity(EXAM_ACTIVITY_ID)!

/** 스탯을 채운 판. 실제 플레이를 돌리지 않고 조건만 세우는 용도다. */
function stocked(extra: Partial<Stats> = {}): GameState {
  const base = createInitialState('시험')
  return { ...base, stats: { ...base.stats, money: 2_000_000, ...extra } }
}

describe('종목 정의', () => {
  it('id와 아이템 id가 중복되지 않는다', () => {
    for (const list of [CERTS.map((c) => c.id), CERTS.map((c) => c.itemId)]) {
      expect(new Set(list).size).toBe(list.length)
    }
  })

  it('itemId는 실제로 있는 아이템이고 돈으로 살 수 없다', () => {
    // ⚠️ 살 수 있으면 시험을 볼 이유가 사라진다(수료증과 같은 규칙).
    for (const c of CERTS) {
      const item = findItem(c.itemId)
      expect(item, `${c.id}의 itemId가 없는 아이템이다`).toBeDefined()
      expect(item!.buyable).toBe(false)
    }
  })

  it('네 종목이 여는 것이 둘씩 갈린다 — 공고 자격 2 · 활동 해금 2', () => {
    const careerCerts = CAREERS.filter((c) => c.cert).map((c) => c.cert)
    // ⚠️ `requiresItem`은 문자열이거나 배열이다 — 문자열만 보면 배열로 잠긴 활동이 빠진다.
    const activityCerts = ACTIVITIES.flatMap((a) => requiredItemIds(a.requiresItem)).filter((id) =>
      id.startsWith('cert-'),
    )
    expect(careerCerts).toHaveLength(2)
    // 수료증 2종(cert-ai·cert-brand)이 섞여 있으므로 O넷 종목만 센다.
    const opened = CERTS.filter((c) => activityCerts.includes(c.itemId))
    expect(opened).toHaveLength(2)
    // 한 종목이 둘 다 하지는 않는다 — 그러면 나머지 종목의 자리가 사라진다.
    for (const c of CERTS) {
      expect(
        careerCerts.includes(c.itemId) && activityCerts.includes(c.itemId),
        `${c.id}이 공고 자격과 활동 해금을 겸한다`,
      ).toBe(false)
    }
  })

  it('응시 활동은 requiresPick이라 예약·바로 가기에서 빠진다', () => {
    // 고른 종목이 있어야 뜻이 성립한다(지원서 제출과 같은 규칙).
    expect(exam.requiresPick).toBe(true)
    // ⚠️ 응시료는 활동이 아니라 종목이 갖는다 — 활동에 적으면 종목마다 다른 값을 못 쓴다.
    expect(exam.effects.money).toBeUndefined()
    expect(SITES.find((s) => s.id === 'onet')!.activityId).toBe(EXAM_ACTIVITY_ID)
  })
})

describe('응시', () => {
  const cert = findCert('doc-2')!

  it('응시료와 1턴을 쓰고 접수 기록이 남는다', () => {
    const before = stocked()
    const after = takeExam(before, cert)
    expect(after.stats.money).toBe(before.stats.money - cert.fee)
    expect(after.slot).toBe('afternoon') // 1턴 소모
    const rec = examsOf(after)[0]
    expect(rec.certId).toBe(cert.id)
    expect(rec.takenDay).toBe(before.day)
    expect(rec.resultDay).toBe(before.day + cert.resultDays)
    expect(rec.passed).toBeUndefined()
  })

  it('요건이 모자라도 접수는 된다 — 발표일까지 채우는 것이 이 시스템의 도박이다', () => {
    const poor = stocked({ vocabulary: 0, knowledge: 0 })
    expect(blockReason(poor, cert)).toBeNull()
    expect(examsOf(takeExam(poor, cert))).toHaveLength(1)
  })

  it('같은 종목을 두 번 접수하지 못한다', () => {
    const once = takeExam(stocked(), cert)
    expect(pendingExam(once, cert.id)).toBeDefined()
    expect(canTake(once, cert)).toBe(false)
    expect(takeExam(once, cert)).toBe(once) // 상태를 그대로 돌려준다(반쪽 상태 금지)
  })

  it('응시료가 모자라면 사유를 말하고 아무것도 하지 않는다', () => {
    const broke = { ...stocked(), stats: { ...stocked().stats, money: cert.fee - 1 } }
    expect(blockReason(broke, cert)).toContain('응시료')
    expect(takeExam(broke, cert)).toBe(broke)
  })
})

describe('발표', () => {
  const cert = findCert('doc-2')!
  const need = cert.requires

  /** 접수만 해 두고 발표일까지 슬롯을 세지 않고 날짜만 밀어 둔다. */
  function applied(stats: Partial<Stats>): GameState {
    const s = takeExam(stocked(stats), cert)
    return { ...s, day: s.day + cert.resultDays }
  }

  it('발표일 전에는 아무 일도 일어나지 않는다', () => {
    const s = takeExam(stocked(need), cert)
    const out = advanceCertification(s)
    expect(out.state).toBe(s)
    expect(out.arrived).toHaveLength(0)
  })

  /**
   * ⚠️ **이 두 개가 이 파일의 본체다.** 판정이 응시 시점 스탯을 보면 첫 번째가,
   * 발표일 스탯을 안 보면 두 번째가 터진다.
   */
  it('응시할 때 모자랐어도 발표일까지 채우면 합격한다', () => {
    const late = applied({ vocabulary: 0, knowledge: 0 })
    const filled = { ...late, stats: { ...late.stats, ...need } }
    const out = advanceCertification(filled)
    expect(examsOf(out.state)[0].passed).toBe(true)
    // 자격증은 배송을 거치지 않고 바로 인벤토리로 들어오고, 도착 알림도 그대로 탄다.
    expect(out.state.inventory?.map((i) => i.id)).toContain(cert.itemId)
    expect(out.arrived.map((i) => i.id)).toEqual([cert.itemId])
  })

  it('응시할 때 채웠어도 발표일에 모자라면 떨어지고 사유가 남는다', () => {
    const dropped = applied(need)
    const drained = { ...dropped, stats: { ...dropped.stats, vocabulary: 0 } }
    const out = advanceCertification(drained)
    const rec = examsOf(out.state)[0]
    expect(rec.passed).toBe(false)
    // ux `error-clarity`: 무엇이 얼마나 모자랐는지 말할 수 있어야 한다.
    expect(rec.reason).toContain('어휘력')
    expect(out.state.inventory ?? []).toHaveLength(0)
  })

  it('발표는 한 번만 확정된다 — 다시 돌려도 결과가 뒤집히지 않는다', () => {
    const first = advanceCertification({ ...applied(need), stats: { ...applied(need).stats, ...need } })
    const again = advanceCertification(first.state)
    expect(again.state).toBe(first.state)
    expect(again.arrived).toHaveLength(0)
  })
})

describe('자격증이 여는 것', () => {
  it('자격증이 없으면 상위 공고의 서류를 통과하지 못한다', () => {
    const gated = CAREERS.filter((c) => c.cert)
    expect(gated.length).toBeGreaterThan(0)
    for (const career of gated) {
      // 스탯은 요건을 전부 넘겨 두고 **자격증만** 없는 상태로 묻는다.
      const s = stocked(career.paper as Partial<Stats>)
      expect(passes(s, career.paper), `${career.id}: 스탯 요건 자체가 안 채워졌다`).toBe(true)
      expect(passes(s, career.paper, career.cert), `${career.id}: 자격증 없이 통과했다`).toBe(false)
      // 자격증을 쥐여 주면 통과한다 — 막고 있던 것이 정확히 그것이었다는 증명이다.
      const withCert = { ...s, inventory: [{ id: career.cert!, day: 1 }] }
      expect(passes(withCert, career.paper, career.cert)).toBe(true)
    }
  })

  it('자격증이 여는 활동은 실제로 잠겨 있다', () => {
    const locked = ACTIVITIES.filter((a) =>
      requiredItemIds(a.requiresItem).some((id) => CERTS.some((c) => c.itemId === id)),
    )
    expect(locked.length).toBe(2)
    for (const a of locked) {
      // 행동력·돈을 다 채워도 아이템이 없으면 못 한다(판정은 `canRun` 하나가 한다).
      const rich = stocked({ stamina: 200 })
      expect(canRun(rich, a), `${a.id}이 자격증 없이 실행된다`).toBe(false)
      const held = { ...rich, inventory: [{ id: requiredItemIds(a.requiresItem)[0], day: 1 }] }
      expect(canRun(held, a)).toBe(true)
      // ⚠️ 번아웃 키가 알바('work')·수료증 외주('gig')와 갈려 있어야 한다.
      expect(a.burnoutKey).toBe('cert-gig')
    }
  })
})
