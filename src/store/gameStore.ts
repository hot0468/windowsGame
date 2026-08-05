import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  canRun,
  claimAdBonus,
  createInitialState,
  runActivity,
  skipSlot,
  spendMoney,
} from '../systems/turn'
import { INITIAL_STATS } from '../types/game'
import { findActivity } from '../data/activities'
import { findItem } from '../data/items'
import { clearPlan, planWeekly, runPlans, setPlan } from '../systems/schedule'
import { collect, order, owns, recordEvent } from '../systems/delivery'
import { advanceEmployment, applyTo, canApply } from '../systems/employment'
import { advanceBank, borrow, deposit, openDeposit, repay, withdraw } from '../systems/bank'
import { selectIncoming } from '../systems/messages'
import {
  AUTO_STOPPED_BY_PLAYER,
  appendStep,
  endRun,
  findStop,
  startRun,
} from '../systems/autoAdvance'
import { AUTO_STEP_MS } from '../data/autoAdvance'
import { findCareer } from '../data/careers'
import type { AutoRun, AutoStop, StopContext } from '../systems/autoAdvance'
import type { Career } from '../data/careers'
import type { OfferOption } from '../data/messages'
import type { ShopItem } from '../data/items'
import type { SkippedPlan } from '../systems/schedule'
import type {
  Activity,
  Application,
  BankEntry,
  BankState,
  Employment,
  GameState,
  JobNotice,
  Slot,
  Stats,
  TermDeposit,
} from '../types/game'

/**
 * 세이브에 반드시 유한한 숫자로 들어 있어야 하는 스탯 키.
 * INITIAL_STATS에서 파생시켜, 스탯이 추가돼도 검증에서 빠지지 않게 한다.
 */
const REQUIRED_STAT_KEYS = Object.keys(INITIAL_STATS) as (keyof Stats)[]

/**
 * 정규직 상태 복원.
 *
 * ⚠️ **정규직이 생기기 전의 세이브에는 이 필드들이 아예 없다** — 그때는 전부 undefined가 되고,
 * 그것이 곧 "지원한 적도 취직한 적도 없다"라 마이그레이션이 필요 없다.
 * 값 검증이 다른 옵셔널 필드보다 빡빡한 이유는 **이 상태가 돈을 만들기 때문**이다:
 * 없는 공고를 가리키거나 숫자가 NaN이면 급여가 NaN이 되고, `NaN <= 0`이 false라
 * 파산 판정이 영영 안 걸린다(스탯 검증과 같은 사고 형태).
 */
function reviveJob(
  saved: Partial<GameState>,
): Pick<GameState, 'application' | 'employment' | 'jobNotices' | 'peakCareerId'> {
  const app = saved.application
  const application: Application | undefined =
    app &&
    findCareer(app.careerId) &&
    Number.isFinite(app.appliedDay) &&
    Number.isFinite(app.dueDay) &&
    (app.stage === 'screening' || app.stage === 'interview' || app.stage === 'final')
      ? {
          careerId: app.careerId,
          appliedDay: Number(app.appliedDay),
          stage: app.stage,
          dueDay: Number(app.dueDay),
        }
      : undefined

  const job = saved.employment
  const employment: Employment | undefined =
    job &&
    findCareer(job.careerId) &&
    Number.isFinite(job.hiredDay) &&
    Number.isFinite(job.paydayDay) &&
    Number.isFinite(job.checkedDay) &&
    Number.isFinite(job.absences)
      ? {
          careerId: job.careerId,
          hiredDay: Number(job.hiredDay),
          paydayDay: Number(job.paydayDay),
          attendedDays: Array.isArray(job.attendedDays)
            ? job.attendedDays.filter((d): d is number => Number.isFinite(d))
            : [],
          absences: Number(job.absences),
          checkedDay: Number(job.checkedDay),
          warnedAt: Number.isFinite(job.warnedAt) ? Number(job.warnedAt) : undefined,
        }
      : undefined

  // 이번 판의 최고 경력. **없는 공고를 가리키면 버린다** — 파산 엔딩이 그 값으로 갈리는데
  // 찾지 못하면 `careerEnding`이 undefined를 주고 그냥 파산 엔딩이 되므로 조용히 맞는다.
  //
  // ⚠️ 이 필드가 생기기 전(2026-08-05 이전) 세이브에는 값이 아예 없다. 그때는 **재직 중인
  //    회사로 메운다** — 그 사람이 실제로 도달한 자리를 알 수 있는 유일한 흔적이고,
  //    비워 두면 다니던 회사가 있는데도 "무직으로 죽었다"가 된다. 해고된 뒤 저장된 옛 세이브는
  //    복원할 방법이 없으므로 무직으로 남는다(그 사실을 알 수 있는 기록 자체가 없다).
  const peakCareerId =
    typeof saved.peakCareerId === 'string' && findCareer(saved.peakCareerId)
      ? saved.peakCareerId
      : employment?.careerId

  return {
    application,
    employment,
    peakCareerId,
    jobNotices: Array.isArray(saved.jobNotices)
      ? (saved.jobNotices.filter((n) => n && typeof n.id === 'string') as JobNotice[])
      : undefined,
  }
}

