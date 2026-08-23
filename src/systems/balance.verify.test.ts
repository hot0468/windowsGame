/**
 * 밸런스 회귀 방지 테스트.
 * 실제 게임 모듈로 시뮬레이션을 돌려, 무한 플레이가 불가능하고
 * 엔딩이 의도한 구간에 도달하는지 검증한다.
 */
import { describe, it, expect } from 'vitest'
import { createInitialState, canRun, owns, runActivity, skipSlot } from './turn'
import {
  advanceCertification,
  canTake,
  certForItem,
  pendingExam,
  takeExam,
} from './certification'
import { findActivity } from '../data/activities'
import { ABSENCE_FIRE, ABSENCE_WARNING, CAREERS, PAYDAY_INTERVAL, findCareer } from '../data/careers'
import { getLivingCost } from './economy'
import { countConsecutive } from './burnout'
import { ACHIEVEMENT_ENDINGS } from '../data/endings'
import { advanceEmployment, applyTo, passes } from './employment'
import { advanceBank, bankOf, bankedTotal, borrow, loanRoom, openDeposit, withdraw } from './bank'
import { DEPOSIT_MIN, LOAN_LIMIT_BASE } from '../data/bank'
import { canMove, moveTo } from './housing'
import { CHEAPEST_HOUSING } from '../data/housing'
import { advanceLottery, affordableTickets, buyTickets } from './lottery'
import { TICKET_PRICE } from '../data/lottery'
import type { Activity, GameState } from '../types/game'
import type { Career } from '../data/careers'
import type { Cert } from '../data/certs'

const work = findActivity('work')!
const game = findActivity('game')!

