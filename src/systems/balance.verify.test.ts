/**
 * 밸런스 회귀 방지 테스트.
 * 실제 게임 모듈로 시뮬레이션을 돌려, 무한 플레이가 불가능하고
 * 엔딩이 의도한 구간에 도달하는지 검증한다.
 */
import { describe, it, expect } from 'vitest'
import { createInitialState, canRun, runActivity, skipSlot } from './turn'
import { findActivity } from '../data/activities'
import { ABSENCE_FIRE, ABSENCE_WARNING, CAREERS, PAYDAY_INTERVAL, findCareer } from '../data/careers'
import { getLivingCost } from './economy'
import { countConsecutive } from './burnout'
import { getFailureEnding } from './ending'
import { careerEnding } from '../data/endings'
import { advanceEmployment, applyTo, passes } from './employment'
import { advanceBank, bankOf, bankedTotal, borrow, loanRoom, openDeposit, withdraw } from './bank'
import { DEPOSIT_MIN, LOAN_LIMIT_BASE } from '../data/bank'
import type { Activity, GameState } from '../types/game'
import type { Career } from '../data/careers'

const work = findActivity('work')!
const game = findActivity('game')!

/** 알바와 멘탈 회복을 번갈아 하는 최적에 가까운 생존 플레이. */
function playOptimally(maxDays: number): { state: GameState; peakMoney: number } {
  let state = createInitialState('시뮬')
  let peakMoney = state.stats.money
  while (!state.gameOver && state.day <= maxDays) {
    const streak = countConsecutive(state.recentActivities, 'work')
    const mentalCost = 8 + streak * 4
    let next: GameState
    if (canRun(state, work) && state.stats.mental - mentalCost > 3) next = runActivity(state, work)
    else if (canRun(state, game) && state.stats.mental < 95) next = runActivity(state, game)
    else next = skipSlot(state)
    state = next
    if (state.stats.money > peakMoney) peakMoney = state.stats.money
  }
  return { state, peakMoney }
}

describe('무한 플레이 차단', () => {
  it('최적 플레이도 결국 파산한다', () => {
    const { state } = playOptimally(1000)
    expect(state.gameOver).toBe('bankrupt')
  })

  it('파산 시점이 의도한 60~120일 구간에 든다', () => {
    const { state } = playOptimally(1000)
    expect(state.day).toBeGreaterThanOrEqual(60)
    expect(state.day).toBeLessThanOrEqual(120)
  })

  it('아무것도 하지 않으면 생활비만으로 훨씬 빨리 파산한다', () => {
    let state = createInitialState('무행동')
    while (!state.gameOver && state.day <= 100) state = skipSlot(state)
    expect(state.gameOver).toBe('bankrupt')
    expect(state.day).toBeLessThan(20)
  })
})

/* ── 정규직 (2026-08-05) ───────────────────────────────────────────────────
 *
 * ⚠️ **위의 알바 시뮬레이션을 약화시키지 않는다.** 정규직은 경로를 하나 더 여는 것이지
 * 기존 경로를 바꾸는 것이 아니므로, 여기서는 **새 경로에 대해 같은 두 가지**를 증명한다:
 *  (a) 규칙대로 출근하는 재직자가 **첫 급여일까지 자동으로 파산하지 않는다**
 *  (b) 그럼에도 **판은 결국 끝난다**(고정 급여 vs 지수적 생활비)
 */

const commute = findActivity('commute')!
const jobApply = findActivity('job-apply')!
const jobInterview = findActivity('job-interview')!
const study = findActivity('study')!
const reading = findActivity('reading')!
const social = findActivity('social')!
const club = findActivity('club')!

/** 그 회사의 서류·면접 요건을 모두 채웠는가. */
function qualified(state: GameState, career: Career): boolean {
  return passes(state.stats, career.paper) && passes(state.stats, career.person)
}

/**
 * 요건을 채우기 위해 지금 해야 할 활동. 없으면 undefined(= 이미 다 채웠다).
 * 스탯 하나당 주 공급원 하나만 본다 — 최적해가 아니라 **평범한 플레이**를 재는 것이 목적이다.
 */