const LEDGER_KINDS: BankEntry['kind'][] = [
  'deposit',
  'withdraw',
  'term-open',
  'term-mature',
  'interest',
  'borrow',
  'repay',
]

/**
 * 은행 상태 복원.
 *
 * ⚠️ **은행이 생기기 전 세이브에는 이 필드가 아예 없다** — 그때는 undefined가 되고
 * 그것이 곧 "거래한 적 없음"이라 마이그레이션이 필요 없다(`plans`·`inventory`와 같은 규칙).
 *
 * ⚠️ **검증이 다른 옵셔널 필드보다 훨씬 빡빡한 이유는 `reviveJob`과 정확히 같다 —
 * 이 상태가 돈을 만들기 때문이다.** 잔액이나 이율이 NaN이면 이자가 NaN이 되고, 만기
 * 원리금이 NaN으로 소지금에 흘러 들어가면 `NaN <= 0`이 false라 **파산 판정이 영영 안 걸린다**
 * (스탯 검증·정규직 검증과 같은 사고 형태). 그래서 숫자 하나라도 유한하지 않으면
 * **그 항목을 통째로 버린다** — 반쪽 잔액을 살리는 것보다 잃는 편이 안전하다.
 */
function reviveBank(saved: Partial<GameState>): BankState | undefined {
  const bank = saved.bank
  if (!bank || typeof bank !== 'object') return undefined
  // 잔액 셋 중 하나라도 못 믿으면 은행 기록 전체를 버린다.
  if (!Number.isFinite(bank.savings) || !Number.isFinite(bank.debt)) return undefined
  if (bank.savings < 0 || bank.debt < 0) return undefined

  const deposits: TermDeposit[] = (Array.isArray(bank.deposits) ? bank.deposits : []).filter(
    (d): d is TermDeposit =>
      !!d &&
      typeof d.id === 'string' &&
      Number.isFinite(d.principal) &&
      d.principal > 0 &&
      Number.isFinite(d.openedDay) &&
      Number.isFinite(d.matureDay) &&
      Number.isFinite(d.rate) &&
      d.rate >= 0,
  )

  return {
    savings: Number(bank.savings),
    debt: Number(bank.debt),
    deposits,
    // 커서가 없거나 못 믿을 값이면 오늘로 잡는다 — 과거로 두면 없던 이자가 한꺼번에 붙고,
    // 미래로 두면 이자가 영영 안 붙는다(`advanceBank`가 `days <= 0`에서 멈춘다).
    accruedDay: Number.isFinite(bank.accruedDay) ? Number(bank.accruedDay) : Number(saved.day ?? 1),
    ledger: (Array.isArray(bank.ledger) ? bank.ledger : []).filter(
      (e): e is BankEntry =>
        !!e &&
        typeof e.id === 'string' &&
        Number.isFinite(e.day) &&
        Number.isFinite(e.amount) &&
        LEDGER_KINDS.includes(e.kind),
    ),
  }
}

