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
import { creditCall, reviveBonus, worksAtCallCenter } from '../systems/callcenter'
import { creditPerformance, revivePerformance, worksAtOffice } from '../systems/drive'
import { healIllness, reviveIllness } from '../systems/illness'
import { reviveRecovery } from '../systems/recovery'
import { brokenRecords } from '../systems/records'
import {
  chanceToday,
  dilemmaDue,
  dilemmaToday,
  nameSeed,
  noticeTextOf,
  resolveDilemma as resolveDilemmaOf,
} from '../systems/chance'
import { innerLine } from '../systems/inner'
import { useMetaStore } from './metaStore'
import { lifeRankOf } from '../systems/lifeRank'
import type { PastLife } from './metaStore'
import {
  buyVaccine as buyVaccineOf,
  clean as cleanOf,
  infect as infectOf,
  isInfected,
} from '../systems/malware'
import { creditAffection, reviveAffection } from '../systems/affection'
import {
  adoptCat as adoptCatOf,
  catEncounterDue,
  catName,
  feedCat as feedCatOf,
  ignoreCat as ignoreCatOf,
  petCat as petCatOf,
  reviveCat,
} from '../systems/cat'
import {
  dueRankEvents,
  grantWish,
  reviveRankEvents,
  settleRankEvents,
} from '../systems/rankEvents'
import { useWindowStore } from './windowStore'
import { advanceBank, borrow, deposit, openDeposit, repay, withdraw } from '../systems/bank'
import { moveTo } from '../systems/housing'
import { advanceLottery, buyTickets } from '../systems/lottery'
import { buyStock as buyStockOf, sellStock as sellStockOf } from '../systems/stocks'
import { findStock } from '../data/stocks'
import { advanceTwitter, postArtwork as postArtworkOf } from '../systems/twitter'
import {
  advanceSubscriptions,
  subscribe as subscribeOf,
  unsubscribe as unsubscribeOf,
} from '../systems/subscription'
import { findSubscription } from '../data/subscriptions'
import {
  createProject as createProjectOf,
  drawIntoProject as drawIntoProjectOf,
  sellAtComicon as sellAtComiconOf,
} from '../systems/projects'
import { advanceContests, enterContest as enterContestOf } from '../systems/contests'
import { joinExpo as joinExpoOf, visitExpo as visitExpoOf } from '../systems/expos'
import {
  acceptOffer,
  advanceWebtoon,
  declineOffer,
  drawWebtoon as drawWebtoonOf,
} from '../systems/webtoon'
import { abandonGig as abandonGigOf, advanceGigs, takeGig as takeGigOf } from '../systems/gigs'
import { findGig } from '../data/gigs'
import { takeCourse as takeCourseOf } from '../systems/courses'
import { reviveBand } from '../systems/band'
import { advancePhoneBill } from '../systems/phone'
import { advanceBills, revivePaidBills } from '../systems/bills'
import { reviveGear } from '../systems/gear'
import { STEAM_ACTIVITY_ID, playGame as playGameOf } from '../systems/steam'
import { renameChannel as renameChannelOf, startStream as startStreamOf } from '../systems/channel'
import { watchFilm as watchFilmOf } from '../systems/cinema'
import { sellItem as sellItemOf, sellPostcard as sellPostcardOf } from '../systems/resale'
import { advanceCertification, takeExam as takeExamOf } from '../systems/certification'
import { findHousing } from '../data/housing'
import { channelVisible, selectIncoming } from '../systems/messages'
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
import type { Message } from '../data/messages'
import type { Cert } from '../data/certs'
import type { Course } from '../data/courses'
import type { SteamGame } from '../data/steam'
import type { StreamTopic } from '../data/videos'
import type { OfferOption } from '../data/messages'
import type { ShopItem } from '../data/items'
import type { SkippedPlan } from '../systems/schedule'
import type {
  GrowthStatKey,
  Activity,
  Application,
  Artwork,
  BankEntry,
  BankState,
  Employment,
  ExamRecord,
  GameState,
  JobNotice,
  HousingState,
  LotteryState,
  LotteryTicket,
  Postcard,
  Slot,
  Stats,
  GigState,
  StockState,
  StockTrade,
  SubscriptionState,
  TermDeposit,
  TwitterState,
} from '../types/game'
import type { Film } from '../data/media'
import type { Housing } from '../data/housing'

/**
 * 세이브에 반드시 유한한 숫자로 들어 있어야 하는 스탯 키.
 * INITIAL_STATS에서 파생시켜, 스탯이 추가돼도 검증에서 빠지지 않게 한다.
 */
const REQUIRED_STAT_KEYS = Object.keys(INITIAL_STATS) as (keyof Stats)[]

/** 체력 통합(2026-08-08) 전 `maxStamina`의 시작값. 이 위로 쌓은 몫만 운동 스탯이 된다. */
const LEGACY_MAX_STAMINA_START = 100

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
          // 급여일에 소지금으로 흘러 들어가는 값이라 스탯과 같은 강도로 검증한다.
          bonus: reviveBonus(job.bonus),
          // 성과 게이지도 같다 — 초과분이 야근비가 되어 소지금으로 흘러 들어간다.
          performance: revivePerformance(job.performance),
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
 * 사는 집 복원.
 *
 * ⚠️ **검증이 빡빡한 이유는 `reviveBank`와 정확히 같다 — 이 상태가 돈을 만진다.**
 * 여기 id가 없는 매물을 가리키면 생활비 배율이 undefined가 되고, 보증금이 NaN이면
 * 이사할 때 그것이 소지금으로 흘러 `NaN <= 0`이 false가 되어 **파산이 영영 안 걸린다.**
 * 그래서 하나라도 못 믿으면 **통째로 버린다** — 그러면 시작 원룸에 사는 것으로 읽히고,
 * 그것이 이 필드가 없던 세이브의 동작과 같다(마이그레이션 불필요).
 */
function reviveHousing(saved: Partial<GameState>): HousingState | undefined {
  const h = saved.housing
  if (!h || typeof h !== 'object') return undefined
  if (typeof h.id !== 'string' || !findHousing(h.id)) return undefined
  if (!Number.isFinite(h.deposit) || h.deposit < 0) return undefined
  return {
    id: h.id,
    movedDay: Number.isFinite(h.movedDay) ? Number(h.movedDay) : Number(saved.day ?? 1),
    deposit: Number(h.deposit),
  }
}

/**
 * 복권 복원.
 *
 * ⚠️ **`serial`이 가장 중요하다** — 이 값이 굴림의 시드이므로, 못 믿는 값이 들어오면
 * 이미 산 표들이 전부 다시 굴러간다(세이브 스커밍이 열린다). 그래서 유한한 정수가
 * 아니면 복권 기록을 통째로 버린다.
 *
 * ⚠️ **`pending`은 소지금으로 흘러 들어가는 값이다**(밤 정산). NaN이면 소지금이 NaN이
 * 되고 파산이 영영 안 걸린다 — `reviveBank`의 잔액과 같은 위험이다.
 */
function reviveLottery(saved: Partial<GameState>): LotteryState | undefined {
  const l = saved.lottery
  if (!l || typeof l !== 'object') return undefined
  if (!Number.isFinite(l.serial) || l.serial < 0) return undefined
  if (!Number.isFinite(l.pending) || l.pending < 0) return undefined
  if (!Number.isFinite(l.spent) || !Number.isFinite(l.won)) return undefined
  return {
    serial: Math.floor(Number(l.serial)),
    spent: Number(l.spent),
    won: Number(l.won),
    pending: Number(l.pending),
    tickets: (Array.isArray(l.tickets) ? l.tickets : [])
      .filter(
        (t): t is LotteryTicket =>
          !!t && typeof t.id === 'string' && Number.isFinite(t.day) && Number.isFinite(t.amount),
      )
      /* ⚠️ **주 1회 추첨(2026-08-17) 이전 표는 이미 굴러간 것이다** — 그때는 사는 즉시
         굴렸으므로 `drawn: true`가 사실이다. 안 채우면 옛 표가 미추첨으로 읽혀 **한 번 더**
         굴러가고, 상금이 두 번 들어온다(마이그레이션이 필요한 유일한 자리다). */
      .map((t) => ({
        ...t,
        serial: Number.isFinite(t.serial) ? t.serial : 0,
        drawDay: Number.isFinite(t.drawDay) ? t.drawDay : t.day,
        drawn: t.drawn ?? true,
      })),
  }
}

/**
 * 트위터 상태 복원.
 *
 * ⚠️ **검증이 `courses`보다 빡빡한 이유는 `reviveLottery`와 정확히 같다 — 이 상태가
 * 돈을 만든다.** `gained`가 NaN이면 주간 정산금이 NaN이 되고 그것이 소지금으로 흘러
 * `NaN <= 0`이 false라 **파산이 영영 안 걸린다**. 하나라도 못 믿으면 통째로 버린다
 * (그러면 "올린 적 없음"이 되고, 그것이 이 필드가 없던 세이브의 동작과 같다).
 *
 * ⚠️ **`paidDay`는 미래로 두지 않는다** — 미래면 정산이 영영 안 돌아 팔로워가 장식이 된다
 * (`BankState.accruedDay`와 같은 판단이되 방향이 반대다: 은행은 과거가 위험하고
 * 여기는 미래가 위험하다. 과거는 `advanceTwitter`의 루프가 따라잡는다).
 */