function prepFor(state: GameState, career: Career) {
  const need = { ...career.paper, ...career.person }
  if ((need.knowledge ?? 0) > state.stats.knowledge) return study
  if ((need.vocabulary ?? 0) > state.stats.vocabulary) return reading
  if ((need.creativity ?? 0) > state.stats.creativity) return findActivity('writing')!
  if ((need.charm ?? 0) > state.stats.charm) return social
  if ((need.sociability ?? 0) > state.stats.sociability) return club
  if ((need.reputation ?? 0) > state.stats.reputation) return findActivity('sns')!
  return undefined
}

interface EmployedRun {
  state: GameState
  /** 채용된 날. null이면 끝까지 취직하지 못했다. */
  hiredDay: number | null
  /** 급여를 받은 날들. */
  paydays: number[]
  /** 채용된 뒤 **첫 급여를 받기 전까지**의 최저 소지금. 0 이하면 급여를 못 버틴 것이다. */
  lowestBeforeFirstPay: number
  /** 해고된 날. null이면 안 잘렸다. */
  firedDay: number | null
}

/**
 * 정규직을 목표로 하는 플레이.
 *
 * `attend`가 false면 **일부러 결근한다** — 경고·해고 경로를 재기 위한 것이다.
 */
function playEmployed(career: Career, maxDays: number, attend = true): EmployedRun {
  let state = createInitialState('정규직')
  let hiredDay: number | null = null
  let firedDay: number | null = null
  const paydays: number[] = []
  let lowestBeforeFirstPay = Number.POSITIVE_INFINITY

  for (let guard = 0; guard < maxDays * 2 + 10; guard++) {
    if (state.gameOver || state.day > maxDays) break

    let next: GameState
    if (attend && canRun(state, commute)) {
      next = runActivity(state, commute)
    } else if (canRun(state, jobInterview)) {
      next = runActivity(state, jobInterview)
    } else if (
      !state.employment &&
      !state.application &&
      qualified(state, career) &&
      canRun(state, jobApply)
    ) {
      next = runActivity(applyTo(state, career), jobApply)
    } else if (state.stats.mental < 30 && canRun(state, game)) {
      next = runActivity(state, game)
    } else if (
      // 취직 전에는 요건부터 채운다. 단 잔고가 얇으면 벌이가 먼저다.
      !state.employment &&
      state.stats.money > 120_000 &&
      prepFor(state, career) &&
      canRun(state, prepFor(state, career)!)
    ) {
      next = runActivity(state, prepFor(state, career)!)
    } else if (canRun(state, work) && state.stats.mental > 20) {
      next = runActivity(state, work)
    } else if (canRun(state, game) && state.stats.mental < 95) {
      next = runActivity(state, game)
    } else {
      next = skipSlot(state)
    }

    const settled = advanceEmployment(next)
    for (const n of settled.notices) {
      if (n.kind === 'hired' && hiredDay === null) hiredDay = n.day
      if (n.kind === 'payday') paydays.push(n.day)
      if (n.kind === 'fired' && firedDay === null) firedDay = n.day
    }
    state = settled.state
    // 첫 급여 전의 구간만 잰다 — "취직했는데 첫 월급 전에 굶어 죽는가"가 질문이다.
    if (hiredDay !== null && paydays.length === 0) {
      lowestBeforeFirstPay = Math.min(lowestBeforeFirstPay, state.stats.money)
    }
  }

  return { state, hiredDay, paydays, lowestBeforeFirstPay, firedDay }
}

