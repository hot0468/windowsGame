import { CERTS, EXAM_ACTIVITY_ID, certForItem, findCert } from '../data/certs'
import { findActivity } from '../data/activities'
import { findItem } from '../data/items'
import { MAILBOX } from '../data/messages'
import { shortfalls } from './employment'
import { messageTime, turnIndex } from './messages'
import { canRun, owns, runActivity } from './turn'
import type { TimedMessage } from './messages'
import type { Cert } from '../data/certs'
import type { ShopItem } from '../data/items'
import type { ExamRecord, GameState } from '../types/game'

/**
 * O넷 — 자격시험 응시와 합격 발표.
 *
 * `turn.ts`를 부르지만 **그 반대는 없다**(courses·bank·housing·lottery와 같은 규칙) —
 * 턴 규칙이 자격증을 모르는 채로 있어야 밸런스 시뮬레이션이 자격증 없이도 성립한다.
 *
 * ## 이 시스템이 지는 약속
 * ① 응시는 **1턴을 쓰고 응시료가 나간다**(떨어져도 돌려주지 않는다).
 * ② 합격 판정에 **무작위가 없다** — 정규직과 같은 규칙이다(`data/certs.ts` 참조).
 * ③ ⚠️ **판정은 응시 시점이 아니라 발표일 시점의 스탯으로 한다.** 응시한 날 모자랐어도
 *    발표일까지 채우면 붙는다 — 그것이 이 시스템의 유일한 도박이고, 굴림보다 나은
 *    도박이다(플레이어가 개입할 수 있다).
 * ④ ⚠️ **새 알림 창구를 만들지 않는다.** 합격은 자격증이 인벤토리로 들어오는 일이므로
 *    **기존 도착 토스트 경로**(`gameStore.arrivals`)를 그대로 타고, 합격·불합격 통지는
 *    채널을 `MAILBOX.id`로 맞춰 **기존 아웃룩**에 실린다(`employment.ts`와 같은 판단).
 */

/* ── 상태 읽기 ─────────────────────────────────────────────────────────── */

export function examsOf(state: GameState): ExamRecord[] {
  return state.exams ?? []
}

/** 아직 발표가 안 난 응시. 같은 종목을 두 번 접수하지 못하게 막는 근거다. */
export function pendingExam(state: GameState, certId: string): ExamRecord | undefined {
  return examsOf(state).find((e) => e.certId === certId && e.passed === undefined)
}

/** 이미 딴 자격증인가. 판정은 보유 하나로 한다(합격 기록이 아니라 아이템이 진실이다). */
export function hasCert(state: GameState, cert: Cert): boolean {
  return owns(state, cert.itemId)
}

/* ── 응시 ─────────────────────────────────────────────────────────────── */

/**
 * 왜 응시할 수 없는가. 화면은 이 문장을 **그대로** 쓴다(사유를 두 곳에서 만들지 않는다).
 * 응시할 수 있으면 null.
 *
 * ⚠️ **스탯 미달은 여기 없다.** 모자란 채로도 접수할 수 있어야 한다 — 발표일까지 채우는
 * 것이 이 시스템의 도박이기 때문이다(정규직 지원과 정확히 같은 규칙).
 */
export function blockReason(state: GameState, cert: Cert): string | null {
  if (state.gameOver) return '게임이 끝났습니다.'
  const activity = findActivity(EXAM_ACTIVITY_ID)
  if (!activity) return '시험 정보를 불러오지 못했습니다.'
  if (hasCert(state, cert)) return '이미 취득한 자격증입니다.'
  const waiting = pendingExam(state, cert.id)
  if (waiting) return `이미 접수했습니다 — ${waiting.resultDay}일차 발표 예정입니다.`
  if (state.stats.money < cert.fee) {
    return `응시료 ${cert.fee.toLocaleString()}원이 부족합니다 — 현재 ${state.stats.money.toLocaleString()}원`
  }
  // 응시료를 뺀 뒤의 상태로 물어야 활동의 돈 조건과 이중으로 걸리지 않는다(강의와 같은 규칙).
  const paid = { ...state, stats: { ...state.stats, money: state.stats.money - cert.fee } }
  if (!canRun(paid, activity)) return '지금은 응시할 수 없습니다 — 행동력이 부족합니다.'
  return null
}

export function canTake(state: GameState, cert: Cert): boolean {
  return blockReason(state, cert) === null
}

/**
 * 응시한다. 응시료를 내고 → 활동을 1턴 실행하고 → 접수 기록을 남긴다.
 * **합격 여부는 여기서 정하지 않는다** — 발표일에 `advanceCertification`이 정한다.
 *
 * ⚠️ 응시일은 **턴을 넘기기 전의 날**이다(출근 기록과 같은 규칙) — 오후에 응시하면
 * `runActivity`가 날짜를 넘기므로, 넘긴 뒤에 찍으면 "다음 날 시험을 본 것"이 된다.
 */