function reviveTwitter(saved: Partial<GameState>): TwitterState | undefined {
  const t = saved.twitter
  if (!t || typeof t !== 'object') return undefined
  if (!Number.isFinite(t.gained) || t.gained < 0) return undefined
  const day = Number(saved.day ?? 1)
  const paidDay = Number.isFinite(t.paidDay) ? Math.min(Number(t.paidDay), day) : day
  return {
    gained: Number(t.gained),
    paidDay,
    // ⚠️ 구세이브에는 `likes`가 없다 — 0으로 메운다(마이그레이션 대신 기본값).
    likes: Number.isFinite(t.likes) && Number(t.likes) >= 0 ? Number(t.likes) : 0,
    postedIds: Array.isArray(t.postedIds)
      ? t.postedIds.filter((id): id is string => typeof id === 'string')
      : [],
  }
}

/**
 * 주식 상태 복원.
 *
 * ⚠️ **검증이 빡빡한 이유는 `reviveBank`·`reviveLottery`와 정확히 같다 — 돈을 만든다.**
 * 주수나 평균 매입가가 NaN이면 매도 대금이 NaN으로 소지금에 흘러 `NaN <= 0`이 false가
 * 되고 **파산이 영영 안 걸린다.** 그래서 **종목별로** 거른다 — 한 종목이 망가졌다고
 * 나머지 보유까지 버릴 이유는 없다(은행은 잔액 하나가 전부라 통째로 버렸다).
 *
 * ⚠️ **없는 종목을 가리키는 보유는 버린다** — 팔 수도 값을 매길 수도 없어 화면에
 * 영원히 남는 유령이 된다.
 */
function reviveStocks(saved: Partial<GameState>): StockState | undefined {
  const st = saved.stocks
  if (!st || typeof st !== 'object') return undefined
  const raw = st.holdings && typeof st.holdings === 'object' ? st.holdings : {}
  const holdings: StockState['holdings'] = {}
  for (const [id, h] of Object.entries(raw)) {
    if (!findStock(id) || !h) continue
    if (!Number.isFinite(h.shares) || !Number.isFinite(h.avgPrice)) continue
    if (h.shares <= 0 || h.avgPrice < 0) continue
    holdings[id] = { shares: Math.floor(Number(h.shares)), avgPrice: Math.round(Number(h.avgPrice)) }
  }
  return {
    holdings,
    spent: Number.isFinite(st.spent) ? Number(st.spent) : 0,
    earned: Number.isFinite(st.earned) ? Number(st.earned) : 0,
    trades: (Array.isArray(st.trades) ? st.trades : []).filter(
      (t): t is StockTrade =>
        !!t && typeof t.id === 'string' && Number.isFinite(t.day) && Number.isFinite(t.amount),
    ),
  }
}

/**
 * 그목 외주 상태 복원.
 *
 * ⚠️ **돈을 만드는 상태다**(납품 보수) — 다만 위험은 잔액이 아니라 **기한**에 있다:
 * `dueDay`가 NaN이면 `day > NaN`이 영원히 false라 **마감이 안 오는 계약**이 된다.
 * 그래서 숫자 하나라도 못 믿으면 **계약만** 버린다(납품 기록까지 버릴 이유는 없다).
 * ⚠️ 없는 일감을 가리키는 계약도 버린다 — 채울 수도 납품할 수도 없는 유령이 된다.
 */
function reviveGigs(saved: Partial<GameState>): GigState | undefined {
  const g = saved.gigs
  if (!g || typeof g !== 'object') return undefined
  const c = g.active
  const active =
    c &&
    findGig(c.gigId) &&
    Number.isFinite(c.takenDay) &&
    Number.isFinite(c.dueDay) &&
    Number.isFinite(c.progress)
      ? {
          gigId: c.gigId,
          takenDay: Number(c.takenDay),
          dueDay: Number(c.dueDay),
          progress: Math.max(0, Math.floor(Number(c.progress))),
        }
      : undefined
  return {
    active,
    done: Array.isArray(g.done) ? g.done.filter((id): id is string => typeof id === 'string') : [],
    missed: Number.isFinite(g.missed) ? Number(g.missed) : 0,
    earned: Number.isFinite(g.earned) ? Number(g.earned) : 0,
  }
}

/**
 * 구독 상태 복원.
 *
 * ⚠️ **돈을 움직이는 상태라 검증이 빡빡하다** — 다만 방향이 반대라 위험도 반대다:
 * 은행·복권은 NaN이 **소지금으로 흘러 파산이 안 걸리는** 것이 문제였고,
 * 여기는 커서(`billedDay`)가 NaN이면 `day - NaN >= 30`이 영원히 false라
 * **청구가 한 번도 안 돌아 공짜 구독**이 된다. 그래서 못 믿을 기록은 **그 상품만** 버린다
 * (구독이 여럿이면 하나 때문에 나머지까지 끊을 이유가 없다 — 은행은 잔액 하나라 통째로 버렸다).
 *
 * ⚠️ **없는 상품을 가리키는 기록도 버린다** — 해지할 수도 청구할 수도 없는 유령이 된다.
 * ⚠️ `billedDay`를 **미래로 두지 않는다**(오늘로 당긴다) — 미래면 청구가 밀리고,
 * 과거는 `advanceSubscriptions`의 루프가 알아서 따라잡는다(`reviveTwitter`와 같은 방향).
 */
