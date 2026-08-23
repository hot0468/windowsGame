import { weekdayOf } from '../data/calendar'
import {
  ABSENCE_FIRE,
  ABSENCE_WARNING,
  INTERVIEW_LEAD_DAYS,
  INTERVIEW_WINDOW_DAYS,
  NOTICE_LIMIT,
  PAYDAY_INTERVAL,
  SCREENING_DAYS,
  careerRank,
  findCareer,
  isWorkWeekday,
} from '../data/careers'
import { findItem } from '../data/items'
import { MAILBOX } from '../data/messages'
import { STAT_NAMES } from '../types/game'
import { markHired } from './careerLog'
import { overtimePay } from './drive'
import { messageTime, turnIndex } from './messages'
import { clampStats, owns, settleRecovery } from './turn'
import type { TimedMessage } from './messages'
import type { Career, CareerRequirement } from '../data/careers'
import type { Application, GameState, JobNotice, Stats } from '../types/game'

/**
 * 정규직 — 지원 · 서류 · 면접 · 최종 결과 · 급여 · 결근 · 해고.
 *
 * ## 이 파일이 있는 이유
 * 알바(`data/jobs.ts`)는 **일용직**이다: 공고를 누르면 그 슬롯을 일하고 그날 일당을 받는다.
 * 정규직은 **한 번 채용되면 고용이 지속된다** — 그래서 규칙이 "활동 하나"로는 표현되지 않고
 * 날짜를 따라 스스로 진행되는 절차가 필요하다.
 *
 * ## 의존 방향
 * ⚠️ `turn.ts`를 부르지만 **그 반대는 없다**(`schedule.ts`·`delivery.ts`와 같은 규칙).
 * 턴 규칙이 고용을 모르는 채로 있어야 밸런스 테스트가 고용 없이도 성립한다.
 * 예외는 딱 둘이고 `turn.ts` 안에 이유가 적혀 있다: `canRun`의 게이트와 `runActivity`의
 * 출근·면접 기록. 둘 다 **활동을 실행하는 모든 통로가 지나는 지점**에 있어야만 새지 않는다.
 *
 * ## 결정성
 * `Math.random`·`Date` 금지. 합격 판정은 **스탯 대 요건**만 보므로 굴림이 아예 없다
 * (사유를 말해 줘야 하는데 주사위를 섞으면 그 설명이 거짓이 된다 — `data/careers.ts` 참조).
 */

/* ── 요건 판정 ─────────────────────────────────────────────────────────── */

/**
 * 모자란 요건을 사람이 읽는 문장으로 만든다.
 *
 * ⚠️ **판정과 사유가 같은 표를 본다.** 통과 여부는 이 배열이 비었는지로만 정하므로
 * "떨어뜨렸는데 이유는 못 대는" 상태가 구조적으로 불가능하다.
 *
 * ⚠️ **자격증도 여기서 본다**(2026-08-05 O넷). `stats`가 아니라 `state`를 받게 된 이유가
 * 그것이다 — 보유는 인벤토리에 있고, 판정을 화면 쪽으로 빼면 스탯 요건과 자격증 요건이
 * 서로 다른 곳에서 판정돼 "화면은 통과라는데 서류에서 떨어지는" 상태가 생긴다.
 */
export function shortfalls(
  state: GameState,
  need: CareerRequirement,
  /** 함께 요구하는 자격증 아이템 id(`Career.cert`). 없으면 스탯만 본다. */
  certItemId?: string,
): string[] {
  const missing = Object.entries(need)
    .filter(([key, min]) => state.stats[key as keyof Stats] < min)
    .map(
      ([key, min]) =>
        `${STAT_NAMES[key as keyof Stats]} ${min} 이상 필요 — 현재 ${state.stats[key as keyof Stats]}`,
    )
  if (certItemId && !owns(state, certItemId)) {
    missing.push(`${findItem(certItemId)?.name ?? '자격증'} 필요 — O넷에서 취득할 수 있습니다`)
  }
  return missing
}

/** 그 단계를 통과하는가. */
export function passes(
  state: GameState,
  need: CareerRequirement,
  certItemId?: string,
): boolean {
  return shortfalls(state, need, certItemId).length === 0
}