export function takeExam(state: GameState, cert: Cert): GameState {
  if (!canTake(state, cert)) return state
  const activity = findActivity(EXAM_ACTIVITY_ID)
  if (!activity) return state

  // ① 응시료. 활동 실행 **전**에 뺀다 — 오후 슬롯이면 runActivity가 생활비까지
  //    정산하므로 순서가 뒤바뀌면 "낼 수 있었는데 파산"이 난다(강의와 같은 이유).
  const paid: GameState = {
    ...state,
    stats: { ...state.stats, money: state.stats.money - cert.fee },
  }
  const record: ExamRecord = {
    certId: cert.id,
    takenDay: state.day,
    resultDay: state.day + cert.resultDays,
  }

  // ② 활동 1턴. 게임이 끝났어도(파산) 접수는 접수다.
  const after = runActivity(paid, activity)
  return { ...after, exams: [...examsOf(after), record] }
}

/* ── 발표 ─────────────────────────────────────────────────────────────── */

/**
 * **턴이 넘어간 뒤** 발표일이 된 응시를 정산한다(`gameStore.afterTurn`이 부른다 —
 * `advanceBank`·`advanceEmployment`와 같은 자리).
 *
 * 합격하면 자격증이 **그 자리에서** 인벤토리로 들어간다(배송을 거치지 않는다 — 수료증과
 * 같은 규칙). 돌려준 `arrived`는 `gameStore.arrivals`를 타고 **기존 도착 토스트**가 된다.
 *
 * ⚠️ **돈을 한 푼도 만지지 않는다.** 그래서 `nightPayoutPending`에 원천을 추가하지 않아도
 * 되고, 밤 정산 순서 어디에 놓아도 파산 판정이 흔들리지 않는다.
 */
export function advanceCertification(state: GameState): { state: GameState; arrived: ShopItem[] } {
  const exams = examsOf(state)
  if (!exams.length) return { state, arrived: [] }

  const arrived: ShopItem[] = []
  let inventory = state.inventory ?? []
  let changed = false

  const next = exams.map((e) => {
    if (e.passed !== undefined || state.day < e.resultDay) return e
    const cert = findCert(e.certId)
    // 없는 종목을 가리키는 기록(구버전 데이터)은 조용히 불합격으로 닫는다 —
    // 영원히 발표를 기다리는 기록이 남는 것보다 낫다.
    if (!cert) {
      changed = true
      return { ...e, passed: false, reason: '종목 정보를 찾을 수 없습니다' }
    }
    changed = true
    // ⚠️ **발표일 시점의 스탯**으로 판정한다. 판정과 사유는 같은 함수가 만든다
    //    (`shortfalls` — 떨어뜨렸는데 이유를 못 대는 상태가 구조적으로 불가능하다).
    const missing = shortfalls(state, cert.requires)
    if (missing.length) return { ...e, passed: false, reason: missing.join(' · ') }

    const item = findItem(cert.itemId)
    // 이미 갖고 있으면 두 장이 되지 않게 넘어간다(수료증과 같은 방어).
    if (item && !inventory.some((i) => i.id === cert.itemId)) {
      inventory = [...inventory, { id: cert.itemId, day: state.day }]
      arrived.push(item)
    }
    return { ...e, passed: true }
  })

  if (!changed) return { state, arrived: [] }
  return { state: { ...state, exams: next, inventory }, arrived }
}

/* ── 통지 ─────────────────────────────────────────────────────────────── */

/**
 * 발표 한 건을 메일 문장으로 바꾼다.
 *
 * ⚠️ **문구를 세이브에 넣지 않는 대신 여기서 매번 만든다**(`noticeMail`과 같은 판단).
 * 종목 이름은 `data/certs.ts`에서 그때그때 읽으므로 종목을 고쳐도 옛 통지가 낡은 이름을
 * 들고 있지 않다.
 */
export function examMail(rec: ExamRecord): { from: string; subject: string; text: string } {
  const cert = findCert(rec.certId)
  const name = cert?.name ?? '자격 종목'
  const from = 'O넷 자격시험본부'
  if (rec.passed) {
    return {
      from,
      subject: `[합격] ${name} 최종 합격 안내`,
      text: `${name} 시험에 합격하셨습니다. 자격증은 아이템 인벤토리에서 확인하실 수 있습니다.`,
    }
  }
  return {
    from,
    subject: `[불합격] ${name} 결과 안내`,
    text: `${name} 시험 결과를 알려드립니다. 기준에 미치지 못했습니다 — ${rec.reason ?? '기준 미달'}. 응시료는 환불되지 않으며 다시 접수하실 수 있습니다.`,
  }
}

/**
 * 사서함에 실을 발표 통지. **발표가 난 것만** 싣는다(접수만 해 둔 것은 소식이 아니다).
 *
 * ⚠️ **새 알림 창구를 만들지 않는다** — 채널을 `MAILBOX.id`로 맞춰 기존 아웃룩 분기를
 * 그대로 탄다(`noticeMessages`와 같은 규칙). 정렬 키가 `turn`인 이유도 같다: 시각
 * 문자열은 며칠에도 같은 값이라 두 출처를 시간순으로 합칠 수 없다.
 */
export function examMessages(state: GameState): TimedMessage[] {
  return examsOf(state)
    .filter((e) => e.passed !== undefined)
    .map((e, i) => {
      // 발표는 밤 정산에서 확정되므로 그 날 오전에 도착한 것으로 적는다.
      const turn = turnIndex(e.resultDay, 'morning')
      return {
        id: `exam-${e.certId}-${e.takenDay}`,
        channel: MAILBOX.id,
        ...examMail(e),
        time: messageTime(turn, i),
        turn,
      }
    })
}

export { CERTS, EXAM_ACTIVITY_ID, certForItem, findCert }