describe('정규직 — 살아남을 수 있는가', () => {
  const entry = CAREERS[0]

  it('평범한 플레이로 실제 채용까지 간다', () => {
    const run = playEmployed(entry, 200)
    expect(run.hiredDay, '끝까지 취직하지 못했다').not.toBeNull()
    // 절차 자체가 최소 9일(서류 3 + 면접 안내 2 + 최종 4)이므로 그보다 빠를 수 없다.
    expect(run.hiredDay!).toBeGreaterThanOrEqual(10)
  })

  it('규칙대로 출근하면 첫 급여일까지 파산하지 않는다', () => {
    const run = playEmployed(entry, 200)
    expect(run.paydays.length, '급여를 한 번도 못 받았다').toBeGreaterThan(0)
    expect(run.paydays[0]).toBe(run.hiredDay! + PAYDAY_INTERVAL)
    // 첫 급여 전 소지금이 0 이하로 간 적이 없어야 "자동 파산"이 아니다.
    expect(run.lowestBeforeFirstPay).toBeGreaterThan(0)
  })

  it('규칙대로 출근하면 해고되지 않는다', () => {
    const run = playEmployed(entry, 200)
    expect(run.firedDay).toBeNull()
    expect(run.state.employment?.absences ?? 0).toBeLessThan(ABSENCE_WARNING)
  })

  it('정규직으로도 결국 판은 끝난다 — 고정 급여가 물가를 이기지 못한다', () => {
    const run = playEmployed(entry, 400)
    expect(run.state.gameOver).toBe('bankrupt')
    // 알바만 하는 플레이(60~120일)보다 오래 버티되, 무한 플레이는 아니다.
    expect(run.state.day).toBeLessThanOrEqual(220)
  })

  it('출근하지 않으면 경고를 거쳐 해고된다 — 예고 없이 잃지 않는다', () => {
    const run = playEmployed(entry, 200, false)
    expect(run.hiredDay, '취직 자체를 못 했다').not.toBeNull()
    expect(run.firedDay, '결근을 계속했는데도 해고되지 않았다').not.toBeNull()
    // 해고보다 경고가 먼저 왔어야 한다.
    const notices = run.state.jobNotices ?? []
    const warned = notices.find((n) => n.kind === 'absence-warning')
    const fired = notices.find((n) => n.kind === 'fired')
    expect(warned, '경고 없이 해고됐다').toBeDefined()
    expect(warned!.day).toBeLessThanOrEqual(fired!.day)
    expect(warned!.amount).toBe(ABSENCE_WARNING)
    expect(fired!.amount).toBe(ABSENCE_FIRE)
  })
})

describe('정규직 공고 정의', () => {
  it('id가 중복되지 않고 급여가 오름차순이다 — 어려운 자리가 더 받아야 한다', () => {
    const ids = CAREERS.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (let i = 1; i < CAREERS.length; i++) {
      expect(CAREERS[i].salary).toBeGreaterThan(CAREERS[i - 1].salary)
    }
  })

  it('요건이 상한을 넘지 않는다 — 평판·도덕의 상한은 100이다', () => {
    for (const c of CAREERS) {
      expect(c.person.reputation ?? 0).toBeLessThanOrEqual(100)
      expect(c.paper.knowledge ?? 0).toBeLessThanOrEqual(999)
    }
  })

  it('서류는 이력서 스탯을, 면접은 사람 스탯을 본다', () => {
    const paperKeys = new Set(CAREERS.flatMap((c) => Object.keys(c.paper)))
    const personKeys = new Set(CAREERS.flatMap((c) => Object.keys(c.person)))
    for (const k of paperKeys) expect(['knowledge', 'vocabulary', 'creativity']).toContain(k)
    for (const k of personKeys) expect(['charm', 'reputation', 'sociability']).toContain(k)
  })

  it('출근 활동은 돈을 만지지 않는다 — 급여의 단일 출처는 공고다', () => {
    expect(commute.effects.money).toBeUndefined()
    expect(commute.scalesWithWage).toBeUndefined()
    expect(findCareer(CAREERS[0].id)!.salary).toBeGreaterThan(0)
  })
})

/* ── 직업 엔딩 도달 가능성 (2026-08-05) ────────────────────────────────────
 *
 * 설계자 지시로 **직업 엔딩은 파산했을 때만 뜬다.** 그래서 "그 엔딩이 존재하는가"는
 * 데이터 검사로 끝나지 않는다 — **그 회사에 실제로 들어갈 수 있어야** 하고, 그러고도
 * 결국 굶어 죽어야 비로소 화면에 나온다. 아무도 볼 수 없는 엔딩은 버그다.
 * 그래서 여기서는 단언이 아니라 **시뮬레이션으로** 다섯 자리 전부를 밟아 본다.
 */

/** 요건 스탯 → 그 스탯의 주 공급원. `prepFor`와 같은 표를 쓰되 순서를 정책이 정한다. */
const REQUIREMENT_SOURCE: Record<string, Activity> = {
  knowledge: study,
  vocabulary: reading,
  creativity: findActivity('writing')!,
  charm: social,
  sociability: club,
  reputation: findActivity('sns')!,
}

const tutor = findActivity('work-tutor')!

