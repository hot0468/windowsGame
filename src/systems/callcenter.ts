import {
  BONUS_TIERS,
  CALLS,
  CALLS_PER_SHIFT,
  CALL_CENTER_CAREER_ID,
  MAX_CALL_BONUS,
  QNA,
} from '../data/callcenter'
import type { CallItem, QnaEntry } from '../data/callcenter'
import type { GameState } from '../types/game'

/**
 * 콜센터 업무 미니게임의 규칙.
 *
 * ## 의존 방향
 * ⚠️ `turn.ts`를 부르지만 **그 반대는 없다**(`employment.ts`·`bank.ts`와 같은 규칙).
 * 턴 규칙이 이 미니게임을 모르는 채로 있어야 밸런스 시뮬레이션이 그대로 성립한다 —
 * 이 파일이 만드는 것은 소지금이 아니라 **급여일에 함께 나갈 보너스 적립액**뿐이다.
 *
 * ## 결정성
 * 오늘 걸려 오는 콜은 **날짜의 함수**다(`Math.random` 금지 — 뉴스·메시지와 같은 규칙).
 * 실시간인 것은 **경과 시간 하나뿐**이고 그건 화면이 재서 밀리초로 넘겨준다 —
 * 이 파일은 `Date`를 부르지 않는다.
 */

/* ── 오늘의 콜 ─────────────────────────────────────────────────────────── */

/**
 * 그날 받을 콜 `CALLS_PER_SHIFT`건. 날짜를 오프셋 삼아 풀을 회전시킨다(`selectNews`와 같은 방식).
 *
 * 풀 길이가 3의 배수가 아니라서 조합이 날마다 어긋난다 — 배수였다면 며칠마다
 * **같은 세 건이 같은 순서로** 되돌아와 검색할 이유가 사라진다.
 */
export function callsForDay(day: number): CallItem[] {
  const start = ((day % CALLS.length) + CALLS.length) % CALLS.length
  return Array.from({ length: CALLS_PER_SHIFT }, (_, i) => CALLS[(start + i) % CALLS.length])
}

/* ── QnA 검색 ──────────────────────────────────────────────────────────── */

/** 검색어 정규화. 공백을 지워 "요금 제"와 "요금제"가 같은 말이 되게 한다. */
function normalize(text: string): string {
  return text.replace(/\s+/g, '').toLowerCase()
}

/**
 * QnA 검색. **빈 검색어는 전체 목록이다** — 처음 앉은 상담원에게 빈 화면을 주지 않는다.
 *
 * 제목과 `keywords`를 함께 본다. 고객이 쓰는 말("비싸요")은 제목에 없으므로
 * 키워드가 없으면 정답에 닿는 길이 제목을 외우는 것뿐이 된다.
 */
export function searchQna(query: string): QnaEntry[] {
  const q = normalize(query)
  if (!q) return QNA
  return QNA.filter(
    (entry) =>
      normalize(entry.title).includes(q) || entry.keywords.some((k) => normalize(k).includes(q)),
  )
}

/* ── 보너스 ────────────────────────────────────────────────────────────── */

/** 처리 시간에 따른 보너스. 표의 **처음 맞는 칸**이 답이다. */
export function bonusFor(elapsedMs: number): { won: number; label: string } {
  const sec = Math.max(0, elapsedMs) / 1000
  const tier = BONUS_TIERS.find((t) => sec <= t.withinSec) ?? BONUS_TIERS[BONUS_TIERS.length - 1]
  return { won: tier.won, label: tier.label }
}

/** 이 판이 콜센터 근무자인가. 창을 여는 쪽과 보너스를 쌓는 쪽이 같은 판정을 본다. */
export function worksAtCallCenter(state: GameState): boolean {
  return state.employment?.careerId === CALL_CENTER_CAREER_ID
}

/**
 * 콜 한 건을 처리한 보너스를 적립한다. **소지금은 건드리지 않는다** —
 * 이 돈은 급여일에 기본급과 함께 들어온다(`systems/employment.ts`의 `payWages`).
 *
 * ⚠️ **여기서 한 건당 상한으로 자른다.** 화면이 시간을 재서 넘기므로 금액의 근거가
 * 화면에 있는데, 상한까지 화면에 두면 이 게임에서 유일하게 **아무도 안 보는 돈**이 된다.
 */
export function creditCall(state: GameState, won: number): GameState {
  const job = state.employment
  if (!job || !worksAtCallCenter(state)) return state
  const safe = Number.isFinite(won) ? Math.min(Math.max(0, Math.round(won)), MAX_CALL_BONUS) : 0
  if (safe <= 0) return state
  return { ...state, employment: { ...job, bonus: (job.bonus ?? 0) + safe } }
}

/**
 * 세이브에서 되살릴 때 쓰는 보정. **못 믿을 값이면 통째로 버린다**(`reviveBank`와 같은 이유 —
 * NaN이 급여에 더해지면 소지금이 NaN이 되고 `NaN <= 0`이 false라 파산이 영영 안 걸린다).
 */
export function reviveBonus(raw: unknown): number | undefined {
  if (typeof raw !== 'number' || !Number.isFinite(raw) || raw < 0) return undefined
  return Math.round(raw)
}