/**
 * 저장된 세이브를 검증해 안전한 GameState로 되돌린다.
 * 필드가 빠진 구버전 세이브를 그대로 통과시키면 clampStats가 NaN을 만들고,
 * NaN <= 0이 false라 게임오버 판정이 영영 걸리지 않아 조용히 망가진다.
 * 복구 불가능하면 null을 반환해 잠금화면에서 새 게임으로 시작하게 한다.
 */
function reviveState(raw: unknown): GameState | null {
  if (!raw || typeof raw !== 'object') return null
  const saved = raw as Partial<GameState>

  // 기본값 위에 저장값을 덮어써서, 새로 추가된 필드가 undefined로 남지 않게 한다.
  const defaults = createInitialState(
    typeof saved.playerName === 'string' && saved.playerName.trim() ? saved.playerName : '이름없음',
  )
  // 개명 전 세이브 호환: intelligence는 knowledge의 옛 이름이다.
  // 매핑 없이 기본값을 덮으면 그 스탯 진행만 조용히 초기화된다.
  const savedStats = { ...(saved.stats ?? {}) } as Partial<Stats> & { intelligence?: number }
  if (savedStats.knowledge === undefined && Number.isFinite(savedStats.intelligence)) {
    savedStats.knowledge = savedStats.intelligence
  }
  delete savedStats.intelligence
  const stats: Stats = { ...defaults.stats, ...savedStats }

  // 스탯이 하나라도 유한한 숫자가 아니면 세이브를 신뢰할 수 없다.
  const statsValid = REQUIRED_STAT_KEYS.every((key) => Number.isFinite(stats[key]))
  if (!statsValid) return null

  const day = Number.isFinite(saved.day) ? Number(saved.day) : defaults.day
  if (day < 1) return null

  return {
    ...reviveJob(saved),
    playerName: defaults.playerName,
    day,
    slot: saved.slot === 'afternoon' ? 'afternoon' : 'morning',
    stats,
    recentActivities: Array.isArray(saved.recentActivities)
      ? saved.recentActivities.filter((id): id is string => typeof id === 'string')
      : [],
    seenEndingIds: Array.isArray(saved.seenEndingIds)
      ? saved.seenEndingIds.filter((id): id is string => typeof id === 'string')
      : [],
    gameOver:
      saved.gameOver === 'bankrupt' || saved.gameOver === 'burnout' ? saved.gameOver : null,
    // 옵셔널 필드는 형태만 확인하고 통과시킨다. 여기서 빠뜨리면 세이브를 되돌릴 때마다
    // 예약·배송·도감이 조용히 사라진다(값 검증은 각 시스템이 이미 하고 있다).
    adBonusDay: Number.isFinite(saved.adBonusDay) ? Number(saved.adBonusDay) : undefined,
    plans: Array.isArray(saved.plans) ? saved.plans : undefined,
    inventory: Array.isArray(saved.inventory) ? saved.inventory : undefined,
    deliveries: Array.isArray(saved.deliveries) ? saved.deliveries : undefined,
    events: Array.isArray(saved.events) ? saved.events : undefined,
    bank: reviveBank(saved),
  }
}

/**
 * 구버전/손상 세이브 보정. 절대 throw하지 않는다 —
 * 못 쓰는 세이브는 크래시가 아니라 새 게임으로 degrade시킨다.
 */
export function migrateSave(persisted: unknown): { state: GameState | null } {
  try {
    if (!persisted || typeof persisted !== 'object') return { state: null }
    return { state: reviveState((persisted as { state?: unknown }).state) }
  } catch {
    return { state: null }
  }
}

/**
 * localStorage에 실제로 저장할 부분을 고른다.
 * 끝난 게임(gameOver)은 저장하지 않는다 — 이어할 수 없는 세이브가 남으면
 * 잠금화면은 "세이브 없음"으로 취급하는데 데이터만 계속 남는 어긋난 상태가 된다.
 * 메모리의 state는 그대로 두므로 엔딩 화면과 "처음부터 다시" 흐름은 영향받지 않고,
 * 진행 중(gameOver === null) 세이브는 항상 보존된다.
 */
export function selectPersistedState(state: GameState | null): { state: GameState | null } {
  return { state: state?.gameOver ? null : state }
}