/** 아직 못 채운 요건과 남은 양. */
function requirementGaps(state: GameState, career: Career): [string, number][] {
  const need = { ...career.paper, ...career.person } as Record<string, number>
  const stats = state.stats as unknown as Record<string, number>
  return Object.entries(need)
    .map(([key, min]) => [key, min - stats[key]] as [string, number])
    .filter(([, gap]) => gap > 0)
}

/** 소지금이 이 일수치 생활비 아래로 내려가면 벌러 간다. */
const RUNWAY_DAYS = 3
/** 멘탈이 이 아래로 내려가면 회복부터 한다. */
const MENTAL_FLOOR = 40

/**
 * **그 자리를 목표로 삼고 계획적으로 노는 플레이.**
 *
 * ⚠️ 위의 `playEmployed`(평범한 플레이)와 **일부러 다른 정책이다.** 첫 공고는 아무 생각
 * 없이 굴러도 닿지만, 청람그룹(지식 150 · 어휘력 100 · 창의력 80 · 매력 80 · 친화력 80 ·
 * 평판 70)은 계획 없이는 못 닿는다. 여기서 재는 질문이 "평범한 플레이가 우연히 닿는가"가
 * 아니라 **"작정한 플레이어가 닿을 수 있는가"**이기 때문이다.
 *
 * 정책의 핵심 두 가지:
 *  1. **지식 60을 먼저 채워 과외(105,000원)를 연다.** 편의점(60,000원)으로 벌면서 여섯 스탯을
 *     키우는 것은 물가를 못 이긴다 — 지식은 어차피 요건이라 이 투자는 두 번 쓰인다.
 *  2. **남은 격차가 작은 요건부터** 채운다. 필요 턴 수의 총합은 어차피 같고,
 *     먼저 끝난 항목만큼 판단이 단순해진다.
 */
function playToward(career: Career, maxDays: number): { state: GameState; hiredDay: number | null } {
  let state = createInitialState('목표')
  let hiredDay: number | null = null

  for (let guard = 0; guard < maxDays * 2 + 10; guard++) {
    if (state.gameOver || state.day > maxDays) break
    const earn = canRun(state, tutor) ? tutor : work

    let next: GameState
    if (canRun(state, commute)) next = runActivity(state, commute)
    else if (canRun(state, jobInterview)) next = runActivity(state, jobInterview)
    else if (
      !state.employment &&
      !state.application &&
      qualified(state, career) &&
      canRun(state, jobApply)
    ) {
      next = runActivity(applyTo(state, career), jobApply)
    } else if (state.stats.mental < MENTAL_FLOOR && canRun(state, game)) {
      next = runActivity(state, game)
    } else if (
      !state.employment &&
      state.stats.money < getLivingCost(state.day) * RUNWAY_DAYS &&
      canRun(state, earn)
    ) {
      next = runActivity(state, earn)
    } else {
      const remaining = requirementGaps(state, career).sort((a, b) => a[1] - b[1])
      // 과외를 여는 지식 60이 최우선이다(그 회사가 어차피 지식을 요구할 때만).
      if (state.stats.knowledge < 60 && (career.paper.knowledge ?? 0) >= 60) {
        remaining.unshift(['knowledge', 0])
      }
      const pick = remaining.map(([key]) => REQUIREMENT_SOURCE[key]).find((a) => a && canRun(state, a))
      if (pick) next = runActivity(state, pick)
      else if (canRun(state, earn) && state.stats.mental > 20) next = runActivity(state, earn)
      else if (canRun(state, game) && state.stats.mental < 95) next = runActivity(state, game)
      else next = skipSlot(state)
    }

    const settled = advanceEmployment(next)
    for (const n of settled.notices) if (n.kind === 'hired' && hiredDay === null) hiredDay = n.day
    state = settled.state
  }
  return { state, hiredDay }
}