function reviveSubscriptions(saved: Partial<GameState>): SubscriptionState | undefined {
  const sub = saved.subscriptions
  if (!sub || typeof sub !== 'object') return undefined
  const raw = sub.active && typeof sub.active === 'object' ? sub.active : {}
  const day = Number(saved.day ?? 1)
  const active: SubscriptionState['active'] = {}
  for (const [id, rec] of Object.entries(raw)) {
    if (!findSubscription(id) || !rec) continue
    if (!Number.isFinite(rec.billedDay) || !Number.isFinite(rec.startedDay)) continue
    active[id] = {
      startedDay: Number(rec.startedDay),
      billedDay: Math.min(Number(rec.billedDay), day),
    }
  }
  return { active, paid: Number.isFinite(sub.paid) ? Number(sub.paid) : 0 }
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
  const savedStats = { ...(saved.stats ?? {}) } as Partial<Stats> & {
    intelligence?: number
    maxStamina?: number
  }
  if (savedStats.knowledge === undefined && Number.isFinite(savedStats.intelligence)) {
    savedStats.knowledge = savedStats.intelligence
  }
  delete savedStats.intelligence
  /* 체력 통합 전 세이브 호환(2026-08-08): `maxStamina`는 운동으로 키우던 그릇이었고
     시작값이 100이었다. 그래서 **100을 넘는 몫이 곧 그 사람이 몸에 쌓아 둔 것**이므로
     운동 스탯으로 옮긴다 — 그냥 지우면 삼십 일치 운동이 조용히 사라진다
     (`intelligence`를 매핑한 것과 같은 이유). 남은 키는 지운다: 아무도 안 읽는 값이
     세이브에 남아 있으면 다음 사람이 "이건 뭐지"를 다시 묻게 된다. */
  if (Number.isFinite(savedStats.maxStamina)) {
    const earned = Math.max(0, Math.round(savedStats.maxStamina!) - LEGACY_MAX_STAMINA_START)
    savedStats.athletics = (savedStats.athletics ?? 0) + earned
  }
  delete savedStats.maxStamina
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
    recovery: reviveRecovery(saved.recovery),
    /* 판 시드. 없던 세이브는 이름 해시로 **결정적으로** 메운다(`nameSeed`) —
       여기서 무작위로 메우면 불러올 때마다 사건이 다시 굴러 세이브 스커밍이 열린다. */
    seed: Number.isFinite(saved.seed) ? Number(saved.seed) : nameSeed(defaults.playerName),
    // 옵셔널 필드는 형태만 확인하고 통과시킨다. 여기서 빠뜨리면 세이브를 되돌릴 때마다
    // 예약·배송·도감이 조용히 사라진다(값 검증은 각 시스템이 이미 하고 있다).
    adBonusDay: Number.isFinite(saved.adBonusDay) ? Number(saved.adBonusDay) : undefined,
    /* 딜레마 결정 커서. 숫자가 아니면 버린다(옵셔널 필드 관례 — `adBonusDay`와 같은 수준). */
    dilemmaDecidedDay: Number.isFinite(saved.dilemmaDecidedDay)
      ? Number(saved.dilemmaDecidedDay)
      : undefined,
    // 감염 상태. 없으면 안 걸린 것이므로 형태만 본다(`adBonusDay`와 같은 수준).
    malware:
      saved.malware && Number.isFinite(saved.malware.day)
        ? { day: Number(saved.malware.day) }
        : undefined,
    plans: Array.isArray(saved.plans) ? saved.plans : undefined,
    inventory: Array.isArray(saved.inventory) ? saved.inventory : undefined,
    deliveries: Array.isArray(saved.deliveries) ? saved.deliveries : undefined,
    events: Array.isArray(saved.events) ? saved.events : undefined,
    bank: reviveBank(saved),
    housing: reviveHousing(saved),
    lottery: reviveLottery(saved),
    courses: saved.courses && typeof saved.courses === 'object' ? saved.courses : undefined,
    // 증기 플레이 횟수. 표시에만 쓰이고 돈·턴을 만들지 않으므로 `courses`와 같은 수준으로 본다.
    steam: saved.steam && typeof saved.steam === 'object' ? saved.steam : undefined,
    // ⚠️ 판 물건 목록. **돈을 만드는 값은 아니지만 돈이 새는 것을 막는 값이다** —
    //    빠지면 팔았던 물건을 되사서 효과를 다시 받는 구멍이 열린다(`systems/resale.ts`).
    sold: Array.isArray(saved.sold) ? saved.sold.filter((id): id is string => typeof id === 'string') : undefined,
    // 장비 마모·고장. 고장은 활동을 잠그므로 모르는 id는 버린다(`reviveGear`).
    gear: reviveGear(saved.gear),
    // 밴드 숙련도. 값이 이상하면 밴드가 없던 것으로 친다(공연·앨범이 잠긴다).
    band: reviveBand(saved.band),
    // 휴대폰 청구 커서. 없으면 산 날부터 다시 센다(`systems/phone.ts`).
    phoneBilledDay: typeof saved.phoneBilledDay === 'number' ? saved.phoneBilledDay : undefined,
    suspendedPhone: saved.suspendedPhone === true ? true : undefined,
    // 지나간 목돈 청구. 모르는 id는 버린다 — 남으면 청구를 지운 뒤에도 계속 낸 것이 된다.
    paidBills: revivePaidBills(saved.paidBills),
    broken: Array.isArray(saved.broken)
      ? saved.broken.filter((id): id is string => typeof id === 'string')
      : undefined,
    // 직업 이력. 도감이 읽기만 하고 돈·턴을 만들지 않으므로 `steam`과 같은 수준으로 본다.
    careerLog:
      saved.careerLog && typeof saved.careerLog === 'object' ? saved.careerLog : undefined,
    // 방송 채널. 이름이 문자열이 아니면 통째로 버린다 — 이름 없는 채널은 트위터 검색이
    // 모든 글에 걸리게 만든다. 횟수는 표시·개수에만 쓰이므로 `steam` 수준으로 본다.
    channel:
      saved.channel && typeof saved.channel.name === 'string' && saved.channel.name.trim()
        ? {
            name: saved.channel.name,
            streams: Number.isFinite(saved.channel.streams) ? Number(saved.channel.streams) : 0,
            topic: typeof saved.channel.topic === 'string' ? saved.channel.topic : undefined,
          }
        : undefined,
    // ⚠️ 그림 자체는 **돈을 만들지 않는다**(올려야 팔로워가 되고, 그 판정은 아래 트위터
    //    상태가 진다). 그래서 검증은 `exams` 수준이면 충분하다 — 모양만 보고 통과시키고,
    //    등급은 어차피 `artGrade`가 매번 계산한다(저장된 등급이라는 것이 없다).
    artworks: Array.isArray(saved.artworks)
      ? (saved.artworks.filter(
          (a) =>
            a &&
            typeof a.id === 'string' &&
            Number.isFinite(a.serial) &&
            Number.isFinite(a.art) &&
            Number.isFinite(a.creativity),
        ) as Artwork[])
      : undefined,
    // ⚠️ 포스트카드는 **돈도 스탯도 만들지 않는다**(모으는 것이 전부다) — 그래서 검증은
    //    모양만 본다. 없는 영화를 가리키는 장은 탐색기가 조용히 건너뛴다.
    postcards: Array.isArray(saved.postcards)
      ? (saved.postcards.filter(
          (p) => p && typeof p.filmId === 'string' && Number.isFinite(p.day),
        ) as Postcard[])
      : undefined,
    twitter: reviveTwitter(saved),
    stocks: reviveStocks(saved),
    subscriptions: reviveSubscriptions(saved),
    gigs: reviveGigs(saved),
    /* ⚠️ 날씨는 여기 없다 — 저장하지 않는 파생값이다(`systems/weather.ts`). */
    illness: reviveIllness(saved.illness),
    affection: reviveAffection(saved.affection),
    rankEvents: reviveRankEvents(saved.rankEvents),
    /* 길고양이. 돈을 만드는 상태가 아니라 검증은 가볍다(`courses` 수준). */
    cat: reviveCat(saved.cat),
    // ⚠️ 응시 기록은 **돈을 만들지 않으므로** 검증이 은행·정규직만큼 빡빡할 필요가 없다
    //    (합격해도 나오는 것은 아이템 하나다). 날짜만 유한하면 통과시키고, 없는 종목을
    //    가리키는 기록은 `advanceCertification`이 조용히 닫는다.
    exams: Array.isArray(saved.exams)
      ? (saved.exams.filter(
          (e) =>
            e && typeof e.certId === 'string' && Number.isFinite(e.takenDay) && Number.isFinite(e.resultDay),
        ) as ExamRecord[])
      : undefined,
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
 *
 * ⚠️ **이제 모든 판을 저장한다**(2026-08-14 육성물 전환). 예전에는 끝난 게임을
 * 버렸는데(이어할 수 없는 세이브가 남으면 잠금화면과 데이터가 어긋나므로), **끝나는
 * 게임 자체가 없어졌다.** 주저앉은 판은 며칠 뒤 저절로 풀리는 **진행 중인 판**이므로
 * 버리면 회복을 기다리던 플레이어가 판을 통째로 잃는다.
 *
 * 함수를 남겨 두는 것은 `partialize`의 자리이자 이 사연이 사는 자리라서다.
 */
export function selectPersistedState(state: GameState | null): { state: GameState | null } {
  return { state }
}

/**
 * 턴이 넘어간 뒤의 공통 처리.
 *
 * **턴을 넘기는 모든 통로가 여기를 지난다** — 예약 실행(`runPlans`)과 택배 수령(`collect`)을
 * 호출부마다 적어 두면 새 통로가 생길 때마다 하나씩 빠뜨린다.
 */
/**
 * 채용 소식을 도감 콜렉션에 찍는다.
 *
 * ⚠️ **`hired` 소식만 본다.** 지원·서류·면접은 아직 다닌 것이 아니고, 해고는
 * 이미 다닌 사실을 지우지 않는다 — 콜렉션은 "다녀 본 적 있는가"를 세기 때문이다.
 */
function unlockHiredCareers(notices: JobNotice[]) {
  const { unlockCareer } = useMetaStore.getState()
  for (const n of notices) {
    if (n.kind === 'hired') unlockCareer(n.careerId)
  }
}

/**
 * 행동 하나가 만든 **피드백 토스트**를 모은다(기록 갱신 + 내면 감상).
 *
 * ⚠️ **기록이 먼저다.** 둘 다 뜨면 "무엇을 이뤘나"가 "어떤 기분인가"보다 먼저 읽혀야
 * 한다 — 토스트는 최대 세 개까지만 쌓이므로(`MAX_TOASTS`) 순서가 곧 우선순위다.
 *
 * ⚠️ **id에 턴을 섞는다** — 같은 기록을 다음 턴에 또 깨면 중복 제거에 걸려
 * 두 번째부터 안 뜬다(택배 알림이 같은 이유로 날짜를 섞는다).
 */
function feedbackFor(before: GameState, after: GameState, activity: Activity): Message[] {
  const turn = `${after.day}-${after.slot}`
  const out: Message[] = brokenRecords(before, after).map((r) => ({
    id: `record-${r.id}-${turn}`,
    channel: 'record',
    from: r.label,
    text: `${r.value} · 여태 중 제일 좋다.`,
  }))
  const line = innerLine(after, activity)
  if (line) out.push({ id: `inner-${turn}`, channel: 'inner', from: '', text: line })
  return out
}

/**
 * 새 아침이 밝았고 오늘 돌발 사건이 있으면 토스트 한 장(`systems/chance.ts`).
 *
 * ⚠️ **채널 수법은 기록·감상과 같다** — `Message`를 재사용하고 채널(`chance`)로만 가른다.
 * 새 토스트 타입을 만들면 겹침 제한·중복 제거를 두 벌로 관리하게 된다(`ToastHost`).
 * 날이 안 바뀐 턴(오전→오후)에는 안 띄운다 — 아침에 이미 말했다.
 */
function chanceNotice(before: GameState, after: GameState): Message[] {
  if (after.day === before.day) return []
  const event = chanceToday(after)
  if (!event) return []
  /* ⚠️ 딜레마는 토스트를 안 띄운다 — 창 자체가 알림이다(`openDilemmaWindow`).
     둘 다 내보내면 같은 사건이 두 창구에서 말해 소음이 된다. */
  if (event.kind === 'dilemma') return []
  return [{ id: `chance-${after.day}`, channel: 'chance', from: event.title, text: noticeTextOf(event) }]
}

function afterTurn(next: GameState, chain?: number) {
  const ran = runPlans(next, chain)
  const got = collect(ran.state)
  // ⚠️ **자격시험 발표는 돈을 만지지 않는다** — 그래서 `nightPayoutPending`에 원천을
  //    추가하지 않아도 되고, 밤 정산 어디에 놓아도 파산 판정이 흔들리지 않는다.
  //    택배 바로 뒤인 것은 둘 다 **아이템이 인벤토리로 들어오는 일**이라 도착 알림을
  //    같은 배열(`arrivals`)로 내보내기 때문이다 — 새 알림 창구를 만들지 않는다.
  const exams = advanceCertification(got.state)
  // ⚠️ **은행 정산은 고용 정산보다 먼저 돈다.** 둘 다 마지막 줄에서 `settleRecovery`를
  //    부르므로 순서 자체가 판정을 바꾸지는 않지만(이미 확정된 사유는 되살아나지 않는다),
  //    만기 원리금이 급여보다 먼저 들어와야 급여 소식 메일에 적히는 잔액이 실제와 맞는다.
  // ⚠️ **복권 당첨금도 밤에 들어온다**(`nightPayoutPending`의 세 번째 원천).
  //    은행보다 앞인 것은 순서가 판정을 바꿔서가 아니라(셋 다 마지막 줄에서
  //    `settleRecovery`를 부르고, 그 함수는 확정된 사유를 되살리지 않는다) —
  //    당첨금이 먼저 들어와야 급여 소식 메일에 적히는 잔액이 실제와 맞기 때문이다.
  // ⚠️ **구독료는 밤에 나가는 유일한 돈이다**(생활비는 `turn.ts`의 취침 정산이 이미 뺀다).
  //    들어오는 것들보다 **먼저** 뺀다 — 그래야 급여 소식 메일에 적힐 잔액이 실제와 맞고,
  //    못 내서 해지될 때도 그날 밤의 판정에 그대로 반영된다.
  //    ⚠️ `nightPayoutPending`에는 넣지 않는다 — 그 술어는 "받을 돈이 남았으니 미뢬다"라
  //    나가는 돈을 넣으면 "낼 돈이 남아서 안 죽는다"는 거꿒된 말이 된다.
  // ⚠️ **마감 감사는 돈을 안 만진다**(평판만 깎는다) — 그래서 `nightPayoutPending`에
  //    원천을 더할 필요가 없고 밤 정산 어디에 놓아도 파산 판정이 안 흔들린다
  //    (자격시험 발표와 같은 부류). 구독료보다 먼저인 것은 둘이 서로 무관하기 때문이다.
  const gigged = advanceGigs(exams.state)
  const billed = advanceSubscriptions(gigged)
  // ⚠️ **휴대폰 요금도 나가는 돈이라 구독료와 같은 자리다** — 못 내면 회선이 정지되고
  //    기기가 인벤토리에서 빠진다(외상을 만들지 않는다는 구독의 규칙 그대로).
  const phoned = advancePhoneBill(billed)
  // ⚠️ **목돈 청구도 나가는 돈이라 구독료 옆자리다.** 못 낸 몫은 평판으로 치르므로
  //    소지금이 음수가 되지 않는다(`systems/bills.ts` 주석 — 파산은 물가의 몫이다).
  const charged = advanceBills(phoned)
  const drawn = advanceLottery(charged)
  // ⚠️ **트위터 주간 정산도 밤에 돈을 넣는다**(`nightPayoutPending`의 네 번째 원천).
  //    은행·복권과 같은 자리·같은 이유이고, 셋 다 마지막 줄에서 `settleRecovery`를 부르므로
  //    순서 자체가 판정을 바꾸지는 않는다(확정된 사유는 되살아나지 않는다).
  const tweeted = advanceTwitter(drawn)
  // ⚠️ **공모전 상금과 웹툰 원고료도 밤에 들어온다**(`nightPayoutPending`의 다섯째·여섯째
  //    원천 — `turn.ts`가 `resultDay`·`dueDay`를 본다). 둘 다 마지막 줄에서
  //    `settleRecovery`를 부르므로 순서가 판정을 바꾸지는 않는다.
  // ⚠️ **웹툰이 공모전보다 뒤인 것은 의도다** — 제의 조건이 공모전 입상 횟수를 보므로
  //    (`offerEarned`), 같은 밤에 입상이 확정되면 그 밤에 제의가 온다. 순서를 뒤집으면
  //    제의가 하루 늦게 오고 "입상했는데 아무 일도 안 일어난 밤"이 한 번 생긴다.
  const judged = advanceContests(tweeted)
  const serialized = advanceWebtoon(judged)
  const banked = advanceBank(serialized)
  // ⚠️ 고용 정산은 **예약 연쇄가 끝난 뒤**에 한 번 돈다. 커서(`checkedDay`)와
  //    급여 루프가 밀린 날짜를 따라잡도록 돼 있어, 며칠이 한 번에 흘러도 새지 않는다.
  // ⚠️ **반드시 마지막이다.** 게임오버는 밤이 다 정산된 뒤 딱 한 번 확정되는데
  //    (설계자 지시: 급여가 우선한다) 그 확정을 `advanceEmployment`의 마지막 줄이 한다.
  //    생활비는 `turn.ts`의 취침 정산이 먼저 빼고 급여는 여기서 들어오므로, 이 호출을
  //    위로 올리면 **월급을 손에 쥔 채 파산하는** 버그가 되돌아온다.
  const job = advanceEmployment(banked)
  /* ⚠️ **랭크 이벤트 창을 여는 자리가 여기다.** 이 함수의 첫 주석이 그 근거다 —
     턴을 넘기는 통로가 넷이라 호출부마다 적으면 새 통로가 생길 때 하나씩 빠뜨린다.
     스케줄러 예약·자동 진행으로 등급이 오른 판에서도 이벤트가 뜨는 것이 그 값이다.
     ⚠️ **마지막 상태로 판정한다** — 급여·정산이 스탯을 건드린 뒤라야 "지금 등급"이 맞다. */
  /* ⚠️ **대화방 이벤트를 먼저 기록하고, 그 상태로 창을 연다.** 순서가 뒤바뀌면 같은 밤에
     둘이 함께 문턱을 넘었을 때 창 판정이 기록 전 상태를 보는데, 지금은 서로 독립이라
     결과가 같다 — 그래도 "기록 → 파생" 방향을 지켜 둔다(나중에 얽히면 이 순서가 답이다). */
  const evented = settleRankEvents(job.state)
  openRankEventWindows(evented)
  /* ⚠️ **길고양이 만남 창도 같은 자리다**(소원 창과 같은 판형·같은 이유) — 자동 진행·
     스케줄러로 넘긴 밤에도 방문일이면 창이 뜨고, 결정 없이 닫으면 그날 안에는 다시 뜬다. */
  openCatWindow(evented)
  /* ⚠️ **아침 딜레마 창도 같은 자리다**(고양이와 같은 판형·같은 이유) — 결정 커서가
     없으면 그날 안에는 다시 뜬다. 토스트는 없다(`chanceNotice`가 딜레마를 제외한다). */
  openDilemmaWindow(evented)
  /* ⚠️ **광고 팝업도 `afterTurn`에 붙는다**(랭크 이벤트 창과 같은 자리·같은 이유) —
     감염의 대가 절반이 성가심인데, 손으로 누른 자리에만 붙이면 자동 진행으로 넘긴 판에서
     통째로 사라진다. */
  openAdwareWindow(evented)
  /* ⚠️ **도감의 직업 콜렉션을 여기서 해금한다**(2026-08-14). 채용 소식이 나오는
     자리가 곧 "다녀 본 회사"가 생기는 자리다 — `systems/`는 스토어를 못 부르므로
     소식을 보고 스토어가 찍는 것이 방향이 맞다(랭크 이벤트 창과 같은 자리·같은 이유).
     ⚠️ **판을 넘어 남겨야 한다**: 세이브의 `careerLog`만 보면 새 게임을 시작하는
     순간 다녀 본 회사가 전부 사라진다. */
  unlockHiredCareers(job.notices)
  return {
    state: evented,
    skippedPlans: ran.skipped,
    arrivals: [...got.arrived, ...exams.arrived],
    jobNotices: job.notices,
    /* ⚠️ **매 턴 비운다** — 피드백 토스트는 방금 한 행동에 대한 말이라 다음 턴까지
       남으면 거짓이 된다(`doActivity`가 이 자리에 그 턴의 감상을 채워 넣는다). */
    feedback: [],
  }
}

/**
 * 콜센터에 출근했으면 사내 프로그램을 띄운다.
 *
 * ⚠️ **`doActivity`에만 붙인다.** 스케줄러 예약·자동 진행으로 지나간 출근은 창을 열지 않고
 * 그래서 보너스도 없다 — 설계자가 말한 "자동 넘기기 = 기본급만"이 그 자리에서 그대로 성립한다
 * (미니게임 안의 [자동 응대] 버튼은 그 선택을 근무 중에도 할 수 있게 하는 같은 규칙의 손잡이다).
 *
 * ⚠️ 판정에 쓰는 상태는 **출근하기 전 것**이다. 그래야 오후 출근으로 날이 넘어가
 * 급여일 정산이 도는 프레임에서도 "출근한 그 회사"가 흔들리지 않는다.
 */
function openCallCenterIfWorking(before: GameState, activityId: string) {
  if (activityId !== 'commute' || !worksAtCallCenter(before)) return
  useWindowStore.getState().open({
    id: 'callcenter',
    kind: 'callcenter',
    title: '한울 상담 지원 시스템',
    icon: 'fluent-color:headphones-24', // ⚠️ fluent-color에 call/phone 계열 다색 글리프가 없다
    x: 96,
    y: 64,
    width: 900,
  })
}

/**
 * 게임 활동을 직접 실행했으면 지뢰찾기를 띄운다.
 *
 * ⚠️ **`doActivity`에만 붙는다**(콜센터와 같은 규칙) — 스케줄러 예약·자동 진행으로 지나간
 * 실행은 창이 안 뜬다. 멘탈·gaming 증감은 창이 열리기 전에 이미 확정됐고 창은 순수
 * 장난감이다(`MinesweeperApp` 머리말 참조).
 * ⚠️ **같은 kind의 낡은 창을 먼저 닫는다**(`openToolWindow`와 같은 이유 —
 * `windowStore.open`은 id가 같으면 앞으로 가져오기만 해서 지난 판이 다시 보인다).
 */
function openMinesweeperIfPlaying(activityId: string) {
  if (activityId !== 'game') return
  const store = useWindowStore.getState()
  store.close('minesweeper')
  store.open({
    id: 'minesweeper',
    kind: 'minesweeper',
    title: '지뢰찾기',
    icon: 'mdi:mine',
    x: 220,
    y: 88,
    width: 360,
  })
}

/**
 * 사무직에 출근했으면 사내 드라이브를 띄운다.
 *
 * ⚠️ **콜센터와 배타다** — `worksAtOffice`는 콜센터를 뺀 나머지 회사이므로 두 창이 함께
 * 뜰 수 없다. 판정을 여기서 다시 적지 않고 `systems/drive.ts`에 물어보는 것도 같은 이유다.
 * ⚠️ **`doActivity`에만 붙는다**(콜센터와 같은 규칙) — 스케줄러 예약·자동 진행으로 지나간
 * 출근은 창이 안 뜨고, 그래서 성과도 안 쌓인다.
 */
function openDriveIfWorking(before: GameState, activityId: string) {
  if (activityId !== 'commute' || !worksAtOffice(before)) return
  useWindowStore.getState().open({
    id: 'drive',
    kind: 'drive',
    title: '너드라이브 — 사내 공유함',
    icon: 'fluent-color:cloud-24',
    x: 72,
    y: 56,
    width: 1000,
  })
}

/**
 * 랭크 이벤트로 열려야 하는 창을 띄우고, **그 사실을 기록하지는 않는다.**
 *
 * ⚠️ **기록은 창 안에서 실제로 무언가를 했을 때만 찍힌다**(`grantWish`) — 여기서 찍으면
 * 창을 닫기만 한 사람이 기회를 잃는다. 그래서 안 빌고 닫으면 다음 밤에 다시 뜬다.
 * ⚠️ **`kind: 'thread'` 이벤트는 여기서 아무것도 안 한다** — 대화방은 목록에 나타나는
 * 것으로 충분하고(`threadVisible`), 그 판정은 기록이 아니라 등급을 본다.
 *
 * ⚠️ **모든 턴 통로가 지나는 `afterTurn` 뒤에 붙는다**(콜센터·드라이브가 `doActivity`에만
 * 붙는 것과 반대다) — 랭크는 스케줄러 예약·자동 진행으로 오른 경우에도 닿으므로,
 * 손으로 누른 자리에만 붙이면 자동으로 넘긴 판에서 이벤트가 통째로 사라진다.
 */
function openRankEventWindows(next: GameState) {
  for (const event of dueRankEvents(next)) {
    if (event.kind !== 'window') continue
    useWindowStore.getState().open({
      id: `rank-${event.id}`,
      kind: event.target as 'wish',
      title: '별똥별',
      icon: 'fluent-color:star-24',
      x: 180,
      y: 96,
      width: 460,
    })
  }
}

/**
 * 방문일이면 길고양이 만남 창을 띄우고, **그 사실을 기록하지는 않는다.**
 *
 * ⚠️ 기록(`decidedDay`)은 창 안에서 실제로 결정했을 때만 찍힌다(`feedCat` 등) —
 * `openRankEventWindows`와 같은 규칙이다: 여기서 찍으면 창을 닫기만 한 사람이
 * 그날의 만남을 잃는다.
 */
function openCatWindow(next: GameState) {
  if (!catEncounterDue(next)) return
  useWindowStore.getState().open({
    id: 'cat-visit',
    kind: 'cat',
    title: '창밖의 손님',
    icon: 'fluent-color:paw-24',
    x: 200,
    y: 110,
    width: 440,
  })
}

/**
 * 딜레마 날 아침이면 갈림길 창을 띄운다 — `openCatWindow`와 같은 규칙: 기록
 * (`dilemmaDecidedDay`)은 창 안에서 실제로 골랐을 때만(`resolveDilemma`) 찍힌다.
 */
function openDilemmaWindow(next: GameState) {
  if (!dilemmaDue(next)) return
  useWindowStore.getState().open({
    id: 'dilemma',
    kind: 'dilemma',
    title: dilemmaToday(next)?.title ?? '갈림길',
    icon: 'fluent-color:question-circle-24',
    x: 220,
    y: 120,
    width: 440,
  })
}

/**
 * 감염 중이면 광고 팝업을 하나 띄운다.
 *
 * ⚠️ **id에 날짜·슬롯을 섞는다** — `windowStore.open`은 id가 같으면 새로 열지 않고 앞으로
 * 가져오기만 하므로, 고정 id면 두 번째 턴부터 창이 안 늘어난다(쌓이는 것이 대가다).
 * ⚠️ **치우지 않고 쌓이게 두되 자리를 조금씩 어긋나게 놓는다** — 정확히 겹치면 여러 개가
 * 떠 있다는 사실 자체가 안 보여 "닫아도 또 뜬다"가 전달되지 않는다.
 */
function openAdwareWindow(next: GameState) {
  if (!isInfected(next)) return
  const id = `adware-${next.day}-${next.slot}`
  useWindowStore.getState().open({
    id,
    kind: 'adware',
    title: '광고',
    icon: 'fluent-color:megaphone-loud-24',
    x: 260 + (next.day % 6) * 26,
    y: 130 + (next.slot === 'afternoon' ? 26 : 0),
    width: 340,
  })
}

/** 떠 있는 광고 팝업을 전부 닫는다. 치료 두 갈래가 같이 부른다(감염이 풀렸는데 창이 남으면 거짓말이다). */
function closeAdwareWindows() {
  const store = useWindowStore.getState()
  for (const w of store.windows) if (w.kind === 'adware') store.close(w.id)
}

/**
 * 접는 판의 기록(도감 '지난 삶'). ⚠️ **1일차 판은 남기지 않는다** — 이름만 짓고 버린
 * 판까지 남기면 '지난 삶'이 삶이 아니라 시도 목록이 된다. export는 테스트용이다
 * (`migrateSave`와 같은 부류의 순수 헬퍼).
 */
export function pastLifeOf(state: GameState): PastLife | null {
  if (state.day <= 1) return null
  return {
    name: state.playerName,
    days: state.day,
    lifeRank: lifeRankOf(state.stats).label,
    peakCareerId: state.peakCareerId,
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
  /** 별똥별 소원 — 고른 성장 스탯을 올린다. 한 번만 된다. */
  makeWish: (key: GrowthStatKey) => void
  /**
   * 길고양이 셋. **셋 다 턴을 쓰지 않는다**(만남은 일어난 일이다 — 소원과 같은 부류).
   * 판정·금액·기록은 전부 `systems/cat.ts`가 갖고 여기서는 부르기만 한다.
   */
  feedCat: () => void
  ignoreCat: () => void
  adoptCat: (name: string) => void
  /** 데스크톱 펫 쓰다듬기 — 하루 한 번 멘탈 +1, 턴 소모 없음(광고 보상과 같은 판형). */
  petCat: () => void
  /** 아침 딜레마에서 하나를 고른다. 턴을 쓰지 않는다(고양이와 같은 통로). */
  resolveDilemma: (choiceIndex: number) => void
  doSkip: () => void
  /** 콜센터 미니게임에서 콜 한 건을 마쳤다. 인자는 그 콜의 보너스(원). */
  finishCall: (won: number) => void
  /**
   * 사내 드라이브 미니게임에서 요청 한 건을 마쳤다. 인자는 그 건의 성과(%).
   * ⚠️ **소지금은 안 움직인다** — 게이지에 쌓였다가 급여일에 100% 초과분만 야근비가 된다.
   */
  finishRequest: (percent: number) => void
  /** 포털 광고 배너 보상(하루 한 번 100원). 턴은 소모하지 않는다. */
  claimAdBonus: () => void
  /**
   * 악성코드 셋. **셋 다 턴을 쓰지 않는다** — 감염은 배너를 누른 결과이고, 치료 둘은
   * 결제(은행 거래와 같은 부류)와 명령 한 줄이다. 규칙은 전부 `systems/malware.ts`가 갖는다.
   */
  infectMalware: () => void
  /** 백신 결제(`VACCINE_PRICE`). 돈이 모자라면 아무 일도 일어나지 않는다. */
  buyVaccine: () => void
  /** 명령 프롬프트의 `clean`. IT 랭크가 모자라면 아무 일도 일어나지 않는다(사유는 화면이 적는다). */
  cleanMalware: () => void
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
   * 중고마켓에 판다. **턴은 소모하지 않고 돈이 바로 들어온다**(`orderItem`의 반대 방향).
   * ⚠️ 되사기 구멍을 막는 `sold` 기록까지 `systems/resale.ts`가 진다 — 여기서는 부르기만 한다.
   */
  sellItem: (itemId: string) => void
  sellPostcard: (filmId: string) => void
  /**
   * 방금 도착한 택배. **휘발**이다 — 토스트를 띄우고 나면 남길 이유가 없다
   * (`skippedPlans`와 같은 규칙). 보유 기록은 `state.inventory`가 들고 있다.
   */
  arrivals: ShopItem[]
  clearArrivals: () => void
  /**
   * 방금 행동에 대한 **피드백 토스트**(기록 갱신 · 내면 감상). **휘발**이다
   * (`arrivals`와 같은 규칙 — 띄우고 나면 남길 이유가 없다).
   *
   * ⚠️ `Message` 형태를 그대로 쓴다: 토스트 자료구조를 하나 더 만들면 겹침 제한과
   * 중복 제거를 두 벌로 관리하게 된다(택배 알림이 같은 판단을 이미 했다).
   */
  feedback: Message[]
  clearFeedback: () => void
  /**
   * 첫 실행 안내 투어가 지금 돌고 있는가. **휘발이다**(`partialize`가 `state`만 저장한다) —
   * 새로고침 도중 끊긴 투어를 되살릴 이유가 없고, 되찾는 길은 설정에 있다.
   */
  tourRunning: boolean
  /** 새 판 직후 "튜토리얼 보시겠습니까?"를 묻는 중인가. `tourRunning`처럼 휘발이다. */
  tourAsk: boolean
  /** 물음에 답한다 — 예면 투어가 돌고, 아니오면 그냥 닫힌다. */
  answerTour: (yes: boolean) => void
  /** 투어를 **처음부터** 돌린다(설정의 [다시 보기]). 새 판은 `startGame`이 묻고 켠다. */
  startTour: () => void
  endTour: () => void
  /**
   * 정규직 공고에 지원한다. **1턴을 쓴다**(`job-apply` 활동이 비용을 갖는다).
   *
   * 기록을 먼저 만들고 활동을 실행하는 순서가 중요하다 — `canRun`의 `'applying'` 게이트가
   * "낼 서류가 정해져 있는가"를 보기 때문이다. 조건이 안 되면 **아무것도 하지 않는다**
   * (반쪽 상태: 지원은 됐는데 턴은 안 쓴, 또는 그 반대를 남기지 않는다).
   */
  applyToCareer: (career: Career) => void
  /**
   * 강의 수강. **1턴을 쓴다** — 수강료를 내고 강의가 가리키는 활동을 실행한다.
   *
   * ⚠️ `applyToCareer`와 같은 모양이다(턴을 쓰는 활동 + 활동만으로는 못 넘기는 값).
   * 규칙·수료증 발급은 전부 `systems/courses.ts`가 갖고 여기서는 부르기만 한다.
   */
  takeCourse: (course: Course) => void
  /**
   * 자격시험 응시. **1턴을 쓴다** — 응시료를 내고 `exam` 활동을 실행한다.
   *
   * ⚠️ `takeCourse`와 같은 모양이되 **결과가 즉시 나지 않는다**: 여기서는 접수만 하고
   * 합격은 발표일 밤에 `afterTurn` → `advanceCertification`이 확정한다.
   */
  takeExam: (cert: Cert) => void
  /**
   * 증기에서 게임을 켠다. **1턴을 쓴다** — `game` 활동을 실행하고 그 게임의 플레이
   * 횟수를 올린다(`takeCourse`와 같은 모양: 활동만으로는 못 넘기는 값이 하나 더 있다).
   */
  playGame: (game: SteamGame) => void
  /**
   * 그림을 트위터에 올린다. **1턴을 쓴다**(`sns` 활동이 비용을 갖는다).
   *
   * ⚠️ `takeCourse`·`playGame`과 같은 모양이다 — 순수 함수가 조건을 다 보고 안 되면
   * 상태를 그대로 돌려주므로 그때는 아무것도 하지 않는다(반쪽 상태 금지).
   */
  postArtwork: (artworkId: string) => void
  /**
   * 개인방송을 켠다. **1턴을 쓴다**(`stream` 활동이 비용을 갖는다).
   * ⚠️ `playGame`과 같은 모양 — 활동만으로는 못 넘기는 값(켠 횟수·주제)이 하나 더 있다.
   */
  startStream: (topic: StreamTopic) => void
  /**
   * 시집이에서 영화를 본다. **`movie` 활동을 실행하고 그 영화의 포스트카드를 남긴다.**
   * ⚠️ `doActivity`와 갈라 둔 이유는 `startStream`과 같다 — 무엇을 봤는지는 활동이
   * 모르는 사실이라, 활동만 실행하면 사라진다.
   */
  watchFilm: (film: Film) => void
  /**
   * 방송 채널 이름을 짓는다. **턴을 쓰지 않는다** — 그래서 `afterTurn`도 부르지 않는다
   * (은행 창구·쇼핑 주문과 같은 통로: 상태만 바꾸고 하루는 흐르지 않는다).
   */
  renameChannel: (name: string) => void
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
  /**
   * 이사. **턴을 소모하지 않는다**(은행 거래·쇼핑 주문과 같은 규칙).
   * 규칙·판정은 전부 `systems/housing.ts`가 갖고 여기서는 순수 함수를 부르기만 한다.
   */
  moveHouse: (target: Housing) => void
  /**
   * 복권 구매. **턴을 소모하지 않는다.** 표 값은 즉시 나가고 **추첨은 다음 토요일 밤**이다
   * (`nightPayoutPending` → `advanceLottery`). 굴림은 `systems/lottery.ts`의 시드
   * PRNG가 하고 여기서는 부르기만 한다.
   */
  buyLottery: (count: number) => void
  /**
   * 주식 매매. **은행 거래와 완전히 같은 부류다** — 턴을 쓰지 않고, 순수 함수가
   * 조건을 다 보고 안 되면 상태를 그대로 돌려주므로 그때는 아무것도 하지 않는다.
   * ⚠️ **밤 정산이 없다**(즉시 체결) — `nightPayoutPending`에 원천을 더하지 않는다.
   */
  /**
   * 구독 가입·해지. **턴을 쓰지 않는다**(은행 거래·쇼핑 주문과 같은 규칙 —
   * 결제는 시간을 쓰는 일이 아니다). 규칙은 `systems/subscription.ts`가 갖는다.
   */
  /**
   * 그목 일감을 받는다/포기한다. **둘 다 턴을 쓰지 않는다** — 계약은 시간을 쓰는
   * 일이 아니다(은행 거래와 같은 규칙). 실제로 시간을 쓰는 것은 **도구 앱**이다.
   * ⚠️ 포기는 마감을 놓친 것과 같은 평판 손해를 진다(규칙은 `systems/gigs.ts`).
   */
  /**
   * 새 작품집을 만든다. **턴을 안 쓴다**(폴더를 만드는 일이다).
   * 그 안에 한 장 그리기(`drawIntoProject`)만 1턴을 쓴다.
   */
  createProject: () => void
  /** 그 작품집에 한 장 그려 넣는다. **1턴.** */
  drawIntoProject: (projectId: string) => void
  /** 코미콘에서 회지를 판다. **1턴**(부스에 앉아 있는 하루). */
  sellAtComicon: (projectId: string) => void
  /** 공모전에 낸다. **턴을 안 쓴다**(봉투를 부치는 일이다 — 기다림이 비용이다). */
  enterContest: (contestId: string, pick: { projectId?: string; artworkId?: string }) => void
  /** 웹툰 연재 제의를 받는다/거절한다. 둘 다 턴을 안 쓴다(계약이다). */
  acceptWebtoon: () => void
  declineWebtoon: () => void
  /** 웹툰 원고를 한 장 친다. **1턴.** */
  drawWebtoon: () => void
  /**
   * 행사를 보러 간다 / 부스로 참여한다. **둘 다 1턴 + 돈**(입장료·참가비)이고,
   * 그 돈은 활동이 아니라 **행사**가 갖는다(`Expo.fee`·`ExpoJoin.fee`).
   * ⚠️ 코미콘 참여는 여기 오지 않는다 — 고를 것이 있어 코미콘 사이트로 보낸다.
   */
  visitExpo: (expoId: string) => void
  joinExpo: (expoId: string) => void
  takeGig: (gigId: string) => void
  abandonGig: () => void
  subscribeTo: (id: string) => void
  unsubscribeFrom: (id: string) => void
  buyStock: (stockId: string, shares: number) => void
  sellStock: (stockId: string, shares: number) => void
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
          // 토스트와 **같은 출처·같은 필터**를 본다 — 여기서 따로 계산하면 알림과 요약이
          // 어긋나고, 아직 없는 방의 메시지가 요약에만 뜬다.
          messages: selectIncoming(after.day, after.slot).filter((m) =>
            channelVisible(m.channel, after),
          ),
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
          if (!current || current.recovery || autoRunning) return
          clearAutoTimer()
          set({ autoRunning: true, autoSlots: 0, autoRun: startRun(current) })
          autoTick()
        },

        stopAuto: () => {
          if (!get().autoRunning) return
          finishAuto(AUTO_STOPPED_BY_PLAYER)
        },

        /**
         * 새 게임: 기존 세이브를 버리고 새로 만든다.
         *
         * ⚠️ **투어는 묻고 돌린다**(2026-08-17 설계자 지시로 물음 복원). 한 번 없앴던
         * 이유는 팝업의 기본 초점이 [바로 시작]이라 새 판을 여는 손짓 그대로 안내가
         * 닫혔던 것 — 그래서 이번에는 **기본 초점이 [보기]다**(`Tour.tsx`).
         */
        startGame: (name) => {
          clearAutoTimer()
          /* 버려지는 세이브를 **도감의 '지난 삶'으로 남긴다** — 새 판이 손실이 아니라
             회차가 되는 자리다(사유는 `metaStore.PastLife` 주석). */
          const prev = get().state
          const past = prev && pastLifeOf(prev)
          if (past) useMetaStore.getState().recordLife(past)
          set({
            /* ⚠️ 판 시드는 여기(store 층)서 **한 번만** 굴려 저장한다 — `systems/`의
               Math.random 금지는 그대로다(복권 일련번호와 같은 부류: 이후의 모든 돌발
               굴림은 이 값의 순수 함수라 새로 고침해도 다시 구르지 않는다). */
            state: { ...createInitialState(name), seed: Math.floor(Math.random() * 2 ** 31) },
            loggedIn: true,
            autoRunning: false,
            autoSlots: 0,
            autoRun: null,
            tourAsk: true,
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

        feedback: [],
        clearFeedback: () => set({ feedback: [] }),

        tourRunning: false,
        tourAsk: false,
        answerTour: (yes) => set({ tourAsk: false, tourRunning: yes }),
        /* ⚠️ **열린 창을 먼저 닫는다** — 투어가 가리키는 것은 전부 바탕화면 요소인데,
           설정 창에서 [다시 보기]를 누른 판이라면 그 창이 대상 위를 덮고 있다.
           구멍은 좌표를 뚫을 뿐이라 **그 자리에 있는 창이 그대로 보인다.** */
        startTour: () => {
          useWindowStore.getState().closeAll()
          set({ tourRunning: true })
        },
        endTour: () => set({ tourRunning: false }),

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

        takeCourse: (course) => {
          const current = get().state
          if (!current) return
          // `takeCourse`가 조건을 다 보고 안 되면 상태를 그대로 돌려준다(반쪽 상태 금지).
          // 턴을 쓰는 활동이므로 `afterTurn`으로 예약·택배·정산을 마저 돌린다.
          const next = takeCourseOf(current, course)
          if (next !== current) set(afterTurn(next))
        },

        playGame: (game) => {
          const current = get().state
          if (!current) return
          // `playGame`이 조건을 다 보고 안 되면 상태를 그대로 돌려준다(반쪽 상태 금지).
          // 턴을 쓰므로 `afterTurn`으로 예약·택배·정산을 마저 돌린다.
          const next = playGameOf(current, game)
          if (next !== current) {
            set(afterTurn(next))
            /* ⚠️ 증기도 **직접 실행**이다 — `doActivity`를 안 지나므로 여기서도 연다.
               빠뜨리면 `game`의 주 실행 통로에서만 지뢰찾기가 안 뜬다. */
            openMinesweeperIfPlaying(STEAM_ACTIVITY_ID)
          }
        },

        createProject: () => {
          const current = get().state
          if (!current) return
          // ⚠️ 턴을 안 쓰므로 `afterTurn`을 거치지 않는다(은행 거래·그몽 수주와 같다).
          const next = createProjectOf(current)
          if (next !== current) set({ state: next })
        },

        drawIntoProject: (projectId) => {
          const current = get().state
          if (!current) return
          const next = drawIntoProjectOf(current, projectId)
          if (next !== current) set(afterTurn(next))
        },

        sellAtComicon: (projectId) => {
          const current = get().state
          if (!current) return
          const next = sellAtComiconOf(current, projectId)
          if (next !== current) set(afterTurn(next))
        },

        enterContest: (contestId, pick) => {
          const current = get().state
          if (!current) return
          const next = enterContestOf(current, contestId, pick)
          if (next !== current) set({ state: next })
        },

        acceptWebtoon: () => {
          const current = get().state
          if (!current) return
          const next = acceptOffer(current)
          if (next !== current) set({ state: next })
        },

        declineWebtoon: () => {
          const current = get().state
          if (!current) return
          const next = declineOffer(current)
          if (next !== current) set({ state: next })
        },

        drawWebtoon: () => {
          const current = get().state
          if (!current) return
          const next = drawWebtoonOf(current)
          if (next !== current) set(afterTurn(next))
        },

        visitExpo: (expoId) => {
          const current = get().state
          if (!current) return
          const next = visitExpoOf(current, expoId)
          if (next !== current) set(afterTurn(next))
        },

        joinExpo: (expoId) => {
          const current = get().state
          if (!current) return
          const next = joinExpoOf(current, expoId)
          if (next !== current) set(afterTurn(next))
        },

        /**
         * 소원을 빈다. **턴도 돈도 쓰지 않는다** — 판정과 기록은 `grantWish` 하나가 한다
         * (안 아프면 그대로 돌려주는 `healIllness`와 같은 모양).
         * ⚠️ `afterTurn`을 부르지 않는다: 턴이 안 넘어갔으므로 밤 정산을 돌릴 이유가 없고,
         * 돌리면 별똥별을 본 밤이 두 번 정산된다.
         */
        makeWish: (key) => {
          const current = get().state
          if (!current) return
          const next = grantWish(current, key)
          if (next !== current) set({ state: next })
        },

        /*
         * 길고양이 셋 + 쓰다듬기. **턴을 안 쓰므로 `afterTurn`을 부르지 않는다**
         * (소원·광고 보상과 같은 통로). 판정과 금액은 전부 `systems/cat.ts`가 갖는다.
         */
        feedCat: () => {
          const current = get().state
          if (!current) return
          const next = feedCatOf(current)
          if (next !== current) set({ state: next })
        },

        ignoreCat: () => {
          const current = get().state
          if (!current) return
          const next = ignoreCatOf(current)
          if (next !== current) set({ state: next })
        },

        /* 아침 딜레마 결정. 판정·클램프·커서는 전부 `systems/chance.ts`가 갖는다. */
        resolveDilemma: (choiceIndex) => {
          const current = get().state
          if (!current) return
          const next = resolveDilemmaOf(current, choiceIndex)
          if (next !== current) set({ state: next })
        },

        adoptCat: (name) => {
          const current = get().state
          if (!current) return
          const next = adoptCatOf(current, name)
          if (next === current) return
          set({
            /* 입양은 이벤트 도감에 한 줄 남는다 — `systems/cat.ts`가 `recordEvent`를 직접
               부르면 `turn → cat → delivery → turn` 순환이라 여기서 찍는다(`claimAdBonus`의
               `first-ad`와 같은 자리). */
            state: recordEvent(next, 'cat-adopted'),
            feedback: [
              {
                id: `cat-adopt-${next.day}`,
                channel: 'cat',
                from: catName(next),
                text: '집에 들였다. 이제 밤마다 사료값이 들고, 가끔 바탕화면을 걸어다닌다.',
              },
            ],
          })
        },

        petCat: () => {
          const current = get().state
          if (!current) return
          const next = petCatOf(current)
          if (next === current) return
          /* 멘탈이 이미 상한이면 +1이 실제로는 0이다 — 숫자는 오른 만큼만 적는다(거짓 금지). */
          const gained = next.stats.mental - current.stats.mental
          set({
            state: next,
            feedback: [
              {
                id: `cat-pet-${next.day}`,
                channel: 'cat',
                from: catName(next),
                text: `기분 좋게 그르릉거린다.${gained > 0 ? ` 멘탈 +${gained}` : ''}`,
              },
            ],
          })
        },

        postArtwork: (artworkId) => {
          const current = get().state
          if (!current) return
          const next = postArtworkOf(current, artworkId)
          if (next !== current) set(afterTurn(next))
        },

        startStream: (topic) => {
          const current = get().state
          if (!current) return
          // `startStream`이 조건(행동력·장비)을 다 보고 안 되면 상태를 그대로 돌려준다.
          const next = startStreamOf(current, topic)
          if (next !== current) set(afterTurn(next))
        },

        watchFilm: (film) => {
          const current = get().state
          if (!current) return
          // `watchFilm`이 조건(행동력·관람료)을 다 보고 안 되면 상태를 그대로 돌려준다.
          const next = watchFilmOf(current, film)
          if (next !== current) set(afterTurn(next))
        },

        renameChannel: (name) => {
          const current = get().state
          if (!current) return
          const next = renameChannelOf(current, name)
          if (next !== current) set({ state: next })
        },

        takeExam: (cert) => {
          const current = get().state
          if (!current) return
          // `takeExam`이 조건(응시료·중복 접수·행동력)을 다 보고 안 되면 상태를 그대로
          // 돌려준다(반쪽 상태 금지 — `takeCourse`와 같은 규칙).
          const next = takeExamOf(current, cert)
          if (next !== current) set(afterTurn(next))
        },

        orderItem: (item) => {
          const current = get().state
          if (!current) return
          const next = order(current, item)
          if (next === current) return
          set({ state: next })
        },

        /* 파는 것은 턴을 안 쓰므로 `afterTurn`을 부르지 않는다(쇼핑 주문과 같은 통로). */
        sellItem: (itemId) => {
          const current = get().state
          if (!current) return
          const next = sellItemOf(current, itemId)
          if (next !== current) set({ state: next })
        },

        sellPostcard: (filmId) => {
          const current = get().state
          if (!current) return
          const next = sellPostcardOf(current, filmId)
          if (next !== current) set({ state: next })
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
          const ran = runActivity(current, activity)
          /* ⚠️ **진료는 활동이 비용을, 여기가 완치를 맡는다**(`data/activities.ts`의 `clinic`).
             활동 효과에 상태 변경을 섞을 자리가 없어서 이렇게 갈렸다 — 낫는 판정 자체는
             `healIllness` 하나가 갖는다(안 아프면 상태를 그대로 돌려준다).
             ⚠️ **`afterTurn`보다 먼저 낫는다**: 오후 진료면 그 밤이 이미 지나갔으므로
             여기서 지우지 않으면 앓은 날이 하루 더 세어진다. */
          /* ⚠️ **호감도는 통로를 가리지 않고 여기서 오른다** — 대화방이든 스케줄러 예약이든
             같은 `doActivity`를 지나므로, 이 한 자리가 곧 단일 출처다(`creditAffection`은
             관계와 무관한 활동이면 상태를 그대로 돌려준다). */
          const healed = activity.id === 'clinic' ? healIllness(ran) : ran
          const result = afterTurn(creditAffection(healed, activity.id))
          /* ⚠️ **행동 피드백은 여기서 만든다** — 행동 직전(`current`)과 직후 상태를
             둘 다 쥔 유일한 자리다(기록 갱신은 둘을 견줘야 알 수 있다).
             ⚠️ **밤 정산까지 끝난 상태로 잰다**(`result.state`): 오후 행동이면 생활비가
             빠진 뒤라야 "잔고 기록"이 실제와 맞는다. */
          set({
            ...result,
            /* 사건 알림이 먼저다 — "오늘 무슨 날인가"가 방금 행동의 감상보다 먼저 읽혀야 한다. */
            feedback: [
              ...chanceNotice(current, result.state),
              ...feedbackFor(current, result.state, activity),
            ],
          })
          openCallCenterIfWorking(current, activity.id)
          openDriveIfWorking(current, activity.id)
          openMinesweeperIfPlaying(activity.id)
        },

        /**
         * 콜 한 건 처리 완료. 금액 판정은 화면(경과 시간)이 하고 상한은 `creditCall`이 쥔다.
         * **소지금은 안 움직인다** — 급여일에 기본급과 함께 들어온다.
         */
        finishRequest: (percent) => {
          const current = get().state
          if (!current) return
          const credited = creditPerformance(current, percent)
          if (credited !== current) set({ state: credited })
        },

        finishCall: (won) => {
          const current = get().state
          if (!current) return
          const credited = creditCall(current, won)
          if (credited !== current) set({ state: credited })
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

        /*
         * 악성코드 셋. **턴을 안 쓰므로 `afterTurn`을 부르지 않는다**(광고 보상·은행 거래와
         * 같은 통로). 판정과 금액은 전부 `systems/malware.ts`가 갖고 여기서는 부르기만 한다.
         */
        infectMalware: () => {
          const current = get().state
          if (!current) return
          const next = infectOf(current)
          if (next === current) return
          set({ state: next })
          /* ⚠️ **감염된 순간 팝업이 하나 뜬다.** 이 자리가 없으면 다음 밤까지 아무 일도
             안 일어나 "무엇이 일어났는지" 알 길이 없다(숨은 비용 금지). */
          openAdwareWindow(next)
        },

        /* ⚠️ 치료 둘은 **떠 있는 팝업까지 닫는다** — 감염이 풀렸는데 광고가 남으면 거짓말이다. */
        buyVaccine: () => {
          const current = get().state
          if (!current) return
          const next = buyVaccineOf(current)
          if (next === current) return
          set({ state: next })
          closeAdwareWindows()
        },

        cleanMalware: () => {
          const current = get().state
          if (!current) return
          const next = cleanOf(current)
          if (next === current) return
          set({ state: next })
          closeAdwareWindows()
        },

        doSkip: () => {
          const current = get().state
          if (!current) return
          const result = afterTurn(skipSlot(current))
          /* 건너뛴 아침에도 돌발 사건은 알린다 — `doActivity`와 같은 자리·같은 이유. */
          set({ ...result, feedback: chanceNotice(current, result.state) })
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

        /**
         * ⚠️ **은행 거래와 완전히 같은 모양이다** — 순수 함수를 부르고, 조건이 안 되면
         * 그 함수가 상태를 그대로 돌려주므로 아무것도 하지 않는다(반쪽 상태 금지).
         * `afterTurn`을 부르지 않는다: 이사도 복권도 턴을 쓰지 않는다.
         */
        moveHouse: (target) => {
          const current = get().state
          if (!current) return
          const next = moveTo(current, target)
          if (next !== current) set({ state: recordEvent(next, 'first-move') })
        },

        buyLottery: (count) => {
          const current = get().state
          if (!current) return
          const next = buyTickets(current, count)
          if (next !== current) set({ state: recordEvent(next, 'first-lottery') })
        },

        takeGig: (gigId) => {
          const current = get().state
          if (!current) return
          const next = takeGigOf(current, gigId)
          if (next !== current) set({ state: recordEvent(next, 'first-gig') })
        },

        abandonGig: () => {
          const current = get().state
          if (!current) return
          const next = abandonGigOf(current)
          if (next !== current) set({ state: next })
        },

        subscribeTo: (id) => {
          const current = get().state
          if (!current) return
          const next = subscribeOf(current, id)
          if (next !== current) set({ state: recordEvent(next, 'first-subscribe') })
        },

        unsubscribeFrom: (id) => {
          const current = get().state
          if (!current) return
          const next = unsubscribeOf(current, id)
          if (next !== current) set({ state: next })
        },

        buyStock: (stockId, shares) => {
          const current = get().state
          if (!current) return
          const next = buyStockOf(current, stockId, shares)
          if (next !== current) set({ state: recordEvent(next, 'first-stock') })
        },

        sellStock: (stockId, shares) => {
          const current = get().state
          if (!current) return
          const next = sellStockOf(current, stockId, shares)
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
