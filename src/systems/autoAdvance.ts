import { findActivity } from '../data/activities'
import { AUTO_MAX_SLOTS, MONEY_DANGER_DAYS } from '../data/autoAdvance'
import { MAILBOX, MESSAGE_SCHEDULE } from '../data/messages'
import { chanceToday, noticeTextOf } from './chance'
import { getLivingCost } from './economy'
import { checkAchievementEnding } from './ending'
import { JOB_NOTICE_LABELS } from './employment'
import { turnIndex } from './messages'
import { findPlan } from './schedule'
import { GROWTH_STAT_KEYS, STAT_NAMES } from '../types/game'
import type { Message } from '../data/messages'
import type { ShopItem } from '../data/items'
import type { SkippedPlan } from './schedule'
import type { GameState, JobNotice, Slot, Stats } from '../types/game'

/**
 * 자동 진행 — **무엇이 흐름을 멈춰 세우는가**와 **그동안 무슨 일이 있었는가**.
 *
 * ## 이 파일이 있는 이유
 * 자동 진행의 루프 자체는 `store/gameStore.ts`에 있다(타이머가 필요하고, 예약·택배·고용
 * 정산을 한자리에 모은 `afterTurn`을 그대로 써야 하기 때문이다). 여기에는 **판정과 기록만**
 * 둔다 — 정지 조건을 컴포넌트나 루프 안의 `if` 사슬로 흩어 놓으면 조건을 하나 더할 때마다
 * 루프를 뜯어야 하고, 그러면 언젠가 새 조건 하나가 조용히 발화하지 않게 된다.
 * 그래서 조건은 **순수 술어의 목록**(`STOP_RULES`)이다: 랜덤 이벤트가 생기면 배열에
 * 항목 하나를 더하면 되고 루프는 손대지 않는다.
 *
 * ## 결정성
 * `Math.random`·`Date` 금지(`systems/` 공통 규칙). 정지 판정은 상태와 그 슬롯의 결과만 본다.
 */

/* ── 정지 사유 ─────────────────────────────────────────────────────────── */

/**
 * 멈춘 이유의 종류.
 *
 * `'stopped'`만 규칙이 아니다 — 플레이어가 멈추기를 누른 경우라 판정할 것이 없다.
 */
export type AutoStopId =
  | 'recovery'
  | 'ending'
  | 'job'
  | 'money'
  | 'delivery'
  | 'chance'
  | 'dilemma'
  | 'mail'
  | 'plan-failed'
  | 'limit'
  | 'no-plan'
  | 'stopped'

export interface AutoStop {
  id: AutoStopId
  /** 플레이어에게 그대로 보여 줄 한 문장. 사유를 못 대는 정지를 만들지 않는다. */
  text: string
  /** 나쁜 소식인가. 화면이 두 번째 판정을 하지 않도록 여기서 정한다. */
  bad: boolean
}

/**
 * 정지 판정에 필요한 것 전부.
 *
 * `before`가 없는 호출은 **슬롯을 실행하기 전 점검**이다(게임오버·엔딩·빈 계획처럼
 * "한 슬롯 더 가 보고 판단할 수 없는" 것들이 여기서 걸린다).
 */
export interface StopContext {
  /** 이 슬롯을 실행하기 전 상태. 실행 전 점검에서는 없다. */
  before?: GameState
  /** 지금 상태. */
  state: GameState
  arrivals: ShopItem[]
  notices: JobNotice[]
  skipped: SkippedPlan[]
  /** 이 턴에 새로 도착한 메시지(토스트와 같은 출처: `selectIncoming`). */
  messages: Message[]
  /** 이번 진행에서 지금까지 넘긴 슬롯 수. */
  slots: number
}

export interface StopRule {
  id: AutoStopId
  bad: boolean
  /** 멈춰야 하면 사유 문장을, 아니면 null을 돌려준다. */
  test: (ctx: StopContext) => string | null
}

const slotName = (slot: Slot) => (slot === 'morning' ? '오전' : '오후')

const won = (v: number) => `${Math.round(v).toLocaleString('ko-KR')}원`