describe('직업 엔딩 — 아무도 볼 수 없는 엔딩은 없다', () => {
  for (const career of CAREERS) {
    it(`${career.company}에 취직한 뒤 파산해 그 회사의 엔딩으로 끝난다`, () => {
      const run = playToward(career, 400)
      expect(run.hiredDay, `${career.id}에 끝내 취직하지 못했다 — 도달 불가능한 엔딩이다`).not.toBeNull()
      // 급여가 물가를 이기지 못하므로 취직한 판도 결국 굶어 죽는다. 그게 이 엔딩의 조건이다.
      expect(run.state.gameOver, `${career.id}: 판이 끝나지 않았다`).toBe('bankrupt')
      expect(run.state.peakCareerId).toBe(career.id)
      const ending = getFailureEnding('bankrupt', run.state)
      expect(ending.id).toBe(careerEnding(career.id)!.id)
      expect(ending.isFailure).toBe(true)
    })
  }

  it('직장을 가져 본 적 없는 판은 그냥 파산으로 끝난다', () => {
    const { state } = playOptimally(1000)
    expect(state.peakCareerId).toBeUndefined()
    expect(getFailureEnding('bankrupt', state).id).toBe('bankrupt')
  })

  /**
   * ⚠️ **비문에 새기는 것은 도달한 최고 직장이지 죽을 때의 직함이 아니다**
   * (`systems/ending.ts`의 `epitaphCareerId`). 해고는 이미 수입을 끊어 파산을 앞당기는데,
   * 거기에 기록까지 지우면 한 사건에 벌을 두 번 주는 것이다.
   */
  it('해고된 뒤 파산해도 다녔던 회사의 엔딩으로 끝난다', () => {
    const run = playEmployed(CAREERS[0], 400, false)
    expect(run.firedDay, '결근했는데도 해고되지 않았다').not.toBeNull()
    expect(run.state.employment, '해고됐는데 재직 상태가 남아 있다').toBeUndefined()
    expect(run.state.gameOver).toBe('bankrupt')
    expect(run.state.peakCareerId).toBe(CAREERS[0].id)
    expect(getFailureEnding('bankrupt', run.state).id).toBe(careerEnding(CAREERS[0].id)!.id)
  })
})

/* ── 은행 (2026-08-05) ─────────────────────────────────────────────────────
 *
 * ⚠️ **이 묶음이 은행 때문에 판이 무한해지지 않는다는 것을 지킨다.**
 *
 * 은행은 두 방향으로 이 프로젝트의 핵심 보증("게임은 반드시 끝난다")을 위협한다:
 *  (a) **복리가 물가를 앞지르면** 예금만으로 영원히 산다.
 *  (b) **빌려서 예금하기**가 이익이면 무위험 차익으로 무한히 불어난다.
 *
 * (b)는 이율 부등식(`bank.test.ts`)이 데이터 수준에서 막는다. 여기서는 **(a)를
 * 시뮬레이션으로** 재 본다 — 단언이 아니라 실제로 최적에 가깝게 굴려 보고 죽는 날을 확인한다.
 *
 * ⚠️ **위의 알바·정규직 시뮬레이션을 약화시키지 않는다.** 은행은 경로를 하나 더 여는
 * 것이지 기존 경로를 바꾸는 것이 아니다(정규직 때와 같은 원칙).
 */

/**
 * **은행을 최대한 활용하는 플레이.**
 *
 * `playOptimally`(알바 + 멘탈 회복)에 은행 한 겹을 얹었다:
 *  - 당장 며칠치 생활비를 넘는 여윳돈은 **정기예금**(가장 높은 이율)에 밀어 넣는다.
 *  - 잔고가 위험해지면 자유예금에서 빼 쓴다.
 *  - **빌리지는 않는다** — 대출은 이율이 더 높아 생존을 늘리는 방향이 아니다
 *    (그 사실 자체는 아래 별도 테스트가 확인한다).
 *
 * ⚠️ **매 슬롯 `advanceBank`를 돌린다** — 손으로 플레이할 때 `gameStore.afterTurn`이
 * 하는 것과 같다. 이걸 빠뜨리면 이자가 한 번도 안 붙어 시뮬레이션이 거짓이 된다.
 */
function playBanking(maxDays: number): { state: GameState; peakBanked: number } {
  let state = createInitialState('은행최적')
  let peakBanked = 0

  while (!state.gameOver && state.day <= maxDays) {
    const living = getLivingCost(state.day)
    // 손에 남겨 둘 최소 현금. 이보다 많으면 묶고, 적으면 푼다.
    const buffer = living * 4

    // ① 여윳돈을 정기예금으로. 이율이 가장 높으므로 이것이 "최적"의 핵심이다.
    if (state.stats.money - buffer >= DEPOSIT_MIN) {
      const put = Math.floor((state.stats.money - buffer) / DEPOSIT_MIN) * DEPOSIT_MIN
      state = openDeposit(state, put)
    }
    // ② 잔고가 얇으면 자유예금에서 되찾는다(만기 전 정기예금은 못 뺀다).
    if (state.stats.money < living * 2 && bankOf(state).savings > 0) {
      state = withdraw(state, Math.min(bankOf(state).savings, living * 3))
    }

    const streak = countConsecutive(state.recentActivities, 'work')
    const mentalCost = 8 + streak * 4
    if (canRun(state, work) && state.stats.mental - mentalCost > 3) state = runActivity(state, work)
    else if (canRun(state, game) && state.stats.mental < 95) state = runActivity(state, game)
    else state = skipSlot(state)

    // ⚠️ 손으로 플레이할 때와 **같은 함수, 같은 자리**. 이자·만기가 여기서 일어난다.
    state = advanceBank(state)
    peakBanked = Math.max(peakBanked, bankedTotal(state))
  }
  return { state, peakBanked }
}