/* ── 지원 ─────────────────────────────────────────────────────────────── */

/**
 * 지원할 수 없는 이유. 비어 있으면 지원할 수 있다.
 *
 * ⚠️ **요건 미달은 여기 없다.** 미달인 채로도 지원할 수 있어야 한다 — 서류 결과가 나오는
 * 날까지 공부해서 채우는 것이 이 시스템의 유일한 도박이기 때문이다. 대신 사이트가
 * 부족한 요건을 글자로 미리 보여 준다(감추지 않는다 = 알바몬과 같은 규칙).
 */
export function applyBlockers(state: GameState): string[] {
  const blockers: string[] = []
  if (state.recovery) blockers.push('게임이 끝나 더 이상 지원할 수 없습니다.')
  if (state.employment) {
    const career = findCareer(state.employment.careerId)
    blockers.push(`${career?.company ?? '회사'}에 재직 중입니다. 한 번에 한 곳만 다닐 수 있습니다.`)
  }
  if (state.application) {
    const career = findCareer(state.application.careerId)
    blockers.push(`${career?.company ?? '지원한 곳'}의 결과를 기다리는 중입니다.`)
  }
  return blockers
}

export function canApply(state: GameState): boolean {
  return applyBlockers(state).length === 0
}

/**
 * 지원 기록을 만든다. **턴은 여기서 쓰지 않는다** —
 * 비용은 `job-apply` 활동이 갖고, 호출부(`gameStore`)가 이 결과에 대고 `runActivity`를 부른다.
 * 그래야 지원도 다른 확정 행동과 똑같이 번아웃·행동력·경고 미리보기를 지난다.
 */
export function applyTo(state: GameState, career: Career): GameState {
  if (!canApply(state)) return state
  return {
    ...state,
    application: {
      careerId: career.id,
      appliedDay: state.day,
      stage: 'screening',
      dueDay: state.day + SCREENING_DAYS,
    },
  }
}

/* ── 최고 경력 ─────────────────────────────────────────────────────────── */

/**
 * 이번 판에서 도달한 최고 직장을 갱신한다. **낮은 곳으로 옮겨도 기록은 내려가지 않는다.**
 *
 * 채용되는 지점이 하나(`advanceApplication`의 최종 합격)뿐이라 여기 한 줄이면 샐 곳이 없다.
 * 읽는 쪽은 파산 엔딩 판정 하나다(`systems/ending.ts`의 `epitaphCareerId`).
 */
export function recordPeakCareer(state: GameState, careerId: string): GameState {
  if (careerRank(careerId) <= careerRank(state.peakCareerId)) return state
  return { ...state, peakCareerId: careerId }
}

/* ── 소식 ─────────────────────────────────────────────────────────────── */

function notice(
  state: GameState,
  kind: JobNotice['kind'],
  careerId: string,
  extra?: { reason?: string; amount?: number; bonus?: number },
): JobNotice {
  return {
    // 같은 종류·같은 회사라도 날이 다르면 다른 소식이다(토스트 중복 제거 키를 겸한다).
    id: `${kind}-${careerId}-${state.day}-${state.slot}`,
    kind,
    careerId,
    day: state.day,
    slot: state.slot,
    ...extra,
  }
}

/** 소식을 세이브에 쌓는다. 오래된 것부터 버린다 — 세이브가 무한히 커지면 안 된다. */
function push(state: GameState, list: JobNotice[]): GameState {
  if (!list.length) return state
  return { ...state, jobNotices: [...(state.jobNotices ?? []), ...list].slice(-NOTICE_LIMIT) }
}

/* ── 하루 정산 ─────────────────────────────────────────────────────────── */