/**
 * 지금 소지금이 이 아래면 위험 구간이다. 근거는 `data/autoAdvance.ts` 주석 참조.
 *
 * ⚠️ **날짜가 아니라 상태를 받는다**(2026-08-05 이사 신설). 위험선은 "며칠치 생활비"인데
 * 생활비가 이제 날짜뿐 아니라 **사는 집**에도 달려 있다. 날짜만 보면 고시원으로 이사한
 * 플레이어가 실제로는 안전한 금액에서 계속 경고를 받는다 — 알림이 거짓이 되면
 * 플레이어는 그 알림 자체를 무시하게 된다.
 *
 * "전과 후를 각자의 기준으로 잰다"는 규칙은 그대로다: 두 상태가 각자의 날짜와 집을
 * 들고 있으므로 이사한 날에도 경고가 사라지지 않는다.
 */
export function moneyDangerLine(state: GameState): number {
  return getLivingCost(state) * MONEY_DANGER_DAYS
}

/**
 * 정지 조건 목록. **위에 있는 것이 먼저 이긴다.**
 *
 * 순서가 곧 "플레이어가 가장 먼저 알아야 하는 것"이다: 판이 끝났는가 → 엔딩인가 →
 * 회사에 무슨 일이 있었는가 → 돈이 위험한가 → 물건이 왔는가 … 마지막이 "계획이 없다"인
 * 이유는 그것이 가장 흔하고 가장 덜 급한 정지이기 때문이다.
 */