/** 알바와 멘탈 회복을 번갈아 하는 최적에 가까운 생존 플레이. */
function playOptimally(maxDays: number): { state: GameState; peakMoney: number } {
  let state = createInitialState('시뮬')
  let peakMoney = state.stats.money
  while (state.day <= maxDays) {
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

describe('무한 플레이가 성립하는가', () => {
  /* ⚠️ **2026-08-14에 뜻이 통째로 뒤집힌 블록이다.** 예전 이름은 '무한 플레이 차단'이었고
     "최적 플레이도 결국 파산한다"·"60~120일에 끝난다"를 지켰다 — 물가가 반드시 수입을
     추월하게 만든 것이 이 게임의 종료 장치였기 때문이다. 육성물 전환(설계자 지시:
     "카이로소프트처럼 완전한 게임오버는 없었으면")으로 그 장치가 사라졌으므로, 지금
     지켜야 하는 것은 정반대다 — **오래 굴려도 판이 끝나지 않는가.** */

  it('최적 플레이는 천 일을 굴려도 끝나지 않는다', () => {
    const { state } = playOptimally(1000)
    expect(state.day).toBeGreaterThan(1000)
  })

  it('그 판이 회복에 갇혀 있지도 않다 — 살아서 도는 것이 무한 플레이다', () => {
    const { state } = playOptimally(1000)
    expect(state.recovery).toBeNull()
    expect(state.stats.money).toBeGreaterThan(0)
  })

  /* 실패가 아프지 않으면 육성물이 아니라 산책이다 — 주저앉는 일은 여전히 일어나야 한다. */
  it('아무것도 하지 않으면 곧 주저앉는다 — 벌이 사라진 것은 아니다', () => {
    let state = createInitialState('무행동')
    let downs = 0
    let wasDown = false
    while (state.day <= 60) {
      state = skipSlot(state)
      const down = state.recovery !== null
      if (down && !wasDown) downs++
      wasDown = down
    }
    expect(downs, '생활비만 나가는데도 한 번도 안 주저앉았다').toBeGreaterThan(0)
  })

  it('그래도 거기서 빠져나온다 — 주저앉음이 영구 상태가 아니다', () => {
    let state = createInitialState('무행동')
    while (state.day <= 60) state = skipSlot(state)
    // 60일을 굴린 끝에 회복에 **갇혀** 있으면 그것이 이름만 다른 게임오버다.
    const before = state.day
    while (state.recovery && state.day <= before + 10) state = skipSlot(state)
    expect(state.recovery).toBeNull()
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

/**
 * 그 회사의 서류·면접 요건을 모두 채웠는가.
 * ⚠️ **자격증도 여기에 들어 있다**(`career.cert`) — 판정은 `shortfalls` 하나가 한다.
 */
function qualified(state: GameState, career: Career): boolean {
  return passes(state, career.paper, career.cert) && passes(state, career.person)
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

  /* ⚠️ 2026-08-22 분 단위 전환: 하루에 들어가는 활동 수가 고정이 아니다(90~480분).
     가드를 넉넉히 잡지 않으면 400일에 닿기 전에 루프가 먼저 끝난다. */
  for (let guard = 0; guard < maxDays * 12 + 10; guard++) {
    if (state.day > maxDays) break

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

  /* ⚠️ 예전 이름은 '정규직으로도 결국 판은 끝난다'였다(고정 급여가 물가를 못 이긴다).
     급여는 여전히 물가 배율을 안 타지만, 물가가 발산하지 않으므로 판이 끝나지는 않는다. */
  it('정규직으로 400일을 굴려도 판이 끝나지 않는다', () => {
    const run = playEmployed(entry, 400)
    expect(run.state.day).toBeGreaterThan(400)
    expect(run.state.recovery).toBeNull()
  })

  it('출근하지 않으면 경고를 거쳐 해고된다 — 예고 없이 잃지 않는다', () => {
    // ⚠️ **첫 해고까지만 돌린다.** 길게 돌리면 해고된 뒤 다시 지원해 취직하는 주기가
    //    몇 번씩 겹치고, `NOTICE_LIMIT`이 오래된 소식을 버려서 "첫 경고"를 집을 수 없게 된다
    //    (여기서 재려는 것은 **한 번의 근태 경로**이지 재취업 반복이 아니다).
    const run = playEmployed(entry, 30, false)
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

  /**
   * ⚠️ **서류는 종이에 적히는 것, 면접은 만나 봐야 아는 것**(`data/careers.ts`의 요건 규칙 1).
   * 운동은 체력검사서로, 게임은 경력으로 적히고, 예의범절·도덕은 대면에서만 드러난다.
   * 목록을 늘릴 때는 그 갈래를 먼저 정하고 `REQUIREMENT_SOURCE`에 공급원도 함께 등록한다.
   */
  it('서류는 이력서 스탯을, 면접은 사람 스탯을 본다', () => {
    const paperKeys = new Set(CAREERS.flatMap((c) => Object.keys(c.paper)))
    const personKeys = new Set(CAREERS.flatMap((c) => Object.keys(c.person)))
    for (const k of paperKeys)
      expect(['knowledge', 'vocabulary', 'creativity', 'athletics', 'gaming']).toContain(k)
    for (const k of personKeys)
      expect(['charm', 'reputation', 'sociability', 'manners', 'morality']).toContain(k)
    // 요건에 쓰인 스탯은 전부 공급원이 있어야 한다 — 없으면 도달 불가능한 자리가 된다.
    for (const k of [...paperKeys, ...personKeys]) expect(REQUIREMENT_SOURCE[k]).toBeDefined()
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
  /* ⚠️ 아래 넷은 물류센터·어린이집·QA가 요구하면서 필요해졌다. 요건에 스탯을 새로 쓰려면
     **그 스탯의 주 공급원을 여기 등록해야** 그 자리가 도달 가능한 엔딩이 된다 — 위 주석의
     "그때 고쳐야 하는 것은 테스트가 아니라 이 정책이다"가 가리키는 표가 정확히 이것이다. */
  athletics: findActivity('running')!,
  gaming: findActivity('esports')!,
  manners: findActivity('etiquette')!,
  morality: findActivity('volunteer')!,
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

/**
 * 자격증이 필요한 자리를 위한 준비 단계.
 *
 * ⚠️ **급여 상위 두 공고는 자격증을 요구한다**(2026-08-05 O넷). 시뮬레이션이 응시할 줄
 * 모르면 그 두 자리가 **도달 불가능한 엔딩**이 되어 아래 테스트가 실패한다 — 그때 고쳐야
 * 하는 것은 테스트가 아니라 **이 정책**이다("아무도 볼 수 없는 엔딩은 버그다"를 지키는
 * 것이 저 테스트의 존재 이유이므로, 느슨하게 만들면 지킬 것이 사라진다).
 *
 * 정책은 정규직 지원과 같다: **기준을 다 채운 뒤에 접수한다.** 합격 판정은 발표일 시점의
 * 스탯으로 나므로 미리 넣어도 되지만, 그렇게 하면 "떨어져서 응시료만 날리는" 경로가
 * 섞여 밸런스를 재는 근거가 흐려진다.
 */
function certToTake(state: GameState, career: Career): Cert | undefined {
  if (!career.cert || owns(state, career.cert)) return undefined
  const cert = certForItem(career.cert)
  if (!cert || pendingExam(state, cert.id)) return undefined
  // 기준 미달이면 아직 안 본다. 응시료를 낼 여유도 함께 본다(내고 굶으면 시뮬레이션이 아니다).
  if (!passes(state, cert.requires)) return undefined
  if (state.stats.money < cert.fee + getLivingCost(state) * 3) return undefined
  return canTake(state, cert) ? cert : undefined
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

  /* ⚠️ 2026-08-22 분 단위 전환: 하루에 들어가는 활동 수가 고정이 아니다(90~480분).
     가드를 넉넉히 잡지 않으면 400일에 닿기 전에 루프가 먼저 끝난다. */
  for (let guard = 0; guard < maxDays * 12 + 10; guard++) {
    if (state.day > maxDays) break
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
      state.stats.money < getLivingCost(state) * RUNWAY_DAYS &&
      canRun(state, earn)
    ) {
      next = runActivity(state, earn)
    } else if (certToTake(state, career)) {
      // 자격증은 **지원보다 먼저** 딴다 — 없으면 서류에서 떨어진다.
      next = takeExam(state, certToTake(state, career)!)
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

    // ⚠️ 손으로 플레이할 때와 **같은 함수, 같은 자리**(`gameStore.afterTurn`).
    //    빠뜨리면 합격이 한 번도 확정되지 않아 자격증이 영영 안 나온다
    //    (`playBanking`이 `advanceBank`를 부르는 것과 같은 이유).
    const settled = advanceEmployment(advanceCertification(next).state)
    for (const n of settled.notices) if (n.kind === 'hired' && hiredDay === null) hiredDay = n.day
    state = settled.state
  }
  return { state, hiredDay }
}

describe('직업 콜렉션 — 아무도 못 여는 줄은 없다', () => {
  /* ⚠️ **2026-08-14에 뜻이 뒤집힌 블록이다.** 예전 이름은 '직업 엔딩 — 아무도 볼 수 없는
     엔딩은 없다'였고, 공고마다 **취직한 뒤 파산해** 그 회사의 엔딩으로 끝나는지를 봤다.
     직업 엔딩 9종이 도감 콜렉션으로 옮겨 가면서 파산이 조건에서 빠졌지만, **"도달할 수
     있는가"라는 물음 자체는 그대로 옳다** — 못 여는 콜렉션 줄은 못 보는 엔딩과 똑같이
     버그다. 그래서 시뮬레이션(`playToward`)은 그대로 두고 단언만 바꾼다. */
  for (const career of CAREERS) {
    it(`${career.company}에 실제로 취직할 수 있다`, () => {
      const run = playToward(career, 400)
      expect(run.hiredDay, `${career.id}에 끝내 취직하지 못했다 — 못 여는 콜렉션이다`).not.toBeNull()
      expect(run.state.peakCareerId).toBe(career.id)
    })
  }

  it('해고돼도 다녔다는 기록은 남는다 — 콜렉션은 "다녀 본 적 있는가"다', () => {
    const run = playEmployed(CAREERS[0], 400, false)
    expect(run.firedDay, '결근했는데도 해고되지 않았다').not.toBeNull()
    expect(run.state.peakCareerId).toBe(CAREERS[0].id)
  })
})

/**
 * ⚠️ **이 묶음이 은행이 공짜 돈이 되지 않는다는 것을 지킨다.**
 *
 * ⚠️ **2026-08-14에 전제가 바뀌었다.** 예전 이 주석은 "은행 때문에 판이 무한해지지
 * 않는다"를 지킨다고 적혀 있었다 — 그때는 "게임은 반드시 끝난다"가 프로젝트의 핵심
 * 보증이었기 때문이다. 육성물 전환으로 판은 원래 안 끝나므로, 남은 위협은 하나다:
 * **빌려서 예금하기가 이익이면** 무위험 차익으로 무한히 불어난다.
 * 이율 부등식(`bank.test.ts`)이 데이터 수준에서 막고, 여기서는 시뮬레이션으로 확인한다.
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
function playBanking(maxDays: number): { state: GameState; peakBanked: number; peakMoney: number } {
  let state = createInitialState('은행최적')
  let peakBanked = 0
  let peakMoney = state.stats.money

  while (state.day <= maxDays) {
    const living = getLivingCost(state)
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
    /* ⚠️ **묶인 돈까지 함께 센다** — 무한 플레이에서 은행의 값은 '며칠을 사 주는가'가
       아니라 '얼마를 불려 주는가'인데, 현금만 보면 예금에 넣은 순간 값이 줄어 보인다. */
    peakMoney = Math.max(peakMoney, state.stats.money + bankedTotal(state))
  }
  return { state, peakBanked, peakMoney }
}

describe('은행 — 쓰는 이유가 있는 장치인가', () => {
  /* ⚠️ **2026-08-14에 뜻이 뒤집힌 블록이다.** 예전 이름은 '은행 — 그래도 판은 끝난다'였고,
     "복리가 물가를 이기지 못한다"·"연장이 240일을 안 넘는다"로 **판이 끝나는 것**을 지켰다.
     무한 플레이가 되면서 "며칠을 사 주는가"로는 장치의 값을 잴 수 없다 — 아무도 안 죽으니까.
     그래서 재는 것을 **얼마를 불려 주는가**로 바꾼다. 판정의 뜻은 그대로다:
     **쓰는 이유가 있어야 장치이고, 공짜 차익이 있으면 안 된다.** */

  it('예금이 실제로 돈을 불려 준다 — 쓰는 이유가 있어야 장치다', () => {
    const banking = playBanking(400)
    const plain = playOptimally(400)
    expect(banking.peakBanked, '은행을 한 번도 쓰지 않았다면 시뮬레이션이 거짓이다').toBeGreaterThan(0)
    expect(banking.peakMoney).toBeGreaterThanOrEqual(plain.peakMoney)
  })

  it('빌려서 예금하는 짓은 이득이 아니다 — 무위험 차익이 없다', () => {
    // 한도까지 빌려 정기예금에 넣고 시작한다. 차익이 존재한다면 빚보다 이자가 커야 한다.
    let state: GameState = createInitialState('차익시도')
    state = borrow(state, loanRoom(state))
    state = openDeposit(state, Math.floor(state.stats.money / DEPOSIT_MIN) * DEPOSIT_MIN)
    let guard = 0
    while (state.day <= 400 && guard++ < 5000) {
      const streak = countConsecutive(state.recentActivities, 'work')
      if (canRun(state, work) && state.stats.mental - (8 + streak * 4) > 3) {
        state = runActivity(state, work)
      } else if (canRun(state, game) && state.stats.mental < 95) state = runActivity(state, game)
      else state = skipSlot(state)
      state = advanceBank(state)
    }
    // 빚이 원금보다 커져 있어야 한다 — 이자가 나를 향해 붙었다는 증거다.
    expect(bankOf(state).debt).toBeGreaterThan(LOAN_LIMIT_BASE)
  })
})

/* ── 이사 · 복권 (2026-08-05) ──────────────────────────────────────────────
 *
 * ⚠️ **이 묶음이 새 장치 둘 때문에 판이 무한해지지 않는다는 것을 지킨다.**
 *
 * 둘은 정확히 반대 방향으로 이 프로젝트의 핵심 보증("게임은 반드시 끝난다")을 위협한다:
 *  (a) **이사**는 생활비를 **영구히** 낮춘다 — 물가를 못 이기게 만드는 바로 그 값을 깎는다.
 *  (b) **복권**은 아주 낮은 확률로 큰 돈을 준다 — 한 번 터지면 며칠이 아니라 몇 달이 생긴다.
 *
 * (b)는 기대값 부등식(`lottery.test.ts`)이 데이터 수준에서 막는다(환급률 27.5%).
 * 여기서는 **둘을 동시에 최대로 쓰는 플레이**를 시뮬레이션으로 돌려 죽는 날을 확인한다.
 *
 * ⚠️ **기존 알바·정규직·은행 시뮬레이션을 약화시키지 않는다**(정규직·은행 때와 같은 원칙).
 */

// 사치 칸이 뒤에 붙어 배열 끝은 가장 비싼 집이다 — 정본 셀렉터를 쓴다(data/housing.ts).
const cheapest = CHEAPEST_HOUSING

/**
 * **가장 싼 집으로 옮기고 복권을 계속 사는 플레이.**
 *
 * `playOptimally`(알바 + 멘탈 회복)에 두 겹을 얹었다:
 *  - 계약금이 모이는 즉시 **가장 싼 집**(고시원, 생활비 48%)으로 옮긴다.
 *  - 그 뒤로는 며칠치 생활비를 넘는 여윳돈으로 **매 슬롯 복권을 산다**(1회 상한까지).
 *
 * ⚠️ **매 슬롯 `advanceLottery`를 돌린다** — 손으로 플레이할 때 `gameStore.afterTurn`이
 * 하는 것과 같다. 빠뜨리면 당첨금이 한 번도 안 들어와 시뮬레이션이 거짓이 된다
 * (`playBanking`이 `advanceBank`를 부르는 것과 같은 이유).
 */
function playHousedGambler(maxDays: number): {
  state: GameState
  movedDay: number | null
  tickets: number
  won: number
  peakMoney: number
} {
  let state = createInitialState('이사복권')
  let movedDay: number | null = null
  let peakMoney = state.stats.money

  while (state.day <= maxDays) {
    // ① 계약금이 되면 가장 싼 집으로. 생활비를 깎는 것이 가장 큰 이득이므로 최우선이다.
    if (movedDay === null && canMove(state, cheapest)) {
      state = moveTo(state, cheapest)
      movedDay = state.day
    }

    // ② 여윳돈으로 복권. 며칠치 생활비는 남긴다(사자마자 굶어 죽으면 시뮬레이션이 아니다).
    //
    // ⚠️ **이사하기 전에는 사지 않는다.** 계약금을 모으는 중에 표를 사면 목돈이 영영
    //    안 모여 "이사도 못 하고 복권도 손해만 보는" 플레이가 된다 — 그건 최적이 아니라
    //    그냥 나쁜 플레이라 밸런스를 재는 근거가 못 된다. 사람도 목돈 모을 때는 안 산다.
    if (movedDay !== null) {
      const buffer = getLivingCost(state) * 3
      const spare = Math.floor((state.stats.money - buffer) / TICKET_PRICE)
      const count = Math.min(spare, affordableTickets(state))
      if (count >= 1) state = buyTickets(state, count)
    }

    const streak = countConsecutive(state.recentActivities, 'work')
    const mentalCost = 8 + streak * 4
    if (canRun(state, work) && state.stats.mental - mentalCost > 3) state = runActivity(state, work)
    else if (canRun(state, game) && state.stats.mental < 95) state = runActivity(state, game)
    else state = skipSlot(state)

    // ⚠️ 손으로 플레이할 때와 **같은 함수, 같은 자리**. 당첨금이 여기서 들어온다.
    state = advanceLottery(state)
    peakMoney = Math.max(peakMoney, state.stats.money)
  }

  const lot = state.lottery
  return { state, movedDay, tickets: lot?.serial ?? 0, won: lot?.won ?? 0, peakMoney }
}

/**
 * 이사만 하는(복권은 안 사는) 대조군. `move=false`면 이사도 안 한다.
 * ⚠️ **`playHousedGambler`와 같은 정책이어야** 비교가 성립한다 — 다른 것은 복권뿐이다.
 */
function playHoused(maxDays: number, move: boolean): { state: GameState; peakMoney: number } {
  let state = createInitialState(move ? '이사만' : '그대로')
  let peakMoney = state.stats.money
  while (state.day <= maxDays) {
    if (move && canMove(state, cheapest)) state = moveTo(state, cheapest)
    const streak = countConsecutive(state.recentActivities, 'work')
    if (canRun(state, work) && state.stats.mental - (8 + streak * 4) > 3) {
      state = runActivity(state, work)
    } else if (canRun(state, game) && state.stats.mental < 95) state = runActivity(state, game)
    else state = skipSlot(state)
    peakMoney = Math.max(peakMoney, state.stats.money)
  }
  return { state, peakMoney }
}

describe('이사 · 복권 — 쓰는 이유가 있는 장치인가', () => {
  /* ⚠️ **2026-08-14에 뜻이 뒤집힌 블록이다**(은행 블록과 같은 자리·같은 사유).
     예전 이름은 '— 그래도 판은 끝난다'였고 "결국 파산한다"·"240일을 안 넘는다"로
     **판이 끝나는 것**을 지켰다. 무한 플레이에서는 "며칠을 사 주는가"로 장치의 값을
     잴 수 없으므로 **얼마를 남겨 주는가**로 바꾼다. 복권이 수입원이 아니라는 것,
     이사가 실제로 이득이라는 것 — 두 판정의 뜻은 그대로다. */

  it('시뮬레이션이 실제로 이사하고 복권을 산다 — 아니면 아래가 전부 거짓이다', () => {
    const run = playHousedGambler(400)
    expect(run.movedDay, '끝내 이사하지 못했다면 시뮬레이션이 거짓이다').not.toBeNull()
    expect(run.tickets, '복권을 한 장도 사지 않았다면 시뮬레이션이 거짓이다').toBeGreaterThan(0)
  })

  it('이사가 실제로 돈을 남겨 준다 — 쓰는 이유가 없으면 장치가 아니다', () => {
    // 같은 정책에서 이사만 뺀 플레이와 견준다. 생활비가 줄었으니 남는 돈이 많아야 한다.
    const moved = playHoused(400, true)
    const stayed = playHoused(400, false)
    expect(moved.peakMoney).toBeGreaterThan(stayed.peakMoney)
  })

  /**
   * ⚠️ **복권은 돈을 벌어 주지 않는다** — 기대값이 음수이므로 사면 살수록 손해다.
   * 이 단언이 무너지면 복권이 수입원이 된 것이고, 그 순간 노동이 뜻을 잃는다.
   */
  it('⚠️ 복권에 쓴 돈이 받은 상금보다 많다 — 수입원이 아니다', () => {
    const run = playHousedGambler(400)
    const lot = run.state.lottery!
    expect(lot.spent).toBeGreaterThan(lot.won)
  })

  it('복권을 안 사면 돈이 더 남는다 — 복권은 지출이다', () => {
    expect(playHoused(400, true).peakMoney).toBeGreaterThan(playHousedGambler(400).peakMoney)
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
    while (state.day <= 200) {
      if (reachedDay === null && state.stats.money >= 1800000) reachedDay = state.day
      const streak = countConsecutive(state.recentActivities, 'work')
      if (canRun(state, work) && state.stats.mental - (8 + streak * 4) > 3) {
        state = runActivity(state, work)
      } else if (canRun(state, game) && state.stats.mental < 95) state = runActivity(state, game)
      else state = skipSlot(state)
    }
    expect(reachedDay).not.toBeNull()
    /* ⚠️ 2026-08-22 분 단위 전환으로 **앞당겨졌다**(옛 구간 25~40일) — 하루가 슬롯 둘이
       아니라 960분이라, 짧은 활동을 섞으면 하루에 서너 개가 들어간다. 구간을 넓힌 것은
       봐주는 것이 아니라 **사실을 다시 적은 것**이다. */
    expect(reachedDay!).toBeGreaterThanOrEqual(15)
    expect(reachedDay!).toBeLessThanOrEqual(40)
  })
  /*
   * ⚠️ **철인이 이 파일에 있어야 하는 이유**(2026-08-08 체력 통합).
   * 예전에는 조건이 `maxStamina: 200`이고 그 값이 곧 스탯 상한이라 "상한에 닿으면 엔딩"이
   * 자명했다(`turn.test.ts`가 두 숫자가 같은지만 봤다). 지금은 조건이 `athletics`이고
   * 상한(999)과 무관해서, **실제로 도달하는지는 굴려 봐야만 안다.**
   * 조건을 올리려면 이 시뮬레이션을 먼저 통과시킬 것 — 느슨하게 고쳐 통과시키지 말 것.
   */
  it('철인 기준은 실제 플레이로 도달 가능하다', () => {
    const running = findActivity('running')!
    const ironman = ACHIEVEMENT_ENDINGS.find((e) => e.id === 'ironman')!
    const goal = ironman.condition!.athletics!
    let state = createInitialState('시뮬')
    let reachedDay: number | null = null
    while (state.day <= 200) {
      if (reachedDay === null && state.stats.athletics >= goal) reachedDay = state.day
      // 돈이 마르면 일하고, 아니면 뛴다. 러닝은 돈이 안 들고 멘탈을 채운다.
      const streak = countConsecutive(state.recentActivities, 'work')
      if (state.stats.money < 200_000 && canRun(state, work) && state.stats.mental - (8 + streak * 4) > 3) {
        state = runActivity(state, work)
      } else if (canRun(state, running)) state = runActivity(state, running)
      else if (canRun(state, work) && state.stats.mental - (8 + streak * 4) > 3) {
        state = runActivity(state, work)
      } else state = skipSlot(state)
    }
    expect(reachedDay, `운동 ${goal}에 못 닿았다 — 철인 엔딩이 도달 불가다`).not.toBeNull()
  })
})