/** 채용 절차를 진행한다. 결과가 나올 날이 됐을 때만 움직인다. */
function advanceApplication(state: GameState): { state: GameState; notices: JobNotice[] } {
  const app = state.application
  if (!app) return { state, notices: [] }
  const career = findCareer(app.careerId)
  // 없는 공고를 가리키는 세이브(구버전 데이터)는 조용히 버린다 — 영원히 안 끝나는 것보다 낫다.
  if (!career) return { state: { ...state, application: undefined }, notices: [] }

  if (app.stage === 'screening' && state.day >= app.dueDay) {
    // ⚠️ 자격증은 **서류**가 본다(이력서에 붙이는 것이라 면접이 아니다).
    const missing = shortfalls(state, career.paper, career.cert)
    if (missing.length) {
      return {
        state: { ...state, application: undefined },
        notices: [notice(state, 'screening-fail', career.id, { reason: missing.join(' · ') })],
      }
    }
    const next: Application = {
      ...app,
      stage: 'interview',
      dueDay: state.day + INTERVIEW_LEAD_DAYS,
    }
    return { state: { ...state, application: next }, notices: [notice(state, 'screening-pass', career.id)] }
  }

  if (app.stage === 'interview' && state.day > app.dueDay + INTERVIEW_WINDOW_DAYS) {
    // 기한을 안 두면 통과한 지원이 영원히 남아 다른 곳에도 못 넣는 상태가 된다.
    return {
      state: { ...state, application: undefined },
      notices: [notice(state, 'interview-miss', career.id)],
    }
  }

  if (app.stage === 'final' && state.day >= app.dueDay) {
    const missing = shortfalls(state, career.person)
    if (missing.length) {
      return {
        state: { ...state, application: undefined },
        notices: [notice(state, 'final-fail', career.id, { reason: missing.join(' · ') })],
      }
    }
    const hired: GameState = {
      ...state,
      application: undefined,
      /* ⚠️ 도감의 "다녀 본 곳"은 **채용된 이 지점에서** 생긴다(`peakCareerId`와 같은 자리).
         출근을 한 번도 안 하고 해고돼도 다녀 본 것은 다녀 본 것이다. */
      careerLog: markHired(state.careerLog, career.id),
      employment: {
        careerId: career.id,
        hiredDay: state.day,
        paydayDay: state.day + PAYDAY_INTERVAL,
        attendedDays: [],
        absences: 0,
        // 입사 당일까지는 결근을 세지 않는다 — 다니지도 않은 날의 책임을 물을 수 없다.
        checkedDay: state.day,
      },
    }
    return {
      // ⚠️ 최고 경력은 **채용되는 이 지점에서만** 올라간다. 해고(`enforceAttendance`)는
      //    `employment`만 지우고 이 기록은 건드리지 않는다 — 그것이 규칙이다.
      state: recordPeakCareer(hired, career.id),
      notices: [notice(state, 'hired', career.id, { amount: career.salary })],
    }
  }

  return { state, notices: [] }
}

/**
 * 무단결근 감사.
 *
 * **결근의 정의:** 지나간 근무일(월~금) 중 출근하지 않은 날. "지나간"이 중요하다 —
 * 오늘은 아직 안 끝났으므로 세지 않는다. `checkedDay` 커서가 같은 날을 두 번 세는 것을 막는다
 * (스케줄러가 여러 날을 한 번에 밀어도 그 사이의 근무일이 전부 감사된다).
 */
function auditAbsences(state: GameState): GameState {
  const job = state.employment
  if (!job) return state
  const lastClosed = state.day - 1
  if (lastClosed <= job.checkedDay) return state

  let absences = job.absences
  for (let d = job.checkedDay + 1; d <= lastClosed; d++) {
    if (!isWorkWeekday(weekdayOf(d))) continue
    if (!job.attendedDays.includes(d)) absences++
  }
  return { ...state, employment: { ...job, absences, checkedDay: lastClosed } }
}

/**
 * 급여 지급.
 *
 * ⚠️ **해고보다 먼저 처리한다** — 이미 일한 주기의 급여는 받아야 한다.
 * `while`인 이유: 스케줄러 연쇄로 여러 주기가 한 번에 지나갈 수 있다.
 *
 * ⚠️ **업무 보너스도 여기서 함께 나간다**(콜센터 미니게임이 쌓아 둔 `Employment.bonus`).
 * 따로 입금하지 않는 이유는 "급여가 우선한다" 규칙 때문이다 — 급여와 보너스가 서로 다른
 * 자리에서 들어오면 밤의 게임오버 판정을 미루는 `nightPayoutPending`이 한쪽만 지킨다.
 * 기본급은 회사가, 보너스 금액은 미니게임이 정하고, **더하는 줄은 여기 하나**다.
 */