export const STOP_RULES: StopRule[] = [
  {
    id: 'recovery',
    bad: true,
    /**
     * ⚠️ **반드시 첫 번째다.** 주저앉은 판을 자동으로 흘려보내면 플레이어가 모르는 사이
     * 회복 기간이 지나가 **무슨 일이 있었는지 못 본다**. `runActivity`·`skipSlot`도
     * 회복 중이면 상태를 그대로 돌려주므로 이중으로 막혀 있다.
     *
     * ⚠️ **판이 끝난 것이 아니다**(2026-08-14). 옛 이름은 `game-over`였고 그때는 실제로
     * 끝이었다. 지금은 며칠 뒤 저절로 풀리므로 문구도 "쓰러졌다"가 아니라 **며칠 남았는지**를
     * 말한다 — 플레이어가 [턴 넘기기]로 빠져나올 수 있음을 알아야 하기 때문이다.
     */
    test: (c) =>
      c.state.recovery?.kind === 'bankrupt'
        ? `소지금이 바닥나 주저앉았습니다. ${c.state.recovery.daysLeft}일 남았습니다.`
        : c.state.recovery?.kind === 'burnout'
          ? `번아웃으로 주저앉았습니다. ${c.state.recovery.daysLeft}일 남았습니다.`
          : null,
  },
  {
    id: 'ending',
    bad: false,
    /** 성취 엔딩 모달이 뜰 상태. 화면을 가로막는 팝업 뒤에서 날짜가 계속 흐르면 안 된다. */
    test: (c) => {
      const ending = checkAchievementEnding(c.state.stats, c.state.seenEndingIds)
      return ending ? `엔딩 조건을 채웠습니다 — ${ending.title}.` : null
    },
  },
  {
    id: 'job',
    bad: false,
    test: (c) =>
      c.notices.length
        ? `회사 소식이 도착했습니다 — ${c.notices
            .map((n) => JOB_NOTICE_LABELS[n.kind])
            .join(' · ')}.`
        : null,
  },
  {
    id: 'money',
    bad: true,
    /**
     * 소지금이 위험선 **아래로 내려가는 순간**에만 멈춘다.
     *
     * ⚠️ 상태만 보면(=`money < line`이면 무조건 멈춤) 한 번 위험 구간에 들어간 뒤로는
     * 자동 진행을 다시 눌러도 첫 점검에서 그대로 멈춰 **한 슬롯도 못 간다.** 위험선은
     * 감옥이 아니라 알림이므로, 넘는 순간 한 번만 말하고 그다음은 플레이어의 판단에 맡긴다.
     */
    test: (c) => {
      if (!c.before) return null
      const line = moneyDangerLine(c.state)
      if (c.state.stats.money >= line) return null
      // ⚠️ **전과 후를 각자의 기준으로 잰다.** 위험선은 생활비에서 나오는데 생활비는
      //    10일마다 오르고(`data/economy.ts`) **이사하면 즉시 달라진다**. 구간이 바뀌는 날에
      //    한쪽 기준으로만 비교하면 "어제도 이미 아래였다"가 되어 경고가 통째로 사라진다
      //    (CDP 실측으로 잡은 버그).
      if (c.before.stats.money < moneyDangerLine(c.before)) return null
      return `소지금이 위험선(생활비 ${MONEY_DANGER_DAYS}일치 ${won(line)}) 아래로 내려갔습니다 — 현재 ${won(
        c.state.stats.money,
      )}.`
    },
  },
  {
    id: 'delivery',
    bad: false,
    test: (c) =>
      c.arrivals.length
        ? `택배가 도착했습니다 — ${c.arrivals.map((i) => i.name).join(' · ')}.`
        : null,
  },
  {
    id: 'chance',
    bad: false,
    /**
     * **"오늘만 기회"가 뜬 아침에만 멈춘다** — 그날만 좋아지는 활동을 자동으로 흘려보내면
     * 기회가 통째로 사라진다. 소소한 사건은 안 멈춘다(밤 정산에 흡수되고 요약에 남는다).
     * 날이 바뀐 순간만 보는 것은 `money` 규칙과 같은 이유다 — 상태만 보면 그날 내내
     * 첫 점검에서 멈춰 한 슬롯도 못 간다.
     */
    test: (c) => {
      if (!c.before || c.before.day === c.state.day) return null
      const event = chanceToday(c.state)
      if (!event || event.kind !== 'boost') return null
      return `오늘만 기회 — ${noticeTextOf(event)}`
    },
  },
  {
    id: 'dilemma',
    bad: false,
    /**
     * **딜레마가 뜬 아침에만 멈춘다**(기회일 정지와 같은 판형·같은 날-바뀜 판정) —
     * 창이 떠서 선택을 기다리는데 자동으로 흘려보내면 고르지 못한 채 날이 간다.
     */
    test: (c) => {
      if (!c.before || c.before.day === c.state.day) return null
      const event = chanceToday(c.state)
      if (event?.kind !== 'dilemma') return null
      return `갈림길 — ${event.title}. 창에서 하나를 골라야 합니다.`
    },
  },
  {
    id: 'mail',
    bad: false,
    /**
     * 사서함에 새 메일이 도착했다.
     *
     * ⚠️ **편성표가 한 바퀴 도는 동안(첫 8턴 = 4일)만 멈춘다.** `MESSAGE_SCHEDULE`은 유한한
     * 대본이 끝에서 처음으로 **순환**하는 구조라(`systems/messages.ts`) 8턴 중 6턴에 메시지가
     * 있다 — 도착할 때마다 멈추면 자동 진행이 세 슬롯을 못 넘겨 기능 자체가 성립하지 않는다.
     * 두 바퀴째부터는 이미 읽은 문장이 다시 오는 것이라 "새 소식"이 아니다.
     *
     * 진짜 사건(정규직 소식·택배)은 각자 자기 규칙이 멈춰 세우고, 흘려보낸 메일도
     * 요약 창에 전부 적힌다 — **멈추지 않을 뿐 사라지지는 않는다.**
     */
    test: (c) => {
      if (turnIndex(c.state.day, c.state.slot) >= MESSAGE_SCHEDULE.length) return null
      const mails = c.messages.filter((m) => m.channel === MAILBOX.id)
      if (!mails.length) return null
      return `메일이 도착했습니다 — ${mails.map((m) => m.subject ?? m.from).join(' · ')}.`
    },
  },
  {
    id: 'plan-failed',
    bad: true,
    /** 예약이 조건 미달로 흘러갔다. 그 슬롯은 아무것도 못 한 채 생활비만 나갔다. */
    test: (c) =>
      c.skipped.length
        ? `예약을 실행하지 못했습니다 — ${c.skipped
            .map((s) => `${s.day}일차 ${slotName(s.slot)} ${planLabel(s.activityId)}(${s.reason})`)
            .join(' · ')}.`
        : null,
  },
  {
    id: 'limit',
    bad: false,
    /** 안전 상한. 사유를 적어 두지 않으면 "왜 갑자기 멈췄지"가 된다. */
    test: (c) =>
      c.slots >= AUTO_MAX_SLOTS
        ? `안전 상한(${AUTO_MAX_SLOTS}슬롯 = ${AUTO_MAX_SLOTS / 2}일)까지 진행했습니다. 다시 눌러 이어갈 수 있습니다.`
        : null,
  },
  {
    id: 'no-plan',
    bad: false,
    /**
     * ⚠️ **예약이 없는 슬롯은 자동으로 건너뛰지 않고 멈춘다**(설계자 결정).
     *
     * 계획 없는 날을 조용히 태우면 생활비만 빠져나가는 동안 플레이어는 아무 일도 일어나지
     * 않는 화면을 보게 되고, 판이 그렇게 죽으면 **왜 죽었는지 모른 채로 죽는다.** 여기서
     * 멈춰 세우는 것이 "내 계획이 여기서 바닥났다"를 눈에 보이게 만드는 유일한 방법이다.
     * 긴 구간을 채우는 수단은 이미 있다 — 스케줄러의 주간 반복(`planWeekly`).
     */
    test: (c) =>
      findPlan(c.state.plans ?? [], c.state.day, c.state.slot)
        ? null
        : `${c.state.day}일차 ${slotName(c.state.slot)}에 예약된 계획이 없습니다.`,
  },
]