/**
 * 턴이 넘어간 뒤의 공통 처리.
 *
 * **턴을 넘기는 모든 통로가 여기를 지난다** — 예약 실행(`runPlans`)과 택배 수령(`collect`)을
 * 호출부마다 적어 두면 새 통로가 생길 때마다 하나씩 빠뜨린다.
 */
function afterTurn(next: GameState, chain?: number) {
  const ran = runPlans(next, chain)
  const got = collect(ran.state)
  // ⚠️ **은행 정산은 고용 정산보다 먼저 돈다.** 둘 다 마지막 줄에서 `settleGameOver`를
  //    부르므로 순서 자체가 판정을 바꾸지는 않지만(이미 확정된 사유는 되살아나지 않는다),
  //    만기 원리금이 급여보다 먼저 들어와야 급여 소식 메일에 적히는 잔액이 실제와 맞는다.
  const banked = advanceBank(got.state)
  // ⚠️ 고용 정산은 **예약 연쇄가 끝난 뒤**에 한 번 돈다. 커서(`checkedDay`)와
  //    급여 루프가 밀린 날짜를 따라잡도록 돼 있어, 며칠이 한 번에 흘러도 새지 않는다.
  // ⚠️ **반드시 마지막이다.** 게임오버는 밤이 다 정산된 뒤 딱 한 번 확정되는데
  //    (설계자 지시: 급여가 우선한다) 그 확정을 `advanceEmployment`의 마지막 줄이 한다.
  //    생활비는 `turn.ts`의 취침 정산이 먼저 빼고 급여는 여기서 들어오므로, 이 호출을
  //    위로 올리면 **월급을 손에 쥔 채 파산하는** 버그가 되돌아온다.
  const job = advanceEmployment(banked)
  return {
    state: job.state,
    skippedPlans: ran.skipped,
    arrivals: got.arrived,
    jobNotices: job.notices,
  }
}

interface GameStore {
  state: GameState | null
  /** 잠금화면을 통과했는지. 저장하지 않아 새로고침 시 잠금화면부터 시작한다. */
  loggedIn: boolean
  startGame: (name: string) => void
  continueGame: () => void
  logout: () => void
  doActivity: (activity: Activity) => void
  doSkip: () => void
  /** 포털 광고 배너 보상(하루 한 번 100원). 턴은 소모하지 않는다. */
  claimAdBonus: () => void
  /**
   * 세이브 문자열을 되돌려 넣는다. 성공하면 true.
   *
   * ⚠️ 형태만 확인하고 값은 믿지 않는다 — 손으로 고친 세이브가 들어올 수 있으므로
   * 스탯은 다음 행동 때 `clampStats`가 어차피 상한으로 끌어내린다. 여기서 전부
   * 검사하려 들면 규칙이 두 곳으로 갈라진다.
   */
  importSave: (raw: string) => boolean
  /** 예약을 정한다(같은 슬롯이면 교체). 지난 슬롯에는 넣지 않는다. */
  planActivity: (day: number, slot: Slot, activityId: string) => void
  /** 예약을 지운다. */
  unplan: (day: number, slot: Slot) => void
  /**
   * 오픈채팅의 제안을 받아들인다(헬스장 등).
   *
   * 세 가지가 한 동작으로 묶인다: 즉시 결제(`cost`) · 주간 예약(`weekly`) · 즉시 활동(`activityId`).
   * 컴포넌트가 세 번 나눠 부르면 중간에 실패했을 때 절반만 적용된 상태가 남는다.
   */
  acceptOffer: (option: OfferOption) => void
  /**
   * 예약을 못 지킨 내역. **휘발**이다 — 알리고 나면 남길 이유가 없다.
   * 조용히 사라지면 왜 안 됐는지 알 수 없으므로 밖으로 꺼내 둔다.
   */
  skippedPlans: SkippedPlan[]
  clearSkipped: () => void
  /**
   * 물건을 산다. **턴은 소모하지 않고 돈만 나간다** — 물건은 다음 날 도착하고
   * 효과도 그때 붙는다(`systems/delivery.ts`).
   */
  orderItem: (item: ShopItem) => void
  /**
   * 방금 도착한 택배. **휘발**이다 — 토스트를 띄우고 나면 남길 이유가 없다
   * (`skippedPlans`와 같은 규칙). 보유 기록은 `state.inventory`가 들고 있다.
   */
  arrivals: ShopItem[]
  clearArrivals: () => void
  /**
   * 정규직 공고에 지원한다. **1턴을 쓴다**(`job-apply` 활동이 비용을 갖는다).
   *
   * 기록을 먼저 만들고 활동을 실행하는 순서가 중요하다 — `canRun`의 `'applying'` 게이트가
   * "낼 서류가 정해져 있는가"를 보기 때문이다. 조건이 안 되면 **아무것도 하지 않는다**
   * (반쪽 상태: 지원은 됐는데 턴은 안 쓴, 또는 그 반대를 남기지 않는다).
   */
  applyToCareer: (career: Career) => void
  /**
   * 방금 도착한 정규직 소식. **휘발**이다 — 토스트를 띄우고 나면 비운다
   * (`arrivals`·`skippedPlans`와 같은 규칙). 원본은 `state.jobNotices`가 들고 있다.
   */
  jobNotices: JobNotice[]
  clearJobNotices: () => void
  /**
   * 은행 거래. **전부 턴을 소모하지 않는다**(쇼핑 주문과 같은 규칙 — "탐색은 무료").
   *
   * ⚠️ **턴을 안 쓰므로 `afterTurn`을 부르지 않는다.** 부르면 창구에서 통장을 만드는
   * 것만으로 반나절이 지나간다. 규칙·판정은 전부 `systems/bank.ts`가 갖고 여기서는
   * 순수 함수를 부르기만 한다(광고 보상·쇼핑 주문과 같은 통로).
   */
  bankDeposit: (amount: number) => void
  bankWithdraw: (amount: number) => void
  bankOpenDeposit: (amount: number) => void
  bankBorrow: (amount: number) => void
  bankRepay: (amount: number) => void
  markEndingSeen: (endingId: string) => void
  reset: () => void