function payWages(state: GameState): { state: GameState; notices: JobNotice[] } {
  let current = state
  const notices: JobNotice[] = []
  for (let guard = 0; guard < 12; guard++) {
    const job = current.employment
    if (!job || current.day < job.paydayDay) break
    const career = findCareer(job.careerId)
    if (!career) break
    /* ⚠️ **성과 게이지의 100% 초과분이 야근비가 된다**(사무직 드라이브 미니게임).
       금액의 단일 출처는 `overtimePay` 하나이고 화면도 같은 함수를 본다 — 여기서 다시
       곱하면 명세서와 실제 입금이 어긋난다. 할당량까지는 기본급이 사는 몫이라 0원이다. */
    const bonus = (job.bonus ?? 0) + overtimePay(job.performance ?? 0)
    const paid = career.salary + bonus
    notices.push(notice(current, 'payday', career.id, { amount: paid, bonus }))
    const paydayDay = job.paydayDay + PAYDAY_INTERVAL
    current = {
      ...current,
      stats: clampStats({ ...current.stats, money: current.stats.money + paid }),
      employment: {
        ...job,
        bonus: 0,
        /* ⚠️ 게이지도 함께 비운다 — 안 비우면 초과분이 매 급여일 다시 지급된다
           (`bonus`를 0으로 되돌리는 것과 정확히 같은 이유). */
        performance: 0,
        paydayDay,
        // 지난 주기의 출근부는 버린다 — 배열이 무한히 자라면 세이브가 커진다.
        attendedDays: job.attendedDays.filter((d) => d >= job.paydayDay),
      },
    }
  }
  return { state: current, notices }
}

/** 경고와 해고. **경고 없이 해고하지 않는다** — 예고 없는 손실은 손실이 아니라 사고다. */
function enforceAttendance(state: GameState): { state: GameState; notices: JobNotice[] } {
  const job = state.employment
  if (!job) return { state, notices: [] }
  const career = findCareer(job.careerId)
  if (!career) return { state, notices: [] }

  if (job.absences >= ABSENCE_FIRE) {
    return {
      state: { ...state, employment: undefined },
      notices: [
        notice(state, 'fired', career.id, { reason: `무단결근 ${job.absences}회`, amount: job.absences }),
      ],
    }
  }
  if (job.absences >= ABSENCE_WARNING && job.warnedAt !== job.absences) {
    return {
      state: { ...state, employment: { ...job, warnedAt: job.absences } },
      notices: [
        notice(state, 'absence-warning', career.id, {
          reason: `무단결근 ${job.absences}회 · ${ABSENCE_FIRE}회가 되면 해고됩니다`,
          amount: job.absences,
        }),
      ],
    }
  }
  return { state, notices: [] }
}

/**
 * **턴이 넘어간 뒤** 고용을 하루치 진행시킨다(`gameStore.afterTurn`이 부른다).
 *
 * 순서가 규칙이다: 채용 절차 → 결근 감사 → **급여** → 경고/해고 → **게임오버 확정**.
 * 급여가 해고보다 앞인 것은 "이미 일한 대가는 받는다"이고, 결근 감사가 급여보다 앞인 것은
 * 급여일에 지난 주기의 출근부를 버리기 때문이다(버린 뒤에 세면 전부 결근이 된다).
 *
 * ⚠️ **게임오버가 맨 뒤인 것이 이 함수의 핵심이다**(설계자 지시: 급여가 우선한다).
 * 밤 정산은 생활비를 먼저 빼는데(`turn.ts`의 `sleep`) 급여는 여기서 들어온다. 그 사이에서
 * 파산을 확정하면 **월급을 손에 쥔 채 굶어 죽었다**는 판정이 나온다 — 실제로 나던 버그다.
 * 그래서 `runActivity`/`skipSlot`은 입금이 남은 밤이면 판정을 미루고(`nightPayoutPending`),
 * 그 마지막 결정을 밤의 마지막 지점인 여기가 맡는다.
 *
 * ⚠️ **`settleRecovery`를 이 줄에서 빼거나 급여보다 앞으로 올리지 말 것** —
 * 급여일에 파산하는 버그가 그대로 되돌아온다. 밤의 판정은 **한 번, 맨 마지막에** 한다.
 * 턴을 넘기는 모든 통로가 `afterTurn` → 이 함수를 지나므로 여기 한 곳이면 샐 데가 없다.
 */
