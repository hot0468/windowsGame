import { CHANCE_EVENTS, CHANCE_RATE_PERCENT } from '../data/chance'
import { findActivity } from '../data/activities'
import { STAT_NAMES } from '../types/game'
import type { ChanceEvent, DilemmaChoice } from '../data/chance'
import type { Activity, GameState, Stats } from '../types/game'

/**
 * 돌발 사건 — **판 시드와 날짜의 순수 함수다.**
 *
 * ## 결정성
 * `Math.random` 금지는 그대로다. 시드는 새 판을 만들 때 store 층이 **한 번만** 굴려
 * `GameState.seed`에 박고(복권 일련번호와 같은 부류), 이후의 모든 굴림은 그 값의
 * 순수 함수다 — 예측은 안 되고(시드를 모른 채 미래를 셈할 수 없다) 재굴림도 안 된다
 * (새로 고침해도 같은 시드라 세이브 스커밍이 안 열린다).
 *
 * ## 적용 자리 (전부 이 파일 밖이다 — 규칙만 여기)
 * - `minor`: 취침 정산(`turn.ts`의 `sleep`) **한 자리**에서만 — 턴을 넘기는 통로가
 *   여럿이라 밖에 두면 샌다.
 * - `boost`: `canRun` 게이트가 아니라 날씨·아픔과 **같은 판형** — 게이트를 만들면
 *   예약·자동 진행이 조용히 스킵된다. 배율은 `runActivity`와 `activityPreview.ts`가
 *   **같은 함수**를 곱해야 확인창이 거짓 숫자를 안 적는다.
 */

/**
 * 그 판·그 날짜의 굴림값(32비트).
 *
 * ⚠️ **곱셈 상수가 `weather.ts`(2246822519)·`drive.ts`(2654435761)와 달라야 한다** —
 * 같으면 두 기능이 같은 날에 몰려 한 기능처럼 읽힌다. 여기는 xxHash의 세 번째 소수를
 * 쓰고, 시드를 섞은 뒤 한 번 더 흩어 인접한 날·인접한 시드가 닮지 않게 한다.
 */
function mix(seed: number, day: number): number {
  let x = (Math.imul(day + 1, 3266489917) ^ seed) >>> 0
  x = Math.imul(x ^ (x >>> 15), 668265263) >>> 0
  return (x ^ (x >>> 13)) >>> 0
}

/** 그날의 사건. 없으면 null. 같은 시드·같은 날은 늘 같다. */
export function chanceOf(seed: number, day: number): ChanceEvent | null {
  const r = mix(seed, day)
  if (r % 100 >= CHANCE_RATE_PERCENT) return null
  // 발생(하위 비트)과 선택(상위 비트)이 같은 굴림의 다른 자리를 본다 — 두 번 섞지 않는다.
  return CHANCE_EVENTS[(r >>> 16) % CHANCE_EVENTS.length]
}

/**
 * 시드 없는 구세이브의 결정적 기본값(이름 해시). `reviveState`가 이걸로 메운다 —
 * 무작위로 메우면 불러올 때마다 사건이 다시 굴러 스커밍이 열린다.
 */
export function nameSeed(name: string): number {
  let h = 0
  for (const ch of name) h = (Math.imul(h, 31) + ch.codePointAt(0)!) >>> 0
  return h % 2 ** 31
}

/**
 * 오늘의 사건. ⚠️ **Recovery 중에는 없다**(`dueRankEvents`와 같은 규칙 — 주저앉은 며칠에
 * 기회가 지나가면 놓친 벌이 두 번이다). 시드 없는 상태(테스트 기본값)도 사건이 없다.
 */
export function chanceToday(state: GameState): ChanceEvent | null {
  if (state.seed === undefined || state.recovery) return null
  return chanceOf(state.seed, state.day)
}

/**
 * 오늘 그 활동의 **긍정 효과에 곱할 값.** 기회가 아니면 1.
 *
 * ⚠️ 날씨(`weatherEfficiency`)와 같은 자리에서 곱는다 — 실행(`runActivity`)과
 * 미리보기(`activityPreview.ts`)가 같은 함수를 본다.
 */
export function chanceEfficiency(state: GameState, activityId: string): number {
  const e = chanceToday(state)
  return e?.kind === 'boost' && e.activityId === activityId && e.gainRate ? e.gainRate : 1
}

/**
 * 오늘 그 활동의 비용 할인으로 **돌려받는 돈**(양수). 기회가 아니면 0.
 *
 * 효율 배율이 아니라 덧셈인 이유: 번아웃 효율은 의도적으로 손해(음수)에 안 곱는다 —
 * 거기 섞으면 "번아웃이 비용도 줄여 주는" 다른 규칙이 된다. `meetMentalBonus`와 같은
 * 판형으로 `applyEffects` 바깥에서 더하고, 미리보기도 같은 함수를 더한다.
 */
export function chanceMoneyBack(state: GameState, activity: Activity): number {
  const e = chanceToday(state)
  if (e?.kind !== 'boost' || e.activityId !== activity.id || e.costRatio === undefined) return 0
  const cost = activity.effects.money ?? 0
  if (cost >= 0) return 0
  return Math.round(-cost * (1 - e.costRatio))
}