  /* ── 자동 진행 ──────────────────────────────────────────────────────── */
  /**
   * 지금 자동으로 흐르고 있는가. **휘발**이다 — 새로고침하면 멈춘 상태에서 시작한다
   * (달리는 채로 저장하면 창을 다시 열자마자 손댈 수 없는 흐름이 시작된다).
   */
  autoRunning: boolean
  /** 이번 진행에서 지금까지 넘긴 슬롯 수. 진행 표시(ux `Progress Indicators`)에 쓴다. */
  autoSlots: number
  /**
   * 마지막 자동 진행의 보고서. 다음 진행이 시작될 때 갈아 끼운다.
   * ⚠️ **휘발이지만 진행이 끝나도 비우지 않는다** — 요약 창을 닫았다가 다시 열 수 있어야 한다.
   */
  autoRun: AutoRun | null
  /** 자동 진행을 시작한다. 게임오버거나 이미 달리는 중이면 아무것도 하지 않는다. */
  startAuto: () => void
  /** 진행을 즉시 멈춘다. 다음 슬롯은 실행되지 않는다. */
  stopAuto: () => void
}

/**
 * 자동 진행이 한 번에 밀어내는 슬롯 수.
 *
 * ⚠️ **1이어야 한다.** 예약 연쇄(`runPlans`)는 기본값 40슬롯까지 한 번에 달리는데,
 * 그 안에서는 급여일도 택배도 보이지 않아 "멈춰야 하는가"를 물을 수가 없다.
 * 연쇄를 여기 루프가 대신 돌면 슬롯마다 정지 조건을 물을 수 있고, 실행 통로는
 * 여전히 `afterTurn` 하나로 남는다(예약 → 택배 → 고용 순서도 그대로다).
 */