/** 예약이 가리키던 활동의 이름. 없는 활동이면 id를 그대로 보여 준다. */
function planLabel(activityId: string): string {
  return findActivity(activityId)?.label ?? activityId
}

/** 첫 번째로 걸리는 정지 사유. 하나도 없으면 null(= 계속 간다). */
export function findStop(ctx: StopContext): AutoStop | null {
  for (const rule of STOP_RULES) {
    const text = rule.test(ctx)
    if (text) return { id: rule.id, text, bad: rule.bad }
  }
  return null
}

/** 플레이어가 직접 멈춘 경우. 규칙이 아니라 사람의 결정이라 목록 밖에 둔다. */
export const AUTO_STOPPED_BY_PLAYER: AutoStop = {
  id: 'stopped',
  text: '진행을 멈췄습니다.',
  bad: false,
}

/* ── 진행 기록 ─────────────────────────────────────────────────────────── */

/** 넘어간 슬롯 한 칸. */
export interface AutoStep {
  day: number
  slot: Slot
  /** 실행한 활동 이름. 조건 미달로 흘려보낸 슬롯에는 없다. */
  label?: string
  /** 못 지킨 사유. 있으면 이 슬롯은 아무것도 하지 않았다. */
  skipped?: string
  /** 이 슬롯이 끝난 뒤의 소지금. */
  money: number
}

/**
 * 한 번의 자동 진행이 남기는 보고서.
 *
 * ⚠️ **며칠이 조용히 사라지지 않게 하는 것이 이 자료의 전부다.** 토스트는 5초 뒤
 * 없어지고 메일은 열어야 보이지만, 이 기록은 진행이 끝나는 순간 창으로 뜬다.
 */
export interface AutoRun {
  fromDay: number
  fromSlot: Slot
  toDay: number
  toSlot: Slot
  /** 넘긴 슬롯 수. 0이면 한 칸도 못 갔다는 뜻이다. */
  slots: number
  steps: AutoStep[]
  moneyBefore: number
  moneyAfter: number
  /**
   * 들어온 돈 · 나간 돈. 순증만 보여 주면 "얼마 벌어 얼마 썼는가"가 사라진다.
   *
   * ⚠️ **슬롯의 소지금 차액을 그대로 쓰면 안 된다.** 오후 슬롯은 취침 정산까지 함께
   * 넘어가므로 차액이 이미 `알바비 − 생활비`로 상계돼 있다 — 그걸 그대로 적으면
   * 며칠을 일하고도 "지출 0원"이라는 거짓말이 화면에 뜬다(실측으로 잡았다).
   * 그래서 그 슬롯에 빠져나간 생활비를 `getLivingCost`로 되돌려 더한 뒤 갈라 놓는다.
   */
  moneyIn: number
  moneyOut: number
  /** 그중 생활비. 매일 반드시 나가는 돈이라 따로 적어야 "왜 줄었는지"가 설명된다. */
  livingPaid: number
  /** 도착한 택배 이름. */
  arrivals: string[]
  notices: JobNotice[]
  skipped: SkippedPlan[]
  /** 그동안 사서함에 쌓인 메일. */
  mails: { from: string; subject: string }[]
  /** 스탯 증감(0인 항목은 빼고). `stamina`는 매일 회복되는 자원이라 세지 않는다. */
  statDelta: { key: keyof Stats; label: string; value: number }[]
  stop: AutoStop | null
  /** 내부 계산용. 끝날 때 증감을 뽑는 기준값이다. */
  statsBefore: Stats
  statsAfter: Stats
}