describe('은행 — 그래도 판은 끝난다', () => {
  it('은행을 최대한 굴려도 결국 파산한다 — 복리가 물가를 이기지 못한다', () => {
    const { state } = playBanking(2000)
    expect(state.gameOver).toBe('bankrupt')
  })

  it('은행이 실제로 며칠을 사 준다 — 쓰는 이유가 있어야 장치다', () => {
    const banking = playBanking(2000)
    const plain = playOptimally(2000)
    expect(banking.peakBanked, '은행을 한 번도 쓰지 않았다면 시뮬레이션이 거짓이다').toBeGreaterThan(0)
    // 예금이 생존을 **늘리기는** 해야 한다. 늘지 않으면 아무도 안 쓴다.
    expect(banking.state.day).toBeGreaterThanOrEqual(plain.state.day)
  })

  it('그 연장이 무한이 아니다 — 기존 상한(120일)의 두 배를 넘지 않는다', () => {
    // ⚠️ 이 상한이 "은행이 판을 통째로 다시 쓰지는 않는다"를 못 박는다.
    //    이자를 올리다가 이 선을 넘으면 여기서 터진다.
    const { state } = playBanking(2000)
    expect(state.day).toBeLessThanOrEqual(240)
  })

  it('빌려서 예금하는 짓은 판을 늘리지 못한다 — 무위험 차익이 없다', () => {
    // 한도까지 빌려 정기예금에 넣고 시작한다. 차익이 존재한다면 이쪽이 더 오래 살아야 한다.
    let state: GameState = createInitialState('차익시도')
    state = borrow(state, loanRoom(state))
    state = openDeposit(state, Math.floor(state.stats.money / DEPOSIT_MIN) * DEPOSIT_MIN)
    let guard = 0
    while (!state.gameOver && state.day <= 2000 && guard++ < 5000) {
      const streak = countConsecutive(state.recentActivities, 'work')
      if (canRun(state, work) && state.stats.mental - (8 + streak * 4) > 3) {
        state = runActivity(state, work)
      } else if (canRun(state, game) && state.stats.mental < 95) state = runActivity(state, game)
      else state = skipSlot(state)
      state = advanceBank(state)
    }
    expect(state.gameOver).toBe('bankrupt')
    // 빚이 원금보다 커져 있어야 한다 — 이자가 나를 향해 붙었다는 증거다.
    expect(bankOf(state).debt).toBeGreaterThan(LOAN_LIMIT_BASE)
  })
})

describe('엔딩 도달 가능성', () => {
  it('현실주의자 기준은 실제 플레이로 도달 가능하다', () => {
    const { peakMoney } = playOptimally(1000)
    expect(peakMoney).toBeGreaterThan(1800000)
  })

  it('현실주의자 도달일이 25~40일 구간에 든다', () => {
    let state = createInitialState('시뮬')
    let reachedDay: number | null = null
    while (!state.gameOver && state.day <= 200) {
      if (reachedDay === null && state.stats.money >= 1800000) reachedDay = state.day
      const streak = countConsecutive(state.recentActivities, 'work')
      if (canRun(state, work) && state.stats.mental - (8 + streak * 4) > 3) {
        state = runActivity(state, work)
      } else if (canRun(state, game) && state.stats.mental < 95) state = runActivity(state, game)
      else state = skipSlot(state)
    }
    expect(reachedDay).not.toBeNull()
    expect(reachedDay!).toBeGreaterThanOrEqual(25)
    expect(reachedDay!).toBeLessThanOrEqual(40)
  })
})