/**
 * 소소한 사건이 그날 밤 정산에 얹는 증감. 사건이 없으면 전부 0.
 *
 * @param balance 생활비·악성코드까지 빠진 **그 밤의 잔액**.
 * ⚠️ **돈을 잃는 사건은 잔액에서 최소 1원을 남기고만 뺀다**(랭크 이벤트 `below`·
 * 악성코드와 같은 규칙) — 단발 사건이 파산을 직접 만들면 "판은 물가로 끝난다"가 흐려진다.
 */
export function chanceNightDelta(
  state: GameState,
  balance: number,
): { stamina: number; mental: number; money: number } {
  const e = chanceToday(state)
  if (e?.kind !== 'minor') return { stamina: 0, mental: 0, money: 0 }
  const raw = e.effects?.money ?? 0
  const money = raw < 0 ? -Math.min(-raw, Math.max(0, balance - 1)) : raw
  return { stamina: e.effects?.stamina ?? 0, mental: e.effects?.mental ?? 0, money }
}

/* ── 딜레마 ─────────────────────────────────────────────────────────── */

/** 오늘의 딜레마. 아니면 null. Recovery·무시드 제외는 `chanceToday`가 이미 한다. */
export function dilemmaToday(state: GameState): ChanceEvent | null {
  const e = chanceToday(state)
  return e?.kind === 'dilemma' ? e : null
}

/**
 * 오늘 아침 딜레마 창이 떠야 하는가.
 *
 * ⚠️ 결정 커서(`GameState.dilemmaDecidedDay`)가 "같은 날 한 번만 묻는다"의 전부다 —
 * 길고양이 `CatState.decidedDay`와 같은 규칙: 결정 없이 창을 닫으면 그날 안에는 다시
 * 뜨고, 날이 지나면 그 갈림길은 그냥 지나간 것이다(어느 쪽도 고른 것이 아니다).
 */
export function dilemmaDue(state: GameState): boolean {
  return dilemmaToday(state) !== null && state.dilemmaDecidedDay !== state.day
}

/**
 * 선택지 버튼에 적는 효과 한 줄(숨은 비용 금지). 라벨은 `STAT_NAMES` 하나만 본다.
 * 효과 없는 선택지도 그 사실을 글자로 적는다 — 빈 버튼은 숨긴 것과 같다.
 */
export function choiceEffectText(choice: DilemmaChoice): string {
  const parts = Object.entries(choice.effects)
    .filter(([, v]) => v !== 0)
    .map(([k, v]) => `${STAT_NAMES[k as keyof Stats]} ${v > 0 ? '+' : ''}${v.toLocaleString('ko-KR')}`)
  return parts.length ? parts.join(' · ') : '아무 일도 없다'
}

/**
 * 딜레마를 결정한다 — 효과를 적용하고 결정 커서를 찍는다. 턴을 쓰지 않는다.
 *
 * ⚠️ **돈 손실은 잔액 1원을 남기고 자른다**(`chanceNightDelta`와 같은 규칙·같은 이유 —
 * 단발 사건이 파산을 직접 만들면 "판은 물가로 끝난다"가 흐려진다).
 * ⚠️ **도덕 상한 100이 리터럴인 이유**: 정본 `growthCap`은 `turn.ts`에 살고 turn이
 * 이 파일을 부르므로(취침 정산) 되부르면 순환이다 — `cat.ts`의 `petCat` 멘탈 100과
 * 같은 자리·같은 사유. `chance.test.ts`가 `growthCap('morality')`와 대조해 지킨다.
 */
export function resolveDilemma(state: GameState, choiceIndex: number): GameState {
  if (!dilemmaDue(state)) return state
  const choice = dilemmaToday(state)?.choices?.[choiceIndex]
  if (!choice) return state
  const { money = 0, mental = 0, morality = 0 } = choice.effects
  const nextMoney =
    money < 0
      ? state.stats.money - Math.min(-money, Math.max(0, state.stats.money - 1))
      : state.stats.money + money
  return {
    ...state,
    stats: {
      ...state.stats,
      money: nextMoney,
      mental: Math.min(100, Math.max(0, state.stats.mental + mental)),
      morality: Math.min(100, Math.max(0, state.stats.morality + morality)),
    },
    dilemmaDecidedDay: state.day,
  }
}

/**
 * 토스트·자동 진행 정지 사유에 쓰는 본문 한 줄.
 *
 * `boost`는 대상 활동 이름과 배율/할인 폭을 **글자로** 적는다(색만으로 전하지 않는다).
 * 이름은 `data/activities.ts`의 `label`에서 가져온다 — 문구에 굳혀 적으면 라벨을 바꾼
 * 순간 거짓이 된다. `minor`는 효과 숫자를 `effects`에서 파생한다(같은 이유).
 */
export function noticeTextOf(event: ChanceEvent): string {
  if (event.kind === 'boost') {
    const label = findActivity(event.activityId!)?.label ?? event.activityId
    return `오늘 하루 ${label} — ${event.text}.`
  }
  const names = { stamina: '체력', mental: '멘탈', money: '소지금' } as const
  const parts = Object.entries(event.effects ?? {})
    .filter(([, v]) => v !== 0)
    .map(([k, v]) => `${names[k as keyof typeof names]} ${v > 0 ? '+' : ''}${v.toLocaleString('ko-KR')}`)
  return parts.length ? `${event.text} (오늘 밤 ${parts.join(' · ')})` : event.text
}