export function startRun(state: GameState): AutoRun {
  return {
    fromDay: state.day,
    fromSlot: state.slot,
    toDay: state.day,
    toSlot: state.slot,
    slots: 0,
    steps: [],
    moneyBefore: state.stats.money,
    moneyAfter: state.stats.money,
    moneyIn: 0,
    moneyOut: 0,
    livingPaid: 0,
    arrivals: [],
    notices: [],
    skipped: [],
    mails: [],
    statDelta: [],
    stop: null,
    statsBefore: state.stats,
    statsAfter: state.stats,
  }
}

/**
 * 슬롯 하나가 지나간 결과를 기록에 붙인다. 원본은 건드리지 않는다.
 *
 * `ctx.before`가 그 슬롯을 실행하기 **전** 상태이므로, "몇 일차 무슨 슬롯에서 무엇을
 * 했는가"는 저쪽의 예약 목록에서 읽는다(실행되고 나면 예약은 지워져 있다).
 */
export function appendStep(run: AutoRun, ctx: StopContext): AutoRun {
  const before = ctx.before
  if (!before) return run

  const plan = findPlan(before.plans ?? [], before.day, before.slot)
  const missed = ctx.skipped.find((s) => s.day === before.day && s.slot === before.slot)
  const step: AutoStep = {
    day: before.day,
    slot: before.slot,
    label: missed || !plan ? undefined : planLabel(plan.activityId),
    skipped: missed ? missed.reason : undefined,
    money: ctx.state.stats.money,
  }

  // 오후 슬롯을 넘기면 밤 정산(생활비 차감)이 함께 일어난다 — `turn.ts`의 `advance`와
  // 같은 판정을 여기서도 한다(같은 함수 `getLivingCost`를 본다).
  // ⚠️ **`before`(그 슬롯을 실행하기 전 상태)를 넘긴다** — 생활비는 날짜뿐 아니라
  //    그때 살던 집에도 달려 있다. 이사한 슬롯에서 지금 집으로 계산하면 금액이 어긋난다.
  const living = before.slot === 'afternoon' ? getLivingCost(before) : 0
  const delta = ctx.state.stats.money - before.stats.money
  // 생활비를 되돌려 더하면 그 슬롯의 **행동 자체**가 만든 돈이 나온다.
  const gross = delta + living
  return {
    ...run,
    toDay: ctx.state.day,
    toSlot: ctx.state.slot,
    slots: run.slots + 1,
    steps: [...run.steps, step],
    moneyAfter: ctx.state.stats.money,
    moneyIn: run.moneyIn + Math.max(0, gross),
    moneyOut: run.moneyOut + Math.max(0, -gross) + living,
    livingPaid: run.livingPaid + living,
    arrivals: [...run.arrivals, ...ctx.arrivals.map((i) => i.name)],
    notices: [...run.notices, ...ctx.notices],
    skipped: [...run.skipped, ...ctx.skipped],
    mails: [
      ...run.mails,
      ...ctx.messages
        .filter((m) => m.channel === MAILBOX.id)
        .map((m) => ({ from: m.from, subject: m.subject ?? m.text })),
    ],
    statsAfter: ctx.state.stats,
  }
}

/**
 * 진행을 끝내고 증감을 확정한다.
 *
 * ⚠️ `stamina`(행동력)는 세지 않는다 — 매일 취침으로 회복되는 자원이라 며칠을 밀면
 * 증감이 언제나 잡음이다. 보여 줄 값은 **며칠 사이에 실제로 남은 것**(성장 스탯·멘탈)이다.
 */
export function endRun(run: AutoRun, stop: AutoStop | null): AutoRun {
  const keys: (keyof Stats)[] = ['mental', ...GROWTH_STAT_KEYS]
  const statDelta = keys
    .map((key) => ({ key, label: STAT_NAMES[key], value: run.statsAfter[key] - run.statsBefore[key] }))
    .filter((d) => d.value !== 0)
  return { ...run, stop, statDelta }
}