const AUTO_CHAIN = 1

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => {
      /**
       * 다음 슬롯을 예약해 둔 타이머. 모듈 스코프인 이유는 **취소할 수 있어야 하기 때문**이다 —
       * 상태에 넣으면 리렌더마다 새 값이 되어 정리 시점이 흐려진다.
       */
      let autoTimer: ReturnType<typeof setTimeout> | null = null

      const clearAutoTimer = () => {
        if (autoTimer !== null) clearTimeout(autoTimer)
        autoTimer = null
      }

      /** 진행을 끝내고 보고서를 확정한다. 사유는 반드시 남긴다. */
      const finishAuto = (stop: AutoStop | null) => {
        clearAutoTimer()
        const run = get().autoRun
        set({ autoRunning: false, autoRun: run ? endRun(run, stop) : null })
      }

      /**
       * 자동 진행 한 걸음 = **슬롯 하나**.
       *
       * ⚠️ 턴을 넘기는 방법을 여기서 새로 만들지 않는다 — `afterTurn`을 연쇄 상한 1로
       * 부르는 것이 전부다. 그래야 예약 실행·조건 미달 처리·택배 수령·고용 정산이
       * 손으로 플레이할 때와 **완전히 같은 함수, 같은 순서**로 일어난다.
       */
      const autoTick = () => {
        autoTimer = null
        const { autoRunning, autoSlots, autoRun, state: before } = get()
        if (!autoRunning || !before || !autoRun) {
          finishAuto(null)
          return
        }

        // 슬롯을 실행하기 **전** 점검. 게임오버·엔딩·빈 계획처럼 "한 슬롯 더 가 보고
        // 판단할 수 없는" 것들이 여기서 걸린다. 특히 게임오버는 여기를 절대 통과하지 못한다.
        const pre = findStop({
          state: before,
          arrivals: [],
          notices: [],
          skipped: [],
          messages: [],
          slots: autoSlots,
        })
        if (pre) {
          finishAuto(pre)
          return
        }

        const result = afterTurn(before, AUTO_CHAIN)
        const after = result.state
        const ctx: StopContext = {
          before,
          state: after,
          arrivals: result.arrivals,
          notices: result.jobNotices,
          skipped: result.skippedPlans,
          // 토스트와 **같은 출처**를 본다 — 여기서 따로 계산하면 알림과 요약이 어긋난다.
          messages: selectIncoming(after.day, after.slot),
          slots: autoSlots + 1,
        }

        // ⚠️ `result`를 그대로 얹는다. 택배·회사 소식이 `arrivals`/`jobNotices`로 나가
        // 토스트와 메일을 평소와 똑같이 탄다 — 자동 진행이 알림 경로를 우회하지 않는다.
        set({ ...result, autoSlots: autoSlots + 1, autoRun: appendStep(autoRun, ctx) })

        const stop = findStop(ctx)
        if (stop) {
          finishAuto(stop)
          return
        }
        autoTimer = setTimeout(autoTick, AUTO_STEP_MS)
      }

      return {
        state: null,
        loggedIn: false,

        autoRunning: false,
        autoSlots: 0,
        autoRun: null,

        startAuto: () => {
          const { state: current, autoRunning } = get()
          // 게임오버에서는 시작조차 하지 않는다. 정지 규칙(`game-over`)이 한 번 더 막지만,
          // 끝난 판에서 버튼이 "돌아가는 시늉"을 하는 것부터가 거짓말이다.
          if (!current || current.gameOver || autoRunning) return
          clearAutoTimer()
          set({ autoRunning: true, autoSlots: 0, autoRun: startRun(current) })
          autoTick()
        },

        stopAuto: () => {
          if (!get().autoRunning) return
          finishAuto(AUTO_STOPPED_BY_PLAYER)
        },

        /** 새 게임: 기존 세이브를 버리고 새로 만든다. */
        startGame: (name) => {
          clearAutoTimer()
          set({
            state: createInitialState(name),
            loggedIn: true,
            autoRunning: false,
            autoSlots: 0,
            autoRun: null,
          })
        },

        /** 이어하기: 기존 세이브를 그대로 두고 로그인만 처리한다. */
        continueGame: () => {
          if (!get().state) return
          set({ loggedIn: true })
        },

        /** 잠금화면으로 돌아간다. 세이브는 유지된다. */
        logout: () => {
          // ⚠️ 달리는 채로 잠금화면에 가면 보이지 않는 곳에서 날짜가 계속 흐른다.
          clearAutoTimer()
          set({ loggedIn: false, autoRunning: false })
        },

        skippedPlans: [],
        clearSkipped: () => set({ skippedPlans: [] }),

        arrivals: [],
        clearArrivals: () => set({ arrivals: [] }),

        jobNotices: [],
        clearJobNotices: () => set({ jobNotices: [] }),

        applyToCareer: (career) => {
          const current = get().state
          if (!current || !canApply(current)) return
          const activity = findActivity('job-apply')
          if (!activity || !canRun(current, activity)) return
          // ⚠️ 게이트를 **먼저** 묻고 기록을 만든다. 기록을 먼저 만들면 그 기록 자체가
          //    "이미 지원한 상태"가 되어 게이트가 닫힌다.
          const applied = applyTo(current, career)
          if (applied === current) return
          set(afterTurn(runActivity(applied, activity)))
        },

        orderItem: (item) => {
          const current = get().state
          if (!current) return
          const next = order(current, item)
          if (next === current) return
          set({ state: next })
        },

        acceptOffer: (option) => {
          const current = get().state
          if (!current) return
          // 결제부터 한다 — 잔액이 모자라면 spendMoney가 상태를 그대로 돌려주므로
          // 아래에서 그걸 확인해 예약·활동을 건너뛴다(외상으로 등록되면 안 된다).
          let next = option.cost ? spendMoney(current, option.cost) : current
          if (option.cost && next === current) return

          // 물건을 사는 제안(헬스장 회원권)은 **쇼핑과 같은 통로**를 탄다 —
          // 가격·중복 구매 판정·다음 날 도착이 전부 `systems/delivery.ts` 하나에 있다.
          // 이미 가진 물건이면 결제를 건너뛰고 아래의 주간 예약만 다시 걸어 준다
          // (재등록이 막히면 회원이 회원 대접을 못 받는다).
          if (option.itemId) {
            const item = findItem(option.itemId)
            if (!item) return
            if (!owns(next, item.id)) {
              const ordered = order(next, item)
              // 잔액 부족·이미 배송 중이면 아무것도 하지 않는다(반쪽 상태를 남기지 않는다).
              if (ordered === next) return
              next = ordered
            }
          }

          if (option.weekly) {
            next = {
              ...recordEvent(next, 'gym-member'),
              plans: planWeekly(
                next.plans ?? [],
                next.day,
                option.weekly.weekday,
                option.weekly.weeks,
                option.weekly.activityId,
              ),
            }
          }

          if (option.activityId) {
            const activity = findActivity(option.activityId)
            if (activity && canRun(next, activity)) {
              set(afterTurn(runActivity(next, activity)))
              return
            }
            // 조건이 안 되면 결제도 예약도 하지 않는다 — 반쪽짜리 상태를 남기지 않는다.
            if (activity) return
          }

          set({ state: next })
        },

        planActivity: (day, slot, activityId) => {
          const current = get().state
          if (!current) return
          // 지난 슬롯에는 못 넣는다 — 과거를 예약하는 건 말이 안 된다.
          const now = current.day * 2 + (current.slot === 'afternoon' ? 1 : 0)
          if (day * 2 + (slot === 'afternoon' ? 1 : 0) < now) return
          const planned = { ...current, plans: setPlan(current.plans ?? [], day, slot, activityId) }
          set({ state: recordEvent(planned, 'first-plan') })
        },

        unplan: (day, slot) => {
          const current = get().state
          if (!current) return
          set({ state: { ...current, plans: clearPlan(current.plans ?? [], day, slot) } })
        },

        /**
         * ⚠️ 행동 뒤에는 **항상 예약을 흘려 보낸다**(`runPlans`).
         * 턴을 넘기는 통로가 여기 둘(doActivity·doSkip)뿐이라 여기서만 부르면 빠짐이 없다.
         * `turn.ts`가 예약을 모르는 것은 의도다 — 턴 규칙이 스케줄러를 모르게 두어야
         * 밸런스 테스트가 스케줄러 없이도 성립한다.
         */
        doActivity: (activity) => {
          const current = get().state
          if (!current || !canRun(current, activity)) return
          set(afterTurn(runActivity(current, activity)))
        },

        /**
         * ⚠️ **이미 있는 세이브 검증기(`reviveState`)를 그대로 쓴다.**
         * 여기서 따로 검사하면 규칙이 두 곳으로 갈라지고, 손으로 고친 세이브가
         * 그쪽 구멍으로 들어온다 — NaN 스탯이 들어오면 게임오버 판정이 영영 안 걸린다.
         */
        importSave: (raw) => {
          try {
            const revived = reviveState(JSON.parse(raw))
            if (!revived) return false
            set({ state: revived })
            return true
          } catch {
            return false
          }
        },

        /**
         * ⚠️ **브라우저가 게임 상태를 바꾸는 유일한 통로다.**
         * 원칙은 그대로다 — 브라우저·사이트는 스탯을 직접 계산하지 않고, 하루 한 번
         * 제한과 금액은 전부 `systems/turn.ts`가 정한다. 여기서는 순수 함수를 부르기만 한다.
         */
        claimAdBonus: () => {
          const current = get().state
          if (!current) return
          const claimed = claimAdBonus(current)
          // 보상을 못 받은 날(이미 받음)은 사건도 기록하지 않는다 — 누른 적이 있어야 사건이다.
          set({ state: claimed === current ? current : recordEvent(claimed, 'first-ad') })
        },

        doSkip: () => {
          const current = get().state
          if (!current) return
          set(afterTurn(skipSlot(current)))
        },

        /**
         * ⚠️ **은행 거래 다섯은 전부 같은 모양이다.** 순수 함수를 부르고, 조건이 안 되면
         * 그 함수가 상태를 **그대로** 돌려주므로 그때는 아무것도 하지 않는다
         * (반쪽 상태를 남기지 않는다 — `orderItem`·`acceptOffer`와 같은 규칙).
         * ⚠️ `afterTurn`을 부르지 않는다: 거래는 턴을 쓰지 않는다.
         */
        bankDeposit: (amount) => {
          const current = get().state
          if (!current) return
          const next = deposit(current, amount)
          if (next !== current) set({ state: recordEvent(next, 'first-deposit') })
        },

        bankWithdraw: (amount) => {
          const current = get().state
          if (!current) return
          const next = withdraw(current, amount)
          if (next !== current) set({ state: next })
        },

        bankOpenDeposit: (amount) => {
          const current = get().state
          if (!current) return
          const next = openDeposit(current, amount)
          if (next !== current) set({ state: recordEvent(next, 'first-deposit') })
        },

        bankBorrow: (amount) => {
          const current = get().state
          if (!current) return
          const next = borrow(current, amount)
          if (next !== current) set({ state: recordEvent(next, 'first-loan') })
        },

        bankRepay: (amount) => {
          const current = get().state
          if (!current) return
          const next = repay(current, amount)
          if (next !== current) set({ state: next })
        },

        markEndingSeen: (endingId) => {
          const current = get().state
          if (!current || current.seenEndingIds.includes(endingId)) return
          set({ state: { ...current, seenEndingIds: [...current.seenEndingIds, endingId] } })
        },

        /** 세이브를 지우고 잠금화면으로 돌아간다. */
        reset: () => {
          clearAutoTimer()
          set({
            state: null,
            loggedIn: false,
            autoRunning: false,
            autoSlots: 0,
            autoRun: null,
          })
        },
      }
    },
    {
      name: 'windows-game-save',
      partialize: (s) => selectPersistedState(s.state),
      /**
       * ⚠️ **2026-08-05에 1 → 2로 올렸다(직업 엔딩).**
       *
       * zustand의 `migrate`는 **저장된 버전이 지금 버전과 다를 때만** 불린다. 그래서 v1로
       * 저장된 세이브는 `reviveState`를 한 번도 지나지 않고, `peakCareerId`를 재직 중인
       * 회사로 메워 주는 보정도 닿지 않았다 — 다니던 회사가 있는데 "무직으로 죽었다"가 된다.
       * 버전을 올리면 기존 세이브가 전부 검증기를 한 번 통과한다(못 쓰는 세이브는 예전처럼
       * 새 게임으로 degrade한다 — 크래시가 아니다).
       */
      version: 2,
      // 구버전/손상 세이브를 검증해 보정한다. 못 쓰면 새 게임으로 시작한다.
      migrate: migrateSave,
    },
  ),
)