export function advanceEmployment(state: GameState): { state: GameState; notices: JobNotice[] } {
  const stepped = advanceApplication(state)
  const audited = auditAbsences(stepped.state)
  const paid = payWages(audited)
  const enforced = enforceAttendance(paid.state)
  const notices = [...stepped.notices, ...paid.notices, ...enforced.notices]
  return { state: settleRecovery(push(enforced.state, notices)), notices }
}

/* ── 화면이 묻는 것들 ──────────────────────────────────────────────────── */

/** 현재 재직 중인 회사. */
export function currentCareer(state: GameState): Career | undefined {
  return state.employment ? findCareer(state.employment.careerId) : undefined
}

/** 결과를 기다리는 지원의 회사. */
export function pendingCareer(state: GameState): Career | undefined {
  return state.application ? findCareer(state.application.careerId) : undefined
}

/** 절차의 단계 라벨. 화면이 문구를 다시 적지 않는다(ux `Progress Indicators`). */
export const STAGE_LABELS: Record<Application['stage'], string> = {
  screening: '서류 심사',
  interview: '면접',
  final: '최종 결과 대기',
}

/** 진행 표시용 단계 번호(1부터). 전체 단계 수는 `STAGE_COUNT`. */
export const STAGE_COUNT = 3

export function stageIndex(stage: Application['stage']): number {
  return stage === 'screening' ? 1 : stage === 'interview' ? 2 : 3
}

/** 오늘 출근했는가. 출근부와 확정 패널이 같은 판정을 본다. */
export function attendedToday(state: GameState): boolean {
  return !!state.employment?.attendedDays.includes(state.day)
}

/** 오늘이 근무일인가. */
export function isWorkday(day: number): boolean {
  return isWorkWeekday(weekdayOf(day))
}

/**
 * 소식 한 건을 메일 문장으로 바꾼다.
 *
 * ⚠️ **문구를 세이브에 넣지 않는 대신 여기서 매번 만든다**(`systems/messages.ts`와 같은 판단).
 * 회사 이름·금액은 `data/careers.ts`에서 그때그때 읽으므로, 공고를 고쳐도 옛 소식이
 * 낡은 숫자를 들고 있지 않다.
 */
export function noticeMail(n: JobNotice): { from: string; subject: string; text: string } {
  const career = findCareer(n.careerId)
  const company = career?.company ?? '회사'
  const won = (v?: number) => `${(v ?? 0).toLocaleString('ko-KR')}원`
  switch (n.kind) {
    case 'screening-pass':
      return {
        from: `${company} 인사팀`,
        subject: '[서류 합격] 면접 일정 안내',
        text: '서류 심사를 통과하셨습니다. 벼룩장터의 채용 현황에서 면접 일정을 확인하고 기한 안에 방문해 주세요. 기한이 지나면 불참으로 처리됩니다.',
      }
    case 'screening-fail':
      return {
        from: `${company} 인사팀`,
        subject: '[서류 결과] 지원해 주셔서 감사합니다',
        text: `아쉽게도 이번 서류 심사에서는 함께하지 못하게 되었습니다. 부족했던 항목은 다음과 같습니다 — ${n.reason ?? '요건 미달'}.`,
      }
    case 'interview-miss':
      return {
        from: `${company} 인사팀`,
        subject: '[면접 불참] 전형이 종료되었습니다',
        text: '안내드린 기한까지 면접에 참석하지 않으셔서 전형을 종료합니다. 다시 지원하실 수 있습니다.',
      }
    case 'hired':
      return {
        from: `${company} 인사팀`,
        subject: '[최종 합격] 입사 안내',
        text: `최종 합격하셨습니다. 근무일은 월~금이며, 급여는 ${won(n.amount)}씩 지급됩니다. 근무일에 출근하지 않으면 무단결근으로 기록됩니다.`,
      }
    case 'final-fail':
      return {
        from: `${company} 인사팀`,
        subject: '[최종 결과] 아쉽게도 인연이 닿지 않았습니다',
        text: `면접 결과를 알려드립니다. 이번에는 함께하지 못하게 되었습니다. 부족했던 항목은 다음과 같습니다 — ${n.reason ?? '요건 미달'}.`,
      }
    case 'payday':
      return {
        from: `${company} 급여담당`,
        subject: '급여명세서가 발행되었습니다',
        // 보너스가 0인 회사(콜센터 외 전부)에는 그 줄을 아예 안 붙인다 — 늘 '보너스 0원'이
        // 적혀 있으면 실제로 보너스가 있는 판에서 그 줄이 눈에 들어오지 않는다.
        text: n.bonus
          ? `이번 급여 ${won(n.amount)}이 지급되었습니다 — 기본급 ${won((n.amount ?? 0) - n.bonus)} · 업무 보너스 ${won(n.bonus)}. 명세서는 사내 시스템에서 확인하실 수 있습니다.`
          : `이번 급여 ${won(n.amount)}이 지급되었습니다. 명세서는 사내 시스템에서 확인하실 수 있습니다.`,
      }
    case 'absence-warning':
      return {
        from: `${company} 인사팀`,
        subject: '[경고] 근태 확인 요청',
        text: `무단결근이 확인되어 안내드립니다 — ${n.reason ?? ''}. 근무일에는 반드시 출근해 주시기 바랍니다.`,
      }
    case 'fired':
      return {
        from: `${company} 인사팀`,
        subject: '[통보] 근로계약 해지 안내',
        text: `반복된 무단결근(${n.reason ?? ''})으로 근로계약을 해지합니다. 남은 절차는 별도로 안내드리지 않습니다.`,
      }
  }
}

/**
 * 회사 소식 한 줄 이름.
 *
 * ⚠️ **문구 전문은 메일이 갖는다**(`noticeMail`) — 여기는 목록·요약에 쓰는 이름뿐이다.
 * ⚠️ 자동 진행 요약과 벼룩장터가 **같은 이름을 본다**(예전엔 `autoAdvance.ts`에만 있었다) —
 * 두 벌로 적으면 한쪽만 고쳐진다.
 */
export const JOB_NOTICE_LABELS: Record<JobNotice['kind'], string> = {
  'screening-pass': '서류 합격',
  'screening-fail': '서류 탈락',
  'interview-miss': '면접 불참 처리',
  hired: '최종 합격',
  'final-fail': '최종 탈락',
  payday: '급여 입금',
  'absence-warning': '근태 경고',
  fired: '해고',
}

/** 지원을 **끝낸** 소식들. 급여·근태처럼 재직 중에 오는 것과 갈라 둔다. */
const OUTCOME_KINDS: JobNotice['kind'][] = ['screening-fail', 'final-fail', 'interview-miss']

/**
 * 직전에 끝난 지원의 결과. 없으면 undefined.
 *
 * ⚠️ **상태를 새로 만들지 않는다** — 탈락하면 `application`이 지워져 벼룩장터가 "지원한 곳이
 * 없습니다"로 되돌아가는데, 무슨 일이 있었는지는 이미 `jobNotices`가 들고 있다.
 * 토스트는 지나가고 메일은 열어야 보이므로, **지원했던 화면에도 흔적을 남긴다**.
 */
export function lastOutcome(state: GameState): JobNotice | undefined {
  return (state.jobNotices ?? []).filter((n) => OUTCOME_KINDS.includes(n.kind)).at(-1)
}

/**
 * 사서함에 실을 정규직 메일.
 *
 * ⚠️ **새 알림 창구를 만들지 않는다.** 이미 아웃룩이 있고 토스트가 있으므로 채널을
 * `MAILBOX.id`로 맞춰 그 둘을 그대로 탄다 — 창구가 셋이 되면 플레이어가 어디를 봐야
 * 하는지 알 수 없다.
 */
export function noticeMessages(state: GameState): TimedMessage[] {
  return (state.jobNotices ?? []).map((n, i) => {
    const turn = turnIndex(n.day, n.slot)
    return { id: n.id, channel: MAILBOX.id, ...noticeMail(n), time: messageTime(turn, i), turn }
  })
}
